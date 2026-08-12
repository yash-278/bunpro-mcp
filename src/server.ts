import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { BunproClient, apiTokenFromEnvironment } from "./bunpro/client.js";
import { connectionErrorMessage } from "./bunpro/errors.js";
import { ConnectionStatusOutputSchema, type ConnectionStatus } from "./bunpro/schemas.js";

export interface BunproAccountAccess {
  checkConnection(): Promise<ConnectionStatus>;
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

  return server;
}
