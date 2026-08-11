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

test("fresh login uses web cookies and an API-only frontend token", async () => {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const responses = [
    response('<input name="authenticity_token" value="csrf&amp;token">', {
      status: 200,
      cookies: ["_grammar_app_session=session-before; Path=/; HttpOnly"]
    }),
    response("", {
      status: 302,
      headers: { location: "/dashboard" },
      cookies: [
        "_grammar_app_session=session-after; Path=/; HttpOnly",
        "frontend_api_token=frontend-token; Path=/; Secure"
      ]
    }),
    response("account", { status: 200 }),
    response(JSON.stringify({ user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } } }), {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  ];

  const mockFetch: FetchLike = async (input, init = {}) => {
    calls.push({ url: new URL(input instanceof Request ? input.url : input), init });
    const next = responses.shift();
    assert.ok(next, "unexpected request");
    return next;
  };

  const result = await new BunproClient(credentials, mockFetch).checkConnection();

  assert.deepEqual(result, {
    connected: true,
    authentication_method: "frontend_session",
    credentials_source: "environment",
    web_session_authenticated: true,
    frontend_token_obtained: true,
    api_authenticated: true,
    source_timezone: "Asia/Kolkata",
    stateless: true
  });
  assert.equal(calls.length, 4);

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
