import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { createMcpHandler, validateHostHeader } from "@modelcontextprotocol/server";
import { BunproClient, BunproRequestGate, type FetchLike } from "./bunpro/client.js";
import { loadHttpConfig, type HttpConfig } from "./config.js";
import {
  HOMEPAGE_FAVICON,
  HOMEPAGE_ROBOTS,
  HOMEPAGE_SITEMAP,
  renderHomepage
} from "./homepage.js";
import { createServer as createBunproMcpServer } from "./server.js";

const MAX_MCP_BODY_BYTES = 1024 * 1024;
const MAX_MCP_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_TOKEN_BYTES = 2048;
const HEADER_TIMEOUT_MS = 10_000;
const REQUEST_TIMEOUT_MS = 30_000;
const KEEP_ALIVE_TIMEOUT_MS = 5_000;
const MAX_CONNECTIONS = 100;
const MAX_REQUESTS_PER_SOCKET = 100;

export const BUNPRO_TOKEN_HEADER = "X-Bunpro-Token";

export interface BunproRequestCredential {
  token: string;
  tokenSource: "request_header" | "request_bearer";
}

export interface HttpService {
  port: number;
  close(): Promise<void>;
}

export interface StartHttpServerOptions {
  config: HttpConfig;
  fetchImplementation?: FetchLike;
  telemetry?: HttpTelemetry;
}

export interface HttpTelemetryEvent {
  request_id: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  active_requests: number;
}

export interface HttpTelemetry {
  record(event: HttpTelemetryEvent): void;
}

export async function serveHttp(environment: NodeJS.ProcessEnv = process.env): Promise<void> {
  const config = loadHttpConfig(environment);
  const service = await startHttpServer({ config });

  const shutdown = (): void => { void service.close(); };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
  console.error(`bunpro-mcp-server listening on 0.0.0.0:${service.port}`);
}

export async function startHttpServer(options: StartHttpServerOptions): Promise<HttpService> {
  const {
    config,
    fetchImplementation = fetch,
    telemetry = new BoundedConsoleTelemetry()
  } = options;
  const mcp = createHttpMcpHandler(fetchImplementation);
  const activity = { activeRequests: 0 };

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
    const requestId = randomUUID();
    const startedAt = performance.now();
    activity.activeRequests += 1;
    response.once("finish", () => {
      activity.activeRequests -= 1;
      telemetry.record({
        request_id: requestId,
        method: request.method ?? "UNKNOWN",
        path: safeRequestPath(request.url),
        status: response.statusCode,
        duration_ms: Math.round(performance.now() - startedAt),
        active_requests: activity.activeRequests
      });
    });
    void routeRequest(request, response, { config, nodeMcpHandler });
  });
  server.headersTimeout = HEADER_TIMEOUT_MS;
  server.requestTimeout = REQUEST_TIMEOUT_MS;
  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
  server.maxConnections = MAX_CONNECTIONS;
  server.maxRequestsPerSocket = MAX_REQUESTS_PER_SOCKET;

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, "0.0.0.0", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("HTTP server did not bind a TCP port.");

  let closed = false;
  return {
    port: address.port,
    async close(): Promise<void> {
      if (closed) return;
      closed = true;
      await new Promise<void>((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
      await mcp.close();
    }
  };
}

export function createHttpMcpHandler(fetchImplementation: FetchLike = fetch) {
  const requestGate = new BunproRequestGate({ maximumConcurrent: 4, maximumQueued: 16 });
  return createMcpHandler(
    context => {
      const credential = bunproCredentialFromHeaders(context.requestInfo?.headers ?? new Headers());
      return createBunproMcpServer(
        () => new BunproClient(credential.token, fetchImplementation, {
          tokenSource: credential.tokenSource,
          requestGate
        })
      );
    },
    {
      legacy: "stateless",
      responseMode: "auto",
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
      ...(dependencies.config.allowLocalHosts ? ["localhost", "127.0.0.1", "[::1]"] : [])
    ];
    const hostResult = validateHostHeader(headerValue(request.headers.host), allowedHosts);
    if (!hostResult.ok) return sendJson(response, 403, { error: "invalid_host" });

    if (request.method === "GET" && url.pathname === "/healthz") {
      return sendJson(response, 200, { status: "ok" });
    }

    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/") {
      return sendHtml(response, 200, renderHomepage(url), request.method === "HEAD");
    }

    if (request.method === "GET" && url.pathname === "/favicon.svg") {
      return sendPublicText(response, 200, HOMEPAGE_FAVICON, "image/svg+xml; charset=utf-8");
    }

    if (request.method === "GET" && url.pathname === "/robots.txt") {
      return sendPublicText(response, 200, HOMEPAGE_ROBOTS, "text/plain; charset=utf-8");
    }

    if (request.method === "GET" && url.pathname === "/sitemap.xml") {
      return sendPublicText(response, 200, HOMEPAGE_SITEMAP, "application/xml; charset=utf-8");
    }

    if (url.pathname !== "/mcp") return sendJson(response, 404, { error: "not_found" });

    if (request.method !== "POST") {
      return sendJson(response, 405, { error: "method_not_allowed" }, { allow: "POST" });
    }

    if (!isJsonMediaType(headerValue(request.headers["content-type"]))) {
      return sendJson(response, 415, { error: "unsupported_media_type" });
    }

    const declaredLength = contentLength(request);
    if (declaredLength !== undefined && declaredLength > MAX_MCP_BODY_BYTES) {
      return sendJson(response, 413, { error: "request_too_large" });
    }

    try {
      bunproCredentialFromHeaders(nodeHeadersToWebHeaders(request));
    } catch {
      return sendJson(
        response,
        401,
        {
          error: "bunpro_token_required",
          message: `Configure the Bunpro Account API Token in the ${BUNPRO_TOKEN_HEADER} request header.`
        }
      );
    }

    try {
      await dependencies.nodeMcpHandler(request, response);
    } catch (error) {
      if (error instanceof RequestTooLargeError) {
        return sendJson(response, 413, { error: "request_too_large" });
      }
      throw error;
    }
  } catch (error) {
    console.error("HTTP request failed:", error instanceof Error ? error.name : "UnknownError");
    if (!response.headersSent) sendJson(response, 500, { error: "internal_error" });
    else response.end();
  }
}

export function bearerTokenFromAuthorization(value: string | null | undefined): string {
  const match = value?.match(/^Bearer[\t ]+([^\s,]+)$/i);
  const token = match?.[1];
  if (!token || Buffer.byteLength(token, "utf8") > MAX_TOKEN_BYTES) {
    throw new Error("A Bunpro Account API Token Bearer header is required.");
  }
  return token;
}

export function bunproCredentialFromHeaders(
  headers: Pick<Headers, "get">
): BunproRequestCredential {
  const rawToken = headers.get(BUNPRO_TOKEN_HEADER);
  const authorization = headers.get("authorization");

  if (rawToken !== null && authorization !== null) {
    throw new Error(`Configure either ${BUNPRO_TOKEN_HEADER} or Authorization, not both.`);
  }

  if (rawToken !== null) {
    if (
      rawToken.length === 0
      || Buffer.byteLength(rawToken, "utf8") > MAX_TOKEN_BYTES
      || /[\s,]/.test(rawToken)
    ) {
      throw new Error(`A valid Bunpro Account API Token is required in ${BUNPRO_TOKEN_HEADER}.`);
    }
    return { token: rawToken, tokenSource: "request_header" };
  }

  return {
    token: bearerTokenFromAuthorization(authorization),
    tokenSource: "request_bearer"
  };
}

async function readRequestBodyBytes(request: IncomingMessage, maximumBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maximumBytes) throw new RequestTooLargeError();
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function nodeHeadersToWebHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();
  const forwardedNames = [
    "accept",
    "authorization",
    "content-type",
    "mcp-protocol-version",
    "mcp-session-id",
    BUNPRO_TOKEN_HEADER.toLowerCase()
  ];
  for (const name of forwardedNames) {
    const value = request.headers[name];
    if (Array.isArray(value)) value.forEach(item => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
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

function sendHtml(response: ServerResponse, status: number, body: string, headOnly = false): void {
  response.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "content-length": String(Buffer.byteLength(body, "utf8")),
    "cache-control": "public, max-age=300, stale-while-revalidate=86400",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY"
  });
  response.end(headOnly ? undefined : body);
}

function sendPublicText(
  response: ServerResponse,
  status: number,
  body: string,
  contentType: string
): void {
  response.writeHead(status, {
    "content-type": contentType,
    "content-length": String(Buffer.byteLength(body, "utf8")),
    "cache-control": "public, max-age=86400",
    "x-content-type-options": "nosniff"
  });
  response.end(body);
}

async function sendWebResponse(response: ServerResponse, webResponse: Response): Promise<void> {
  const headers: Record<string, string> = {};
  webResponse.headers.forEach((value, name) => { headers[name] = value; });
  headers["cache-control"] = "no-store";
  const body = Buffer.from(await webResponse.arrayBuffer());
  if (body.byteLength > MAX_MCP_RESPONSE_BYTES) {
    return sendJson(response, 502, { error: "upstream_response_too_large" });
  }
  response.writeHead(webResponse.status, headers);
  response.end(body);
}

function isJsonMediaType(value: string | undefined): boolean {
  return value?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function contentLength(request: IncomingMessage): number | undefined {
  const value = headerValue(request.headers["content-length"]);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

class RequestTooLargeError extends Error {
  constructor() {
    super("The MCP request body is too large.");
    this.name = "RequestTooLargeError";
  }
}

function safeRequestPath(value: string | undefined): string {
  try {
    return new URL(value ?? "/", "https://mcp.invalid").pathname;
  } catch {
    return "/invalid";
  }
}

class BoundedConsoleTelemetry implements HttpTelemetry {
  #windowStartedAt = Date.now();
  #eventsInWindow = 0;

  record(event: HttpTelemetryEvent): void {
    const now = Date.now();
    if (now - this.#windowStartedAt >= 60_000) {
      this.#windowStartedAt = now;
      this.#eventsInWindow = 0;
    }
    const isError = event.status >= 400;
    if (!isError && Math.random() >= 0.01) return;
    if (this.#eventsInWindow >= 60) return;
    this.#eventsInWindow += 1;
    console.error(JSON.stringify({ event: "http_request", ...event }));
  }
}

type NodeMcpHandler = (request: IncomingMessage, response: ServerResponse) => Promise<void>;
