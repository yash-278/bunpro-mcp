import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const inheritedEnvironment = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
);

const client = new Client({ name: "bunpro-mcp-auth-smoke", version: "0.1.0" });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["dist/index.js"],
  env: inheritedEnvironment
});

try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  assert.ok(tools.some(tool => tool.name === "get_connection_status"));

  const firstResult = await client.callTool({ name: "get_connection_status", arguments: {} });
  const secondResult = await client.callTool({ name: "get_connection_status", arguments: {} });
  assert.equal(firstResult.isError, undefined);
  assert.equal(secondResult.isError, undefined);

  const firstConnection = firstResult.structuredContent as Record<string, unknown> | undefined;
  const connection = secondResult.structuredContent as Record<string, unknown> | undefined;
  assert.equal(firstConnection?.session_resolution, "fresh_login");
  assert.equal(connection?.session_resolution, "cached_session");
  assert.equal(connection?.authentication_cache, "process_memory");
  assert.equal(connection?.connected, true);
  assert.equal(connection?.web_session_authenticated, true);
  assert.equal(connection?.frontend_token_obtained, true);
  assert.equal(connection?.api_authenticated, true);
  assert.equal(connection?.stateless, true);

  process.stdout.write(`${JSON.stringify({ first_call: firstConnection, second_call: connection }, null, 2)}\n`);
} finally {
  await client.close();
}
