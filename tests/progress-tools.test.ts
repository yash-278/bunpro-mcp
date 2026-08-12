import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createHttpMcpHandler } from "../src/http-server.js";
import type { FetchLike } from "../src/bunpro/client.js";

async function withMcpClient(
  fetchImplementation: FetchLike,
  run: (client: Client) => Promise<void>
): Promise<void> {
  const handler = createHttpMcpHandler(fetchImplementation);
  const transport = new StreamableHTTPClientTransport(new URL("https://mcp.example/mcp"), {
    authProvider: { token: async () => "account-token" },
    fetch: (input, init) => handler.fetch(new Request(input, init))
  });
  const client = new Client({ name: "progress-tools-test", version: "0.1.0" });
  try {
    await client.connect(transport);
    await run(client);
  } finally {
    await client.close();
    await handler.close();
  }
}

function fixtureFetch(fixtures: Record<string, unknown>, paths: string[]): FetchLike {
  return async input => {
    const url = new URL(input instanceof Request ? input.url : input);
    paths.push(url.pathname);
    const fixture = fixtures[url.pathname];
    return fixture === undefined ? new Response("not found", { status: 404 }) : Response.json(fixture);
  };
}

const userFixture = { user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } } };
const stages = (offset: number) => ({
  beginner: offset + 1,
  adept: offset + 2,
  seasoned: offset + 3,
  expert: offset + 4,
  master: offset + 5,
  total_count: offset + 20
});
const reviewStats = (offset: number) => ({
  accuracy: 80 + offset,
  correct: 8 + offset,
  incorrect: 2,
  total: 10 + offset,
  global: 999
});

test("get_learning_progress normalizes JLPT progress and omits unrelated or unexplained fields", async () => {
  const paths: string[] = [];
  const levels = Object.fromEntries([1, 2, 3, 4, 5].map(level => [String(level), stages(level)]));
  const totals = Object.fromEntries([1, 2, 3, 4, 5].map(level => [String(level), reviewStats(level)]));
  const fetch = fixtureFetch({
    "/api/frontend/user": userFixture,
    "/api/frontend/user_stats/base_stats": {
      facts: {
        days_studied: 30,
        grammar_studied: 120,
        vocab_studied: 50,
        streak: 7,
        total_badges: 9,
        last_session: 123456,
        weekly_streak: [{ day: "Mon", val: true }, { day: "Tue", val: false }]
      },
      badges: { data: [{ id: "private-badge" }] }
    },
    "/api/frontend/user_stats/jlpt_progress_mixed": { grammar: levels, vocab: levels },
    "/api/frontend/user_stats/total_review_stats": {
      grammar: totals,
      vocab: totals,
      mixed: totals
    },
    "/api/frontend/user_stats/total_cram_stats": {
      items: { accuracy: 75, correct: 30, incorrect: 10, total: 40 },
      sessions: {
        average_time: "00:10:00",
        reviews_per_session: 20,
        session_count: 2,
        total_time: "00:20:00"
      }
    }
  }, paths);

  await withMcpClient(fetch, async client => {
    const result = await client.callTool({ name: "get_learning_progress", arguments: {} });
    assert.equal(result.isError, undefined);
    const output = result.structuredContent as Record<string, any>;
    assert.deepEqual(output.base, {
      days_studied: 30,
      grammar_studied: 120,
      vocabulary_studied: 50,
      current_streak: 7,
      total_badges: 9,
      weekly_streak: [{ day: "Mon", studied: true }, { day: "Tue", studied: false }]
    });
    assert.deepEqual(output.jlpt_progress.map((item: any) => item.jlpt_level), ["N5", "N4", "N3", "N2", "N1"]);
    assert.equal(output.jlpt_progress[0].combined.derived, true);
    assert.equal(output.jlpt_progress[0].combined.beginner, 12);
    assert.equal(output.review_totals[0].jlpt_level, "N5");
    assert.equal(output.review_totals[0].mixed.source_supplied, true);
    assert.deepEqual(output.cram.items, { accuracy: 75, correct: 30, incorrect: 10, total: 40 });
    assert.doesNotMatch(JSON.stringify(output), /private-badge|last_session|global/);
    assert.deepEqual(paths, [
      "/api/frontend/user",
      "/api/frontend/user_stats/base_stats",
      "/api/frontend/user_stats/jlpt_progress_mixed",
      "/api/frontend/user_stats/total_review_stats",
      "/api/frontend/user_stats/total_cram_stats"
    ]);
  });
});

test("get_activity_trend preserves daily evidence and averages only source-present records", async () => {
  const paths: string[] = [];
  const fetch = fixtureFetch({
    "/api/frontend/user": userFixture,
    "/api/frontend/user_stats/review_heatmap": {
      grammar: { "2026-08-10": 3, "2026-08-11": 4 },
      vocab: { "2026-08-10": 2 },
      mixed: { "2026-08-10": 5, "2026-08-11": 4 }
    },
    "/api/frontend/user_stats/new_content_heatmap": {
      grammar: { "2026-08-10": 1 },
      vocab: { "2026-08-10": 2 },
      mixed: { "2026-08-10": 3 }
    },
    "/api/frontend/user_stats/accuracy_over_time": {
      "2026-08-10": 80,
      "2026-08-11": 100
    }
  }, paths);
  await withMcpClient(fetch, async client => {
    const result = await client.callTool({
      name: "get_activity_trend",
      arguments: { start_date: "2026-08-10", end_date: "2026-08-12" }
    });
    assert.equal(result.isError, undefined);
    const output = result.structuredContent as Record<string, any>;
    assert.deepEqual(output.metrics, {
      reviews: { source_record_days: 2, total: 9, average_per_source_record_day: 4.5 },
      new_content: { source_record_days: 1, total: 3, average_per_source_record_day: 3 },
      accuracy: { source_record_days: 2, average_percent: 90 }
    });
    assert.equal(output.derived_measures_labeled, true);
    assert.equal(output.days.length, 3);
    assert.equal(output.days[2].reviews.coverage, "no_source_record");
    assert.deepEqual(paths, [
      "/api/frontend/user",
      "/api/frontend/user_stats/review_heatmap",
      "/api/frontend/user_stats/new_content_heatmap",
      "/api/frontend/user_stats/accuracy_over_time"
    ]);
  });
});

test("get_learning_progress fails closed when Bunpro changes its JLPT groups", async () => {
  const paths: string[] = [];
  const incompleteLevels = Object.fromEntries([2, 3, 4, 5].map(level => [String(level), stages(level)]));
  const completeLevels = Object.fromEntries([1, 2, 3, 4, 5].map(level => [String(level), reviewStats(level)]));
  const fetch = fixtureFetch({
    "/api/frontend/user": userFixture,
    "/api/frontend/user_stats/base_stats": {
      facts: {
        days_studied: 1,
        grammar_studied: 1,
        vocab_studied: 1,
        streak: 1,
        total_badges: 0,
        weekly_streak: []
      }
    },
    "/api/frontend/user_stats/jlpt_progress_mixed": {
      grammar: incompleteLevels,
      vocab: incompleteLevels
    },
    "/api/frontend/user_stats/total_review_stats": {
      grammar: completeLevels,
      vocab: completeLevels,
      mixed: completeLevels
    },
    "/api/frontend/user_stats/total_cram_stats": {
      items: { accuracy: 0, correct: 0, incorrect: 0, total: 0 },
      sessions: {
        average_time: "00:00:00",
        reviews_per_session: 0,
        session_count: 0,
        total_time: "00:00:00"
      }
    }
  }, paths);

  await withMcpClient(fetch, async client => {
    const result = await client.callTool({ name: "get_learning_progress", arguments: {} });
    assert.equal(result.isError, true);
    const message = result.content
      .filter(item => item.type === "text")
      .map(item => item.text)
      .join("\n");
    assert.match(message, /unexpected JLPT level groups/i);
    assert.doesNotMatch(message, /account-token|beginner|global/i);
  });
});
