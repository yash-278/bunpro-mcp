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

const STUDY_DECKS_ROUTE = "/api/frontend/user/queue";
const LATEST_ATTEMPTS_ROUTE = "/api/frontend/user_stats/last_done_reviews";
const LAST_24_HOURS_ROUTE = "/api/frontend/summary/last_24_hours";

const UserDeckSchema = z.object({
  id: z.string(),
  attributes: z.object({
    deck_id: z.number().int().nonnegative(),
    actively_studying: z.boolean(),
    batch_size: z.number().int().nonnegative(),
    daily_goal: z.number().int().nonnegative(),
    daily_goal_count_grammar: z.number().int().nonnegative(),
    daily_goal_count_vocab: z.number().int().nonnegative(),
    complete_grammar_count: z.number().int().nonnegative(),
    complete_vocab_count: z.number().int().nonnegative()
  }).loose()
}).loose();
const DeckMetadataSchema = z.object({
  id: z.string(),
  attributes: z.object({
    title: z.string(),
    slug: z.string(),
    deck_type: z.string(),
    grammar_count: z.number().int().nonnegative(),
    vocab_count: z.number().int().nonnegative()
  }).loose()
}).loose();
const StudyDeckQueueSchema = z.object({
  data: z.array(UserDeckSchema),
  included: z.array(DeckMetadataSchema)
});
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
  source: StudySource,
  input: ListStudyDecksInput
): Promise<ListStudyDecksOutput> {
  const operationSignal = AbortSignal.timeout(30_000);
  await source.checkConnection(operationSignal);
  const queue = parse(
    StudyDeckQueueSchema,
    await source.getFrontendJson(STUDY_DECKS_ROUTE, operationSignal),
    "study-deck configuration"
  );
  const metadataById = new Map(queue.included.map(deck => [deck.id, deck.attributes]));
  const matching = queue.data.filter(deck => !input.active_only || deck.attributes.actively_studying);
  const decks = matching.slice(0, input.limit).map(userDeck => {
    const deckId = String(userDeck.attributes.deck_id);
    const metadata = metadataById.get(deckId);
    if (!metadata) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        "Bunpro returned study-deck configuration without matching deck metadata."
      );
    }
    return {
      deck_id: deckId,
      title: metadata.title,
      slug: metadata.slug,
      deck_type: metadata.deck_type,
      actively_studying: userDeck.attributes.actively_studying,
      batch_size: userDeck.attributes.batch_size,
      daily_goal: userDeck.attributes.daily_goal,
      daily_goal_progress: {
        grammar: userDeck.attributes.daily_goal_count_grammar,
        vocabulary: userDeck.attributes.daily_goal_count_vocab
      },
      completed: {
        grammar: userDeck.attributes.complete_grammar_count,
        vocabulary: userDeck.attributes.complete_vocab_count
      },
      content: {
        grammar: metadata.grammar_count,
        vocabulary: metadata.vocab_count
      }
    };
  });
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
