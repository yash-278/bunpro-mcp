import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const inheritedEnvironment = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
);

assert.ok(inheritedEnvironment.BUNPRO_API_TOKEN, "BUNPRO_API_TOKEN must be configured for the live smoke test.");

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

  const result = await client.callTool({ name: "get_connection_status", arguments: {} });
  assert.equal(result.isError, undefined);

  const connection = result.structuredContent as Record<string, unknown> | undefined;
  assert.equal(connection?.connected, true);
  assert.equal(connection?.authentication_method, "account_api_token");
  assert.equal(connection?.token_source, "environment");
  assert.equal(connection?.token_persisted_by_server, false);
  assert.equal(connection?.api_authenticated, true);
  assert.equal(connection?.stateless, true);

  process.stdout.write(`${JSON.stringify(connection, null, 2)}\n`);
} finally {
  await client.close();
}
