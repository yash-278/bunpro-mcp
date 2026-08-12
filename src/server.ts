import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { BunproClient, credentialsFromEnvironment } from "./bunpro/client.js";
import { BunproAccountNotLinkedError, connectionErrorMessage } from "./bunpro/errors.js";
import {
  ConnectionStatusOutputSchema,
  DisconnectOutputSchema,
  type ConnectionStatus,
  type DisconnectStatus
} from "./bunpro/schemas.js";

export interface BunproAccountAccess {
  checkConnection(): Promise<ConnectionStatus>;
  disconnect?(): Promise<DisconnectStatus>;
}

export type BunproClientFactory = () => BunproAccountAccess;

export interface ServerOptions {
  oauthScopes?: string[];
  allowAccountDisconnect?: boolean;
}

export function createServer(
  clientFactory: BunproClientFactory = () => new BunproClient(credentialsFromEnvironment()),
  options: ServerOptions = {}
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

  if (options.allowAccountDisconnect) {
    server.registerTool(
      "disconnect_bunpro_account",
      {
        title: "Disconnect Bunpro account",
        description:
          "Remove the current user's encrypted Bunpro credentials, cookies, and frontend token from active hosted MCP storage. Reconnecting requires entering Bunpro credentials again.",
        inputSchema: z.object({
          confirm: z.literal(true).describe("Must be true to confirm permanent removal of the linked Bunpro authentication data.")
        }).strict(),
        outputSchema: DisconnectOutputSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: true,
          openWorldHint: true
        },
        ...(options.oauthScopes
          ? { _meta: { securitySchemes: [{ type: "oauth2", scopes: options.oauthScopes }] } }
          : {})
      },
      async (): Promise<CallToolResult> => {
        const account = getClient();
        if (!account.disconnect) {
          return {
            isError: true,
            content: [{ type: "text", text: "Account disconnection is unavailable in this transport." }]
          };
        }

        try {
          const structuredContent = await account.disconnect();
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
  }

  return server;
}
