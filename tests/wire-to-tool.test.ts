import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import {
  createFrontendSourceOperationFactory,
  type FrontendSourceOptions
} from "../src/bunpro/frontend-source.js";
import { createServer } from "../src/server.js";
import {
  bunproRoutes,
  createBunproWire,
  reviewSession,
  stalledBodyReply,
  wireBodies,
  type WireOverrides
} from "./fixtures/bunpro-wire.js";

type ToolResult = Awaited<ReturnType<Client["callTool"]>>;

const syntheticToken = "synthetic-account-api-token";
const fixedClock = new Date("2026-08-12T12:00:00.000Z");

const studyHistoryRoutes = [
  bunproRoutes.user,
  bunproRoutes.reviewHeatmap,
  bunproRoutes.newContentHeatmap,
  bunproRoutes.accuracyOverTime
];
const reviewScheduleRoutes = [
  bunproRoutes.user,
  bunproRoutes.due,
  bunproRoutes.forecastDaily
];
const deckRoutes = [bunproRoutes.user, bunproRoutes.deckQueue];
const learningProgressRoutes = [
  bunproRoutes.user,
  bunproRoutes.baseStats,
  bunproRoutes.jlptProgress,
  bunproRoutes.totalReviewStats,
  bunproRoutes.totalCramStats
];
const unavailableMeasures = [
  "study duration for the requested day",
  "exact correct and incorrect counts for the requested day",
  "complete item-level history for an arbitrary historical day"
];
const noCounts = { grammar: null, vocabulary: null, source_total: null, component_sum: null };
const noRecordCounts = { coverage: "no_source_record", ...noCounts, consistency: "not_comparable" };
const unavailableCounts = { coverage: "unavailable", ...noCounts, consistency: "not_comparable" };
const noRecordAccuracy = { coverage: "no_source_record", percent: null };
const unavailableAccuracy = { coverage: "unavailable", percent: null };
const reviewsAugust10 = {
  coverage: "available",
  grammar: 3,
  vocabulary: 2,
  source_total: 6,
  component_sum: 5,
  consistency: "mismatch"
};
const reviewsAugust11 = {
  coverage: "available",
  grammar: 4,
  vocabulary: null,
  source_total: 4,
  component_sum: null,
  consistency: "not_comparable"
};
const newContentAugust10 = {
  coverage: "available",
  grammar: 1,
  vocabulary: 2,
  source_total: 3,
  component_sum: 3,
  consistency: "match"
};
const accuracyAugust10 = { coverage: "available", percent: 88.5 };
const accuracyAugust11 = { coverage: "available", percent: 100 };
const reviewsCoverage = {
  status: "available",
  first_record_date: "2026-08-10",
  last_record_date: "2026-08-11"
};
const newContentCoverage = {
  status: "available",
  first_record_date: "2026-08-10",
  last_record_date: "2026-08-10"
};
const accuracyCoverage = reviewsCoverage;
const completeCoverage = {
  reviews: reviewsCoverage,
  new_content: newContentCoverage,
  accuracy: accuracyCoverage
};
const completeDays = [
  {
    study_day: "2026-08-10",
    in_progress: false,
    activity_evidence: "recorded",
    reviews: reviewsAugust10,
    new_content: newContentAugust10,
    accuracy: accuracyAugust10
  },
  {
    study_day: "2026-08-11",
    in_progress: false,
    activity_evidence: "recorded",
    reviews: reviewsAugust11,
    new_content: noRecordCounts,
    accuracy: accuracyAugust11
  },
  {
    study_day: "2026-08-12",
    in_progress: true,
    activity_evidence: "no_source_record",
    reviews: noRecordCounts,
    new_content: noRecordCounts,
    accuracy: noRecordAccuracy
  }
];
const activeDeckOutput = {
  active_only: true,
  count: 1,
  total_matching: 1,
  has_more: false,
  decks: [{
    deck_id: "101",
    title: "Synthetic N3 Grammar",
    slug: "synthetic-n3-grammar",
    deck_type: "jlpt",
    actively_studying: true,
    batch_size: 3,
    daily_goal: 5,
    daily_goal_progress: { grammar: 2, vocabulary: 1 },
    completed: { grammar: 20, vocabulary: 10 },
    content: { grammar: 200, vocabulary: 80 }
  }]
};

test("get_connection_status reports the account timezone from the user route", async t => {
  const { result, routes } = await callTool(t, "get_connection_status");

  assert.deepEqual(routes, [bunproRoutes.user]);
  assert.deepEqual(result.structuredContent, {
    connected: true,
    authentication_method: "account_api_token",
    token_source: "environment",
    token_persisted_by_server: false,
    api_authenticated: true,
    source_timezone: "Asia/Kolkata",
    stateless: true
  });
});

test("get_study_day_summary reports one Study Day with its Source Coverage", async t => {
  const { result, routes } = await callTool(t, "get_study_day_summary", {
    date: "2026-08-10",
    expected_timezone: "Asia/Kolkata"
  });

  assert.deepEqual(routes, studyHistoryRoutes);
  assert.deepEqual(result.structuredContent, {
    study_day: "2026-08-10",
    in_progress: false,
    activity_evidence: "recorded",
    reviews: reviewsAugust10,
    new_content: newContentAugust10,
    accuracy: accuracyAugust10,
    source_timezone: "Asia/Kolkata",
    expected_timezone: "Asia/Kolkata",
    timezone_matches: true,
    overall_query_status: "complete",
    source_coverage: completeCoverage,
    unavailable_measures: unavailableMeasures
  });
});

test("get_study_day_summary keeps a sparse day with no record as unknown, not zero", async t => {
  const { result, routes } = await callTool(t, "get_study_day_summary", { date: "2026-08-09" });

  assert.deepEqual(routes, studyHistoryRoutes);
  assert.deepEqual(result.structuredContent, {
    study_day: "2026-08-09",
    in_progress: false,
    activity_evidence: "no_source_record",
    reviews: noRecordCounts,
    new_content: noRecordCounts,
    accuracy: noRecordAccuracy,
    source_timezone: "Asia/Kolkata",
    expected_timezone: null,
    timezone_matches: null,
    overall_query_status: "complete",
    source_coverage: completeCoverage,
    unavailable_measures: unavailableMeasures
  });
});

test("get_study_day_summary keeps activity evidence when the accuracy source returns 503", async t => {
  const { result, routes } = await callTool(t, "get_study_day_summary", { date: "2026-08-10" }, {
    [bunproRoutes.accuracyOverTime]: new Response("synthetic outage", { status: 503 })
  });

  assert.deepEqual(routes, studyHistoryRoutes);
  assert.deepEqual(result.structuredContent, {
    study_day: "2026-08-10",
    in_progress: false,
    activity_evidence: "recorded",
    reviews: reviewsAugust10,
    new_content: newContentAugust10,
    accuracy: unavailableAccuracy,
    source_timezone: "Asia/Kolkata",
    expected_timezone: null,
    timezone_matches: null,
    overall_query_status: "partial",
    source_coverage: {
      reviews: reviewsCoverage,
      new_content: newContentCoverage,
      accuracy: { status: "upstream_unavailable", first_record_date: null, last_record_date: null }
    },
    unavailable_measures: unavailableMeasures
  });
});

test("get_study_day_summary stops the sequence and fails when the first source is rate limited", async t => {
  const { result, routes } = await callTool(t, "get_study_day_summary", { date: "2026-08-10" }, {
    [bunproRoutes.reviewHeatmap]: new Response("synthetic throttle", { status: 429 })
  });

  assert.deepEqual(routes, [bunproRoutes.user, bunproRoutes.reviewHeatmap]);
  assertToolError(
    result,
    "BUNPRO_RATE_LIMITED: Bunpro rate-limited the Study Day request. Wait before trying again."
  );
});

test("get_study_day_summary stops the sequence and stays partial when a later source is rate limited", async t => {
  const { result, routes } = await callTool(t, "get_study_day_summary", { date: "2026-08-10" }, {
    [bunproRoutes.newContentHeatmap]: new Response("synthetic throttle", { status: 429 })
  });

  assert.deepEqual(routes, [
    bunproRoutes.user,
    bunproRoutes.reviewHeatmap,
    bunproRoutes.newContentHeatmap
  ]);
  assert.deepEqual(result.structuredContent, {
    study_day: "2026-08-10",
    in_progress: false,
    activity_evidence: "recorded",
    reviews: reviewsAugust10,
    new_content: unavailableCounts,
    accuracy: unavailableAccuracy,
    source_timezone: "Asia/Kolkata",
    expected_timezone: null,
    timezone_matches: null,
    overall_query_status: "partial",
    source_coverage: {
      reviews: reviewsCoverage,
      new_content: { status: "rate_limited", first_record_date: null, last_record_date: null },
      accuracy: { status: "not_queried", first_record_date: null, last_record_date: null }
    },
    unavailable_measures: unavailableMeasures
  });
});

test("get_study_day_summary reports a rate limit ahead of an earlier source failure", async t => {
  const { result, routes } = await callTool(t, "get_study_day_summary", { date: "2026-08-10" }, {
    [bunproRoutes.reviewHeatmap]: new Response("synthetic removal", { status: 404 }),
    [bunproRoutes.newContentHeatmap]: new Response("synthetic throttle", { status: 429 })
  });

  assert.deepEqual(routes, [
    bunproRoutes.user,
    bunproRoutes.reviewHeatmap,
    bunproRoutes.newContentHeatmap
  ]);
  assertToolError(
    result,
    "BUNPRO_RATE_LIMITED: Bunpro rate-limited the Study Day request. Wait before trying again."
  );
});

test("get_study_day_summary keeps zero counts, missing components, and null accuracy on the source timezone's today", async t => {
  const { result, routes } = await callTool(t, "get_study_day_summary", { date: "2026-08-12" }, {
    [bunproRoutes.reviewHeatmap]: {
      grammar: {},
      vocab: { "2026-08-12": 0 },
      mixed: { "2026-08-12": 0 }
    },
    [bunproRoutes.newContentHeatmap]: { grammar: {}, vocab: {}, mixed: {} },
    [bunproRoutes.accuracyOverTime]: { "2026-08-12": null }
  }, { clock: new Date("2026-08-11T18:45:00.000Z") });

  assert.deepEqual(routes, studyHistoryRoutes);
  assert.deepEqual(result.structuredContent, {
    study_day: "2026-08-12",
    in_progress: true,
    activity_evidence: "recorded",
    reviews: {
      coverage: "available",
      grammar: null,
      vocabulary: 0,
      source_total: 0,
      component_sum: null,
      consistency: "not_comparable"
    },
    new_content: noRecordCounts,
    accuracy: { coverage: "available", percent: null },
    source_timezone: "Asia/Kolkata",
    expected_timezone: null,
    timezone_matches: null,
    overall_query_status: "complete",
    source_coverage: {
      reviews: {
        status: "available",
        first_record_date: "2026-08-12",
        last_record_date: "2026-08-12"
      },
      new_content: { status: "available", first_record_date: null, last_record_date: null },
      accuracy: {
        status: "available",
        first_record_date: "2026-08-12",
        last_record_date: "2026-08-12"
      }
    },
    unavailable_measures: unavailableMeasures
  });
});

test("a future end date stops after Account Context with one message from every Study Period tool", async t => {
  const cases = [
    { name: "get_study_day_summary", args: { date: "2026-08-13" } },
    { name: "get_study_range_summary", args: { start_date: "2026-08-10", end_date: "2026-08-13" } },
    { name: "get_activity_trend", args: { start_date: "2026-08-10", end_date: "2026-08-13" } }
  ];

  for (const item of cases) {
    await t.test(item.name, async st => {
      const { result, routes } = await callTool(st, item.name, item.args);

      assert.deepEqual(routes, [bunproRoutes.user]);
      assertToolError(result, "BUNPRO_INVALID_INPUT: Study Period cannot end in the future.");
    });
  }
});

test("get_study_day_summary rejects an impossible date without an upstream call", async t => {
  const { result, routes } = await callTool(t, "get_study_day_summary", { date: "2026-02-30" });

  assert.deepEqual(routes, []);
  assertToolError(result, "BUNPRO_INVALID_INPUT: Study Day is not a valid calendar date.");
});

test("get_study_range_summary reports every day of a Study Period from one set of requests", async t => {
  const { result, routes } = await callTool(t, "get_study_range_summary", {
    start_date: "2026-08-10",
    end_date: "2026-08-12",
    expected_timezone: "Asia/Kolkata"
  });

  assert.deepEqual(routes, studyHistoryRoutes);
  assert.deepEqual(result.structuredContent, {
    requested_start_date: "2026-08-10",
    requested_end_date: "2026-08-12",
    source_timezone: "Asia/Kolkata",
    expected_timezone: "Asia/Kolkata",
    timezone_matches: true,
    overall_query_status: "complete",
    days: completeDays,
    aggregates: {
      reviews: { source_record_days: 2, source_total: 10 },
      new_content: { source_record_days: 1, source_total: 3 },
      accuracy: { source_record_days: 2, average_percent: 94.25 }
    },
    contiguous_checked_through: {
      activity: "2026-08-12",
      accuracy: "2026-08-12",
      all_sources: "2026-08-12"
    },
    source_coverage: completeCoverage,
    unavailable_measures: unavailableMeasures
  });
});

test("get_study_range_summary stays partial when one source route is removed", async t => {
  const { result, routes } = await callTool(t, "get_study_range_summary", {
    start_date: "2026-08-10",
    end_date: "2026-08-12"
  }, {
    [bunproRoutes.newContentHeatmap]: new Response("synthetic removal", { status: 404 })
  });

  assert.deepEqual(routes, studyHistoryRoutes);
  assert.deepEqual(result.structuredContent, {
    requested_start_date: "2026-08-10",
    requested_end_date: "2026-08-12",
    source_timezone: "Asia/Kolkata",
    expected_timezone: null,
    timezone_matches: null,
    overall_query_status: "partial",
    days: [
      {
        study_day: "2026-08-10",
        in_progress: false,
        activity_evidence: "recorded",
        reviews: reviewsAugust10,
        new_content: unavailableCounts,
        accuracy: accuracyAugust10
      },
      {
        study_day: "2026-08-11",
        in_progress: false,
        activity_evidence: "recorded",
        reviews: reviewsAugust11,
        new_content: unavailableCounts,
        accuracy: accuracyAugust11
      },
      {
        study_day: "2026-08-12",
        in_progress: true,
        activity_evidence: "unavailable",
        reviews: noRecordCounts,
        new_content: unavailableCounts,
        accuracy: noRecordAccuracy
      }
    ],
    aggregates: {
      reviews: { source_record_days: 2, source_total: 10 },
      new_content: { source_record_days: 0, source_total: 0 },
      accuracy: { source_record_days: 2, average_percent: 94.25 }
    },
    contiguous_checked_through: {
      activity: null,
      accuracy: "2026-08-12",
      all_sources: null
    },
    source_coverage: {
      reviews: reviewsCoverage,
      new_content: { status: "contract_changed", first_record_date: null, last_record_date: null },
      accuracy: accuracyCoverage
    },
    unavailable_measures: unavailableMeasures
  });
});

test("get_activity_trend averages only source-present records across a Study Period", async t => {
  const { result, routes } = await callTool(t, "get_activity_trend", {
    start_date: "2026-08-10",
    end_date: "2026-08-12"
  });

  assert.deepEqual(routes, studyHistoryRoutes);
  assert.deepEqual(result.structuredContent, {
    requested_start_date: "2026-08-10",
    requested_end_date: "2026-08-12",
    source_timezone: "Asia/Kolkata",
    expected_timezone: null,
    timezone_matches: null,
    overall_query_status: "complete",
    days: completeDays,
    metrics: {
      reviews: { source_record_days: 2, total: 10, average_per_source_record_day: 5 },
      new_content: { source_record_days: 1, total: 3, average_per_source_record_day: 3 },
      accuracy: { source_record_days: 2, average_percent: 94.25 }
    },
    derived_measures_labeled: true,
    source_coverage: completeCoverage
  });
});

test("get_activity_trend stays partial when one source returns 503", async t => {
  const { result, routes } = await callTool(t, "get_activity_trend", {
    start_date: "2026-08-10",
    end_date: "2026-08-12"
  }, {
    [bunproRoutes.reviewHeatmap]: new Response("synthetic outage", { status: 503 })
  });

  assert.deepEqual(routes, studyHistoryRoutes);
  assert.deepEqual(result.structuredContent, {
    requested_start_date: "2026-08-10",
    requested_end_date: "2026-08-12",
    source_timezone: "Asia/Kolkata",
    expected_timezone: null,
    timezone_matches: null,
    overall_query_status: "partial",
    days: [
      {
        study_day: "2026-08-10",
        in_progress: false,
        activity_evidence: "recorded",
        reviews: unavailableCounts,
        new_content: newContentAugust10,
        accuracy: accuracyAugust10
      },
      {
        study_day: "2026-08-11",
        in_progress: false,
        activity_evidence: "unavailable",
        reviews: unavailableCounts,
        new_content: noRecordCounts,
        accuracy: accuracyAugust11
      },
      {
        study_day: "2026-08-12",
        in_progress: true,
        activity_evidence: "unavailable",
        reviews: unavailableCounts,
        new_content: noRecordCounts,
        accuracy: noRecordAccuracy
      }
    ],
    metrics: {
      reviews: { source_record_days: 0, total: 0, average_per_source_record_day: null },
      new_content: { source_record_days: 1, total: 3, average_per_source_record_day: 3 },
      accuracy: { source_record_days: 2, average_percent: 94.25 }
    },
    derived_measures_labeled: true,
    source_coverage: {
      reviews: { status: "upstream_unavailable", first_record_date: null, last_record_date: null },
      new_content: newContentCoverage,
      accuracy: accuracyCoverage
    }
  });
});

test("get_review_schedule separates due reviews from the sorted forecast", async t => {
  const { result, routes } = await callTool(t, "get_review_schedule");

  assert.deepEqual(routes, reviewScheduleRoutes);
  assert.deepEqual(result.structuredContent, {
    source_timezone: "Asia/Kolkata",
    retrieved_at: "2026-08-12T12:00:00.000Z",
    due_now: { grammar: 5, vocabulary: 7, total: 12 },
    forecast: [
      { bucket: "later_today", date: "2026-08-12", grammar: 2, vocabulary: 1, total: 3 },
      { bucket: "tomorrow", date: "2026-08-13", grammar: 3, vocabulary: 5, total: 8 },
      { bucket: "date", date: "2026-08-14", grammar: 4, vocabulary: 6, total: 10 },
      { bucket: "date", date: "2026-08-15", grammar: 1, vocabulary: 0, total: 1 }
    ],
    forecast_is_projection: true
  });
});

test("get_review_schedule accepts 14 forecast buckets", async t => {
  const dates = forecastDates(12);
  const { result, routes } = await callTool(t, "get_review_schedule", {}, {
    [bunproRoutes.forecastDaily]: forecastBody(dates)
  });

  assert.deepEqual(routes, reviewScheduleRoutes);
  assert.deepEqual(result.structuredContent, {
    source_timezone: "Asia/Kolkata",
    retrieved_at: "2026-08-12T12:00:00.000Z",
    due_now: { grammar: 5, vocabulary: 7, total: 12 },
    forecast: [
      { bucket: "later_today", date: "2026-08-12", grammar: 1, vocabulary: 1, total: 2 },
      { bucket: "tomorrow", date: "2026-08-13", grammar: 1, vocabulary: 1, total: 2 },
      ...dates.map(date => ({ bucket: "date", date, grammar: 1, vocabulary: 1, total: 2 }))
    ],
    forecast_is_projection: true
  });
});

test("get_review_schedule rejects 15 forecast buckets", async t => {
  const { result, routes } = await callTool(t, "get_review_schedule", {}, {
    [bunproRoutes.forecastDaily]: forecastBody(forecastDates(13))
  });

  assert.deepEqual(routes, reviewScheduleRoutes);
  assertToolError(
    result,
    "BUNPRO_CONTRACT_CHANGED: Bunpro returned an unexpected daily forecast horizon."
  );
});

test("get_review_schedule rejects an invalid forecast date", async t => {
  const { result, routes } = await callTool(t, "get_review_schedule", {}, {
    [bunproRoutes.forecastDaily]: forecastBody(["2026-02-30"])
  });

  assert.deepEqual(routes, reviewScheduleRoutes);
  assertToolError(result, "BUNPRO_CONTRACT_CHANGED: Bunpro returned an invalid forecast date.");
});

test("list_study_decks joins active decks with their metadata and drops unrelated fields", async t => {
  const { result, routes } = await callTool(t, "list_study_decks", { active_only: true, limit: 20 });

  assert.deepEqual(routes, deckRoutes);
  assert.deepEqual(result.structuredContent, activeDeckOutput);
});

test("list_study_decks fails when a selected deck has no metadata", async t => {
  const { result, routes } = await callTool(t, "list_study_decks", { active_only: true, limit: 20 }, {
    [bunproRoutes.deckQueue]: deckQueueWithoutMetadata("101")
  });

  assert.deepEqual(routes, deckRoutes);
  assertToolError(
    result,
    "BUNPRO_CONTRACT_CHANGED: Bunpro returned study-deck configuration without matching deck metadata."
  );
});

test("list_study_decks ignores missing metadata on an unselected deck", async t => {
  const { result, routes } = await callTool(t, "list_study_decks", { active_only: true, limit: 20 }, {
    [bunproRoutes.deckQueue]: deckQueueWithoutMetadata("102")
  });

  assert.deepEqual(routes, deckRoutes);
  assert.deepEqual(result.structuredContent, activeDeckOutput);
});

test("get_recent_activity bounds the last-24-hours view and drops lesson content", async t => {
  const { result, routes } = await callTool(t, "get_recent_activity", {
    view: "last_24_hours",
    limit: 1
  });

  assert.deepEqual(routes, [bunproRoutes.user, bunproRoutes.last24Hours]);
  assert.deepEqual(result.structuredContent, {
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
      label: "Synthetic grammar 1"
    }],
    sessions: { count: 2, xp_delta: 25, buncoin_delta: 3 }
  });
});

test("get_recent_activity latest-attempts view has no sessions and labels by slug", async t => {
  const { result, routes } = await callTool(t, "get_recent_activity", {
    view: "latest_attempts",
    limit: 20
  });

  assert.deepEqual(routes, [bunproRoutes.user, bunproRoutes.lastDoneReviews]);
  assert.deepEqual(result.structuredContent, {
    source_timezone: "Asia/Kolkata",
    view: "latest_attempts",
    count: 1,
    total_available: 1,
    has_more: false,
    completeness: "latest_source_records_not_guaranteed_complete",
    attempts: [{
      attempt_id: "9",
      time: "2026-08-12T09:00:00.000Z",
      correct: false,
      content_type: "vocabulary",
      content_id: "209",
      label: "synthetic-word"
    }],
    sessions: null
  });
});

test("get_recent_activity leaves an in-progress session out of the session aggregates", async t => {
  const { result, routes } = await callTool(t, "get_recent_activity", {
    view: "last_24_hours",
    limit: 20
  }, {
    [bunproRoutes.last24Hours]: {
      history_objects: [],
      review_sessions: {
        data: [reviewSession(100, 110, 5, 7), reviewSession(110, null, 7, 8)]
      }
    }
  });

  assert.deepEqual(routes, [bunproRoutes.user, bunproRoutes.last24Hours]);
  assert.deepEqual(result.structuredContent, {
    source_timezone: "Asia/Kolkata",
    view: "last_24_hours",
    count: 0,
    total_available: 0,
    has_more: false,
    completeness: "upstream_rolling_window_not_guaranteed_complete",
    attempts: [],
    sessions: { count: 1, xp_delta: 10, buncoin_delta: 2 }
  });
});

test("get_learning_progress maps Bunpro levels to JLPT order and derives combined counts", async t => {
  const { result, routes } = await callTool(t, "get_learning_progress");

  assert.deepEqual(routes, learningProgressRoutes);
  assert.deepEqual(result.structuredContent, {
    retrieved_at: "2026-08-12T12:00:00.000Z",
    base: {
      days_studied: 30,
      grammar_studied: 120,
      vocabulary_studied: 50,
      current_streak: 7,
      weekly_streak: [{ day: "Mon", studied: true }, { day: "Tue", studied: false }]
    },
    jlpt_progress: [
      {
        jlpt_level: "N5",
        grammar: stages(1, 2, 3, 4, 5, 15),
        vocabulary: stages(10, 20, 30, 40, 50, 150),
        combined: { ...stages(11, 22, 33, 44, 55, 165), derived: true }
      },
      {
        jlpt_level: "N4",
        grammar: stages(2, 3, 4, 5, 6, 20),
        vocabulary: stages(11, 21, 31, 41, 51, 155),
        combined: { ...stages(13, 24, 35, 46, 57, 175), derived: true }
      },
      {
        jlpt_level: "N3",
        grammar: stages(3, 4, 5, 6, 7, 25),
        vocabulary: stages(12, 22, 32, 42, 52, 160),
        combined: { ...stages(15, 26, 37, 48, 59, 185), derived: true }
      },
      {
        jlpt_level: "N2",
        grammar: stages(4, 5, 6, 7, 8, 30),
        vocabulary: stages(13, 23, 33, 43, 53, 165),
        combined: { ...stages(17, 28, 39, 50, 61, 195), derived: true }
      },
      {
        jlpt_level: "N1",
        grammar: stages(5, 6, 7, 8, 9, 35),
        vocabulary: stages(14, 24, 34, 44, 54, 170),
        combined: { ...stages(19, 30, 41, 52, 63, 205), derived: true }
      }
    ],
    review_totals: [
      {
        jlpt_level: "N5",
        grammar: totals(80, 8, 2, 10),
        vocabulary: totals(90, 9, 1, 10),
        mixed: { ...totals(85, 17, 3, 20), source_supplied: true }
      },
      {
        jlpt_level: "N4",
        grammar: totals(75, 6, 2, 8),
        vocabulary: totals(60, 3, 2, 5),
        mixed: { ...totals(69.2, 9, 4, 13), source_supplied: true }
      },
      {
        jlpt_level: "N3",
        grammar: totals(50, 2, 2, 4),
        vocabulary: totals(25, 1, 3, 4),
        mixed: { ...totals(37.5, 3, 5, 8), source_supplied: true }
      },
      {
        jlpt_level: "N2",
        grammar: totals(100, 1, 0, 1),
        vocabulary: totals(100, 2, 0, 2),
        mixed: { ...totals(100, 3, 0, 3), source_supplied: true }
      },
      {
        jlpt_level: "N1",
        grammar: totals(0, 0, 0, 0),
        vocabulary: totals(0, 0, 0, 0),
        mixed: { ...totals(0, 0, 0, 0), source_supplied: true }
      }
    ],
    cram: {
      items: totals(75, 30, 10, 40),
      sessions: {
        average_time: "00:10:00",
        reviews_per_session: 20,
        session_count: 2,
        total_time: "00:20:00"
      }
    }
  });
});

test("get_learning_progress fails when a JLPT level is missing", async t => {
  const jlptProgress = wireBodies()[bunproRoutes.jlptProgress];
  delete jlptProgress.grammar["1"];

  const { result, routes } = await callTool(t, "get_learning_progress", {}, {
    [bunproRoutes.jlptProgress]: jlptProgress
  });

  assert.deepEqual(routes, learningProgressRoutes);
  assertToolError(result, "BUNPRO_CONTRACT_CHANGED: Bunpro returned unexpected JLPT level groups.");
});

test("the shared transport turns upstream failures into sanitized errors without a retry", async t => {
  const cases = [
    {
      name: "401",
      reply: new Response(`invalid token ${syntheticToken}`, { status: 401 }),
      expected: "BUNPRO_AUTH_FAILED: Bunpro rejected the Account API Token. Configure a current token from Bunpro Settings > API."
    },
    {
      name: "429",
      reply: new Response("synthetic throttle", { status: 429, headers: { "retry-after": "60" } }),
      expected: "BUNPRO_RATE_LIMITED: Bunpro rate-limited the request. Wait before trying again; the MCP will not retry automatically."
    },
    {
      name: "404",
      reply: new Response("synthetic removal", { status: 404 }),
      expected: "BUNPRO_CONTRACT_CHANGED: The Bunpro Frontend API route is unavailable. Bunpro may have changed or restricted its temporary route whitelist."
    },
    {
      name: "malformed JSON",
      reply: new Response("not-json", { status: 200 }),
      expected: "BUNPRO_CONTRACT_CHANGED: Bunpro accepted the Account API Token, but the API response was not valid JSON."
    }
  ];

  for (const item of cases) {
    await t.test(item.name, async st => {
      const { result, routes } = await callTool(st, "get_review_schedule", {}, {
        [bunproRoutes.due]: item.reply
      });

      assert.deepEqual(routes, [bunproRoutes.user, bunproRoutes.due]);
      assertToolError(result, item.expected);
    });
  }
});

test("get_connection_status has a deadline", { timeout: 1_000 }, async t => {
  const { result, routes } = await callTool(t, "get_connection_status", {}, {
    [bunproRoutes.user]: stalledBodyReply
  }, { operationTimeoutMs: 20 });

  assert.deepEqual(routes, [bunproRoutes.user]);
  assertToolError(
    result,
    "BUNPRO_UPSTREAM_UNAVAILABLE: Bunpro did not finish responding before the request timeout. Try again later."
  );
});

test("a Study Day past its deadline keeps what arrived and reports honest coverage", { timeout: 1_000 }, async t => {
  const { result, routes } = await callTool(t, "get_study_day_summary", { date: "2026-08-10" }, {
    [bunproRoutes.newContentHeatmap]: stalledBodyReply
  }, { operationTimeoutMs: 40 });

  assert.deepEqual(routes, [
    bunproRoutes.user,
    bunproRoutes.reviewHeatmap,
    bunproRoutes.newContentHeatmap
  ]);
  assert.equal(result.isError, undefined);
  const summary = result.structuredContent as Record<string, unknown>;
  assert.equal(summary.overall_query_status, "partial");
  assert.deepEqual(summary.reviews, reviewsAugust10);
  assert.deepEqual(summary.source_coverage, {
    reviews: reviewsCoverage,
    new_content: { status: "upstream_unavailable", first_record_date: null, last_record_date: null },
    accuracy: { status: "not_queried", first_record_date: null, last_record_date: null }
  });
});

test("the wire fixture fails a test whose source requests an unknown route", async () => {
  const hooks: Array<() => void> = [];
  const wire = createBunproWire({ after: hook => void hooks.push(hook as () => void) });

  await assert.rejects(
    wire.fetch("https://api.bunpro.jp/api/frontend/synthetic_unknown_route"),
    /No synthetic response/
  );

  assert.deepEqual(wire.routes(), ["/api/frontend/synthetic_unknown_route"]);
  assert.equal(hooks.length, 1);
  assert.throws(() => hooks[0]?.(), /no synthetic response/);
});

async function callTool(
  t: TestContext,
  name: string,
  args: Record<string, unknown> = {},
  overrides: WireOverrides = {},
  { clock = fixedClock, ...sourceOptions }: FrontendSourceOptions & { clock?: Date } = {}
) {
  const wire = createBunproWire(t, overrides);
  const server = createServer({
    sourceOperationFactory: createFrontendSourceOperationFactory(
      () => syntheticToken,
      wire.fetch,
      sourceOptions
    ),
    clock: () => clock
  });
  const client = new Client({ name: "wire-to-tool-test", version: "0.1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  t.after(async () => {
    await client.close();
    await server.close();
  });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const result = await client.callTool({ name, arguments: args });
  return { result, routes: wire.routes() };
}

function assertToolError(result: ToolResult, expected: string): void {
  assert.equal(result.isError, true);
  assert.equal(result.structuredContent, undefined);
  assert.deepEqual(result.content, [{ type: "text", text: expected }]);
}

function forecastDates(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `2026-08-${14 + index}`);
}

function forecastBody(dates: string[]) {
  const dated = Object.fromEntries(dates.map(date => [date, 1]));
  const buckets = { later: 1, tomorrow: 1, ...dated };
  return { grammar: buckets, vocab: buckets };
}

function deckQueueWithoutMetadata(deckId: string) {
  const deckQueue = wireBodies()[bunproRoutes.deckQueue];
  return {
    ...deckQueue,
    included: deckQueue.included.filter(deck => deck.id !== deckId)
  };
}

function stages(
  beginner: number,
  seasoned: number,
  adept: number,
  expert: number,
  master: number,
  totalCount: number
) {
  return { beginner, seasoned, adept, expert, master, total_count: totalCount };
}

function totals(accuracy: number, correct: number, incorrect: number, total: number) {
  return { accuracy, correct, incorrect, total };
}
