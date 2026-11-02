import { BunproError } from "./errors.js";
import type {
  ListStudyDecksInput,
  ListStudyDecksOutput,
  RecentActivityInput,
  RecentActivityOutput,
  ReviewSchedule
} from "./schemas.js";
import type { FrontendSource } from "./frontend-source.js";
import { nextDay, todayInTimeZone } from "./study-period.js";

export async function getReviewSchedule(
  source: Pick<FrontendSource, "loadReviewPlanning">,
  now: Date = new Date()
): Promise<ReviewSchedule> {
  const planning = await source.loadReviewPlanning();
  const today = todayInTimeZone(now, planning.accountContext.sourceTimezone);
  const tomorrow = nextDay(today);
  const forecast = [
    { bucket: "later_today" as const, date: today, ...planning.forecast.laterToday },
    { bucket: "tomorrow" as const, date: tomorrow, ...planning.forecast.tomorrow },
    ...[...planning.forecast.dated]
      .sort((left, right) => left.date.localeCompare(right.date))
      .map(item => ({ bucket: "date" as const, ...item }))
  ];

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
  const configuration = await source.loadDeckConfiguration();
  const matching = configuration.entries.filter(
    entry => !input.active_only || entry.activelyStudying
  );
  const decks = matching.slice(0, input.limit).map(entry => {
    if (entry.metadata === null) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        "Bunpro returned study-deck configuration without matching deck metadata."
      );
    }
    return {
      deck_id: entry.deckId,
      title: entry.metadata.title,
      slug: entry.metadata.slug,
      deck_type: entry.metadata.deckType,
      actively_studying: entry.activelyStudying,
      batch_size: entry.batchSize,
      daily_goal: entry.dailyGoal,
      daily_goal_progress: entry.dailyGoalProgress,
      completed: entry.completed,
      content: entry.metadata.content
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
  source: Pick<FrontendSource, "loadRecentActivity">,
  input: RecentActivityInput
): Promise<RecentActivityOutput> {
  const activity = await source.loadRecentActivity(input.view);
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
