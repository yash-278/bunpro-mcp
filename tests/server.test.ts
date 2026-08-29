import assert from "node:assert/strict";
import test from "node:test";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import * as z from "zod/v4";
import { InMemoryFrontendSource } from "../src/bunpro/in-memory-frontend-source.js";
import {
  ActivityTrendOutputSchema,
  ConnectionStatusOutputSchema,
  LearningProgressOutputSchema,
  ListStudyDecksInputSchema,
  ListStudyDecksOutputSchema,
  RecentActivityInputSchema,
  RecentActivityOutputSchema,
  ReviewScheduleOutputSchema,
  StudyDayInputSchema,
  StudyDaySummaryOutputSchema,
  StudyRangeInputSchema,
  StudyRangeSummaryOutputSchema
} from "../src/bunpro/schemas.js";
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

test("the MCP adapter exposes exactly eight read-only tools and preserves structured output", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const sourceData = {
    accountContext: {
      sourceTimezone: "Asia/Kolkata",
      tokenSource: "request_header" as const
    },
    reviewPlanning: {
      dueNow: { grammar: 2, vocabulary: 3 },
      forecast: {
        laterToday: { grammar: 1, vocabulary: 0 },
        tomorrow: { grammar: 2, vocabulary: 1 },
        dated: []
      }
    }
  };
  const server = createServer({
    sourceOperationFactory: () => new InMemoryFrontendSource(sourceData),
    clock: () => new Date("2026-08-12T12:00:00.000Z")
  });
  const client = new Client({ name: "server-adapter-test", version: "0.1.0" });

  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const listing = await client.listTools();
    const emptyInput = z.object({}).strict();
    const expectedSchemas: Record<string, { input: z.ZodType; output: z.ZodType }> = {
      get_connection_status: { input: emptyInput, output: ConnectionStatusOutputSchema },
      get_study_day_summary: { input: StudyDayInputSchema, output: StudyDaySummaryOutputSchema },
      get_study_range_summary: { input: StudyRangeInputSchema, output: StudyRangeSummaryOutputSchema },
      get_review_schedule: { input: emptyInput, output: ReviewScheduleOutputSchema },
      list_study_decks: { input: ListStudyDecksInputSchema, output: ListStudyDecksOutputSchema },
      get_recent_activity: { input: RecentActivityInputSchema, output: RecentActivityOutputSchema },
      get_learning_progress: { input: emptyInput, output: LearningProgressOutputSchema },
      get_activity_trend: { input: StudyRangeInputSchema, output: ActivityTrendOutputSchema }
    };
    assert.deepEqual(listing.tools.map(tool => tool.name), Object.keys(expectedSchemas));
    for (const tool of listing.tools) {
      assert.deepEqual(tool.annotations, {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      });
      const schemas = expectedSchemas[tool.name];
      assert.ok(schemas);
      assert.deepEqual(tool.inputSchema, z.toJSONSchema(schemas.input, { io: "input" }));
      assert.deepEqual(tool.outputSchema, z.toJSONSchema(schemas.output));
    }

    const success = await client.callTool({ name: "get_review_schedule", arguments: {} });
    assert.equal(success.isError, undefined);
    const text = success.content.find(item => item.type === "text");
    assert.equal(text?.type, "text");
    if (text?.type === "text") {
      assert.deepEqual(JSON.parse(text.text), success.structuredContent);
    }

    const invalid = await client.callTool({
      name: "get_study_day_summary",
      arguments: { date: "not-a-date" }
    });
    assert.equal(invalid.isError, true);
  } finally {
    await client.close();
    await server.close();
  }
});

test("the MCP adapter sanitizes unexpected source failures", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  class UnexpectedReviewSource extends InMemoryFrontendSource {
    override async loadReviewPlanning(): Promise<never> {
      throw new Error("secret upstream response");
    }
  }
  const server = createServer({
    sourceOperationFactory: () => new UnexpectedReviewSource({
      accountContext: { sourceTimezone: "Asia/Kolkata", tokenSource: "request_header" }
    })
  });
  const client = new Client({ name: "server-error-test", version: "0.1.0" });

  try {
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    const result = await client.callTool({ name: "get_review_schedule", arguments: {} });
    assert.equal(result.isError, true);
    const message = result.content
      .filter(item => item.type === "text")
      .map(item => item.text)
      .join("\n");
    assert.match(message, /^BUNPRO_UPSTREAM_UNAVAILABLE:/);
    assert.doesNotMatch(message, /secret upstream response/);
  } finally {
    await client.close();
    await server.close();
  }
});
