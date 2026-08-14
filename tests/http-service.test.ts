import assert from "node:assert/strict";
import test from "node:test";
import { request as httpRequest } from "node:http";
import { startHttpServer } from "../src/http-server.js";

interface HttpResult {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

let requestSequence = 0;

async function request(
  port: number,
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
): Promise<HttpResult> {
  const sequence = ++requestSequence;
  return new Promise((resolve, reject) => {
    const outgoing = httpRequest({
      hostname: "127.0.0.1",
      port,
      path,
      agent: false,
      method: options.method ?? "GET",
      headers: { host: "mcp.example", ...options.headers }
    }, incoming => {
      const chunks: Buffer[] = [];
      incoming.on("data", chunk => chunks.push(Buffer.from(chunk)));
      incoming.on("end", () => resolve({
        status: incoming.statusCode ?? 0,
        headers: incoming.headers,
        body: Buffer.concat(chunks).toString("utf8")
      }));
    });
    outgoing.on("error", error => reject(new Error(`HTTP test request ${sequence} failed.`, {
      cause: error
    })));
    if (options.body) outgoing.write(options.body);
    outgoing.end();
  });
}

test("the public HTTP service enforces its canonical host and bounded MCP request contract", async () => {
  const telemetry: unknown[] = [];
  const service = await startHttpServer({
    config: {
      port: 0,
      publicBaseUrl: new URL("https://mcp.example")
    },
    telemetry: { record: event => telemetry.push(event) }
  });

  try {
    const homepage = await request(service.port, "/");
    assert.equal(homepage.status, 200);
    assert.match(String(homepage.headers["content-type"]), /^text\/html/);
    assert.match(String(homepage.headers["content-security-policy"]), /frame-ancestors 'none'/);
    assert.match(homepage.body, /Your Japanese study data/);
    assert.match(homepage.body, /data-site="shibui"/);
    assert.match(homepage.body, /Unofficial community tool/);
    assert.match(homepage.body, /not available in ChatGPT's official directory/);
    assert.match(homepage.body, /Streamable HTTP/);
    assert.match(homepage.body, /https:\/\/bunpro\.yashkadam\.com\/mcp/);
    assert.match(homepage.body, /X-Bunpro-Token/);
    assert.match(homepage.body, /Leave blank/);
    assert.match(homepage.body, /Check my Bunpro connection/);
    assert.doesNotMatch(homepage.body, /Available in ChatGPT|Open in ChatGPT|data-concept=/);
    assert.doesNotMatch(homepage.body, /dangerously_authenticate|\/api\/frontend|Token token=/);

    const legacyConceptQuery = await request(service.port, "/?concept=orbit");
    assert.equal(legacyConceptQuery.status, 200);
    assert.match(legacyConceptQuery.body, /data-site="shibui"/);
    assert.doesNotMatch(legacyConceptQuery.body, /data-concept=|BUNPRO \/ LIVE CONTEXT|STUDY RECEIPT/);

    const homepageHead = await request(service.port, "/?concept=mochi", { method: "HEAD" });
    assert.equal(homepageHead.status, 200);
    assert.equal(homepageHead.body, "");
    assert.ok(Number(homepageHead.headers["content-length"]) > 45_000);

    const robots = await request(service.port, "/robots.txt");
    assert.equal(robots.status, 200);
    assert.match(robots.body, /Disallow: \/mcp/);

    const health = await request(service.port, "/healthz");
    assert.equal(health.status, 200);
    assert.equal(health.headers["cache-control"], "no-store");

    const invalidHost = await request(service.port, "/healthz", {
      headers: { host: "bypass.example" }
    });
    assert.equal(invalidHost.status, 403);

    const invalidMethod = await request(service.port, "/mcp", { method: "PUT" });
    assert.equal(invalidMethod.status, 405);
    assert.equal(invalidMethod.headers.allow, "POST");

    const invalidMedia = await request(service.port, "/mcp", {
      method: "POST",
      headers: {
        "x-bunpro-token": "account-token",
        "content-type": "text/plain"
      },
      body: "not json"
    });
    assert.equal(invalidMedia.status, 415);

    const oversized = await request(service.port, "/mcp", {
      method: "POST",
      headers: {
        "x-bunpro-token": "account-token",
        "content-type": "application/json",
        "content-length": String(1024 * 1024 + 1)
      }
    });
    assert.equal(oversized.status, 413);
    assert.equal(oversized.headers["cache-control"], "no-store");

    const missingToken = await request(service.port, "/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" }
    });
    assert.equal(missingToken.status, 401);

    const ambiguousToken = await request(service.port, "/mcp", {
      method: "POST",
      headers: {
        authorization: "Bearer account-token",
        "x-bunpro-token": "account-token",
        "content-type": "application/json"
      }
    });
    assert.equal(ambiguousToken.status, 401);

    const serializedTelemetry = JSON.stringify(telemetry);
    assert.doesNotMatch(serializedTelemetry, /account-token|authorization|x-bunpro-token|not json/i);
    assert.match(serializedTelemetry, /"status":413/);
  } finally {
    await service.close();
  }
});
