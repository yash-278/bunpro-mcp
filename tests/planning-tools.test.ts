import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryFrontendSource } from "../src/bunpro/in-memory-frontend-source.js";
import { getRecentActivity, getReviewSchedule, listStudyDecks } from "../src/bunpro/planning.js";

test("get_review_schedule separates due-now work from the normalized 14-day forecast", async () => {
  const source = new InMemoryFrontendSource({
    accountContext: { sourceTimezone: "Asia/Kolkata", tokenSource: "environment" },
    reviewPlanning: {
      dueNow: { grammar: 5, vocabulary: 7 },
      forecast: {
        laterToday: { grammar: 2, vocabulary: 1 },
        tomorrow: { grammar: 3, vocabulary: 5 },
        dated: [{ date: "2026-08-14", grammar: 4, vocabulary: 6 }]
      }
    }
  });

  const output = await getReviewSchedule(source, new Date("2026-08-12T12:00:00.000Z"));
  assert.equal(output.source_timezone, "Asia/Kolkata");
  assert.equal(output.retrieved_at, "2026-08-12T12:00:00.000Z");
  assert.deepEqual(output.due_now, { grammar: 5, vocabulary: 7, total: 12 });
  assert.deepEqual(output.forecast, [
    { bucket: "later_today", date: "2026-08-12", grammar: 2, vocabulary: 1, total: 3 },
    { bucket: "tomorrow", date: "2026-08-13", grammar: 3, vocabulary: 5, total: 8 },
    { bucket: "date", date: "2026-08-14", grammar: 4, vocabulary: 6, total: 10 }
  ]);
});

test("list_study_decks returns bounded active study configuration without unrelated deck metadata", async () => {
  const source = new InMemoryFrontendSource({
    accountContext: { sourceTimezone: "Asia/Kolkata", tokenSource: "environment" },
    deckConfiguration: {
      entries: [
        {
          deckId: "101",
          activelyStudying: true,
          batchSize: 3,
          dailyGoal: 5,
          dailyGoalProgress: { grammar: 2, vocabulary: 1 },
          completed: { grammar: 20, vocabulary: 10 },
          metadata: {
            title: "N3 Grammar",
            slug: "n3-grammar",
            deckType: "grammar",
            content: { grammar: 200, vocabulary: 0 }
          }
        },
        {
          deckId: "102",
          activelyStudying: false,
          batchSize: 1,
          dailyGoal: 2,
          dailyGoalProgress: { grammar: 0, vocabulary: 0 },
          completed: { grammar: 1, vocabulary: 1 },
          metadata: null
        }
      ]
    }
  });

  const output = await listStudyDecks(source, { active_only: true, limit: 20 });
  assert.deepEqual(output, {
    active_only: true,
    count: 1,
    total_matching: 1,
    has_more: false,
    decks: [{
      deck_id: "101",
      title: "N3 Grammar",
      slug: "n3-grammar",
      deck_type: "grammar",
      actively_studying: true,
      batch_size: 3,
      daily_goal: 5,
      daily_goal_progress: { grammar: 2, vocabulary: 1 },
      completed: { grammar: 20, vocabulary: 10 },
      content: { grammar: 200, vocabulary: 0 }
    }]
  });
});

test("list_study_decks fails closed when a selected deck has no metadata", async () => {
  const source = new InMemoryFrontendSource({
    accountContext: { sourceTimezone: "Asia/Kolkata", tokenSource: "environment" },
    deckConfiguration: {
      entries: [{
        deckId: "missing",
        activelyStudying: true,
        batchSize: 1,
        dailyGoal: 1,
        dailyGoalProgress: { grammar: 0, vocabulary: 0 },
        completed: { grammar: 0, vocabulary: 0 },
        metadata: null
      }]
    }
  });

  await assert.rejects(
    listStudyDecks(source, { active_only: true, limit: 20 }),
    /without matching deck metadata/i
  );
});

test("get_recent_activity returns a bounded last-24-hours view without embedded lesson content", async () => {
  const attempt = (id: number, correct: boolean) => ({
    attemptId: String(id),
    time: `2026-08-12T0${id}:00:00.000Z`,
    correct,
    contentType: "grammar_point",
    contentId: String(100 + id),
    label: `Grammar ${id}`
  });
  const source = new InMemoryFrontendSource({
    accountContext: { sourceTimezone: "Asia/Kolkata", tokenSource: "environment" },
    recentActivity: {
      last_24_hours: {
        attempts: [attempt(1, true), attempt(2, false)],
        sessions: [
          { startingXp: 100, endingXp: 110, startingBuncoin: 5, endingBuncoin: 7 },
          { startingXp: 110, endingXp: 125, startingBuncoin: 7, endingBuncoin: 8 }
        ]
      }
    }
  });

  const output = await getRecentActivity(source, { view: "last_24_hours", limit: 1 });
  assert.deepEqual(output, {
    source_timezone: "Asia/Kolkata",
    view: "last_24_hours",
    count: 1,
    total_available: 2,
    has_more: true,
    completeness: "upstream_rolling_window_not_guaranteed_complete",
    attempts: [{
      attempt_id: "1",
      time: "2026-08-12T01:00:00.000Z",
      correct: true,
      content_type: "grammar_point",
      content_id: "101",
      label: "Grammar 1"
    }],
    sessions: { count: 2, xp_delta: 25, buncoin_delta: 3 }
  });
});

test("get_recent_activity latest-attempts view preserves source semantics", async () => {
  const source = new InMemoryFrontendSource({
    accountContext: { sourceTimezone: "Asia/Kolkata", tokenSource: "environment" },
    recentActivity: {
      latest_attempts: {
        attempts: [{
          attemptId: "9",
          time: "2026-08-12T09:00:00.000Z",
          correct: false,
          contentType: "vocabulary",
          contentId: "209",
          label: "word-slug"
        }],
        sessions: null
      }
    }
  });

  const output = await getRecentActivity(source, { view: "latest_attempts", limit: 20 });
  assert.equal(output.view, "latest_attempts");
  assert.equal(output.sessions, null);
  assert.equal(output.attempts[0]?.label, "word-slug");
});
