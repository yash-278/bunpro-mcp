import assert from "node:assert/strict";
import test from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { InMemoryFrontendSource } from "../src/bunpro/in-memory-frontend-source.js";
import { createServer } from "../src/server.js";

test("get_connection_status creates a fresh Frontend source operation for every call", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  let operations = 0;
  const server = createServer({
    sourceOperationFactory: () => {
      operations += 1;
      return new InMemoryFrontendSource({
        accountContext: {
          sourceTimezone: operations === 1 ? "Asia/Kolkata" : "Asia/Tokyo",
          tokenSource: "request_header"
        }
      });
    }
  });
  const client = new Client({ name: "server-test", version: "0.1.0" });

  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const first = await client.callTool({ name: "get_connection_status", arguments: {} });
    const second = await client.callTool({ name: "get_connection_status", arguments: {} });

    assert.deepEqual(first.structuredContent, {
      connected: true,
      authentication_method: "account_api_token",
      token_source: "request_header",
      token_persisted_by_server: false,
      api_authenticated: true,
      source_timezone: "Asia/Kolkata",
      stateless: true
    });
    assert.deepEqual(second.structuredContent, {
      connected: true,
      authentication_method: "account_api_token",
      token_source: "request_header",
      token_persisted_by_server: false,
      api_authenticated: true,
      source_timezone: "Asia/Tokyo",
      stateless: true
    });
    assert.equal(operations, 2);
  } finally {
    await client.close();
    await server.close();
  }
});
