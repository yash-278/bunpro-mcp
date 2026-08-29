import { BunproError } from "./errors.js";
import type {
  DailyCountSeries,
  FrontendSource,
  SourceOutcome,
  StudyHistorySnapshot
} from "./frontend-source.js";
import type {
  StudyDayEvidence,
  StudyDayInput,
  StudyDaySummary,
  StudyRangeInput,
  StudyRangeSummary
} from "./schemas.js";

type SourceStatus = StudyDaySummary["source_coverage"]["reviews"]["status"];

const UNAVAILABLE_MEASURES = [
  "study duration for the requested day",
  "exact correct and incorrect counts for the requested day",
  "complete item-level history for an arbitrary historical day"
];

export async function getStudyDaySummary(
  source: Pick<FrontendSource, "getAccountContext" | "loadStudyHistory">,
  input: StudyDayInput,
  now: Date = new Date()
): Promise<StudyDaySummary> {
  assertValidCalendarDate(input.date);
  const operationSignal = AbortSignal.timeout(30_000);
  const accountContext = await source.getAccountContext(operationSignal);
  const currentDate = dateInTimeZone(now, accountContext.sourceTimezone);
  if (input.date > currentDate) {
    throw new BunproError("BUNPRO_CONTRACT_CHANGED", "Study Day cannot be in the future.");
  }
  const evidence = await loadEvidence(source, operationSignal);
  const day = buildDayEvidence(evidence, input.date, currentDate);

  return {
    ...day,
    source_timezone: evidence.accountContext.sourceTimezone,
    expected_timezone: input.expected_timezone ?? null,
    timezone_matches: input.expected_timezone === undefined
      ? null
      : input.expected_timezone === evidence.accountContext.sourceTimezone,
    overall_query_status: overallStatus(evidence),
    source_coverage: sourceCoverage(evidence),
    unavailable_measures: UNAVAILABLE_MEASURES
  };
}

export async function getStudyRangeSummary(
  source: Pick<FrontendSource, "getAccountContext" | "loadStudyHistory">,
  input: StudyRangeInput,
  now: Date = new Date()
): Promise<StudyRangeSummary> {
  const dates = inclusiveDates(input.start_date, input.end_date);
  if (dates.length > 93) {
    throw new BunproError("BUNPRO_CONTRACT_CHANGED", "Study ranges may include at most 93 calendar days.");
  }
  const operationSignal = AbortSignal.timeout(30_000);
  const accountContext = await source.getAccountContext(operationSignal);
  const currentDate = dateInTimeZone(now, accountContext.sourceTimezone);
  if (input.end_date > currentDate) {
    throw new BunproError("BUNPRO_CONTRACT_CHANGED", "Study range cannot end in the future.");
  }
  const evidence = await loadEvidence(source, operationSignal);
  const days = dates.map(date => buildDayEvidence(evidence, date, currentDate));
  const reviewDays = days.filter(day => day.reviews.coverage === "available");
  const newContentDays = days.filter(day => day.new_content.coverage === "available");
  const accuracyDays = days.filter(day => day.accuracy.coverage === "available" && day.accuracy.percent !== null);
  const accuracyTotal = accuracyDays.reduce((total, day) => total + (day.accuracy.percent ?? 0), 0);
  const activityChecked = evidence.reviews.status === "available" && evidence.newContent.status === "available";
  const accuracyChecked = evidence.accuracy.status === "available";

  return {
    requested_start_date: input.start_date,
    requested_end_date: input.end_date,
    source_timezone: evidence.accountContext.sourceTimezone,
    expected_timezone: input.expected_timezone ?? null,
    timezone_matches: input.expected_timezone === undefined
      ? null
      : input.expected_timezone === evidence.accountContext.sourceTimezone,
    overall_query_status: overallStatus(evidence),
    days,
    aggregates: {
      reviews: {
        source_record_days: reviewDays.length,
        source_total: reviewDays.reduce((total, day) => total + (day.reviews.source_total ?? 0), 0)
      },
      new_content: {
        source_record_days: newContentDays.length,
        source_total: newContentDays.reduce((total, day) => total + (day.new_content.source_total ?? 0), 0)
      },
      accuracy: {
        source_record_days: accuracyDays.length,
        average_percent: accuracyDays.length === 0 ? null : accuracyTotal / accuracyDays.length
      }
    },
    contiguous_checked_through: {
      activity: activityChecked ? input.end_date : null,
      accuracy: accuracyChecked ? input.end_date : null,
      all_sources: activityChecked && accuracyChecked ? input.end_date : null
    },
    source_coverage: sourceCoverage(evidence),
    unavailable_measures: UNAVAILABLE_MEASURES
  };
}

async function loadEvidence(
  source: Pick<FrontendSource, "loadStudyHistory">,
  operationSignal: AbortSignal
): Promise<StudyHistorySnapshot> {
  const evidence = await source.loadStudyHistory(operationSignal);
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

function countEvidence(payload: DailyCountSeries, date: string): StudyDaySummary["reviews"] {
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

function unavailableCountEvidence(): StudyDaySummary["reviews"] {
  return {
    coverage: "unavailable",
    grammar: null,
    vocabulary: null,
    source_total: null,
    component_sum: null,
    consistency: "not_comparable"
  };
}

function coverageForSource<T>(
  result: SourceOutcome<T>
): StudyDaySummary["source_coverage"]["reviews"] {
  if (result.status !== "available") {
    return { status: result.status as SourceStatus, first_record_date: null, last_record_date: null };
  }
  return coverageForMap(result.data);
}

function coverageForMap(payload: unknown): StudyDaySummary["source_coverage"]["reviews"] {
  const dates = collectIsoDates(payload);
  return {
    status: "available",
    first_record_date: dates[0] ?? null,
    last_record_date: dates.at(-1) ?? null
  };
}

function collectIsoDates(payload: unknown): string[] {
  if (!isRecord(payload)) return [];
  const candidates = Object.values(payload).every(value => isRecord(value))
    ? Object.values(payload).flatMap(value => Object.keys(value as Record<string, unknown>))
    : Object.keys(payload);
  return [...new Set(candidates.filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)))].sort();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertValidCalendarDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BunproError("BUNPRO_CONTRACT_CHANGED", "Use an ISO date in YYYY-MM-DD format.");
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new BunproError("BUNPRO_CONTRACT_CHANGED", "Study Day is not a valid calendar date.");
  }
}

function inclusiveDates(start: string, end: string): string[] {
  assertValidCalendarDate(start);
  assertValidCalendarDate(end);
  if (start > end) {
    throw new BunproError("BUNPRO_CONTRACT_CHANGED", "Study range start_date must not follow end_date.");
  }
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const endValue = new Date(`${end}T00:00:00Z`).valueOf();
  while (cursor.valueOf() <= endValue && dates.length <= 93) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (cursor.valueOf() <= endValue) dates.push(cursor.toISOString().slice(0, 10));
  return dates;
}

function dateInTimeZone(value: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(value);
}
