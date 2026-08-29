import * as z from "zod/v4";
import { BunproError } from "./errors.js";
import type {
  ListStudyDecksInput,
  ListStudyDecksOutput,
  RecentActivityInput,
  RecentActivityOutput,
  ReviewSchedule
} from "./schemas.js";
import type { FrontendSource } from "./frontend-source.js";
import type { StudySource } from "./study.js";

const LATEST_ATTEMPTS_ROUTE = "/api/frontend/user_stats/last_done_reviews";
const LAST_24_HOURS_ROUTE = "/api/frontend/summary/last_24_hours";

const AttemptSchema = z.object({
  id: z.union([z.string(), z.number()]),
  time: z.string().min(1),
  status: z.boolean(),
  reviewable: z.object({
    data: z.object({
      id: z.union([z.string(), z.number()]),
      type: z.string().min(1),
      attributes: z.object({
        title: z.string().optional(),
        slug: z.string().optional()
      }).loose()
    }).loose()
  }).loose()
}).loose();
const ReviewSessionSchema = z.object({
  attributes: z.object({
    starting_xp: z.number().int(),
    ending_xp: z.number().int(),
    starting_buncoin: z.number().int(),
    ending_buncoin: z.number().int()
  }).loose()
}).loose();
const Last24HoursSchema = z.object({
  history_objects: z.array(AttemptSchema),
  review_sessions: z.object({ data: z.array(ReviewSessionSchema) }).loose()
}).loose();
const LatestAttemptsSchema = z.array(AttemptSchema);

export async function getReviewSchedule(
  source: Pick<FrontendSource, "loadReviewPlanning">,
  now: Date = new Date()
): Promise<ReviewSchedule> {
  const operationSignal = AbortSignal.timeout(30_000);
  const planning = await source.loadReviewPlanning(operationSignal);
  const today = dateInTimeZone(now, planning.accountContext.sourceTimezone);
  const tomorrow = addDays(today, 1);
  const forecast = [
    { bucket: "later_today" as const, date: today, ...planning.forecast.laterToday },
    { bucket: "tomorrow" as const, date: tomorrow, ...planning.forecast.tomorrow },
    ...[...planning.forecast.dated]
      .sort((left, right) => left.date.localeCompare(right.date))
      .map(item => ({ bucket: "date" as const, ...item, date: validForecastDate(item.date) }))
  ];
  if (forecast.length > 14) {
    throw new BunproError("BUNPRO_CONTRACT_CHANGED", "Bunpro returned an unexpected daily forecast horizon.");
  }

  return {
    source_timezone: planning.accountContext.sourceTimezone,
    retrieved_at: now.toISOString(),
    due_now: {
      ...planning.dueNow,
      total: planning.dueNow.grammar + planning.dueNow.vocabulary
    },
    forecast: forecast.map(item => ({
      bucket: item.bucket,
      date: item.date,
      grammar: item.grammar,
      vocabulary: item.vocabulary,
      total: item.grammar + item.vocabulary
    })),
    forecast_is_projection: true
  };
}

export async function listStudyDecks(
  source: Pick<FrontendSource, "loadDeckConfiguration">,
  input: ListStudyDecksInput
): Promise<ListStudyDecksOutput> {
  const operationSignal = AbortSignal.timeout(30_000);
  const configuration = await source.loadDeckConfiguration(operationSignal);
  const matching = configuration.decks.filter(deck => !input.active_only || deck.activelyStudying);
  const decks = matching.slice(0, input.limit).map(deck => ({
    deck_id: deck.deckId,
    title: deck.title,
    slug: deck.slug,
    deck_type: deck.deckType,
    actively_studying: deck.activelyStudying,
    batch_size: deck.batchSize,
    daily_goal: deck.dailyGoal,
    daily_goal_progress: deck.dailyGoalProgress,
    completed: deck.completed,
    content: deck.content
  }));
  return {
    active_only: input.active_only,
    count: decks.length,
    total_matching: matching.length,
    has_more: matching.length > decks.length,
    decks
  };
}

export async function getRecentActivity(
  source: StudySource,
  input: RecentActivityInput
): Promise<RecentActivityOutput> {
  const operationSignal = AbortSignal.timeout(30_000);
  const connection = await source.checkConnection(operationSignal);
  const isRollingWindow = input.view === "last_24_hours";
  const payload = await source.getFrontendJson(
    isRollingWindow ? LAST_24_HOURS_ROUTE : LATEST_ATTEMPTS_ROUTE,
    operationSignal
  );
  let attempts: z.infer<typeof AttemptSchema>[];
  let sessions: z.infer<typeof ReviewSessionSchema>[] | null;
  if (isRollingWindow) {
    const parsed = parse(Last24HoursSchema, payload, "last-24-hours activity");
    attempts = parsed.history_objects;
    sessions = parsed.review_sessions.data;
  } else {
    attempts = parse(LatestAttemptsSchema, payload, "latest review attempts");
    sessions = null;
  }
  const normalizedAttempts = attempts.slice(0, input.limit).map(attempt => ({
    attempt_id: String(attempt.id),
    time: attempt.time,
    correct: attempt.status,
    content_type: attempt.reviewable.data.type,
    content_id: String(attempt.reviewable.data.id),
    label: attempt.reviewable.data.attributes.title ??
      attempt.reviewable.data.attributes.slug ??
      null
  }));
  return {
    source_timezone: connection.source_timezone,
    view: input.view,
    count: normalizedAttempts.length,
    total_available: attempts.length,
    has_more: attempts.length > normalizedAttempts.length,
    completeness: isRollingWindow
      ? "upstream_rolling_window_not_guaranteed_complete"
      : "latest_source_records_not_guaranteed_complete",
    attempts: normalizedAttempts,
    sessions: sessions === null ? null : {
      count: sessions.length,
      xp_delta: sessions.reduce(
        (total, session) => total + session.attributes.ending_xp - session.attributes.starting_xp,
        0
      ),
      buncoin_delta: sessions.reduce(
        (total, session) => total + session.attributes.ending_buncoin - session.attributes.starting_buncoin,
        0
      )
    }
  };
}

function parse<T>(schema: z.ZodType<T>, payload: unknown, name: string): T {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new BunproError(
      "BUNPRO_CONTRACT_CHANGED",
      `Bunpro accepted the Account API Token, but the ${name} response shape changed.`
    );
  }
  return parsed.data;
}

function validForecastDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== value) {
    throw new BunproError("BUNPRO_CONTRACT_CHANGED", "Bunpro returned an invalid forecast date.");
  }
  return value;
}

function dateInTimeZone(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
