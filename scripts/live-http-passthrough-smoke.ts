import assert from "node:assert/strict";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createHttpMcpHandler } from "../src/http-server.js";

const apiToken = process.env.BUNPRO_API_TOKEN;
assert.ok(apiToken, "BUNPRO_API_TOKEN must be configured for the live HTTP passthrough smoke test.");

const handler = createHttpMcpHandler();
const transport = new StreamableHTTPClientTransport(new URL("https://local-smoke.invalid/mcp"), {
  requestInit: { headers: { "X-Bunpro-Token": apiToken } },
  fetch: (input, init) => handler.fetch(new Request(input, init))
});
const client = new Client({ name: "bunpro-mcp-http-smoke", version: "0.1.0" });

try {
  await client.connect(transport);
  const result = await client.callTool({ name: "get_connection_status", arguments: {} });
  assert.equal(result.isError, undefined);

  const connection = result.structuredContent as Record<string, unknown> | undefined;
  assert.equal(connection?.connected, true);
  assert.equal(connection?.authentication_method, "account_api_token");
  assert.equal(connection?.token_source, "request_header");
  assert.equal(connection?.token_persisted_by_server, false);
  assert.equal(connection?.api_authenticated, true);
  assert.equal(connection?.stateless, true);

  process.stdout.write(`${JSON.stringify(connection, null, 2)}\n`);
} finally {
  await client.close();
  await handler.close();
}
