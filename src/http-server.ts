import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createMcpHandler, validateHostHeader } from "@modelcontextprotocol/server";
import { BunproClient, type FetchLike } from "./bunpro/client.js";
import { loadHttpConfig, type HttpConfig } from "./config.js";
import { createServer as createBunproMcpServer } from "./server.js";

const MAX_MCP_BODY_BYTES = 1024 * 1024;
const MAX_BEARER_TOKEN_BYTES = 2048;

export async function serveHttp(environment: NodeJS.ProcessEnv = process.env): Promise<void> {
  const config = loadHttpConfig(environment);
  const mcp = createHttpMcpHandler();

  const nodeMcpHandler: NodeMcpHandler = async (request, response) => {
    const method = request.method ?? "GET";
    const body = method === "GET" || method === "HEAD"
      ? undefined
      : await readRequestBodyBytes(request, MAX_MCP_BODY_BYTES);
    const webRequest = new Request(new URL(request.url ?? "/mcp", config.publicBaseUrl), {
      method,
      headers: nodeHeadersToWebHeaders(request),
      ...(body && body.byteLength > 0 ? { body: new Uint8Array(body) } : {})
    });
    const webResponse = await mcp.fetch(webRequest);
    await sendWebResponse(response, webResponse);
  };

  const server = createHttpServer((request, response) => {
    void routeRequest(request, response, { config, nodeMcpHandler });
  });

  const shutdown = async (): Promise<void> => {
    server.close();
    await mcp.close();
  };
  process.once("SIGTERM", () => void shutdown());
  process.once("SIGINT", () => void shutdown());

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, "0.0.0.0", () => resolve());
  });
  console.error(`bunpro-mcp-server listening on 0.0.0.0:${config.port}`);
}

export function createHttpMcpHandler(fetchImplementation: FetchLike = fetch) {
  return createMcpHandler(
    context => {
      const token = bearerTokenFromAuthorization(context.requestInfo?.headers.get("authorization"));
      return createBunproMcpServer(
        () => new BunproClient(token, fetchImplementation, { tokenSource: "request_bearer" })
      );
    },
    {
      legacy: "stateless",
      responseMode: "json",
      onerror: error => console.error("MCP request failed:", error.name)
    }
  );
}

interface RouteDependencies {
  config: HttpConfig;
  nodeMcpHandler: NodeMcpHandler;
}

async function routeRequest(
  request: IncomingMessage,
  response: ServerResponse,
  dependencies: RouteDependencies
): Promise<void> {
  try {
    const url = new URL(request.url ?? "/", dependencies.config.publicBaseUrl);
    const allowedHosts = [
      dependencies.config.publicBaseUrl.hostname,
      "healthcheck.railway.app",
      "localhost",
      "127.0.0.1",
      "[::1]"
    ];
    const hostResult = validateHostHeader(headerValue(request.headers.host), allowedHosts);
    if (!hostResult.ok) return sendJson(response, 403, { error: "invalid_host" });

    if (request.method === "GET" && url.pathname === "/healthz") {
      return sendJson(response, 200, { status: "ok" });
    }

    if (url.pathname !== "/mcp") return sendJson(response, 404, { error: "not_found" });

    try {
      bearerTokenFromAuthorization(headerValue(request.headers.authorization));
    } catch {
      return sendJson(
        response,
        401,
        {
          error: "bunpro_token_required",
          message: "Configure the Bunpro Account API Token as this MCP connection's Bearer token."
        },
        { "www-authenticate": 'Bearer realm="bunpro-mcp"' }
      );
    }

    await dependencies.nodeMcpHandler(request, response);
  } catch (error) {
    console.error("HTTP request failed:", error instanceof Error ? error.name : "UnknownError");
    if (!response.headersSent) sendJson(response, 500, { error: "internal_error" });
    else response.end();
  }
}

export function bearerTokenFromAuthorization(value: string | null | undefined): string {
  const match = value?.match(/^Bearer[\t ]+([^\s,]+)$/i);
  const token = match?.[1];
  if (!token || Buffer.byteLength(token, "utf8") > MAX_BEARER_TOKEN_BYTES) {
    throw new Error("A Bunpro Account API Token Bearer header is required.");
  }
  return token;
}

async function readRequestBodyBytes(request: IncomingMessage, maximumBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maximumBytes) throw new Error("The request body is too large.");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function nodeHeadersToWebHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return headers;
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers
  });
  response.end(JSON.stringify(body));
}

async function sendWebResponse(response: ServerResponse, webResponse: Response): Promise<void> {
  const headers: Record<string, string> = {};
  webResponse.headers.forEach((value, name) => { headers[name] = value; });
  response.writeHead(webResponse.status, headers);
  response.end(Buffer.from(await webResponse.arrayBuffer()));
}

type NodeMcpHandler = (request: IncomingMessage, response: ServerResponse) => Promise<void>;
