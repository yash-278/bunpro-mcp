import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { BunproClient, credentialsFromEnvironment } from "./bunpro/client.js";
import { BunproAccountNotLinkedError, connectionErrorMessage } from "./bunpro/errors.js";
import { ConnectionStatusOutputSchema } from "./bunpro/schemas.js";

export type BunproClientFactory = () => Pick<BunproClient, "checkConnection">;

export interface ServerOptions {
  oauthScopes?: string[];
}

export function createServer(
  clientFactory: BunproClientFactory = () => new BunproClient(credentialsFromEnvironment()),
  options: ServerOptions = {}
): McpServer {
  const server = new McpServer({ name: "bunpro-mcp-server", version: "0.1.0" });
  let sharedClient: Pick<BunproClient, "checkConnection"> | undefined;
  const getClient = (): Pick<BunproClient, "checkConnection"> => {
    sharedClient ??= clientFactory();
    return sharedClient;
  };

  server.registerTool(
    "get_connection_status",
    {
      title: "Check Bunpro connection",
      description:
        "Verify the current user's Bunpro authentication. The MCP reuses a valid session, attempts a web-session refresh after an authorization failure, and performs a credential login only when needed. It returns no credentials, cookies, CSRF values, or tokens.",
      inputSchema: z.object({}).strict(),
      outputSchema: ConnectionStatusOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true
      },
      ...(options.oauthScopes
        ? { _meta: { securitySchemes: [{ type: "oauth2", scopes: options.oauthScopes }] } }
        : {})
    },
    async (): Promise<CallToolResult> => {
      try {
        const structuredContent = await getClient().checkConnection();
        return {
          content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
          structuredContent
        };
      } catch (error) {
        if (error instanceof BunproAccountNotLinkedError) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `${connectionErrorMessage(error)}\nSetup URL: ${error.setupUrl}`
              }
            ]
          };
        }
        return {
          isError: true,
          content: [{ type: "text", text: connectionErrorMessage(error) }]
        };
      }
    }
  );

  return server;
}
