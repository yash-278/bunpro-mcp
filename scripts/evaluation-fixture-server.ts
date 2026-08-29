import { serveStdio } from "@modelcontextprotocol/server/stdio";
import type {
  JlptLevel,
  ReviewAggregateFact,
  StageCountsFact
} from "../src/bunpro/frontend-source.js";
import { InMemoryFrontendSource } from "../src/bunpro/in-memory-frontend-source.js";
import { createServer } from "../src/server.js";

const jlptLevels: readonly JlptLevel[] = ["N5", "N4", "N3", "N2", "N1"];
const grammarProgress = levelRecord<StageCountsFact>(level => ({
  beginner: level,
  seasoned: level + 1,
  adept: level + 2,
  expert: level + 3,
  master: level + 4,
  totalCount: level * 8
}));
const vocabularyProgress = levelRecord<StageCountsFact>(level => ({
  beginner: level + 1,
  seasoned: level + 2,
  adept: level + 3,
  expert: level + 4,
  master: level + 5,
  totalCount: level * 12
}));
const reviewTotals = levelRecord<ReviewAggregateFact>(level => ({
  accuracy: 70 + level * 5,
  correct: level * 12,
  incorrect: level * 3,
  total: level * 15
}));

const sourceData = {
  accountContext: {
    sourceTimezone: "Asia/Kolkata",
    tokenSource: "environment" as const
  },
  studyHistory: {
    reviews: {
      status: "available" as const,
      data: {
        grammar: {
          "2026-07-01": 7,
          "2026-07-02": 4,
          "2026-07-04": 12,
          "2026-07-05": 3,
          "2026-07-07": 8
        },
        vocabulary: {
          "2026-07-01": 3,
          "2026-07-02": 6,
          "2026-07-04": 8,
          "2026-07-05": 2,
          "2026-07-07": 7
        },
        mixed: {
          "2026-07-01": 10,
          "2026-07-02": 10,
          "2026-07-04": 20,
          "2026-07-05": 5,
          "2026-07-07": 15
        }
      }
    },
    newContent: {
      status: "available" as const,
      data: {
        grammar: {
          "2026-07-02": 1,
          "2026-07-03": 2,
          "2026-07-05": 2,
          "2026-07-07": 1
        },
        vocabulary: {
          "2026-07-02": 1,
          "2026-07-03": 1,
          "2026-07-05": 3,
          "2026-07-07": 4
        },
        mixed: {
          "2026-07-02": 2,
          "2026-07-03": 3,
          "2026-07-05": 5,
          "2026-07-07": 5
        }
      }
    },
    accuracy: {
      status: "available" as const,
      data: {
        "2026-07-01": 80,
        "2026-07-02": 90,
        "2026-07-04": 75,
        "2026-07-05": 100,
        "2026-07-07": 85
      }
    }
  },
  reviewPlanning: {
    dueNow: { grammar: 12, vocabulary: 8 },
    forecast: {
      laterToday: { grammar: 2, vocabulary: 3 },
      tomorrow: { grammar: 4, vocabulary: 6 },
      dated: [
        { date: "2026-08-14", grammar: 6, vocabulary: 4 },
        { date: "2026-08-15", grammar: 8, vocabulary: 2 }
      ]
    }
  },
  deckConfiguration: {
    decks: [
      deck("101", "Starter Grammar", "starter-grammar", "grammar", true, 5, 10, 4, 1, 60, 20, 100, 50),
      deck("202", "Tobira Intermediate", "tobira-intermediate", "mixed", true, 10, 25, 9, 6, 180, 75, 300, 200),
      deck("303", "Archived Advanced", "archived-advanced", "mixed", false, 20, 40, 0, 0, 500, 500, 600, 400)
    ]
  },
  recentActivity: {
    latest_attempts: {
      attempts: [
        attempt(1, true, "Grammar A"),
        attempt(2, false, "Vocabulary B"),
        attempt(3, true, "Grammar C"),
        attempt(4, true, "Vocabulary D")
      ],
      sessions: null
    },
    last_24_hours: {
      attempts: [
        attempt(1, true, "Grammar A"),
        attempt(2, false, "Vocabulary B"),
        attempt(3, true, "Grammar C")
      ],
      sessions: [
        { startingXp: 100, endingXp: 130, startingBuncoin: 10, endingBuncoin: 15 },
        { startingXp: 200, endingXp: 220, startingBuncoin: 20, endingBuncoin: 22 }
      ]
    }
  },
  learningProgress: {
    base: {
      daysStudied: 120,
      grammarStudied: 400,
      vocabularyStudied: 250,
      currentStreak: 7,
      weeklyStreak: [
        { day: "Mon", studied: true },
        { day: "Tue", studied: true },
        { day: "Wed", studied: false }
      ]
    },
    jlptProgress: {
      grammar: grammarProgress,
      vocabulary: vocabularyProgress
    },
    reviewTotals: {
      grammar: reviewTotals,
      vocabulary: reviewTotals,
      mixed: reviewTotals
    },
    cram: {
      items: { accuracy: 80, correct: 80, incorrect: 20, total: 100 },
      sessions: {
        averageTime: "00:10:00",
        reviewsPerSession: 25,
        sessionCount: 4,
        totalTime: "00:40:00"
      }
    }
  }
};

void serveStdio(() => createServer({
  sourceOperationFactory: () => new InMemoryFrontendSource(sourceData)
}));

function levelRecord<T>(factory: (level: number) => T): Record<JlptLevel, T> {
  return Object.fromEntries(jlptLevels.map((level, index) => [level, factory(5 - index)])) as Record<JlptLevel, T>;
}

function attempt(id: number, correct: boolean, label: string) {
  return {
    attemptId: String(id),
    time: `2026-07-07T0${id}:00:00+05:30`,
    correct,
    contentType: id % 2 === 0 ? "vocabulary" : "grammar",
    contentId: String(id * 10),
    label
  };
}

function deck(
  deckId: string,
  title: string,
  slug: string,
  deckType: string,
  activelyStudying: boolean,
  batchSize: number,
  dailyGoal: number,
  goalGrammar: number,
  goalVocabulary: number,
  completedGrammar: number,
  completedVocabulary: number,
  contentGrammar: number,
  contentVocabulary: number
) {
  return {
    deckId,
    title,
    slug,
    deckType,
    activelyStudying,
    batchSize,
    dailyGoal,
    dailyGoalProgress: { grammar: goalGrammar, vocabulary: goalVocabulary },
    completed: { grammar: completedGrammar, vocabulary: completedVocabulary },
    content: { grammar: contentGrammar, vocabulary: contentVocabulary }
  };
}
