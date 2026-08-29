import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { BunproClient, BunproRequestGate, apiTokenFromEnvironment } from "./bunpro/client.js";
import { connectionErrorMessage } from "./bunpro/errors.js";
import {
  createFrontendSourceOperationFactory,
  type FrontendSourceOperationFactory
} from "./bunpro/frontend-source.js";
import { ConnectionStatusOutputSchema, type ConnectionStatus } from "./bunpro/schemas.js";
import {
  StudyDayInputSchema,
  StudyDaySummaryOutputSchema,
  StudyRangeInputSchema,
  StudyRangeSummaryOutputSchema,
  ReviewScheduleOutputSchema,
  ListStudyDecksInputSchema,
  ListStudyDecksOutputSchema,
  RecentActivityInputSchema,
  RecentActivityOutputSchema,
  LearningProgressOutputSchema,
  ActivityTrendOutputSchema
} from "./bunpro/schemas.js";
import { getStudyDaySummary, getStudyRangeSummary } from "./bunpro/study.js";
import { getRecentActivity, getReviewSchedule, listStudyDecks } from "./bunpro/planning.js";
import { getActivityTrend, getLearningProgress } from "./bunpro/progress.js";

export interface BunproAccountAccess {
  checkConnection(operationSignal?: AbortSignal): Promise<ConnectionStatus>;
  getFrontendJson(path: string, operationSignal?: AbortSignal): Promise<unknown>;
}

export type BunproClientFactory = () => BunproAccountAccess;
export type Clock = () => Date;

export interface BunproServerOptions {
  sourceOperationFactory?: FrontendSourceOperationFactory;
  legacyClientFactory?: BunproClientFactory;
  clock?: Clock;
}

export function createServer(options: BunproServerOptions = {}): McpServer {
  const server = new McpServer({ name: "bunpro-mcp-server", version: "0.4.0" });
  const requestGate = new BunproRequestGate({ maximumConcurrent: 4, maximumQueued: 16 });
  const legacyClientFactory = options.legacyClientFactory
    ?? (() => new BunproClient(apiTokenFromEnvironment(), fetch, { requestGate }));
  const sourceOperationFactory = options.sourceOperationFactory
    ?? createFrontendSourceOperationFactory(apiTokenFromEnvironment, fetch, { requestGate });
  const clock = options.clock ?? (() => new Date());
  let sharedClient: BunproAccountAccess | undefined;
  const getClient = (): BunproAccountAccess => {
    sharedClient ??= legacyClientFactory();
    return sharedClient;
  };

  server.registerTool(
    "get_connection_status",
    {
      title: "Check Bunpro connection",
      description:
        "Verify that the caller's Bunpro Account API Token can access the read-only Frontend API. The token comes from BUNPRO_API_TOKEN in stdio mode or X-Bunpro-Token in HTTP mode. The MCP never returns or stores the token.",
      inputSchema: z.object({}).strict(),
      outputSchema: ConnectionStatusOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (): Promise<CallToolResult> => {
      try {
        const accountContext = await sourceOperationFactory().getAccountContext();
        const structuredContent: ConnectionStatus = {
          connected: true,
          authentication_method: "account_api_token",
          token_source: accountContext.tokenSource,
          token_persisted_by_server: false,
          api_authenticated: true,
          source_timezone: accountContext.sourceTimezone,
          stateless: true
        };
        return {
          content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
          structuredContent
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: connectionErrorMessage(error) }]
        };
      }
    }
  );

  server.registerTool(
    "get_study_day_summary",
    {
      title: "Get Bunpro Study Day summary",
      description:
        "Return source-backed Bunpro review, new-content, and accuracy evidence for one exact Bunpro calendar day. Missing sparse records remain unknown rather than zero.",
      inputSchema: StudyDayInputSchema,
      outputSchema: StudyDaySummaryOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async input => {
      try {
        const structuredContent = await getStudyDaySummary(getClient(), input, clock());
        return {
          content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
          structuredContent
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: connectionErrorMessage(error) }]
        };
      }
    }
  );

  server.registerTool(
    "get_study_range_summary",
    {
      title: "Get Bunpro Study range summary",
      description:
        "Return one source-backed entry for every inclusive Bunpro calendar day in a range of at most 93 days, using one bounded set of upstream requests.",
      inputSchema: StudyRangeInputSchema,
      outputSchema: StudyRangeSummaryOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async input => {
      try {
        const structuredContent = await getStudyRangeSummary(getClient(), input, clock());
        return {
          content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
          structuredContent
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: connectionErrorMessage(error) }]
        };
      }
    }
  );

  server.registerTool(
    "get_review_schedule",
    {
      title: "Get Bunpro review schedule",
      description:
        "Return current grammar and vocabulary reviews due plus Bunpro's forecast from later today through its current daily horizon. Forecast values are projections, not completed study.",
      inputSchema: z.object({}).strict(),
      outputSchema: ReviewScheduleOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async () => {
      try {
        const structuredContent = await getReviewSchedule(getClient(), clock());
        return {
          content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
          structuredContent
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: connectionErrorMessage(error) }]
        };
      }
    }
  );

  server.registerTool(
    "list_study_decks",
    {
      title: "List Bunpro study decks",
      description:
        "List bounded Bunpro study-deck configuration, goals, progress, and content counts. These are study decks, not queued review items.",
      inputSchema: ListStudyDecksInputSchema,
      outputSchema: ListStudyDecksOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async input => {
      try {
        const structuredContent = await listStudyDecks(getClient(), input);
        return {
          content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
          structuredContent
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: connectionErrorMessage(error) }]
        };
      }
    }
  );

  server.registerTool(
    "get_recent_activity",
    {
      title: "Get recent Bunpro activity",
      description:
        "Return a bounded rolling last-24-hours view or latest-attempts view. The source does not guarantee complete history or pagination.",
      inputSchema: RecentActivityInputSchema,
      outputSchema: RecentActivityOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async input => {
      try {
        const structuredContent = await getRecentActivity(getClient(), input);
        return {
          content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
          structuredContent
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: connectionErrorMessage(error) }]
        };
      }
    }
  );

  server.registerTool(
    "get_learning_progress",
    {
      title: "Get Bunpro learning progress",
      description:
        "Return normalized account study facts, JLPT N5-N1 SRS-stage progress, JLPT review totals, and cram aggregates without badge or profile details.",
      inputSchema: z.object({}).strict(),
      outputSchema: LearningProgressOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async () => {
      try {
        const structuredContent = await getLearningProgress(getClient(), clock());
        return {
          content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
          structuredContent
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: connectionErrorMessage(error) }]
        };
      }
    }
  );

  server.registerTool(
    "get_activity_trend",
    {
      title: "Get Bunpro activity trend",
      description:
        "Return preserved daily review, new-content, and accuracy evidence plus explicitly derived totals and source-present-day averages for a range of at most 93 days.",
      inputSchema: StudyRangeInputSchema,
      outputSchema: ActivityTrendOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async input => {
      try {
        const structuredContent = await getActivityTrend(getClient(), input, clock());
        return {
          content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
          structuredContent
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: connectionErrorMessage(error) }]
        };
      }
    }
  );

  return server;
}
