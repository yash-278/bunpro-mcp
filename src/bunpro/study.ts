import { BunproError } from "./errors.js";
import type {
  DailyCountSeries,
  FrontendSource,
  SourceOutcome,
  StudyHistorySnapshot
} from "./frontend-source.js";
import type {
  ActivityTrend,
  DailyCountEvidence,
  StudyDayEvidence,
  StudyDayInput,
  StudyDaySummary,
  StudyRangeInput,
  StudyRangeSummary
} from "./schemas.js";
import {
  expandStudyPeriod,
  rejectFutureStudyPeriod,
  todayInTimeZone
} from "./study-period.js";

type SourceStatus = StudyDaySummary["source_coverage"]["reviews"]["status"];
type SourceRecords = DailyCountSeries | Record<string, number | null>;
type CountAggregate = StudyRangeSummary["aggregates"]["reviews"];
type StudyHistoryReader = Pick<FrontendSource, "getAccountContext" | "loadStudyHistory">;

interface StudyPeriodEvidence {
  readonly requestedStartDate: string;
  readonly requestedEndDate: string;
  readonly sourceTimezone: string;
  readonly expectedTimezone: string | null;
  readonly timezoneMatches: boolean | null;
  readonly overallQueryStatus: StudyRangeSummary["overall_query_status"];
  readonly days: readonly StudyDayEvidence[];
  readonly aggregates: StudyRangeSummary["aggregates"];
  readonly contiguousCheckedThrough: StudyRangeSummary["contiguous_checked_through"];
  readonly sourceCoverage: StudyRangeSummary["source_coverage"];
  readonly unavailableMeasures: readonly string[];
}

const UNAVAILABLE_MEASURES = [
  "study duration for the requested day",
  "exact correct and incorrect counts for the requested day",
  "complete item-level history for an arbitrary historical day"
];

export async function getStudyDaySummary(
  source: StudyHistoryReader,
  input: StudyDayInput,
  now: Date
): Promise<StudyDaySummary> {
  const period = await analyzePeriod(source, {
    start_date: input.date,
    end_date: input.date,
    ...(input.expected_timezone === undefined
      ? {}
      : { expected_timezone: input.expected_timezone })
  }, now);
  const day = period.days[0];
  if (!day) {
    throw new BunproError("BUNPRO_CONTRACT_CHANGED", "Study Day analysis returned no calendar day.");
  }
  return {
    ...day,
    source_timezone: period.sourceTimezone,
    expected_timezone: period.expectedTimezone,
    timezone_matches: period.timezoneMatches,
    overall_query_status: period.overallQueryStatus,
    source_coverage: period.sourceCoverage,
    unavailable_measures: [...period.unavailableMeasures]
  };
}

export async function getStudyRangeSummary(
  source: StudyHistoryReader,
  input: StudyRangeInput,
  now: Date
): Promise<StudyRangeSummary> {
  const period = await analyzePeriod(source, input, now);
  return projectRange(period);
}

export async function getActivityTrend(
  source: StudyHistoryReader,
  input: StudyRangeInput,
  now: Date
): Promise<ActivityTrend> {
  const period = await analyzePeriod(source, input, now);
  return {
    requested_start_date: period.requestedStartDate,
    requested_end_date: period.requestedEndDate,
    source_timezone: period.sourceTimezone,
    expected_timezone: period.expectedTimezone,
    timezone_matches: period.timezoneMatches,
    overall_query_status: period.overallQueryStatus,
    days: [...period.days],
    metrics: {
      reviews: countMetric(period.aggregates.reviews),
      new_content: countMetric(period.aggregates.new_content),
      accuracy: {
        source_record_days: period.aggregates.accuracy.source_record_days,
        average_percent: period.aggregates.accuracy.average_percent
      }
    },
    derived_measures_labeled: true,
    source_coverage: period.sourceCoverage
  };
}

async function analyzePeriod(
  source: StudyHistoryReader,
  input: StudyRangeInput,
  now: Date
): Promise<StudyPeriodEvidence> {
  const dates = expandStudyPeriod(input.start_date, input.end_date);
  const accountContext = await source.getAccountContext();
  const currentDate = todayInTimeZone(now, accountContext.sourceTimezone);
  rejectFutureStudyPeriod(input.end_date, currentDate);
  const evidence = await loadEvidence(source);
  const days = dates.map(date => buildDayEvidence(evidence, date, currentDate));
  const accuracyDays = days.filter(
    day => day.accuracy.coverage === "available" && day.accuracy.percent !== null
  );
  const accuracyTotal = accuracyDays.reduce(
    (total, day) => total + (day.accuracy.percent ?? 0),
    0
  );
  const activityChecked = evidence.reviews.status === "available"
    && evidence.newContent.status === "available";
  const accuracyChecked = evidence.accuracy.status === "available";

  return {
    requestedStartDate: input.start_date,
    requestedEndDate: input.end_date,
    sourceTimezone: evidence.accountContext.sourceTimezone,
    expectedTimezone: input.expected_timezone ?? null,
    timezoneMatches: input.expected_timezone === undefined
      ? null
      : input.expected_timezone === evidence.accountContext.sourceTimezone,
    overallQueryStatus: overallStatus(evidence),
    days,
    aggregates: {
      reviews: countAggregate(evidence.reviews, days.map(day => day.reviews)),
      new_content: countAggregate(evidence.newContent, days.map(day => day.new_content)),
      accuracy: {
        source_record_days: accuracyChecked ? accuracyDays.length : null,
        average_percent: accuracyDays.length === 0 ? null : accuracyTotal / accuracyDays.length
      }
    },
    contiguousCheckedThrough: {
      activity: activityChecked ? input.end_date : null,
      accuracy: accuracyChecked ? input.end_date : null,
      all_sources: activityChecked && accuracyChecked ? input.end_date : null
    },
    sourceCoverage: sourceCoverage(evidence),
    unavailableMeasures: UNAVAILABLE_MEASURES
  };
}

function projectRange(period: StudyPeriodEvidence): StudyRangeSummary {
  return {
    requested_start_date: period.requestedStartDate,
    requested_end_date: period.requestedEndDate,
    source_timezone: period.sourceTimezone,
    expected_timezone: period.expectedTimezone,
    timezone_matches: period.timezoneMatches,
    overall_query_status: period.overallQueryStatus,
    days: [...period.days],
    aggregates: period.aggregates,
    contiguous_checked_through: period.contiguousCheckedThrough,
    source_coverage: period.sourceCoverage,
    unavailable_measures: [...period.unavailableMeasures]
  };
}

async function loadEvidence(source: StudyHistoryReader): Promise<StudyHistorySnapshot> {
  const evidence = await source.loadStudyHistory();
  const outcomes = [evidence.reviews, evidence.newContent, evidence.accuracy];
  if (!outcomes.some(result => result.status === "available")) {
    if (outcomes.some(result => result.status === "rate_limited")) {
      throw new BunproError(
        "BUNPRO_RATE_LIMITED",
        "Bunpro rate-limited the Study Day request. Wait before trying again."
      );
    }
    if (outcomes.every(result => result.status === "contract_changed" || result.status === "not_queried")) {
      throw new BunproError(
        "BUNPRO_CONTRACT_CHANGED",
        "Bunpro authentication succeeded, but the Study Day source contracts are unavailable."
      );
    }
    throw new BunproError(
      "BUNPRO_UPSTREAM_UNAVAILABLE",
      "Bunpro authentication succeeded, but no requested Study Day source was available."
    );
  }
  return evidence;
}

function buildDayEvidence(
  evidence: StudyHistorySnapshot,
  date: string,
  currentDate: string
): StudyDayEvidence {
  const reviews = evidence.reviews.status === "available"
    ? countEvidence(evidence.reviews.data, date)
    : unavailableCountEvidence();
  const newContent = evidence.newContent.status === "available"
    ? countEvidence(evidence.newContent.data, date)
    : unavailableCountEvidence();
  const activityRecorded = reviews.coverage === "available" || newContent.coverage === "available";
  const activitySourcesAvailable = evidence.reviews.status === "available"
    && evidence.newContent.status === "available";
  return {
    study_day: date,
    in_progress: date === currentDate,
    activity_evidence: activityRecorded
      ? "recorded"
      : activitySourcesAvailable ? "no_source_record" : "unavailable",
    reviews,
    new_content: newContent,
    accuracy: evidence.accuracy.status !== "available"
      ? { coverage: "unavailable", percent: null }
      : Object.hasOwn(evidence.accuracy.data, date)
        ? { coverage: "available", percent: evidence.accuracy.data[date] ?? null }
        : { coverage: "no_source_record", percent: null }
  };
}

function countAggregate(
  source: SourceOutcome<DailyCountSeries>,
  days: readonly DailyCountEvidence[]
): CountAggregate {
  if (source.status !== "available") {
    return { source_record_days: null, source_total: null };
  }
  const recordedDays = days.filter(day => day.coverage === "available");
  if (recordedDays.length === 0) {
    return { source_record_days: 0, source_total: null };
  }
  return {
    source_record_days: recordedDays.length,
    source_total: recordedDays.reduce((total, day) => total + (day.source_total ?? 0), 0)
  };
}

function countMetric(aggregate: CountAggregate): ActivityTrend["metrics"]["reviews"] {
  const { source_record_days: recordDays, source_total: total } = aggregate;
  return {
    source_record_days: recordDays,
    total,
    average_per_source_record_day: !recordDays || total === null ? null : total / recordDays
  };
}

function overallStatus(evidence: StudyHistorySnapshot): StudyDaySummary["overall_query_status"] {
  return [evidence.reviews, evidence.newContent, evidence.accuracy].every(
    result => result.status === "available"
  ) ? "complete" : "partial";
}

function sourceCoverage(evidence: StudyHistorySnapshot): StudyDaySummary["source_coverage"] {
  return {
    reviews: coverageForSource(evidence.reviews),
    new_content: coverageForSource(evidence.newContent),
    accuracy: coverageForSource(evidence.accuracy)
  };
}

function countEvidence(payload: DailyCountSeries, date: string): DailyCountEvidence {
  if (!Object.hasOwn(payload.mixed, date)) {
    return {
      coverage: "no_source_record",
      grammar: null,
      vocabulary: null,
      source_total: null,
      component_sum: null,
      consistency: "not_comparable"
    };
  }
  const grammar = payload.grammar[date] ?? null;
  const vocabulary = payload.vocabulary[date] ?? null;
  const sourceTotal = payload.mixed[date] ?? 0;
  const componentSum = grammar === null || vocabulary === null ? null : grammar + vocabulary;
  return {
    coverage: "available",
    grammar,
    vocabulary,
    source_total: sourceTotal,
    component_sum: componentSum,
    consistency: componentSum === null
      ? "not_comparable"
      : sourceTotal === componentSum ? "match" : "mismatch"
  };
}

function unavailableCountEvidence(): DailyCountEvidence {
  return {
    coverage: "unavailable",
    grammar: null,
    vocabulary: null,
    source_total: null,
    component_sum: null,
    consistency: "not_comparable"
  };
}

function coverageForSource(
  result: SourceOutcome<SourceRecords>
): StudyDaySummary["source_coverage"]["reviews"] {
  if (result.status !== "available") {
    return { status: result.status as SourceStatus, first_record_date: null, last_record_date: null };
  }
  return coverageForMap(result.data);
}

function coverageForMap(payload: SourceRecords): StudyDaySummary["source_coverage"]["reviews"] {
  const dates = collectIsoDates(payload);
  return {
    status: "available",
    first_record_date: dates[0] ?? null,
    last_record_date: dates.at(-1) ?? null
  };
}

function collectIsoDates(payload: SourceRecords): string[] {
  const dates = Object.entries(payload).flatMap(([key, value]) =>
    typeof value === "object" && value !== null ? Object.keys(value) : [key]
  );
  return [...new Set(dates)].sort();
}
