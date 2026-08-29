import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "../src/server.js";
import { BunproFrontendSource } from "../src/bunpro/frontend-source.js";

const levels = Object.fromEntries(
  [1, 2, 3, 4, 5].map(level => [String(level), {
    beginner: level,
    seasoned: level + 1,
    adept: level + 2,
    expert: level + 3,
    master: level + 4,
    total_count: level * 8
  }])
);
const vocabularyLevels = Object.fromEntries(
  [1, 2, 3, 4, 5].map(level => [String(level), {
    beginner: level + 1,
    seasoned: level + 2,
    adept: level + 3,
    expert: level + 4,
    master: level + 5,
    total_count: level * 12
  }])
);
const reviewLevels = Object.fromEntries(
  [1, 2, 3, 4, 5].map(level => [String(level), {
    accuracy: 70 + level * 5,
    correct: level * 12,
    incorrect: level * 3,
    total: level * 15,
    global: 999
  }])
);
const fixtures: Record<string, unknown> = {
  "/api/frontend/user": {
    user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } }
  },
  "/api/frontend/user_stats/review_heatmap": {
    grammar: {
      "2026-07-01": 7,
      "2026-07-02": 4,
      "2026-07-04": 12,
      "2026-07-05": 3,
      "2026-07-07": 8
    },
    vocab: {
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
  },
  "/api/frontend/user_stats/new_content_heatmap": {
    grammar: {
      "2026-07-02": 1,
      "2026-07-03": 2,
      "2026-07-05": 2,
      "2026-07-07": 1
    },
    vocab: {
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
  },
  "/api/frontend/user_stats/accuracy_over_time": {
    "2026-07-01": 80,
    "2026-07-02": 90,
    "2026-07-04": 75,
    "2026-07-05": 100,
    "2026-07-07": 85
  },
  "/api/frontend/user/due": {
    total_due_grammar: 12,
    total_due_vocab: 8
  },
  "/api/frontend/user_stats/forecast_daily": {
    grammar: { later: 2, tomorrow: 4, "2026-08-14": 6, "2026-08-15": 8 },
    vocab: { later: 3, tomorrow: 6, "2026-08-14": 4, "2026-08-15": 2 }
  },
  "/api/frontend/user/queue": {
    data: [
      {
        id: "user-deck-101",
        attributes: {
          deck_id: 101,
          actively_studying: true,
          batch_size: 5,
          daily_goal: 10,
          daily_goal_count_grammar: 4,
          daily_goal_count_vocab: 1,
          complete_grammar_count: 60,
          complete_vocab_count: 20
        }
      },
      {
        id: "user-deck-202",
        attributes: {
          deck_id: 202,
          actively_studying: true,
          batch_size: 10,
          daily_goal: 25,
          daily_goal_count_grammar: 9,
          daily_goal_count_vocab: 6,
          complete_grammar_count: 180,
          complete_vocab_count: 75
        }
      },
      {
        id: "user-deck-303",
        attributes: {
          deck_id: 303,
          actively_studying: false,
          batch_size: 20,
          daily_goal: 40,
          daily_goal_count_grammar: 0,
          daily_goal_count_vocab: 0,
          complete_grammar_count: 500,
          complete_vocab_count: 500
        }
      }
    ],
    included: [
      {
        id: "101",
        attributes: {
          title: "Starter Grammar",
          slug: "starter-grammar",
          deck_type: "grammar",
          grammar_count: 100,
          vocab_count: 50
        }
      },
      {
        id: "202",
        attributes: {
          title: "Tobira Intermediate",
          slug: "tobira-intermediate",
          deck_type: "mixed",
          grammar_count: 300,
          vocab_count: 200
        }
      },
      {
        id: "303",
        attributes: {
          title: "Archived Advanced",
          slug: "archived-advanced",
          deck_type: "mixed",
          grammar_count: 600,
          vocab_count: 400
        }
      }
    ]
  },
  "/api/frontend/user_stats/last_done_reviews": [
    attempt(1, true, "Grammar A"),
    attempt(2, false, "Vocabulary B"),
    attempt(3, true, "Grammar C"),
    attempt(4, true, "Vocabulary D")
  ],
  "/api/frontend/summary/last_24_hours": {
    history_objects: [
      attempt(1, true, "Grammar A"),
      attempt(2, false, "Vocabulary B"),
      attempt(3, true, "Grammar C")
    ],
    next_review: 123,
    review_sessions: {
      data: [
        { attributes: { starting_xp: 100, ending_xp: 130, starting_buncoin: 10, ending_buncoin: 15 } },
        { attributes: { starting_xp: 200, ending_xp: 220, starting_buncoin: 20, ending_buncoin: 22 } }
      ]
    }
  },
  "/api/frontend/user_stats/base_stats": {
    facts: {
      days_studied: 120,
      grammar_studied: 400,
      vocab_studied: 250,
      streak: 7,
      weekly_streak: [
        { day: "Mon", val: true },
        { day: "Tue", val: true },
        { day: "Wed", val: false }
      ]
    }
  },
  "/api/frontend/user_stats/jlpt_progress_mixed": {
    grammar: levels,
    vocab: vocabularyLevels
  },
  "/api/frontend/user_stats/total_review_stats": {
    grammar: reviewLevels,
    vocab: reviewLevels,
    mixed: reviewLevels
  },
  "/api/frontend/user_stats/total_cram_stats": {
    items: { accuracy: 80, correct: 80, incorrect: 20, total: 100 },
    sessions: {
      average_time: "00:10:00",
      reviews_per_session: 25,
      session_count: 4,
      total_time: "00:40:00"
    }
  }
};

void serveStdio(() => createServer({
  sourceOperationFactory: () => new BunproFrontendSource("evaluation-token", async input => {
    const path = new URL(input instanceof Request ? input.url : input).pathname;
    if (!Object.hasOwn(fixtures, path)) {
      return new Response("missing evaluation fixture", { status: 404 });
    }
    return Response.json(fixtures[path]);
  })
}));

function attempt(id: number, status: boolean, title: string) {
  return {
    id,
    time: `2026-07-07T0${id}:00:00+05:30`,
    status,
    reviewable: {
      data: {
        id: id * 10,
        type: id % 2 === 0 ? "vocabulary" : "grammar",
        attributes: { title }
      }
    }
  };
}
