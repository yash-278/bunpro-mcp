import assert from "node:assert/strict";
import test from "node:test";
import { BunproClient, credentialsFromEnvironment, type FetchLike } from "../src/bunpro/client.js";
import { BunproError } from "../src/bunpro/errors.js";

const credentials = { username: "test@example.com", password: "test-password" };

function response(body: string, init: ResponseInit & { cookies?: string[] } = {}): Response {
  const headers = new Headers(init.headers);
  for (const cookie of init.cookies ?? []) headers.append("set-cookie", cookie);
  return new Response(body, { ...init, headers });
}

function userResponse(): Response {
  return response(JSON.stringify({ user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } } }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

function freshSessionResponses(token = "frontend-token", csrf = "csrf&amp;token"): Response[] {
  return [
    response(`<input name="authenticity_token" value="${csrf}">`, {
      status: 200,
      cookies: ["_grammar_app_session=session-before; Path=/; HttpOnly"]
    }),
    response("", {
      status: 302,
      headers: { location: "/dashboard" },
      cookies: [
        "_grammar_app_session=session-after; Path=/; HttpOnly",
        `frontend_api_token=${token}; Path=/; Secure`
      ]
    }),
    response("account", { status: 200 }),
    userResponse()
  ];
}

test("one fresh login is serialized and reused by concurrent calls", async () => {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const responses = [
    ...freshSessionResponses(),
    userResponse()
  ];

  const mockFetch: FetchLike = async (input, init = {}) => {
    calls.push({ url: new URL(input instanceof Request ? input.url : input), init });
    const next = responses.shift();
    assert.ok(next, "unexpected request");
    return next;
  };

  const client = new BunproClient(credentials, mockFetch);
  const [firstResult, secondResult] = await Promise.all([
    client.checkConnection(),
    client.checkConnection()
  ]);

  assert.deepEqual(firstResult, {
    connected: true,
    authentication_method: "frontend_session",
    session_resolution: "fresh_login",
    authentication_cache: "process_memory",
    credentials_source: "environment",
    web_session_authenticated: true,
    frontend_token_obtained: true,
    api_authenticated: true,
    source_timezone: "Asia/Kolkata",
    stateless: true
  });
  assert.equal(secondResult.session_resolution, "cached_session");
  assert.equal(calls.length, 5);
  assert.equal(calls.filter(call => call.init.method === "POST").length, 1);

  const signIn = calls[1];
  assert.ok(signIn);
  assert.equal(signIn.url.href, "https://bunpro.jp/users/sign_in");
  assert.match(new Headers(signIn.init.headers).get("cookie") ?? "", /_grammar_app_session=session-before/);
  assert.equal(signIn.init.body?.toString(), "authenticity_token=csrf%26token&user%5Bemail%5D=test%40example.com&user%5Bpassword%5D=test-password&user%5Bremember_me%5D=0");

  const account = calls[2];
  assert.ok(account);
  const accountCookies = new Headers(account.init.headers).get("cookie") ?? "";
  assert.match(accountCookies, /_grammar_app_session=session-after/);
  assert.match(accountCookies, /frontend_api_token=frontend-token/);

  const api = calls[3];
  assert.ok(api);
  const apiHeaders = new Headers(api.init.headers);
  assert.equal(api.url.href, "https://api.bunpro.jp/api/frontend/user");
  assert.equal(apiHeaders.get("authorization"), "Token token=frontend-token");
  assert.equal(apiHeaders.get("cookie"), null, "web cookies must never be sent to the API host");

  const cachedApi = calls[4];
  assert.ok(cachedApi);
  assert.equal(new Headers(cachedApi.init.headers).get("authorization"), "Token token=frontend-token");
});

test("an API rejection refreshes the token through the cached web session", async () => {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const responses = [
    ...freshSessionResponses("initial-token"),
    response("unauthorized", { status: 401 }),
    response("account", {
      status: 200,
      cookies: [
        "_grammar_app_session=refreshed-session; Path=/; HttpOnly",
        "frontend_api_token=refreshed-token; Path=/; Secure"
      ]
    }),
    userResponse()
  ];
  const mockFetch: FetchLike = async (input, init = {}) => {
    calls.push({ url: new URL(input instanceof Request ? input.url : input), init });
    const next = responses.shift();
    assert.ok(next, "unexpected request");
    return next;
  };

  const client = new BunproClient(credentials, mockFetch);
  await client.checkConnection();
  const refreshed = await client.checkConnection();

  assert.equal(refreshed.session_resolution, "refreshed_session");
  assert.equal(calls.filter(call => call.init.method === "POST").length, 1);
  assert.equal(new Headers(calls[4]?.init.headers).get("authorization"), "Token token=initial-token");
  assert.equal(calls[5]?.url.href, "https://bunpro.jp/settings/account");
  assert.equal(new Headers(calls[6]?.init.headers).get("authorization"), "Token token=refreshed-token");
});

test("a failed cached-session refresh falls back to a fresh login", async () => {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const secondLogin = freshSessionResponses("second-token", "second-csrf");
  const responses = [
    ...freshSessionResponses("initial-token"),
    response("unauthorized", { status: 401 }),
    response("", { status: 302, headers: { location: "/login" } }),
    ...secondLogin
  ];
  const mockFetch: FetchLike = async (input, init = {}) => {
    calls.push({ url: new URL(input instanceof Request ? input.url : input), init });
    const next = responses.shift();
    assert.ok(next, "unexpected request");
    return next;
  };

  const client = new BunproClient(credentials, mockFetch);
  await client.checkConnection();
  const relogged = await client.checkConnection();

  assert.equal(relogged.session_resolution, "relogged_session");
  assert.equal(calls.filter(call => call.init.method === "POST").length, 2);
  assert.equal(calls[6]?.url.href, "https://bunpro.jp/login");
  assert.equal(new Headers(calls[9]?.init.headers).get("authorization"), "Token token=second-token");
});

test("rejected login returns a sanitized authentication error", async () => {
  const mockFetch: FetchLike = async (_input, init = {}) => {
    if (init.method === "POST") return response("invalid credentials", { status: 200 });
    return response('<input name="authenticity_token" value="csrf">', { status: 200 });
  };

  await assert.rejects(
    new BunproClient(credentials, mockFetch).checkConnection(),
    (error: unknown) => {
      assert.ok(error instanceof BunproError);
      assert.equal(error.code, "BUNPRO_AUTH_FAILED");
      assert.doesNotMatch(error.message, /test-password|test@example\.com/);
      return true;
    }
  );
});

test("credentials are loaded only from the configured environment names", () => {
  assert.deepEqual(
    credentialsFromEnvironment({ BUNPRO_USERNAME: "name", BUNPRO_PASSWORD: "password" }),
    { username: "name", password: "password" }
  );

  assert.throws(
    () => credentialsFromEnvironment({}),
    (error: unknown) => error instanceof BunproError && error.code === "BUNPRO_CONFIG_MISSING"
  );
});

test("an encrypted-store session snapshot hydrates without a fresh login", async () => {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const mockFetch: FetchLike = async (input, init = {}) => {
    calls.push({ url: new URL(input instanceof Request ? input.url : input), init });
    return userResponse();
  };

  const client = new BunproClient(credentials, mockFetch, {
    initialSession: {
      cookies: {
        _grammar_app_session: "stored-session",
        frontend_api_token: "stored-token"
      },
      frontendToken: "stored-token"
    },
    authenticationCache: "encrypted_store",
    credentialsSource: "encrypted_store"
  });

  const status = await client.checkConnection();
  assert.equal(status.session_resolution, "cached_session");
  assert.equal(status.authentication_cache, "encrypted_store");
  assert.equal(status.credentials_source, "encrypted_store");
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url.href, "https://api.bunpro.jp/api/frontend/user");
  assert.equal(new Headers(calls[0]?.init.headers).get("authorization"), "Token token=stored-token");
  assert.deepEqual(client.sessionSnapshot(), {
    cookies: {
      _grammar_app_session: "stored-session",
      frontend_api_token: "stored-token"
    },
    frontendToken: "stored-token"
  });
});
