import assert from "node:assert/strict";
import test from "node:test";
import { BunproError } from "../src/bunpro/errors.js";
import {
  expandStudyPeriod,
  isIsoCalendarDate,
  nextDay,
  rejectFutureStudyPeriod,
  todayInTimeZone
} from "../src/bunpro/study-period.js";

test("a date must exist on the calendar in YYYY-MM-DD format", () => {
  assert.equal(isIsoCalendarDate("2026-08-12"), true);
  assert.equal(isIsoCalendarDate("2024-02-29"), true);
  assert.equal(isIsoCalendarDate("2026-02-29"), false);
  assert.equal(isIsoCalendarDate("2026-02-30"), false);
  assert.equal(isIsoCalendarDate("2026-13-01"), false);
  assert.equal(isIsoCalendarDate("2026-8-12"), false);
  assert.equal(isIsoCalendarDate("later"), false);
});

test("the next day crosses month, year, and leap-day boundaries", () => {
  assert.equal(nextDay("2026-08-12"), "2026-08-13");
  assert.equal(nextDay("2026-08-31"), "2026-09-01");
  assert.equal(nextDay("2026-12-31"), "2027-01-01");
  assert.equal(nextDay("2024-02-28"), "2024-02-29");
  assert.equal(nextDay("2026-02-28"), "2026-03-01");
});

test("a Study Period expands into each inclusive Study Day", () => {
  assert.deepEqual(expandStudyPeriod("2026-08-12", "2026-08-12"), ["2026-08-12"]);
  assert.deepEqual(expandStudyPeriod("2026-02-27", "2026-03-02"), [
    "2026-02-27",
    "2026-02-28",
    "2026-03-01",
    "2026-03-02"
  ]);
});

test("a Study Period rejects an invalid calendar date at either end", () => {
  const expected = invalidInput("Study Day is not a valid calendar date.");

  assert.throws(() => expandStudyPeriod("2026-02-30", "2026-03-01"), expected);
  assert.throws(() => expandStudyPeriod("2026-02-01", "2026-02-30"), expected);
});

test("a Study Period rejects a start date that follows the end date", () => {
  assert.throws(
    () => expandStudyPeriod("2026-08-10", "2026-08-09"),
    invalidInput("Study Period start_date must not follow end_date.")
  );
});

test("a Study Period accepts 93 days and rejects 94", () => {
  const days = expandStudyPeriod("2026-01-01", "2026-04-03");

  assert.equal(days.length, 93);
  assert.equal(days[0], "2026-01-01");
  assert.equal(days.at(-1), "2026-04-03");
  assert.throws(
    () => expandStudyPeriod("2026-01-01", "2026-04-04"),
    invalidInput("A Study Period may include at most 93 Study Days.")
  );
});

test("today follows the named timezone across the UTC date line", () => {
  const instant = new Date("2026-08-11T18:45:00.000Z");

  assert.equal(todayInTimeZone(instant, "Asia/Kolkata"), "2026-08-12");
  assert.equal(todayInTimeZone(instant, "America/New_York"), "2026-08-11");
});

test("a Study Period may end today but not after it", () => {
  assert.doesNotThrow(() => rejectFutureStudyPeriod("2026-08-12", "2026-08-12"));
  assert.throws(
    () => rejectFutureStudyPeriod("2026-08-13", "2026-08-12"),
    invalidInput("Study Period cannot end in the future.")
  );
});

function invalidInput(message: string) {
  return (error: unknown) => {
    assert.ok(error instanceof BunproError);
    assert.equal(error.code, "BUNPRO_INVALID_INPUT");
    assert.equal(error.message, message);
    return true;
  };
}
