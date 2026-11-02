import assert from "node:assert/strict";
import test from "node:test";
import {
  BUNPRO_REQUEST_BUDGET,
  BunproRequestGate,
  apiTokenFromEnvironment,
  type FetchLike
} from "../src/bunpro/client.js";
import { BunproError } from "../src/bunpro/errors.js";
import { BunproFrontendSource } from "../src/bunpro/frontend-source.js";
import { stalledBody } from "./fixtures/bunpro-wire.js";

const apiToken = "test-account-api-token";

function response(body: string, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

function userResponse(): Response {
  return response(JSON.stringify({
    user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } }
  }), { status: 200, headers: { "content-type": "application/json" } });
}

test("a rejected token returns a sanitized authentication error without retrying", async () => {
  let calls = 0;
  const source = new BunproFrontendSource(apiToken, async () => {
    calls += 1;
    return response(`invalid token ${apiToken}`, { status: 401 });
  });

  await assert.rejects(source.getAccountContext(), (error: unknown) => {
    assert.ok(error instanceof BunproError);
    assert.equal(error.code, "BUNPRO_AUTH_FAILED");
    assert.doesNotMatch(error.message, new RegExp(apiToken));
    return true;
  });
  assert.equal(calls, 1);
});

test("rate limiting fails closed without an automatic retry", async () => {
  let calls = 0;
  const source = new BunproFrontendSource(apiToken, async () => {
    calls += 1;
    return response("slow down", { status: 429, headers: { "retry-after": "60" } });
  });

  await assert.rejects(
    source.getAccountContext(),
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_RATE_LIMITED"
  );
  assert.equal(calls, 1);
});

test("route removal, upstream failure, malformed JSON, and oversized responses are sanitized", async t => {
  const cases: Array<{ name: string; response: Response; code: string }> = [
    {
      name: "removed route",
      response: response("private route details", { status: 404 }),
      code: "BUNPRO_CONTRACT_CHANGED"
    },
    {
      name: "upstream failure",
      response: response("private server details", { status: 503 }),
      code: "BUNPRO_UPSTREAM_UNAVAILABLE"
    },
    {
      name: "malformed JSON",
      response: response("not-json", { status: 200 }),
      code: "BUNPRO_CONTRACT_CHANGED"
    },
    {
      name: "oversized response",
      response: response("x".repeat(2 * 1024 * 1024 + 1), { status: 200 }),
      code: "BUNPRO_CONTRACT_CHANGED"
    },
    {
      name: "oversized content-length",
      response: response("{}", { status: 200, headers: { "content-length": String(2 * 1024 * 1024 + 1) } }),
      code: "BUNPRO_CONTRACT_CHANGED"
    }
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      const source = new BunproFrontendSource(apiToken, async () => item.response);
      await assert.rejects(source.getAccountContext(), (error: unknown) => {
        assert.ok(error instanceof BunproError);
        assert.equal(error.code, item.code);
        assert.doesNotMatch(error.message, /private|not-json|xxxxx/);
        return true;
      });
    });
  }
});

test("the source transport enforces its request timeout", async () => {
  const neverCompletes: FetchLike = async (_input, init = {}) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
  });
  const source = new BunproFrontendSource(apiToken, neverCompletes, { requestTimeoutMs: 20 });

  await assert.rejects(
    source.getAccountContext(),
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_UPSTREAM_UNAVAILABLE"
  );
});

test("the request timer covers a stalled response body", { timeout: 1_000 }, async () => {
  const source = new BunproFrontendSource(
    apiToken,
    async (_input, init = {}) => stalledBody(init.signal),
    { requestTimeoutMs: 20 }
  );

  await assert.rejects(
    source.getAccountContext(),
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_UPSTREAM_UNAVAILABLE"
  );
});

test("the deadline firing during the body read is an upstream failure, not a contract change", { timeout: 1_000 }, async () => {
  const source = new BunproFrontendSource(
    apiToken,
    async (_input, init = {}) => stalledBody(init.signal),
    { operationTimeoutMs: 20 }
  );

  await assert.rejects(
    source.getAccountContext(),
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_UPSTREAM_UNAVAILABLE"
  );
});

test("a network failure during the body read is an upstream failure", async () => {
  const source = new BunproFrontendSource(apiToken, async () => new Response(
    new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new TypeError("terminated"));
      }
    }),
    { status: 200 }
  ));

  await assert.rejects(
    source.getAccountContext(),
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_UPSTREAM_UNAVAILABLE"
  );
});

test("the operation deadline starts at the first Bunpro request", async () => {
  const source = new BunproFrontendSource(apiToken, async (_input, init = {}) => {
    init.signal?.throwIfAborted();
    return userResponse();
  }, { operationTimeoutMs: 10 });

  await new Promise(resolve => setTimeout(resolve, 30));

  assert.equal((await source.getAccountContext()).sourceTimezone, "Asia/Kolkata");
});

test("every request in one operation shares the deadline", { timeout: 1_000 }, async () => {
  const bodies: Record<string, unknown> = {
    "/api/frontend/user/due": { total_due_grammar: 1, total_due_vocab: 1 },
    "/api/frontend/user_stats/forecast_daily": {
      grammar: { later: 1, tomorrow: 1 },
      vocab: { later: 1, tomorrow: 1 }
    }
  };
  const slowFetch: FetchLike = async (input, init = {}) => {
    const route = new URL(String(input)).pathname;
    if (route === "/api/frontend/user") return userResponse();
    await new Promise((resolve, reject) => {
      setTimeout(resolve, 60);
      init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    });
    return response(JSON.stringify(bodies[route]), { status: 200 });
  };
  const source = new BunproFrontendSource(apiToken, slowFetch, { operationTimeoutMs: 100 });

  await assert.rejects(
    source.loadReviewPlanning(),
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_UPSTREAM_UNAVAILABLE"
  );
});

test("Study History stops at the deadline and keeps what already arrived", { timeout: 1_000 }, async () => {
  const routes: string[] = [];
  const stallsAfterReviews: FetchLike = async (input, init = {}) => {
    const route = new URL(String(input)).pathname;
    routes.push(route);
    if (route === "/api/frontend/user") return userResponse();
    if (route === "/api/frontend/user_stats/review_heatmap") {
      return response(JSON.stringify({ grammar: {}, vocab: {}, mixed: {} }), { status: 200 });
    }
    return stalledBody(init.signal);
  };
  const source = new BunproFrontendSource(apiToken, stallsAfterReviews, { operationTimeoutMs: 40 });

  const history = await source.loadStudyHistory();

  assert.equal(history.reviews.status, "available");
  assert.equal(history.newContent.status, "upstream_unavailable");
  assert.equal(history.accuracy.status, "not_queried");
  assert.deepEqual(routes, [
    "/api/frontend/user",
    "/api/frontend/user_stats/review_heatmap",
    "/api/frontend/user_stats/new_content_heatmap"
  ]);
});

test("Study History that stalls on its first source marks the rest not_queried", { timeout: 1_000 }, async () => {
  const routes: string[] = [];
  const stallsOnFirstSource: FetchLike = async (input, init = {}) => {
    const route = new URL(String(input)).pathname;
    routes.push(route);
    return route === "/api/frontend/user" ? userResponse() : stalledBody(init.signal);
  };
  const source = new BunproFrontendSource(apiToken, stallsOnFirstSource, { operationTimeoutMs: 20 });

  const history = await source.loadStudyHistory();

  assert.equal(history.reviews.status, "upstream_unavailable");
  assert.equal(history.newContent.status, "not_queried");
  assert.equal(history.accuracy.status, "not_queried");
  assert.deepEqual(routes, ["/api/frontend/user", "/api/frontend/user_stats/review_heatmap"]);
});

test("a shared request gate bounds outbound concurrency and rejects excess queued work", async () => {
  const gate = new BunproRequestGate({ maximumConcurrent: 2, maximumQueued: 1 });
  const releases: Array<() => void> = [];
  let active = 0;
  let maximumActive = 0;
  const blockingFetch: FetchLike = async () => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise<void>(resolve => releases.push(resolve));
    active -= 1;
    return userResponse();
  };
  const sources = Array.from(
    { length: 4 },
    () => new BunproFrontendSource(apiToken, blockingFetch, { requestGate: gate })
  );
  const calls = sources.map(source => source.getAccountContext());
  const excessResult = calls[3]?.then(
    () => undefined,
    (error: unknown) => error
  );

  await new Promise(resolve => setImmediate(resolve));
  assert.equal(active, 2);
  const excessError = await excessResult;
  assert.ok(excessError instanceof BunproError);
  assert.equal(excessError.code, "BUNPRO_BUSY");

  releases.splice(0).forEach(release => release());
  await new Promise(resolve => setImmediate(resolve));
  releases.splice(0).forEach(release => release());
  await Promise.all(calls.slice(0, 3));
  assert.equal(maximumActive, 2);
});

test("the gate holds a slot until the response body is fully read", { timeout: 1_000 }, async () => {
  const gate = new BunproRequestGate({ maximumConcurrent: 1, maximumQueued: 1 });
  const finishBodies: Array<() => void> = [];
  let requests = 0;
  const stalledBodies: FetchLike = async () => {
    requests += 1;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        finishBodies.push(() => {
          controller.enqueue(new TextEncoder().encode(JSON.stringify({
            user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } }
          })));
          controller.close();
        });
      }
    });
    return new Response(body, { status: 200 });
  };
  const sources = Array.from(
    { length: 2 },
    () => new BunproFrontendSource(apiToken, stalledBodies, { requestGate: gate })
  );

  const calls = sources.map(source => source.getAccountContext());
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(requests, 1);

  finishBodies[0]?.();
  await calls[0];
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(requests, 2);

  finishBodies[1]?.();
  await calls[1];
});

test("a queued request leaves at its deadline and frees its place", { timeout: 1_000 }, async () => {
  const gate = new BunproRequestGate({ maximumConcurrent: 1, maximumQueued: 1 });
  let finishRunning = (): void => undefined;
  let requests = 0;
  const firstStalls: FetchLike = async () => {
    requests += 1;
    if (requests === 1) await new Promise<void>(resolve => { finishRunning = resolve; });
    return userResponse();
  };
  const running = new BunproFrontendSource(apiToken, firstStalls, { requestGate: gate })
    .getAccountContext();
  const expires = new BunproFrontendSource(apiToken, firstStalls, {
    requestGate: gate,
    operationTimeoutMs: 20
  }).getAccountContext();

  await assert.rejects(
    expires,
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_UPSTREAM_UNAVAILABLE"
  );
  assert.equal(requests, 1);

  const replacement = new BunproFrontendSource(apiToken, firstStalls, { requestGate: gate })
    .getAccountContext();
  finishRunning();
  await Promise.all([running, replacement]);
  assert.equal(requests, 2);
});

test("a request waiting for its paced start leaves at its deadline", { timeout: 1_000 }, async () => {
  const gate = new BunproRequestGate({
    maximumConcurrent: 2,
    maximumQueued: 0,
    minimumStartIntervalMs: 60_000
  });
  let requests = 0;
  const fetchUser: FetchLike = async () => {
    requests += 1;
    return userResponse();
  };

  await new BunproFrontendSource(apiToken, fetchUser, { requestGate: gate }).getAccountContext();

  await assert.rejects(
    new BunproFrontendSource(apiToken, fetchUser, {
      requestGate: gate,
      operationTimeoutMs: 20
    }).getAccountContext(),
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_UPSTREAM_UNAVAILABLE"
  );
  assert.equal(requests, 1);
});

test("the Request Budget allows 4 running and 6 queued requests at 2-second pacing", async () => {
  const gate = new BunproRequestGate(BUNPRO_REQUEST_BUDGET);
  const operation = new AbortController();
  const stalled = (): Promise<void> => new Promise((_resolve, reject) => {
    operation.signal.addEventListener("abort", () => reject(operation.signal.reason), { once: true });
  });

  const admitted = Array.from({ length: 10 }, () => gate.run(stalled, operation.signal));
  const excess = gate.run(stalled, operation.signal);

  await assert.rejects(
    excess,
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_BUSY"
  );
  operation.abort();
  await Promise.allSettled(admitted);
  assert.equal(BUNPRO_REQUEST_BUDGET.minimumStartIntervalMs, 2_000);
});

test("a shared request gate paces outbound request starts", async () => {
  const minimumStartIntervalMs = 15;
  const gate = new BunproRequestGate({
    maximumConcurrent: 3,
    maximumQueued: 0,
    minimumStartIntervalMs
  });
  const starts: number[] = [];

  const { signal } = new AbortController();

  await Promise.all(Array.from({ length: 3 }, () => gate.run(async () => {
    starts.push(performance.now());
  }, signal)));

  assert.equal(starts.length, 3);
  assert.ok(
    starts[2]! - starts[0]! >= minimumStartIntervalMs,
    "three requests should not start as an immediate burst"
  );
});

test("the Account API Token is loaded only from BUNPRO_API_TOKEN", () => {
  assert.equal(apiTokenFromEnvironment({ BUNPRO_API_TOKEN: " account-token " }), "account-token");
  assert.throws(
    () => apiTokenFromEnvironment({ BUNPRO_USERNAME: "name", BUNPRO_PASSWORD: "password" }),
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_CONFIG_MISSING"
  );
  assert.throws(
    () => apiTokenFromEnvironment({ BUNPRO_API_TOKEN: "bad token" }),
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_CONFIG_MISSING"
  );
});
