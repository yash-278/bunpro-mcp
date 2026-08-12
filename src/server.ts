import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { BunproClient, apiTokenFromEnvironment } from "./bunpro/client.js";
import { connectionErrorMessage } from "./bunpro/errors.js";
import { ConnectionStatusOutputSchema, type ConnectionStatus } from "./bunpro/schemas.js";
import {
  StudyDayInputSchema,
  StudyDaySummaryOutputSchema,
  StudyRangeInputSchema,
  StudyRangeSummaryOutputSchema
} from "./bunpro/schemas.js";
import { getStudyDaySummary, getStudyRangeSummary } from "./bunpro/study.js";

export interface BunproAccountAccess {
  checkConnection(operationSignal?: AbortSignal): Promise<ConnectionStatus>;
  getFrontendJson(path: string, operationSignal?: AbortSignal): Promise<unknown>;
}

export type BunproClientFactory = () => BunproAccountAccess;

export function createServer(
  clientFactory: BunproClientFactory = () => new BunproClient(apiTokenFromEnvironment())
): McpServer {
  const server = new McpServer({ name: "bunpro-mcp-server", version: "0.1.0" });
  let sharedClient: BunproAccountAccess | undefined;
  const getClient = (): BunproAccountAccess => {
    sharedClient ??= clientFactory();
    return sharedClient;
  };

  server.registerTool(
    "get_connection_status",
    {
      title: "Check Bunpro connection",
      description:
        "Verify that the caller's Bunpro Account API Token can access the read-only Frontend API. The token comes from BUNPRO_API_TOKEN in stdio mode or the request Bearer header in HTTP mode. The MCP never returns or stores the token.",
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
        const structuredContent = await getClient().checkConnection();
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
        const structuredContent = await getStudyDaySummary(getClient(), input);
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
        const structuredContent = await getStudyRangeSummary(getClient(), input);
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
