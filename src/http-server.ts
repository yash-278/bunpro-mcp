import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  bearerAuthChallengeResponse,
  createMcpHandler,
  getOAuthProtectedResourceMetadataUrl,
  validateHostHeader,
  verifyBearerToken,
  type AuthInfo
} from "@modelcontextprotocol/server";
import { createServer as createBunproMcpServer } from "./server.js";
import { loadHttpConfig, type HttpConfig } from "./config.js";
import { JwtTokenVerifier } from "./auth/jwt-verifier.js";
import { SetupTokenService } from "./auth/setup-token.js";
import { BunproSessionManager } from "./bunpro/session-manager.js";
import { connectionErrorMessage } from "./bunpro/errors.js";
import { PostgresCredentialVault } from "./storage/credential-vault.js";

const MAX_SETUP_BODY_BYTES = 16 * 1024;
const MAX_MCP_BODY_BYTES = 1024 * 1024;

type AuthenticatedIncomingMessage = IncomingMessage & { auth?: AuthInfo };

export async function serveHttp(environment: NodeJS.ProcessEnv = process.env): Promise<void> {
  const config = loadHttpConfig(environment);
  const vault = new PostgresCredentialVault(config.databaseUrl, config.credentialsEncryptionKey);
  await vault.initialize();

  const setupTokens = new SetupTokenService(config.setupTokenSecret);
  const sessions = new BunproSessionManager(vault, setupTokens, config.publicBaseUrl);
  const verifier = new JwtTokenVerifier(config.authorizationServerUrl, config.authAudience);
  const authOptions = {
    verifier,
    requiredScopes: [config.authScope],
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(config.mcpUrl)
  };

  const mcp = createMcpHandler(
    context => {
      if (!context.authInfo) throw new Error("Authenticated MCP request context is missing.");
      return createBunproMcpServer(() => sessions.checkerFor(context.authInfo as AuthInfo), {
        oauthScopes: [config.authScope]
      });
    },
    {
      legacy: "stateless",
      responseMode: "json",
      onerror: error => console.error("MCP request failed:", error.message)
    }
  );
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
    const webResponse = await mcp.fetch(webRequest, request.auth ? { authInfo: request.auth } : {});
    await sendWebResponse(response, webResponse);
  };

  const server = createHttpServer((request, response) => {
    void routeRequest(request as AuthenticatedIncomingMessage, response, {
      config,
      sessions,
      nodeMcpHandler,
      authOptions
    });
  });

  const shutdown = async (): Promise<void> => {
    server.close();
    await mcp.close();
    await vault.close();
  };
  process.once("SIGTERM", () => void shutdown());
  process.once("SIGINT", () => void shutdown());

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, "0.0.0.0", () => resolve());
  });
  console.error(`bunpro-mcp-server listening on 0.0.0.0:${config.port}`);
}

interface RouteDependencies {
  config: HttpConfig;
  sessions: BunproSessionManager;
  nodeMcpHandler: NodeMcpHandler;
  authOptions: Parameters<typeof verifyBearerToken>[1];
}

async function routeRequest(
  request: AuthenticatedIncomingMessage,
  response: ServerResponse,
  dependencies: RouteDependencies
): Promise<void> {
  try {
    const url = new URL(request.url ?? "/", dependencies.config.publicBaseUrl);
    const allowedHosts = [dependencies.config.publicBaseUrl.hostname, "localhost", "127.0.0.1", "[::1]"];
    const hostResult = validateHostHeader(headerValue(request.headers.host), allowedHosts);
    if (!hostResult.ok) return sendJson(response, 403, { error: "invalid_host" });

    if (request.method === "GET" && url.pathname === "/healthz") {
      return sendJson(response, 200, { status: "ok" });
    }

    if (request.method === "GET" && isProtectedResourceMetadataPath(url.pathname)) {
      return sendJson(response, 200, {
        resource: dependencies.config.mcpUrl.href,
        authorization_servers: [dependencies.config.authorizationServerUrl.href],
        scopes_supported: [dependencies.config.authScope],
        bearer_methods_supported: ["header"],
        resource_name: "Bunpro MCP"
      }, { "access-control-allow-origin": "*" });
    }

    if (url.pathname === "/setup") {
      return await handleSetup(request, response, url, dependencies.sessions);
    }

    if (url.pathname !== "/mcp") return sendJson(response, 404, { error: "not_found" });

    try {
      request.auth = await verifyBearerToken(headerValue(request.headers.authorization), dependencies.authOptions);
    } catch (error) {
      return sendWebResponse(response, bearerAuthChallengeResponse(error, dependencies.authOptions));
    }
    await dependencies.nodeMcpHandler(request, response);
  } catch (error) {
    console.error("HTTP request failed:", error instanceof Error ? error.message : "unknown error");
    if (!response.headersSent) sendJson(response, 500, { error: "internal_error" });
    else response.end();
  }
}

async function handleSetup(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  sessions: BunproSessionManager
): Promise<void> {
  if (request.method === "GET") {
    const token = url.searchParams.get("token") ?? "";
    try {
      const principalId = sessions.verifySetupToken(token);
      if (await sessions.isLinked(principalId)) {
        return sendHtml(response, 409, setupPage("This identity already has a linked Bunpro account."));
      }
      return sendHtml(response, 200, setupForm(token));
    } catch (error) {
      return sendHtml(response, 400, setupPage(error instanceof Error ? error.message : "Invalid setup link."));
    }
  }

  if (request.method !== "POST") {
    response.setHeader("allow", "GET, POST");
    return sendJson(response, 405, { error: "method_not_allowed" });
  }

  try {
    const body = new URLSearchParams(await readRequestBody(request));
    const token = body.get("token") ?? "";
    const username = body.get("username")?.trim() ?? "";
    const password = body.get("password") ?? "";
    if (!username || !password || username.length > 320 || password.length > 1024) {
      return sendHtml(response, 400, setupPage("Enter a valid Bunpro username and password."));
    }

    const principalId = sessions.verifySetupToken(token);
    await sessions.link(principalId, { username, password });
    return sendHtml(
      response,
      200,
      setupPage("Bunpro is connected. You can close this page and retry the MCP connection check.")
    );
  } catch (error) {
    return sendHtml(response, 400, setupPage(connectionErrorMessage(error)));
  }
}

function isProtectedResourceMetadataPath(pathname: string): boolean {
  return pathname === "/.well-known/oauth-protected-resource" ||
    pathname === "/.well-known/oauth-protected-resource/mcp";
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  return (await readRequestBodyBytes(request, MAX_SETUP_BODY_BYTES)).toString("utf8");
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

function setupForm(token: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><title>Connect Bunpro</title>${styles()}</head>
<body><main><h1>Connect Bunpro</h1><p>Your credentials are encrypted before storage and are only used to create or refresh your Bunpro session.</p>
<form method="post" action="/setup" autocomplete="on">
<input type="hidden" name="token" value="${escapeHtml(token)}">
<label>Bunpro username or email<input name="username" type="text" autocomplete="username" required maxlength="320"></label>
<label>Bunpro password<input name="password" type="password" autocomplete="current-password" required maxlength="1024"></label>
<button type="submit">Connect Bunpro</button></form></main></body></html>`;
}

function setupPage(message: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer"><title>Bunpro MCP</title>${styles()}</head>
<body><main><h1>Bunpro MCP</h1><p>${escapeHtml(message)}</p></main></body></html>`;
}

function styles(): string {
  return `<style>body{font:16px system-ui,sans-serif;background:#f7f7f5;color:#20201d;margin:0}main{max-width:32rem;margin:10vh auto;padding:2rem;background:white;border-radius:16px;box-shadow:0 8px 30px #0001}label{display:block;margin:1rem 0}input{box-sizing:border-box;width:100%;margin-top:.4rem;padding:.75rem;border:1px solid #bbb;border-radius:8px}button{padding:.8rem 1rem;border:0;border-radius:8px;background:#7057d9;color:white;font-weight:600}</style>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character] ?? character);
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

function sendHtml(response: ServerResponse, status: number, body: string): void {
  response.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff"
  });
  response.end(body);
}

async function sendWebResponse(response: ServerResponse, webResponse: Response): Promise<void> {
  const headers: Record<string, string> = {};
  webResponse.headers.forEach((value, name) => { headers[name] = value; });
  response.writeHead(webResponse.status, headers);
  response.end(Buffer.from(await webResponse.arrayBuffer()));
}

type NodeMcpHandler = (request: AuthenticatedIncomingMessage, response: ServerResponse) => Promise<void>;
