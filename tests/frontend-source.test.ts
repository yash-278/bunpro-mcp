import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { BunproFrontendSource } from "../src/bunpro/frontend-source.js";
import { BunproError } from "../src/bunpro/errors.js";
import { InMemoryFrontendSource } from "../src/bunpro/in-memory-frontend-source.js";
import {
  bunproRoutes,
  createBunproWire,
  wireBodies,
  type WireOverrides
} from "./fixtures/bunpro-wire.js";

const apiToken = "test-account-api-token";

test("Account Context is normalized once within a Frontend source operation", async t => {
  const wire = createBunproWire(t);
  const source = new BunproFrontendSource(apiToken, wire.fetch, {
    tokenSource: "request_header"
  });

  const first = await source.getAccountContext();
  const second = await source.getAccountContext();

  assert.deepEqual(first, {
    sourceTimezone: "Asia/Kolkata",
    tokenSource: "request_header"
  });
  assert.strictEqual(second, first);
  assert.equal(wire.calls.length, 1);
  assert.equal(
    wire.calls[0]?.url.href,
    "https://api.bunpro.jp/api/frontend/user?dangerously_authenticate_using_api_token=true"
  );
  assert.equal(
    new Headers(wire.calls[0]?.init.headers).get("authorization"),
    `Token token=${apiToken}`
  );
});

test("Study History preserves normalized partial source outcomes", async t => {
  const wire = createBunproWire(t, {
    [bunproRoutes.reviewHeatmap]: {
      grammar: { "2026-08-10": 3 },
      vocab: { "2026-08-10": 2 },
      mixed: { "2026-08-10": 6 }
    },
    [bunproRoutes.newContentHeatmap]: new Response("route unavailable", { status: 404 }),
    [bunproRoutes.accuracyOverTime]: { "2026-08-10": 88.5, "2026-08-11": null }
  });
  const source = new BunproFrontendSource(apiToken, wire.fetch);

  const snapshot = await source.loadStudyHistory();

  assert.deepEqual(snapshot, {
    accountContext: {
      sourceTimezone: "Asia/Kolkata",
      tokenSource: "environment"
    },
    reviews: {
      status: "available",
      data: {
        grammar: { "2026-08-10": 3 },
        vocabulary: { "2026-08-10": 2 },
        mixed: { "2026-08-10": 6 }
      }
    },
    newContent: { status: "contract_changed" },
    accuracy: {
      status: "available",
      data: { "2026-08-10": 88.5, "2026-08-11": null }
    }
  });
  assert.deepEqual(wire.routes(), [
    "/api/frontend/user",
    "/api/frontend/user_stats/review_heatmap",
    "/api/frontend/user_stats/new_content_heatmap",
    "/api/frontend/user_stats/accuracy_over_time"
  ]);
});

test("Study History stops its sequential plan when Bunpro throttles a source", async t => {
  const wire = createBunproWire(t, {
    [bunproRoutes.reviewHeatmap]: new Response("slow down", { status: 429 })
  });
  const source = new BunproFrontendSource(apiToken, wire.fetch);

  const snapshot = await source.loadStudyHistory();

  assert.deepEqual(snapshot.reviews, { status: "rate_limited" });
  assert.deepEqual(snapshot.newContent, { status: "not_queried" });
  assert.deepEqual(snapshot.accuracy, { status: "not_queried" });
  assert.deepEqual(wire.routes(), [
    "/api/frontend/user",
    "/api/frontend/user_stats/review_heatmap"
  ]);
});

test("review planning preserves distinct forecast contract errors", async t => {
  await t.test("inconsistent grammar and vocabulary buckets", async st => {
    const source = sourceForWire(st, {
      [bunproRoutes.forecastDaily]: {
        grammar: { later: 1, tomorrow: 1, "2026-08-31": 1 },
        vocab: { later: 1, tomorrow: 1 }
      }
    });
    await assert.rejects(source.loadReviewPlanning(), /inconsistent grammar and vocabulary/i);
  });

  await t.test("missing required forecast buckets", async st => {
    const source = sourceForWire(st, {
      [bunproRoutes.forecastDaily]: {
        grammar: { later: 1 },
        vocab: { later: 1 }
      }
    });
    await assert.rejects(source.loadReviewPlanning(), /unexpected daily forecast horizon/i);
  });
});

test("the source fails closed on invalid timezone, Study History, recent activity, and learning facts", async t => {
  await t.test("invalid account timezone", async st => {
    const source = sourceForWire(st, {
      [bunproRoutes.user]: {
        user: { data: { attributes: { time_zone_iana: "not/a-timezone" } } }
      }
    });
    await assert.rejects(source.getAccountContext(), contractChanged);
  });

  await t.test("invalid Study History date and accuracy", async st => {
    const snapshot = await sourceForWire(st, {
      [bunproRoutes.reviewHeatmap]: {
        grammar: { someday: 1 },
        vocab: { someday: 1 },
        mixed: { someday: 2 }
      },
      [bunproRoutes.accuracyOverTime]: { "2026-08-12": 175 }
    }).loadStudyHistory();
    assert.deepEqual(snapshot.reviews, { status: "contract_changed" });
    assert.deepEqual(snapshot.accuracy, { status: "contract_changed" });
  });

  await t.test("malformed recent activity", async st => {
    const source = sourceForWire(st, {
      [bunproRoutes.lastDoneReviews]: [{
        id: 1,
        time: "2026-08-12T00:00:00Z",
        status: "yes",
        reviewable: { data: { id: 1, type: "grammar", attributes: {} } }
      }]
    });
    await assert.rejects(source.loadRecentActivity("latest_attempts"), contractChanged);
  });

  for (const variant of ["jlpt groups", "accuracy", "weekly streak"] as const) {
    await t.test(`invalid learning ${variant}`, async st => {
      const bodies = wireBodies();
      if (variant === "jlpt groups") {
        delete bodies[bunproRoutes.jlptProgress].grammar["1"];
      } else if (variant === "accuracy") {
        bodies[bunproRoutes.totalReviewStats].grammar["5"]!.accuracy = 175;
      } else {
        bodies[bunproRoutes.baseStats].facts.weekly_streak = Array.from({ length: 8 }, (_, index) => ({
          day: `day-${index}`,
          val: true
        }));
      }
      await assert.rejects(sourceForWire(st, bodies).loadLearningProgress(), contractChanged);
    });
  }
});

test("the in-memory source serves normalized facts and typed capability failures", async () => {
  const accountContext = {
    sourceTimezone: "Asia/Kolkata",
    tokenSource: "environment" as const
  };
  const reviewPlanning = {
    dueNow: { grammar: 3, vocabulary: 2 },
    forecast: {
      laterToday: { grammar: 1, vocabulary: 0 },
      tomorrow: { grammar: 2, vocabulary: 1 },
      dated: []
    }
  };
  const expectedFailure = new BunproError("BUNPRO_RATE_LIMITED", "Rate limited test fixture.");
  const source = new InMemoryFrontendSource(
    { accountContext, reviewPlanning },
    { learningProgress: expectedFailure }
  );

  assert.deepEqual(await source.loadReviewPlanning(), {
    accountContext,
    ...reviewPlanning
  });
  await assert.rejects(source.loadLearningProgress(), error => error === expectedFailure);
});

function sourceForWire(
  t: Pick<TestContext, "after">,
  overrides: WireOverrides
): BunproFrontendSource {
  return new BunproFrontendSource(apiToken, createBunproWire(t, overrides).fetch);
}

function contractChanged(error: unknown): boolean {
  return error instanceof BunproError && error.code === "BUNPRO_CONTRACT_CHANGED";
}
