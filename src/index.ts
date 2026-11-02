#!/usr/bin/env node

import { serveStdio } from "@modelcontextprotocol/server/stdio";
import {
  BUNPRO_REQUEST_BUDGET,
  BunproRequestGate,
  apiTokenFromEnvironment
} from "./bunpro/client.js";
import { createFrontendSourceOperationFactory } from "./bunpro/frontend-source.js";
import { createServer } from "./server.js";

if (process.env.TRANSPORT === "http") {
  const { serveHttp } = await import("./http-server.js");
  await serveHttp();
} else {
  const sourceOperationFactory = createFrontendSourceOperationFactory(
    apiTokenFromEnvironment,
    fetch,
    { requestGate: new BunproRequestGate(BUNPRO_REQUEST_BUDGET) }
  );
  void serveStdio(() => createServer({ sourceOperationFactory }));
  console.error("bunpro-mcp-server running on stdio");
}
