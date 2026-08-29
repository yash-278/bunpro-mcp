import assert from "node:assert/strict";
import test from "node:test";
import {
  BunproFrontendSource,
  type FetchLike
} from "../src/bunpro/frontend-source.js";
import { BunproError } from "../src/bunpro/errors.js";
import { InMemoryFrontendSource } from "../src/bunpro/in-memory-frontend-source.js";

const apiToken = "test-account-api-token";

test("Account Context is normalized once within a Frontend source operation", async () => {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const mockFetch: FetchLike = async (input, init = {}) => {
    calls.push({ url: new URL(input instanceof Request ? input.url : input), init });
    return Response.json({
      user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } }
    });
  };
  const source = new BunproFrontendSource(apiToken, mockFetch, {
    tokenSource: "request_header"
  });

  const first = await source.getAccountContext();
  const second = await source.getAccountContext();

  assert.deepEqual(first, {
    sourceTimezone: "Asia/Kolkata",
    tokenSource: "request_header"
  });
  assert.strictEqual(second, first);
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0]?.url.href,
    "https://api.bunpro.jp/api/frontend/user?dangerously_authenticate_using_api_token=true"
  );
  assert.equal(
    new Headers(calls[0]?.init.headers).get("authorization"),
    `Token token=${apiToken}`
  );
});

test("Study History preserves normalized partial source outcomes", async () => {
  const requestedPaths: string[] = [];
  const fixtures: Record<string, unknown> = {
    "/api/frontend/user": {
      user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } }
    },
    "/api/frontend/user_stats/review_heatmap": {
      grammar: { "2026-08-10": 3 },
      vocab: { "2026-08-10": 2 },
      mixed: { "2026-08-10": 6 }
    },
    "/api/frontend/user_stats/accuracy_over_time": {
      "2026-08-10": 88.5,
      "2026-08-11": null
    }
  };
  const source = new BunproFrontendSource(apiToken, async input => {
    const path = new URL(input instanceof Request ? input.url : input).pathname;
    requestedPaths.push(path);
    if (path === "/api/frontend/user_stats/new_content_heatmap") {
      return new Response("route unavailable", { status: 404 });
    }
    const fixture = fixtures[path];
    return fixture === undefined
      ? new Response("not found", { status: 404 })
      : Response.json(fixture);
  });

  const snapshot = await source.loadStudyHistory();

  assert.deepEqual(snapshot, {
    accountContext: {
      sourceTimezone: "Asia/Kolkata",
      tokenSource: "environment"
    },
    reviews: {
      status: "available",
      data: {
        grammar: { "2026-08-10": 3 },
        vocabulary: { "2026-08-10": 2 },
        mixed: { "2026-08-10": 6 }
      }
    },
    newContent: { status: "contract_changed" },
    accuracy: {
      status: "available",
      data: { "2026-08-10": 88.5, "2026-08-11": null }
    }
  });
  assert.deepEqual(requestedPaths, [
    "/api/frontend/user",
    "/api/frontend/user_stats/review_heatmap",
    "/api/frontend/user_stats/new_content_heatmap",
    "/api/frontend/user_stats/accuracy_over_time"
  ]);
});

test("Study History stops its sequential plan when Bunpro throttles a source", async () => {
  const requestedPaths: string[] = [];
  const source = new BunproFrontendSource(apiToken, async input => {
    const path = new URL(input instanceof Request ? input.url : input).pathname;
    requestedPaths.push(path);
    if (path === "/api/frontend/user") {
      return Response.json({
        user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } }
      });
    }
    return new Response("slow down", { status: 429 });
  });

  const snapshot = await source.loadStudyHistory();

  assert.deepEqual(snapshot.reviews, { status: "rate_limited" });
  assert.deepEqual(snapshot.newContent, { status: "not_queried" });
  assert.deepEqual(snapshot.accuracy, { status: "not_queried" });
  assert.deepEqual(requestedPaths, [
    "/api/frontend/user",
    "/api/frontend/user_stats/review_heatmap"
  ]);
});

test("review planning returns semantic due and forecast facts", async () => {
  const fixtures: Record<string, unknown> = {
    "/api/frontend/user": {
      user: { data: { attributes: { time_zone_iana: "Asia/Tokyo" } } }
    },
    "/api/frontend/user/due": {
      total_due_grammar: 12,
      total_due_vocab: 5
    },
    "/api/frontend/user_stats/forecast_daily": {
      grammar: { later: 2, tomorrow: 3, "2026-08-31": 4 },
      vocab: { later: 1, tomorrow: 0, "2026-08-31": 2 }
    }
  };
  const source = new BunproFrontendSource(apiToken, async input => {
    const path = new URL(input instanceof Request ? input.url : input).pathname;
    return Response.json(fixtures[path]);
  });

  const snapshot = await source.loadReviewPlanning();

  assert.deepEqual(snapshot, {
    accountContext: {
      sourceTimezone: "Asia/Tokyo",
      tokenSource: "environment"
    },
    dueNow: { grammar: 12, vocabulary: 5 },
    forecast: {
      laterToday: { grammar: 2, vocabulary: 1 },
      tomorrow: { grammar: 3, vocabulary: 0 },
      dated: [
        { date: "2026-08-31", grammar: 4, vocabulary: 2 }
      ]
    }
  });
});

test("deck configuration joins user progress with normalized deck facts", async () => {
  const fixtures: Record<string, unknown> = {
    "/api/frontend/user": {
      user: { data: { attributes: { time_zone_iana: "Asia/Tokyo" } } }
    },
    "/api/frontend/user/queue": {
      data: [{
        id: "user-deck-1",
        attributes: {
          deck_id: 7,
          actively_studying: true,
          batch_size: 3,
          daily_goal: 6,
          daily_goal_count_grammar: 2,
          daily_goal_count_vocab: 1,
          complete_grammar_count: 40,
          complete_vocab_count: 30
        }
      }],
      included: [{
        id: "7",
        attributes: {
          title: "N5 Path",
          slug: "n5-path",
          deck_type: "jlpt",
          grammar_count: 100,
          vocab_count: 80
        }
      }]
    }
  };
  const source = new BunproFrontendSource(apiToken, async input => {
    const path = new URL(input instanceof Request ? input.url : input).pathname;
    return Response.json(fixtures[path]);
  });

  const snapshot = await source.loadDeckConfiguration();

  assert.deepEqual(snapshot.decks, [{
    deckId: "7",
    title: "N5 Path",
    slug: "n5-path",
    deckType: "jlpt",
    activelyStudying: true,
    batchSize: 3,
    dailyGoal: 6,
    dailyGoalProgress: { grammar: 2, vocabulary: 1 },
    completed: { grammar: 40, vocabulary: 30 },
    content: { grammar: 100, vocabulary: 80 }
  }]);
});

test("recent activity normalizes both semantic source views", async () => {
  const requestedPaths: string[] = [];
  const attempt = {
    id: 9,
    time: "2026-08-29T10:00:00+09:00",
    status: true,
    reviewable: {
      data: {
        id: 91,
        type: "grammar",
        attributes: { title: "〜てもいい" }
      }
    }
  };
  const fixtures: Record<string, unknown> = {
    "/api/frontend/user": {
      user: { data: { attributes: { time_zone_iana: "Asia/Tokyo" } } }
    },
    "/api/frontend/summary/last_24_hours": {
      history_objects: [attempt],
      review_sessions: {
        data: [{
          attributes: {
            starting_xp: 10,
            ending_xp: 25,
            starting_buncoin: 4,
            ending_buncoin: 7
          }
        }]
      }
    },
    "/api/frontend/user_stats/last_done_reviews": [attempt]
  };
  const source = new BunproFrontendSource(apiToken, async input => {
    const path = new URL(input instanceof Request ? input.url : input).pathname;
    requestedPaths.push(path);
    return Response.json(fixtures[path]);
  });

  const rolling = await source.loadRecentActivity("last_24_hours");
  const latest = await source.loadRecentActivity("latest_attempts");

  assert.deepEqual(rolling.attempts, [{
    attemptId: "9",
    time: "2026-08-29T10:00:00+09:00",
    correct: true,
    contentType: "grammar",
    contentId: "91",
    label: "〜てもいい"
  }]);
  assert.deepEqual(rolling.sessions, [{
    startingXp: 10,
    endingXp: 25,
    startingBuncoin: 4,
    endingBuncoin: 7
  }]);
  assert.deepEqual(latest.attempts, rolling.attempts);
  assert.equal(latest.sessions, null);
  assert.deepEqual(requestedPaths, [
    "/api/frontend/user",
    "/api/frontend/summary/last_24_hours",
    "/api/frontend/user_stats/last_done_reviews"
  ]);
});

test("learning progress returns validated normalized account and JLPT facts", async () => {
  const stageCounts = {
    beginner: 1,
    seasoned: 2,
    adept: 3,
    expert: 4,
    master: 5,
    total_count: 15
  };
  const reviewTotals = {
    accuracy: 80,
    correct: 8,
    incorrect: 2,
    total: 10
  };
  const levels = Object.fromEntries(["1", "2", "3", "4", "5"].map(level => [level, stageCounts]));
  const reviews = Object.fromEntries(["1", "2", "3", "4", "5"].map(level => [level, reviewTotals]));
  const fixtures: Record<string, unknown> = {
    "/api/frontend/user": {
      user: { data: { attributes: { time_zone_iana: "Asia/Tokyo" } } }
    },
    "/api/frontend/user_stats/base_stats": {
      facts: {
        days_studied: 120,
        grammar_studied: 400,
        vocab_studied: 250,
        streak: 7,
        weekly_streak: [{ day: "Mon", val: true }]
      }
    },
    "/api/frontend/user_stats/jlpt_progress_mixed": {
      grammar: levels,
      vocab: levels
    },
    "/api/frontend/user_stats/total_review_stats": {
      grammar: reviews,
      vocab: reviews,
      mixed: reviews
    },
    "/api/frontend/user_stats/total_cram_stats": {
      items: reviewTotals,
      sessions: {
        average_time: "00:10:00",
        reviews_per_session: 25,
        session_count: 4,
        total_time: "00:40:00"
      }
    }
  };
  const source = new BunproFrontendSource(apiToken, async input => {
    const path = new URL(input instanceof Request ? input.url : input).pathname;
    return Response.json(fixtures[path]);
  });

  const snapshot = await source.loadLearningProgress();

  assert.deepEqual(snapshot.base, {
    daysStudied: 120,
    grammarStudied: 400,
    vocabularyStudied: 250,
    currentStreak: 7,
    weeklyStreak: [{ day: "Mon", studied: true }]
  });
  assert.deepEqual(snapshot.jlptProgress.grammar.N5, {
    beginner: 1,
    seasoned: 2,
    adept: 3,
    expert: 4,
    master: 5,
    totalCount: 15
  });
  assert.deepEqual(snapshot.reviewTotals.mixed.N1, reviewTotals);
  assert.deepEqual(snapshot.cram, {
    items: reviewTotals,
    sessions: {
      averageTime: "00:10:00",
      reviewsPerSession: 25,
      sessionCount: 4,
      totalTime: "00:40:00"
    }
  });
});

test("the in-memory source serves normalized facts and typed capability failures", async () => {
  const accountContext = {
    sourceTimezone: "Asia/Kolkata",
    tokenSource: "environment" as const
  };
  const reviewPlanning = {
    dueNow: { grammar: 3, vocabulary: 2 },
    forecast: {
      laterToday: { grammar: 1, vocabulary: 0 },
      tomorrow: { grammar: 2, vocabulary: 1 },
      dated: []
    }
  };
  const expectedFailure = new BunproError("BUNPRO_RATE_LIMITED", "Rate limited test fixture.");
  const source = new InMemoryFrontendSource(
    { accountContext, reviewPlanning },
    { learningProgress: expectedFailure }
  );

  assert.deepEqual(await source.loadReviewPlanning(), {
    accountContext,
    ...reviewPlanning
  });
  await assert.rejects(source.loadLearningProgress(), error => error === expectedFailure);
});
