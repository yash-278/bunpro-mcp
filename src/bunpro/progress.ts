import * as z from "zod/v4";
import { BunproError } from "./errors.js";
import type { ActivityTrend, LearningProgress, StudyRangeInput } from "./schemas.js";
import { getStudyRangeSummary, type StudySource } from "./study.js";

const BASE_STATS_ROUTE = "/api/frontend/user_stats/base_stats";
const JLPT_PROGRESS_ROUTE = "/api/frontend/user_stats/jlpt_progress_mixed";
const TOTAL_REVIEW_STATS_ROUTE = "/api/frontend/user_stats/total_review_stats";
const TOTAL_CRAM_STATS_ROUTE = "/api/frontend/user_stats/total_cram_stats";
const JLPT_KEYS = ["5", "4", "3", "2", "1"] as const;

const StageCountsSchema = z.object({
  beginner: z.number().int().nonnegative(),
  seasoned: z.number().int().nonnegative(),
  adept: z.number().int().nonnegative(),
  expert: z.number().int().nonnegative(),
  master: z.number().int().nonnegative(),
  total_count: z.number().int().nonnegative()
}).loose();
const ReviewAggregateSourceSchema = z.object({
  accuracy: z.number().min(0).max(100),
  correct: z.number().int().nonnegative(),
  incorrect: z.number().int().nonnegative(),
  total: z.number().int().nonnegative()
}).loose();
const BaseStatsSchema = z.object({
  facts: z.object({
    days_studied: z.number().int().nonnegative(),
    grammar_studied: z.number().int().nonnegative(),
    vocab_studied: z.number().int().nonnegative(),
    streak: z.number().int().nonnegative(),
    weekly_streak: z.array(z.object({ day: z.string(), val: z.boolean() }).loose()).max(7)
  }).loose()
}).loose();
const JlptProgressSchema = z.object({
  grammar: z.record(z.string(), StageCountsSchema),
  vocab: z.record(z.string(), StageCountsSchema)
});
const TotalReviewStatsSchema = z.object({
  grammar: z.record(z.string(), ReviewAggregateSourceSchema),
  vocab: z.record(z.string(), ReviewAggregateSourceSchema),
  mixed: z.record(z.string(), ReviewAggregateSourceSchema)
});
const TotalCramStatsSchema = z.object({
  items: ReviewAggregateSourceSchema,
  sessions: z.object({
    average_time: z.string(),
    reviews_per_session: z.number().int().nonnegative(),
    session_count: z.number().int().nonnegative(),
    total_time: z.string()
  }).loose()
});

export async function getLearningProgress(
  source: StudySource,
  now: Date = new Date()
): Promise<LearningProgress> {
  const operationSignal = AbortSignal.timeout(30_000);
  await source.checkConnection(operationSignal);
  const base = parse(
    BaseStatsSchema,
    await source.getFrontendJson(BASE_STATS_ROUTE, operationSignal),
    "base statistics"
  );
  const jlpt = parse(
    JlptProgressSchema,
    await source.getFrontendJson(JLPT_PROGRESS_ROUTE, operationSignal),
    "JLPT progress"
  );
  const reviews = parse(
    TotalReviewStatsSchema,
    await source.getFrontendJson(TOTAL_REVIEW_STATS_ROUTE, operationSignal),
    "total review statistics"
  );
  const cram = parse(
    TotalCramStatsSchema,
    await source.getFrontendJson(TOTAL_CRAM_STATS_ROUTE, operationSignal),
    "total cram statistics"
  );
  assertJlptKeys(jlpt.grammar, jlpt.vocab, reviews.grammar, reviews.vocab, reviews.mixed);

  return {
    retrieved_at: now.toISOString(),
    base: {
      days_studied: base.facts.days_studied,
      grammar_studied: base.facts.grammar_studied,
      vocabulary_studied: base.facts.vocab_studied,
      current_streak: base.facts.streak,
      weekly_streak: base.facts.weekly_streak.map(day => ({ day: day.day, studied: day.val }))
    },
    jlpt_progress: JLPT_KEYS.map(key => {
      const grammar = requiredLevel(jlpt.grammar, key);
      const vocabulary = requiredLevel(jlpt.vocab, key);
      return {
        jlpt_level: `N${key}` as "N5" | "N4" | "N3" | "N2" | "N1",
        grammar: stageCounts(grammar),
        vocabulary: stageCounts(vocabulary),
        combined: {
          ...addStageCounts(grammar, vocabulary),
          derived: true as const
        }
      };
    }),
    review_totals: JLPT_KEYS.map(key => ({
      jlpt_level: `N${key}` as "N5" | "N4" | "N3" | "N2" | "N1",
      grammar: reviewAggregate(requiredLevel(reviews.grammar, key)),
      vocabulary: reviewAggregate(requiredLevel(reviews.vocab, key)),
      mixed: {
        ...reviewAggregate(requiredLevel(reviews.mixed, key)),
        source_supplied: true as const
      }
    })),
    cram: {
      items: reviewAggregate(cram.items),
      sessions: {
        average_time: cram.sessions.average_time,
        reviews_per_session: cram.sessions.reviews_per_session,
        session_count: cram.sessions.session_count,
        total_time: cram.sessions.total_time
      }
    }
  };
}

export async function getActivityTrend(
  source: StudySource,
  input: StudyRangeInput
): Promise<ActivityTrend> {
  const range = await getStudyRangeSummary(source, input);
  const reviewCount = range.aggregates.reviews.source_record_days;
  const newContentCount = range.aggregates.new_content.source_record_days;
  return {
    requested_start_date: range.requested_start_date,
    requested_end_date: range.requested_end_date,
    source_timezone: range.source_timezone,
    expected_timezone: range.expected_timezone,
    timezone_matches: range.timezone_matches,
    overall_query_status: range.overall_query_status,
    days: range.days,
    metrics: {
      reviews: {
        source_record_days: reviewCount,
        total: range.aggregates.reviews.source_total,
        average_per_source_record_day: reviewCount === 0
          ? null
          : range.aggregates.reviews.source_total / reviewCount
      },
      new_content: {
        source_record_days: newContentCount,
        total: range.aggregates.new_content.source_total,
        average_per_source_record_day: newContentCount === 0
          ? null
          : range.aggregates.new_content.source_total / newContentCount
      },
      accuracy: {
        source_record_days: range.aggregates.accuracy.source_record_days,
        average_percent: range.aggregates.accuracy.average_percent
      }
    },
    derived_measures_labeled: true,
    source_coverage: range.source_coverage
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

function assertJlptKeys(...groups: Array<Record<string, unknown>>): void {
  if (groups.some(group => Object.keys(group).sort().join(",") !== "1,2,3,4,5")) {
    throw new BunproError("BUNPRO_CONTRACT_CHANGED", "Bunpro returned unexpected JLPT level groups.");
  }
}

function requiredLevel<T>(group: Record<string, T>, key: string): T {
  const value = group[key];
  if (value === undefined) {
    throw new BunproError("BUNPRO_CONTRACT_CHANGED", "Bunpro omitted a required JLPT level.");
  }
  return value;
}

function stageCounts(value: z.infer<typeof StageCountsSchema>) {
  return {
    beginner: value.beginner,
    seasoned: value.seasoned,
    adept: value.adept,
    expert: value.expert,
    master: value.master,
    total_count: value.total_count
  };
}

function addStageCounts(
  left: z.infer<typeof StageCountsSchema>,
  right: z.infer<typeof StageCountsSchema>
) {
  return {
    beginner: left.beginner + right.beginner,
    seasoned: left.seasoned + right.seasoned,
    adept: left.adept + right.adept,
    expert: left.expert + right.expert,
    master: left.master + right.master,
    total_count: left.total_count + right.total_count
  };
}

function reviewAggregate(value: z.infer<typeof ReviewAggregateSourceSchema>) {
  return {
    accuracy: value.accuracy,
    correct: value.correct,
    incorrect: value.incorrect,
    total: value.total
  };
}
