import assert from "node:assert/strict";
import test from "node:test";
import {
  BunproClient,
  BunproRequestGate,
  apiTokenFromEnvironment,
  type FetchLike
} from "../src/bunpro/client.js";
import { BunproError } from "../src/bunpro/errors.js";

const apiToken = "test-account-api-token";

function response(body: string, init: ResponseInit = {}): Response {
  return new Response(body, init);
}

function userResponse(): Response {
  return response(JSON.stringify({ user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } } }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

test("the Account API Token and opt-in flag are sent on every Frontend API request", async () => {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const mockFetch: FetchLike = async (input, init = {}) => {
    calls.push({ url: new URL(input instanceof Request ? input.url : input), init });
    return userResponse();
  };

  const client = new BunproClient(apiToken, mockFetch, { tokenSource: "request_bearer" });
  const first = await client.checkConnection();
  const second = await client.checkConnection();

  assert.deepEqual(first, {
    connected: true,
    authentication_method: "account_api_token",
    token_source: "request_bearer",
    token_persisted_by_server: false,
    api_authenticated: true,
    source_timezone: "Asia/Kolkata",
    stateless: true
  });
  assert.deepEqual(second, first);
  assert.equal(calls.length, 2);

  for (const call of calls) {
    assert.equal(
      call.url.href,
      "https://api.bunpro.jp/api/frontend/user?dangerously_authenticate_using_api_token=true"
    );
    const headers = new Headers(call.init.headers);
    assert.equal(call.init.method, "GET");
    assert.equal(headers.get("authorization"), `Token token=${apiToken}`);
    assert.equal(headers.get("cookie"), null);
  }
});

test("existing query parameters are retained when the Account Token opt-in is added", async () => {
  let requestedUrl: URL | undefined;
  const mockFetch: FetchLike = async input => {
    requestedUrl = new URL(input instanceof Request ? input.url : input);
    return response("{}", { status: 200, headers: { "content-type": "application/json" } });
  };

  await new BunproClient(apiToken, mockFetch).getFrontendJson("/api/frontend/example?page=2");
  assert.equal(requestedUrl?.searchParams.get("page"), "2");
  assert.equal(requestedUrl?.searchParams.get("dangerously_authenticate_using_api_token"), "true");
});

test("the client rejects routes outside Bunpro's read-only Frontend API namespace", async () => {
  let called = false;
  const mockFetch: FetchLike = async () => {
    called = true;
    return userResponse();
  };

  await assert.rejects(
    new BunproClient(apiToken, mockFetch).getFrontendJson("https://example.com/collect"),
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_CONTRACT_CHANGED"
  );
  assert.equal(called, false);
});

test("a rejected token returns a sanitized authentication error without retrying", async () => {
  let calls = 0;
  const mockFetch: FetchLike = async () => {
    calls += 1;
    return response(`invalid token ${apiToken}`, { status: 401 });
  };

  await assert.rejects(
    new BunproClient(apiToken, mockFetch).checkConnection(),
    (error: unknown) => {
      assert.ok(error instanceof BunproError);
      assert.equal(error.code, "BUNPRO_AUTH_FAILED");
      assert.doesNotMatch(error.message, new RegExp(apiToken));
      return true;
    }
  );
  assert.equal(calls, 1);
});

test("rate limiting fails closed without an automatic retry", async () => {
  let calls = 0;
  const mockFetch: FetchLike = async () => {
    calls += 1;
    return response("slow down", { status: 429, headers: { "retry-after": "60" } });
  };

  await assert.rejects(
    new BunproClient(apiToken, mockFetch).checkConnection(),
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_RATE_LIMITED"
  );
  assert.equal(calls, 1);
});

test("route removal, upstream failure, malformed JSON, and oversized responses are sanitized", async t => {
  const cases: Array<{ name: string; response: Response; code: string }> = [
    { name: "removed route", response: response("private route details", { status: 404 }), code: "BUNPRO_CONTRACT_CHANGED" },
    { name: "upstream failure", response: response("private server details", { status: 503 }), code: "BUNPRO_UPSTREAM_UNAVAILABLE" },
    { name: "malformed JSON", response: response("not-json", { status: 200 }), code: "BUNPRO_CONTRACT_CHANGED" },
    {
      name: "oversized response",
      response: response("x".repeat(2 * 1024 * 1024 + 1), {
        status: 200,
        headers: { "content-type": "application/json" }
      }),
      code: "BUNPRO_CONTRACT_CHANGED"
    }
  ];

  for (const item of cases) {
    await t.test(item.name, async () => {
      const client = new BunproClient(apiToken, async () => item.response);
      await assert.rejects(client.checkConnection(), (error: unknown) => {
        assert.ok(error instanceof BunproError);
        assert.equal(error.code, item.code);
        assert.doesNotMatch(error.message, /private|not-json|xxxxx/);
        return true;
      });
    });
  }
});

test("the client enforces its request timeout", async () => {
  const neverCompletes: FetchLike = async (_input, init = {}) => new Promise((_resolve, reject) => {
    init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
  });
  const client = new BunproClient(apiToken, neverCompletes, { requestTimeoutMs: 20 });

  await assert.rejects(
    client.checkConnection(),
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
  const clients = Array.from(
    { length: 4 },
    () => new BunproClient(apiToken, blockingFetch, { requestGate: gate })
  );
  const calls = clients.map(client => client.checkConnection());
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
