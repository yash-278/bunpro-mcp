import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createHttpMcpHandler } from "../src/http-server.js";
import type { FetchLike } from "../src/bunpro/client.js";
import { InMemoryFrontendSource } from "../src/bunpro/in-memory-frontend-source.js";
import { getReviewSchedule, listStudyDecks } from "../src/bunpro/planning.js";

async function withMcpClient(
  fetchImplementation: FetchLike,
  run: (client: Client) => Promise<void>,
  clock: () => Date = () => new Date()
): Promise<void> {
  const handler = createHttpMcpHandler(fetchImplementation, clock);
  const transport = new StreamableHTTPClientTransport(new URL("https://mcp.example/mcp"), {
    authProvider: { token: async () => "account-token" },
    fetch: (input, init) => handler.fetch(new Request(input, init))
  });
  const client = new Client({ name: "planning-tools-test", version: "0.1.0" });
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
    return fixture === undefined
      ? new Response("not found", { status: 404 })
      : Response.json(fixture);
  };
}

const userFixture = {
  user: { data: { attributes: { time_zone_iana: "Asia/Kolkata" } } }
};

test("get_review_schedule separates due-now work from the normalized 14-day forecast", async () => {
  const source = new InMemoryFrontendSource({
    accountContext: { sourceTimezone: "Asia/Kolkata", tokenSource: "environment" },
    reviewPlanning: {
      dueNow: { grammar: 5, vocabulary: 7 },
      forecast: {
        laterToday: { grammar: 2, vocabulary: 1 },
        tomorrow: { grammar: 3, vocabulary: 5 },
        dated: [{ date: "2026-08-14", grammar: 4, vocabulary: 6 }]
      }
    }
  });

  const output = await getReviewSchedule(source, new Date("2026-08-12T12:00:00.000Z"));
  assert.equal(output.source_timezone, "Asia/Kolkata");
  assert.equal(output.retrieved_at, "2026-08-12T12:00:00.000Z");
  assert.deepEqual(output.due_now, { grammar: 5, vocabulary: 7, total: 12 });
  assert.deepEqual(output.forecast, [
    { bucket: "later_today", date: "2026-08-12", grammar: 2, vocabulary: 1, total: 3 },
    { bucket: "tomorrow", date: "2026-08-13", grammar: 3, vocabulary: 5, total: 8 },
    { bucket: "date", date: "2026-08-14", grammar: 4, vocabulary: 6, total: 10 }
  ]);
});

test("list_study_decks returns bounded active study configuration without unrelated deck metadata", async () => {
  const source = new InMemoryFrontendSource({
    accountContext: { sourceTimezone: "Asia/Kolkata", tokenSource: "environment" },
    deckConfiguration: {
      decks: [
        {
          deckId: "101",
          title: "N3 Grammar",
          slug: "n3-grammar",
          deckType: "grammar",
          activelyStudying: true,
          batchSize: 3,
          dailyGoal: 5,
          dailyGoalProgress: { grammar: 2, vocabulary: 1 },
          completed: { grammar: 20, vocabulary: 10 },
          content: { grammar: 200, vocabulary: 0 }
        },
        {
          deckId: "102",
          title: "Inactive",
          slug: "inactive",
          deckType: "mixed",
          activelyStudying: false,
          batchSize: 1,
          dailyGoal: 2,
          dailyGoalProgress: { grammar: 0, vocabulary: 0 },
          completed: { grammar: 1, vocabulary: 1 },
          content: { grammar: 1, vocabulary: 1 }
        }
      ]
    }
  });

  const output = await listStudyDecks(source, { active_only: true, limit: 20 });
  assert.deepEqual(output, {
    active_only: true,
    count: 1,
    total_matching: 1,
    has_more: false,
    decks: [{
      deck_id: "101",
      title: "N3 Grammar",
      slug: "n3-grammar",
      deck_type: "grammar",
      actively_studying: true,
      batch_size: 3,
      daily_goal: 5,
      daily_goal_progress: { grammar: 2, vocabulary: 1 },
      completed: { grammar: 20, vocabulary: 10 },
      content: { grammar: 200, vocabulary: 0 }
    }]
  });
});

test("get_recent_activity returns a bounded last-24-hours view without embedded lesson content", async () => {
  const paths: string[] = [];
  const attempt = (id: number, status: boolean) => ({
    id,
    time: `2026-08-12T0${id}:00:00.000Z`,
    status,
    type: "grammar",
    study_question: { answer: "must not be returned" },
    reviewable: {
      data: {
        id: String(100 + id),
        type: "grammar_point",
        attributes: {
          title: `Grammar ${id}`,
          meaning: "embedded meaning must not be returned",
          nuance: "embedded nuance must not be returned"
        }
      }
    }
  });
  const fetch = fixtureFetch({
    "/api/frontend/user": userFixture,
    "/api/frontend/summary/last_24_hours": {
      history_objects: [attempt(1, true), attempt(2, false)],
      next_review: 123456,
      review_sessions: {
        data: [
          { id: "1", type: "review_session", attributes: {
            starting_xp: 100,
            ending_xp: 110,
            starting_buncoin: 5,
            ending_buncoin: 7,
            starting_level: 1
          } },
          { id: "2", type: "review_session", attributes: {
            starting_xp: 110,
            ending_xp: 125,
            starting_buncoin: 7,
            ending_buncoin: 8,
            starting_level: 1
          } }
        ]
      }
    }
  }, paths);

  await withMcpClient(fetch, async client => {
    const result = await client.callTool({
      name: "get_recent_activity",
      arguments: { limit: 1 }
    });
    assert.equal(result.isError, undefined);
    assert.deepEqual(result.structuredContent, {
      source_timezone: "Asia/Kolkata",
      view: "last_24_hours",
      count: 1,
      total_available: 2,
      has_more: true,
      completeness: "upstream_rolling_window_not_guaranteed_complete",
      attempts: [{
        attempt_id: "1",
        time: "2026-08-12T01:00:00.000Z",
        correct: true,
        content_type: "grammar_point",
        content_id: "101",
        label: "Grammar 1"
      }],
      sessions: { count: 2, xp_delta: 25, buncoin_delta: 3 }
    });
    assert.doesNotMatch(JSON.stringify(result.structuredContent), /next_review|answer|meaning|nuance|starting_level/);
    assert.deepEqual(paths, ["/api/frontend/user", "/api/frontend/summary/last_24_hours"]);
  });
});

test("get_recent_activity latest-attempts view calls only the dedicated source", async () => {
  const paths: string[] = [];
  const fetch = fixtureFetch({
    "/api/frontend/user": userFixture,
    "/api/frontend/user_stats/last_done_reviews": [{
      id: 9,
      time: "2026-08-12T09:00:00.000Z",
      status: false,
      type: "vocab",
      study_question: null,
      reviewable: {
        data: {
          id: "209",
          type: "vocabulary",
          attributes: { slug: "word-slug", meaning: "not returned" }
        }
      }
    }]
  }, paths);
  await withMcpClient(fetch, async client => {
    const result = await client.callTool({
      name: "get_recent_activity",
      arguments: { view: "latest_attempts", limit: 20 }
    });
    assert.equal(result.isError, undefined);
    const output = result.structuredContent as Record<string, any>;
    assert.equal(output.view, "latest_attempts");
    assert.equal(output.sessions, null);
    assert.equal(output.attempts[0].label, "word-slug");
    assert.deepEqual(paths, ["/api/frontend/user", "/api/frontend/user_stats/last_done_reviews"]);
  });
});
