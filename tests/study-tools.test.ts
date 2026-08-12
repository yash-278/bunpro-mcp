import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createHttpMcpHandler } from "../src/http-server.js";
import type { FetchLike } from "../src/bunpro/client.js";

const fixtures: Record<string, unknown> = {
  "/api/frontend/user": {
    user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } }
  },
  "/api/frontend/user_stats/review_heatmap": {
    grammar: { "2026-08-10": 3, "2026-08-11": 4 },
    vocab: { "2026-08-10": 2 },
    mixed: { "2026-08-10": 6, "2026-08-11": 4 }
  },
  "/api/frontend/user_stats/new_content_heatmap": {
    grammar: { "2026-08-10": 1 },
    vocab: { "2026-08-10": 2 },
    mixed: { "2026-08-10": 3 }
  },
  "/api/frontend/user_stats/accuracy_over_time": {
    "2026-08-10": 88.5
  }
};

async function withMcpClient(
  fetchImplementation: FetchLike,
  run: (client: Client) => Promise<void>
): Promise<void> {
  const handler = createHttpMcpHandler(fetchImplementation);
  const transport = new StreamableHTTPClientTransport(new URL("https://mcp.example/mcp"), {
    authProvider: { token: async () => "account-token" },
    fetch: (input, init) => handler.fetch(new Request(input, init))
  });
  const client = new Client({ name: "study-tools-test", version: "0.1.0" });
  try {
    await client.connect(transport);
    await run(client);
  } finally {
    await client.close();
    await handler.close();
  }
}

function fixtureFetch(requestedPaths: string[]): FetchLike {
  return async input => {
    const url = new URL(input instanceof Request ? input.url : input);
    requestedPaths.push(url.pathname);
    const body = fixtures[url.pathname];
    return body === undefined
      ? new Response("not found", { status: 404 })
      : Response.json(body);
  };
}

test("get_study_day_summary returns normalized source-backed evidence after authenticating first", async () => {
  const requestedPaths: string[] = [];
  await withMcpClient(fixtureFetch(requestedPaths), async client => {
    const result = await client.callTool({
      name: "get_study_day_summary",
      arguments: { date: "2026-08-10", expected_timezone: "Asia/Kolkata" }
    });

    assert.equal(result.isError, undefined);
    const output = result.structuredContent as Record<string, any>;
    assert.equal(output.study_day, "2026-08-10");
    assert.equal(output.source_timezone, "Asia/Kolkata");
    assert.equal(output.timezone_matches, true);
    assert.equal(output.in_progress, false);
    assert.equal(output.overall_query_status, "complete");
    assert.deepEqual(output.reviews, {
      coverage: "available",
      grammar: 3,
      vocabulary: 2,
      source_total: 6,
      component_sum: 5,
      consistency: "mismatch"
    });
    assert.deepEqual(output.new_content, {
      coverage: "available",
      grammar: 1,
      vocabulary: 2,
      source_total: 3,
      component_sum: 3,
      consistency: "match"
    });
    assert.deepEqual(output.accuracy, { coverage: "available", percent: 88.5 });
    assert.equal(output.activity_evidence, "recorded");
    assert.deepEqual(requestedPaths, [
      "/api/frontend/user",
      "/api/frontend/user_stats/review_heatmap",
      "/api/frontend/user_stats/new_content_heatmap",
      "/api/frontend/user_stats/accuracy_over_time"
    ]);
  });
});

test("get_study_day_summary preserves activity evidence when accuracy coverage is unavailable", async () => {
  const requestedPaths: string[] = [];
  const partialFetch: FetchLike = async input => {
    const url = new URL(input instanceof Request ? input.url : input);
    requestedPaths.push(url.pathname);
    if (url.pathname === "/api/frontend/user_stats/accuracy_over_time") {
      return new Response("route unavailable", { status: 404 });
    }
    const body = fixtures[url.pathname];
    return body === undefined ? new Response("not found", { status: 404 }) : Response.json(body);
  };

  await withMcpClient(partialFetch, async client => {
    const result = await client.callTool({
      name: "get_study_day_summary",
      arguments: { date: "2026-08-10" }
    });
    assert.equal(result.isError, undefined);
    const output = result.structuredContent as Record<string, any>;
    assert.equal(output.overall_query_status, "partial");
    assert.equal(output.activity_evidence, "recorded");
    assert.deepEqual(output.accuracy, { coverage: "unavailable", percent: null });
    assert.deepEqual(output.source_coverage.accuracy, {
      status: "contract_changed",
      first_record_date: null,
      last_record_date: null
    });
    assert.equal(requestedPaths.length, 4);
  });
});

test("get_study_range_summary fetches each source once and returns every requested calendar day", async () => {
  const requestedPaths: string[] = [];
  await withMcpClient(fixtureFetch(requestedPaths), async client => {
    const result = await client.callTool({
      name: "get_study_range_summary",
      arguments: {
        start_date: "2026-08-10",
        end_date: "2026-08-12",
        expected_timezone: "Asia/Kolkata"
      }
    });

    assert.equal(result.isError, undefined);
    const output = result.structuredContent as Record<string, any>;
    assert.equal(output.requested_start_date, "2026-08-10");
    assert.equal(output.requested_end_date, "2026-08-12");
    assert.deepEqual(output.days.map((day: any) => day.study_day), [
      "2026-08-10",
      "2026-08-11",
      "2026-08-12"
    ]);
    assert.equal(output.days[2].activity_evidence, "no_source_record");
    assert.deepEqual(output.aggregates, {
      reviews: { source_record_days: 2, source_total: 10 },
      new_content: { source_record_days: 1, source_total: 3 },
      accuracy: { source_record_days: 1, average_percent: 88.5 }
    });
    assert.deepEqual(output.contiguous_checked_through, {
      activity: "2026-08-12",
      accuracy: "2026-08-12",
      all_sources: "2026-08-12"
    });
    assert.deepEqual(requestedPaths, [
      "/api/frontend/user",
      "/api/frontend/user_stats/review_heatmap",
      "/api/frontend/user_stats/new_content_heatmap",
      "/api/frontend/user_stats/accuracy_over_time"
    ]);
  });
});

test("study tools reject invalid and oversized ranges before making Bunpro requests", async () => {
  let calls = 0;
  const countingFetch: FetchLike = async () => {
    calls += 1;
    return Response.json(fixtures["/api/frontend/user"]);
  };
  await withMcpClient(countingFetch, async client => {
    const invalidDay = await client.callTool({
      name: "get_study_day_summary",
      arguments: { date: "2026-02-30" }
    });
    assert.equal(invalidDay.isError, true);

    const reversed = await client.callTool({
      name: "get_study_range_summary",
      arguments: { start_date: "2026-08-10", end_date: "2026-08-09" }
    });
    assert.equal(reversed.isError, true);

    const tooLong = await client.callTool({
      name: "get_study_range_summary",
      arguments: { start_date: "2026-01-01", end_date: "2026-04-04" }
    });
    assert.equal(tooLong.isError, true);
    assert.equal(calls, 0);
  });
});

test("a rate limit on the first Study Day source stops the operation without fan-out", async () => {
  const requestedPaths: string[] = [];
  const throttledFetch: FetchLike = async input => {
    const url = new URL(input instanceof Request ? input.url : input);
    requestedPaths.push(url.pathname);
    if (url.pathname === "/api/frontend/user") return Response.json(fixtures[url.pathname]);
    return new Response("slow down", { status: 429 });
  };
  await withMcpClient(throttledFetch, async client => {
    const result = await client.callTool({
      name: "get_study_day_summary",
      arguments: { date: "2026-08-10" }
    });
    assert.equal(result.isError, true);
    assert.match((result.content[0] as { text: string }).text, /^BUNPRO_RATE_LIMITED:/);
    assert.deepEqual(requestedPaths, [
      "/api/frontend/user",
      "/api/frontend/user_stats/review_heatmap"
    ]);
  });
});

test("future Study Days stop after the timezone authentication request", async () => {
  const requestedPaths: string[] = [];
  await withMcpClient(fixtureFetch(requestedPaths), async client => {
    const result = await client.callTool({
      name: "get_study_day_summary",
      arguments: { date: "2999-01-01" }
    });
    assert.equal(result.isError, true);
    assert.deepEqual(requestedPaths, ["/api/frontend/user"]);
  });
});
