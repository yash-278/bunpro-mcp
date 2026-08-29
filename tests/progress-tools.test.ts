import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryFrontendSource } from "../src/bunpro/in-memory-frontend-source.js";
import { getLearningProgress } from "../src/bunpro/progress.js";
import { StudyEvidenceService } from "../src/bunpro/study.js";

test("get_learning_progress derives the public JLPT view from normalized facts", async () => {
  const jlptLevels = ["N5", "N4", "N3", "N2", "N1"] as const;
  const levelFacts = Object.fromEntries(jlptLevels.map((level, index) => [level, {
    beginner: index + 6,
    adept: index + 7,
    seasoned: index + 8,
    expert: index + 9,
    master: index + 10,
    totalCount: index + 25
  }])) as Record<(typeof jlptLevels)[number], StageCounts>;
  const totals = Object.fromEntries(jlptLevels.map((level, index) => [level, {
    accuracy: 81 + index,
    correct: 9 + index,
    incorrect: 2,
    total: 11 + index
  }])) as Record<(typeof jlptLevels)[number], ReviewStats>;
  const source = new InMemoryFrontendSource({
    accountContext: { sourceTimezone: "Asia/Kolkata", tokenSource: "environment" },
    learningProgress: {
      base: {
        daysStudied: 30,
        grammarStudied: 120,
        vocabularyStudied: 50,
        currentStreak: 7,
        weeklyStreak: [{ day: "Mon", studied: true }, { day: "Tue", studied: false }]
      },
      jlptProgress: { grammar: levelFacts, vocabulary: levelFacts },
      reviewTotals: { grammar: totals, vocabulary: totals, mixed: totals },
      cram: {
        items: { accuracy: 75, correct: 30, incorrect: 10, total: 40 },
        sessions: {
          averageTime: "00:10:00",
          reviewsPerSession: 20,
          sessionCount: 2,
          totalTime: "00:20:00"
        }
      }
    }
  });

  const output = await getLearningProgress(source, new Date("2026-08-12T12:00:00.000Z"));

  assert.deepEqual(output.base, {
    days_studied: 30,
    grammar_studied: 120,
    vocabulary_studied: 50,
    current_streak: 7,
    weekly_streak: [{ day: "Mon", studied: true }, { day: "Tue", studied: false }]
  });
  assert.deepEqual(output.jlpt_progress.map(item => item.jlpt_level), jlptLevels);
  assert.equal(output.jlpt_progress[0]?.combined.derived, true);
  assert.equal(output.jlpt_progress[0]?.combined.beginner, 12);
  assert.equal(output.review_totals[0]?.jlpt_level, "N5");
  assert.equal(output.review_totals[0]?.mixed.source_supplied, true);
  assert.deepEqual(output.cram.items, { accuracy: 75, correct: 30, incorrect: 10, total: 40 });
});

test("Study Evidence trend preserves daily evidence and averages source-present records", async () => {
  const source = new InMemoryFrontendSource({
    accountContext: { sourceTimezone: "Asia/Kolkata", tokenSource: "environment" },
    studyHistory: {
      reviews: {
        status: "available",
        data: {
          grammar: { "2026-08-10": 3, "2026-08-11": 4 },
          vocabulary: { "2026-08-10": 2 },
          mixed: { "2026-08-10": 5, "2026-08-11": 4 }
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
      accuracy: {
        status: "available",
        data: { "2026-08-10": 80, "2026-08-11": 100 }
      }
    }
  });
  const service = new StudyEvidenceService(
    () => source,
    () => new Date("2026-08-12T12:00:00.000Z")
  );

  const output = await service.getTrend({
    start_date: "2026-08-10",
    end_date: "2026-08-12"
  });

  assert.deepEqual(output.metrics, {
    reviews: { source_record_days: 2, total: 9, average_per_source_record_day: 4.5 },
    new_content: { source_record_days: 1, total: 3, average_per_source_record_day: 3 },
    accuracy: { source_record_days: 2, average_percent: 90 }
  });
  assert.equal(output.derived_measures_labeled, true);
  assert.equal(output.days.length, 3);
  assert.equal(output.days[2]?.reviews.coverage, "no_source_record");
});

interface StageCounts {
  beginner: number;
  seasoned: number;
  adept: number;
  expert: number;
  master: number;
  totalCount: number;
}

interface ReviewStats {
  accuracy: number;
  correct: number;
  incorrect: number;
  total: number;
}
