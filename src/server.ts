import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { BunproClient, credentialsFromEnvironment } from "./bunpro/client.js";
import { connectionErrorMessage } from "./bunpro/errors.js";
import { ConnectionStatusOutputSchema } from "./bunpro/schemas.js";

export type BunproClientFactory = () => Pick<BunproClient, "checkConnection">;

export function createServer(
  clientFactory: BunproClientFactory = () => new BunproClient(credentialsFromEnvironment())
): McpServer {
  const server = new McpServer({ name: "bunpro-mcp-server", version: "0.1.0" });

  server.registerTool(
    "get_connection_status",
    {
      title: "Check Bunpro connection",
      description:
        "Perform a fresh Bunpro login using credentials from the MCP host environment, verify the authenticated web session and frontend API token, and return only non-secret connection metadata. This tool never returns credentials, cookies, CSRF values, or tokens.",
      inputSchema: z.object({}).strict(),
      outputSchema: ConnectionStatusOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async (): Promise<CallToolResult> => {
      try {
        const structuredContent = await clientFactory().checkConnection();
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
