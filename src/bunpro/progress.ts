import type { ActivityTrend, LearningProgress, StudyRangeInput } from "./schemas.js";
import { getStudyRangeSummary, type StudySource } from "./study.js";
import type {
  FrontendSource,
  JlptLevel,
  ReviewAggregateFact,
  StageCountsFact
} from "./frontend-source.js";

const JLPT_LEVELS: readonly JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];

export async function getLearningProgress(
  source: Pick<FrontendSource, "loadLearningProgress">,
  now: Date = new Date()
): Promise<LearningProgress> {
  const operationSignal = AbortSignal.timeout(30_000);
  const progress = await source.loadLearningProgress(operationSignal);

  return {
    retrieved_at: now.toISOString(),
    base: {
      days_studied: progress.base.daysStudied,
      grammar_studied: progress.base.grammarStudied,
      vocabulary_studied: progress.base.vocabularyStudied,
      current_streak: progress.base.currentStreak,
      weekly_streak: progress.base.weeklyStreak
    },
    jlpt_progress: JLPT_LEVELS.map(jlptLevel => {
      const grammar = progress.jlptProgress.grammar[jlptLevel];
      const vocabulary = progress.jlptProgress.vocabulary[jlptLevel];
      return {
        jlpt_level: jlptLevel,
        grammar: stageCounts(grammar),
        vocabulary: stageCounts(vocabulary),
        combined: {
          ...addStageCounts(grammar, vocabulary),
          derived: true as const
        }
      };
    }),
    review_totals: JLPT_LEVELS.map(jlptLevel => ({
      jlpt_level: jlptLevel,
      grammar: reviewAggregate(progress.reviewTotals.grammar[jlptLevel]),
      vocabulary: reviewAggregate(progress.reviewTotals.vocabulary[jlptLevel]),
      mixed: {
        ...reviewAggregate(progress.reviewTotals.mixed[jlptLevel]),
        source_supplied: true as const
      }
    })),
    cram: {
      items: reviewAggregate(progress.cram.items),
      sessions: {
        average_time: progress.cram.sessions.averageTime,
        reviews_per_session: progress.cram.sessions.reviewsPerSession,
        session_count: progress.cram.sessions.sessionCount,
        total_time: progress.cram.sessions.totalTime
      }
    }
  };
}

export async function getActivityTrend(
  source: StudySource,
  input: StudyRangeInput,
  now: Date = new Date()
): Promise<ActivityTrend> {
  const range = await getStudyRangeSummary(source, input, now);
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

function stageCounts(value: StageCountsFact) {
  return {
    beginner: value.beginner,
    seasoned: value.seasoned,
    adept: value.adept,
    expert: value.expert,
    master: value.master,
    total_count: value.totalCount
  };
}

function addStageCounts(
  left: StageCountsFact,
  right: StageCountsFact
) {
  return {
    beginner: left.beginner + right.beginner,
    seasoned: left.seasoned + right.seasoned,
    adept: left.adept + right.adept,
    expert: left.expert + right.expert,
    master: left.master + right.master,
    total_count: left.totalCount + right.totalCount
  };
}

function reviewAggregate(value: ReviewAggregateFact) {
  return {
    accuracy: value.accuracy,
    correct: value.correct,
    incorrect: value.incorrect,
    total: value.total
  };
}
