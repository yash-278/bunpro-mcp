import assert from "node:assert/strict";
import test from "node:test";
import { BunproError } from "../src/bunpro/errors.js";
import type {
  AccountContext,
  FrontendSource,
  StudyHistorySnapshot
} from "../src/bunpro/frontend-source.js";
import { StudyEvidenceService } from "../src/bunpro/study.js";

const accountContext: AccountContext = {
  sourceTimezone: "Asia/Kolkata",
  tokenSource: "environment"
};
const studyHistory: StudyHistorySnapshot = {
  accountContext,
  reviews: {
    status: "available",
    data: {
      grammar: { "2026-08-10": 3, "2026-08-11": 4 },
      vocabulary: { "2026-08-10": 2 },
      mixed: { "2026-08-10": 6, "2026-08-11": 4 }
    }
  },
  newContent: {
    status: "available",
    data: {
      grammar: { "2026-08-10": 1 },
      vocabulary: { "2026-08-10": 2 },
      mixed: { "2026-08-10": 3 }
    }
  },
  accuracy: { status: "available", data: { "2026-08-10": 88.5 } }
};
const clock = new Date("2026-08-12T12:00:00.000Z");

test("study services reject invalid and oversized ranges before reading the source", async () => {
  const source = new RecordingStudySource(studyHistory);
  const service = studyService(source);

  await assert.rejects(
    service.getDay({ date: "2026-02-30" }),
    /valid calendar date/i
  );
  await assert.rejects(
    service.getRange({ start_date: "2026-08-10", end_date: "2026-08-09" }),
    /must not follow/i
  );
  await assert.rejects(
    service.getRange({ start_date: "2026-01-01", end_date: "2026-04-04" }),
    /at most 93/i
  );
  assert.deepEqual(source.events, []);
});

test("an all-source rate limit preserves Study Day failure precedence", async () => {
  const source = new RecordingStudySource({
    accountContext,
    reviews: { status: "rate_limited" },
    newContent: { status: "not_queried" },
    accuracy: { status: "not_queried" }
  });
  const service = studyService(source);

  await assert.rejects(
    service.getDay({ date: "2026-08-10" }),
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_RATE_LIMITED"
  );
  assert.deepEqual(source.events, ["account", "history"]);
});

test("future Study Days stop after reading only Account Context", async () => {
  const source = new RecordingStudySource(studyHistory);
  const service = studyService(source);

  await assert.rejects(
    service.getDay({ date: "2999-01-01" }),
    /cannot be in the future/i
  );
  assert.deepEqual(source.events, ["account"]);
});

test("Study Day preserves zero counts, missing components, explicit null accuracy, and timezone today", async () => {
  const source = new RecordingStudySource({
    accountContext,
    reviews: {
      status: "available",
      data: {
        grammar: {},
        vocabulary: { "2026-08-12": 0 },
        mixed: { "2026-08-12": 0 }
      }
    },
    newContent: {
      status: "available",
      data: { grammar: {}, vocabulary: {}, mixed: {} }
    },
    accuracy: { status: "available", data: { "2026-08-12": null } }
  });
  const service = new StudyEvidenceService(
    () => source as unknown as FrontendSource,
    () => new Date("2026-08-11T18:45:00.000Z")
  );

  const output = await service.getDay({ date: "2026-08-12" });

  assert.equal(output.in_progress, true);
  assert.deepEqual(output.reviews, {
    coverage: "available",
    grammar: null,
    vocabulary: 0,
    source_total: 0,
    component_sum: null,
    consistency: "not_comparable"
  });
  assert.deepEqual(output.accuracy, { coverage: "available", percent: null });
});

test("Study Period accepts 93 days and rejects 94 before creating a source operation", async () => {
  let operations = 0;
  const service = new StudyEvidenceService(
    () => {
      operations += 1;
      return new RecordingStudySource(studyHistory) as unknown as FrontendSource;
    },
    () => clock
  );

  const accepted = await service.getRange({
    start_date: "2026-01-01",
    end_date: "2026-04-03"
  });
  assert.equal(accepted.days.length, 93);
  assert.equal(operations, 1);

  await assert.rejects(
    service.getRange({ start_date: "2026-01-01", end_date: "2026-04-04" }),
    /at most 93/i
  );
  assert.equal(operations, 1);
});

function studyService(
  source: Pick<FrontendSource, "getAccountContext" | "loadStudyHistory">
): StudyEvidenceService {
  return new StudyEvidenceService(() => source as FrontendSource, () => clock);
}

class RecordingStudySource implements Pick<FrontendSource, "getAccountContext" | "loadStudyHistory"> {
  readonly events: string[] = [];
  readonly #history: StudyHistorySnapshot;

  constructor(history: StudyHistorySnapshot) {
    this.#history = history;
  }

  async getAccountContext(): Promise<AccountContext> {
    this.events.push("account");
    return this.#history.accountContext;
  }

  async loadStudyHistory(): Promise<StudyHistorySnapshot> {
    this.events.push("history");
    return this.#history;
  }
}
