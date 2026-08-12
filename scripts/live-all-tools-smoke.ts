import assert from "node:assert/strict";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createHttpMcpHandler } from "../src/http-server.js";

const apiToken = process.env.BUNPRO_API_TOKEN;
assert.ok(apiToken, "BUNPRO_API_TOKEN must be configured for the live tool smoke test.");

const remoteUrl = process.env.BUNPRO_MCP_URL;
const handler = remoteUrl === undefined ? createHttpMcpHandler() : undefined;
const transport = new StreamableHTTPClientTransport(new URL(remoteUrl ?? "https://local-smoke.invalid/mcp"), {
  authProvider: { token: async () => apiToken },
  fetch: handler === undefined
    ? fetch
    : (input, init) => handler.fetch(new Request(input, init))
});
const client = new Client({ name: "bunpro-mcp-all-tools-smoke", version: "0.1.0" });

try {
  await client.connect(transport);
  const connection = await call("get_connection_status", {});
  const timezone = requiredString(connection, "source_timezone");
  const today = calendarDate(new Date(), timezone);
  const yesterday = addDays(today, -1);
  const weekStart = addDays(yesterday, -6);

  await pause();
  await call("get_study_day_summary", { date: yesterday, expected_timezone: timezone });
  await pause();
  await call("get_study_range_summary", {
    start_date: weekStart,
    end_date: yesterday,
    expected_timezone: timezone
  });
  await pause();
  await call("get_review_schedule", {});
  await pause();
  await call("list_study_decks", { active_only: true, limit: 1 });
  await pause();
  await call("get_recent_activity", { view: "last_24_hours", limit: 1 });
  await pause();
  await call("get_learning_progress", {});
  await pause();
  await call("get_activity_trend", {
    start_date: weekStart,
    end_date: yesterday,
    expected_timezone: timezone
  });
} finally {
  await client.close();
  await handler?.close();
}

async function call(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const result = await client.callTool({ name, arguments: args });
  assert.equal(result.isError, undefined, `${name} returned an MCP error.`);
  assert.ok(result.structuredContent, `${name} did not return structured content.`);
  process.stdout.write(`${name}: ok\n`);
  return result.structuredContent as Record<string, unknown>;
}

function requiredString(value: Record<string, unknown>, key: string): string {
  const candidate = value[key];
  if (typeof candidate !== "string") {
    throw new Error(`${key} must be a string.`);
  }
  return candidate;
}

function calendarDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

async function pause(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 750));
}
