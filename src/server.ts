import { McpServer, type CallToolResult } from "@modelcontextprotocol/server";
import { toolErrorMessage } from "./bunpro/errors.js";
import type { FrontendSourceOperationFactory } from "./bunpro/frontend-source.js";
import { TOOL_DECLARATIONS } from "./tools.js";

export type Clock = () => Date;

export interface BunproServerOptions {
  sourceOperationFactory: FrontendSourceOperationFactory;
  clock?: Clock;
}

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true
};

export function createServer(options: BunproServerOptions): McpServer {
  const server = new McpServer({ name: "bunpro-mcp-server", version: "0.4.0" });
  const { sourceOperationFactory } = options;
  const clock = options.clock ?? (() => new Date());

  for (const tool of TOOL_DECLARATIONS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        annotations: READ_ONLY_ANNOTATIONS
      },
      async (input): Promise<CallToolResult> => {
        try {
          const source = sourceOperationFactory();
          const now = clock();
          const structuredContent = await tool.run(input, { source, now });
          return {
            content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
            structuredContent
          };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: "text", text: toolErrorMessage(error) }]
          };
        }
      }
    );
  }

  return server;
}
