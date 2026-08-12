import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import {
  bearerTokenFromAuthorization,
  createHttpMcpHandler
} from "../src/http-server.js";
import type { FetchLike } from "../src/bunpro/client.js";

test("the HTTP transport accepts a Bunpro token from a Bearer header", () => {
  assert.equal(bearerTokenFromAuthorization("Bearer account-token"), "account-token");
  assert.equal(bearerTokenFromAuthorization("bearer\taccount-token"), "account-token");
});

test("the HTTP transport rejects missing, non-Bearer, ambiguous, and oversized credentials", () => {
  assert.throws(() => bearerTokenFromAuthorization(undefined));
  assert.throws(() => bearerTokenFromAuthorization("Basic account-token"));
  assert.throws(() => bearerTokenFromAuthorization("Bearer token one"));
  assert.throws(() => bearerTokenFromAuthorization("Bearer first, Bearer second"));
  assert.throws(() => bearerTokenFromAuthorization(`Bearer ${"x".repeat(2049)}`));
});

test("Streamable HTTP passes the caller's Bearer token to Bunpro without storing identity", async () => {
  const token = "caller-account-token";
  const upstreamCalls: Array<{ url: URL; init: RequestInit }> = [];
  const upstreamFetch: FetchLike = async (input, init = {}) => {
    upstreamCalls.push({ url: new URL(input instanceof Request ? input.url : input), init });
    return new Response(
      JSON.stringify({ user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } } }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };
  const handler = createHttpMcpHandler(upstreamFetch);
  const transport = new StreamableHTTPClientTransport(new URL("https://mcp.example/mcp"), {
    authProvider: { token: async () => token },
    fetch: (input, init) => handler.fetch(new Request(input, init))
  });
  const client = new Client({ name: "http-passthrough-test", version: "0.1.0" });

  try {
    await client.connect(transport);
    const result = await client.callTool({ name: "get_connection_status", arguments: {} });
    assert.equal(result.isError, undefined);
    assert.deepEqual(result.structuredContent, {
      connected: true,
      authentication_method: "account_api_token",
      token_source: "request_bearer",
      token_persisted_by_server: false,
      api_authenticated: true,
      source_timezone: "Asia/Kolkata",
      stateless: true
    });
    assert.equal(upstreamCalls.length, 1);
    assert.equal(
      upstreamCalls[0]?.url.href,
      "https://api.bunpro.jp/api/frontend/user?dangerously_authenticate_using_api_token=true"
    );
    assert.equal(
      new Headers(upstreamCalls[0]?.init.headers).get("authorization"),
      `Token token=${token}`
    );
  } finally {
    await client.close();
    await handler.close();
  }
});
