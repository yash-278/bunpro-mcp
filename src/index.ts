#!/usr/bin/env node

import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server.js";

if (process.env.TRANSPORT === "http") {
  const { serveHttp } = await import("./http-server.js");
  await serveHttp();
} else {
  void serveStdio(() => createServer());
  console.error("bunpro-mcp-server running on stdio");
}
