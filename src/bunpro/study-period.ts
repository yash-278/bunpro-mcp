import { BunproError } from "./errors.js";

export const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_STUDY_PERIOD_DAYS = 93;

export function isIsoCalendarDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function nextDay(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export function expandStudyPeriod(startDate: string, endDate: string): string[] {
  if (!isIsoCalendarDate(startDate) || !isIsoCalendarDate(endDate)) {
    throw invalidInput("Study Day is not a valid calendar date.");
  }
  if (startDate > endDate) {
    throw invalidInput("Study Period start_date must not follow end_date.");
  }
  const days = [startDate];
  let day = startDate;
  while (day !== endDate) {
    if (days.length === MAX_STUDY_PERIOD_DAYS) {
      throw invalidInput(`A Study Period may include at most ${MAX_STUDY_PERIOD_DAYS} Study Days.`);
    }
    day = nextDay(day);
    days.push(day);
  }
  return days;
}

export function rejectFutureStudyPeriod(endDate: string, today: string): void {
  if (endDate > today) throw invalidInput("Study Period cannot end in the future.");
}

export function todayInTimeZone(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

function invalidInput(message: string): BunproError {
  return new BunproError("BUNPRO_INVALID_INPUT", message);
}
