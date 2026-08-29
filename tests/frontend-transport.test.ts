import assert from "node:assert/strict";
import test from "node:test";
import {
  BunproRequestGate,
  apiTokenFromEnvironment,
  type FetchLike
} from "../src/bunpro/client.js";
import { BunproError } from "../src/bunpro/errors.js";
import { BunproFrontendSource } from "../src/bunpro/frontend-source.js";

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
