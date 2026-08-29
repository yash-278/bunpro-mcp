import { BunproError } from "./errors.js";
import type {
  ListStudyDecksInput,
  ListStudyDecksOutput,
  RecentActivityInput,
  RecentActivityOutput,
  ReviewSchedule
} from "./schemas.js";
import type { FrontendSource } from "./frontend-source.js";

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
  source: Pick<FrontendSource, "loadRecentActivity">,
  input: RecentActivityInput
): Promise<RecentActivityOutput> {
  const operationSignal = AbortSignal.timeout(30_000);
  const activity = await source.loadRecentActivity(input.view, operationSignal);
  const isRollingWindow = activity.view === "last_24_hours";
  const normalizedAttempts = activity.attempts.slice(0, input.limit).map(attempt => ({
    attempt_id: attempt.attemptId,
    time: attempt.time,
    correct: attempt.correct,
    content_type: attempt.contentType,
    content_id: attempt.contentId,
    label: attempt.label
  }));
  return {
    source_timezone: activity.accountContext.sourceTimezone,
    view: activity.view,
    count: normalizedAttempts.length,
    total_available: activity.attempts.length,
    has_more: activity.attempts.length > normalizedAttempts.length,
    completeness: isRollingWindow
      ? "upstream_rolling_window_not_guaranteed_complete"
      : "latest_source_records_not_guaranteed_complete",
    attempts: normalizedAttempts,
    sessions: activity.sessions === null ? null : {
      count: activity.sessions.length,
      xp_delta: activity.sessions.reduce(
        (total, session) => total + session.endingXp - session.startingXp,
        0
      ),
      buncoin_delta: activity.sessions.reduce(
        (total, session) => total + session.endingBuncoin - session.startingBuncoin,
        0
      )
    }
  };
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
