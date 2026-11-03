import assert from "node:assert/strict";
import type { TestContext } from "node:test";
import type { FetchLike } from "../../src/bunpro/client.js";

export const bunproRoutes = {
  user: "/api/frontend/user",
  due: "/api/frontend/user/due",
  deckQueue: "/api/frontend/user/queue",
  reviewHeatmap: "/api/frontend/user_stats/review_heatmap",
  newContentHeatmap: "/api/frontend/user_stats/new_content_heatmap",
  accuracyOverTime: "/api/frontend/user_stats/accuracy_over_time",
  forecastDaily: "/api/frontend/user_stats/forecast_daily",
  lastDoneReviews: "/api/frontend/user_stats/last_done_reviews",
  last24Hours: "/api/frontend/summary/last_24_hours",
  baseStats: "/api/frontend/user_stats/base_stats",
  jlptProgress: "/api/frontend/user_stats/jlpt_progress_mixed",
  totalReviewStats: "/api/frontend/user_stats/total_review_stats",
  totalCramStats: "/api/frontend/user_stats/total_cram_stats",
  troubledContent: "/api/frontend/user_stats/troubled_content"
} as const;

export type BunproRoute = (typeof bunproRoutes)[keyof typeof bunproRoutes];

/** A JSON body for the route, a `Response` to send a status or malformed body, or a `WireReply`. */
export type WireOverrides = Partial<Record<BunproRoute, unknown>>;

/** Builds a reply from the request, for a body that has to follow the request's signal. */
export type WireReply = (init: RequestInit) => Response;

export interface WireCall {
  url: URL;
  init: RequestInit;
}

export interface BunproWire {
  fetch: FetchLike;
  calls: WireCall[];
  routes(): string[];
}

/**
 * Serves synthetic Bunpro responses and records each call. The source turns a
 * thrown fetch error into a Source Coverage status, so an unknown route also
 * fails the test from an `after` hook.
 */
export function createBunproWire(
  t: Pick<TestContext, "after">,
  overrides: WireOverrides = {}
): BunproWire {
  const replies: Record<string, unknown> = { ...wireBodies(), ...overrides };
  const calls: WireCall[] = [];
  const unknownRoutes: string[] = [];

  t.after(() => {
    assert.deepEqual(unknownRoutes, [], "The source requested a route with no synthetic response.");
  });

  return {
    calls,
    routes: () => calls.map(call => call.url.pathname),
    fetch: async (input, init = {}) => {
      const url = new URL(input instanceof Request ? input.url : input);
      calls.push({ url, init });
      if (!Object.hasOwn(replies, url.pathname)) {
        unknownRoutes.push(url.pathname);
        throw new Error(`No synthetic response for ${url.pathname}.`);
      }
      const reply = replies[url.pathname];
      if (typeof reply === "function") return (reply as WireReply)(init);
      return reply instanceof Response ? reply.clone() : Response.json(reply);
    }
  };
}

/** Headers arrive, then the body stalls until the signal aborts it, as it does with `fetch`. */
export function stalledBody(signal: AbortSignal | null | undefined): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      signal?.addEventListener("abort", () => controller.error(signal.reason), { once: true });
    }
  });
  return new Response(body, { status: 200 });
}

export const stalledBodyReply: WireReply = init => stalledBody(init.signal);

/** A fresh set of default bodies, safe for a test to change before overriding a route. */
export function wireBodies() {
  return {
    [bunproRoutes.user]: {
      user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } }
    },
    [bunproRoutes.due]: { total_due_grammar: 5, total_due_vocab: 7 },
    [bunproRoutes.deckQueue]: {
      data: [
        userDeck("user-deck-101", 101, true),
        userDeck("user-deck-102", 102, false)
      ],
      included: [
        deckMetadata("101", "Synthetic N3 Grammar", "synthetic-n3-grammar"),
        deckMetadata("102", "Synthetic N4 Vocabulary", "synthetic-n4-vocabulary")
      ]
    },
    [bunproRoutes.reviewHeatmap]: {
      grammar: { "2026-08-10": 3, "2026-08-11": 4 } as Record<string, number>,
      vocab: { "2026-08-10": 2 } as Record<string, number>,
      mixed: { "2026-08-10": 6, "2026-08-11": 4 } as Record<string, number>
    },
    [bunproRoutes.newContentHeatmap]: {
      grammar: { "2026-08-10": 1 } as Record<string, number>,
      vocab: { "2026-08-10": 2 } as Record<string, number>,
      mixed: { "2026-08-10": 3 } as Record<string, number>
    },
    [bunproRoutes.accuracyOverTime]: {
      "2026-08-10": 88.5,
      "2026-08-11": 100
    } as Record<string, number | null>,
    [bunproRoutes.forecastDaily]: {
      grammar: { later: 2, tomorrow: 3, "2026-08-15": 1, "2026-08-14": 4 } as Record<string, number>,
      vocab: { later: 1, tomorrow: 5, "2026-08-15": 0, "2026-08-14": 6 } as Record<string, number>
    },
    [bunproRoutes.lastDoneReviews]: [{
      id: 9,
      time: "2026-08-12T09:00:00.000Z",
      status: false,
      reviewable: {
        data: { id: 209, type: "vocabulary", attributes: { slug: "synthetic-word" } }
      }
    }] as unknown[],
    [bunproRoutes.last24Hours]: {
      history_objects: [
        grammarAttempt(1, "2026-08-12T01:00:00.000Z", true),
        grammarAttempt(2, "2026-08-12T02:00:00.000Z", false)
      ],
      review_sessions: {
        data: [
          reviewSession(100, 110, 5, 7),
          reviewSession(110, 125, 7, 8)
        ]
      }
    },
    [bunproRoutes.baseStats]: {
      facts: {
        days_studied: 30,
        grammar_studied: 120,
        vocab_studied: 50,
        streak: 7,
        weekly_streak: [{ day: "Mon", val: true }, { day: "Tue", val: false }]
      }
    },
    [bunproRoutes.jlptProgress]: {
      grammar: jlptGroup(
        stageCounts(1, 2, 3, 4, 5, 15),
        stageCounts(2, 3, 4, 5, 6, 20),
        stageCounts(3, 4, 5, 6, 7, 25),
        stageCounts(4, 5, 6, 7, 8, 30),
        stageCounts(5, 6, 7, 8, 9, 35)
      ),
      vocab: jlptGroup(
        stageCounts(10, 20, 30, 40, 50, 150),
        stageCounts(11, 21, 31, 41, 51, 155),
        stageCounts(12, 22, 32, 42, 52, 160),
        stageCounts(13, 23, 33, 43, 53, 165),
        stageCounts(14, 24, 34, 44, 54, 170)
      )
    },
    [bunproRoutes.totalReviewStats]: {
      grammar: jlptGroup(
        reviewTotals(80, 8, 2, 10),
        reviewTotals(75, 6, 2, 8),
        reviewTotals(50, 2, 2, 4),
        reviewTotals(100, 1, 0, 1),
        reviewTotals(0, 0, 0, 0)
      ),
      vocab: jlptGroup(
        reviewTotals(90, 9, 1, 10),
        reviewTotals(60, 3, 2, 5),
        reviewTotals(25, 1, 3, 4),
        reviewTotals(100, 2, 0, 2),
        reviewTotals(0, 0, 0, 0)
      ),
      mixed: jlptGroup(
        reviewTotals(85, 17, 3, 20),
        reviewTotals(69.2, 9, 4, 13),
        reviewTotals(37.5, 3, 5, 8),
        reviewTotals(100, 3, 0, 3),
        reviewTotals(0, 0, 0, 0)
      )
    },
    [bunproRoutes.totalCramStats]: {
      items: reviewTotals(75, 30, 10, 40),
      sessions: {
        average_time: "00:10:00",
        reviews_per_session: 20,
        session_count: 2,
        total_time: "00:20:00"
      }
    },
    [bunproRoutes.troubledContent]: [
      troubledEntry(301, "grammar_point", 72.5, 1),
      troubledEntry(302, "vocabulary", null, 0),
      troubledEntry(303, "grammar_point", 40, 2)
    ] as unknown[]
  };
}

function userDeck(id: string, deckId: number, activelyStudying: boolean) {
  return {
    id,
    attributes: {
      deck_id: deckId,
      actively_studying: activelyStudying,
      batch_size: 3,
      daily_goal: 5,
      daily_goal_count_grammar: 2,
      daily_goal_count_vocab: 1,
      complete_grammar_count: 20,
      complete_vocab_count: 10
    }
  };
}

function deckMetadata(id: string, title: string, slug: string) {
  return {
    id,
    attributes: {
      title,
      slug,
      deck_type: "jlpt",
      grammar_count: 200,
      vocab_count: 80,
      description: "Synthetic deck description"
    }
  };
}

function grammarAttempt(id: number, time: string, correct: boolean) {
  return {
    id,
    time,
    status: correct,
    reviewable: {
      data: {
        id: 100 + id,
        type: "grammar_point",
        attributes: { title: `Synthetic grammar ${id}`, meaning: "Synthetic lesson text" }
      }
    }
  };
}

/** One Troubled Content entry, with the fields the tool must leave out. */
export function troubledEntry(
  id: number,
  typeSnake: string,
  accuracy: number | null,
  streak: number
) {
  return {
    data: {
      id: `review-${id}`,
      type: "review",
      attributes: { accuracy, streak },
      relationships: {}
    },
    reviewable: {
      data: {
        attributes: {
          id,
          title: `Synthetic item ${id}`,
          meaning: `Synthetic meaning ${id}`,
          slug: `synthetic-item-${id}`,
          furigana: `synthetic-furigana-${id}`,
          level: "JLPT3",
          type_pascal: "SyntheticPascal",
          type_snake: typeSnake
        }
      }
    }
  };
}

export function reviewSession(
  startingXp: number,
  endingXp: number | null,
  startingBuncoin: number,
  endingBuncoin: number
) {
  return {
    attributes: {
      starting_xp: startingXp,
      ending_xp: endingXp,
      starting_buncoin: startingBuncoin,
      ending_buncoin: endingBuncoin
    }
  };
}

function jlptGroup<T>(n5: T, n4: T, n3: T, n2: T, n1: T): Record<string, T> {
  return { "5": n5, "4": n4, "3": n3, "2": n2, "1": n1 };
}

function stageCounts(
  beginner: number,
  seasoned: number,
  adept: number,
  expert: number,
  master: number,
  totalCount: number
) {
  return { beginner, seasoned, adept, expert, master, total_count: totalCount };
}

function reviewTotals(accuracy: number, correct: number, incorrect: number, total: number) {
  return { accuracy, correct, incorrect, total };
}
