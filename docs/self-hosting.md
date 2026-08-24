# Self-hosting Bunpro MCP

Bunpro MCP supports two stateless transports:

- **stdio** for a single local MCP client;
- **Streamable HTTP** for a remote HTTPS service used by one or more clients.

The server needs no Auth0 tenant, OAuth provider, PostgreSQL database, encryption key, setup page, Bunpro username, or Bunpro password.

## Choose a deployment

| Option | Best for | Token location |
| --- | --- | --- |
| Local stdio | One desktop client and the smallest trust boundary | `BUNPRO_API_TOKEN` in the MCP client's secret environment configuration |
| Local Docker HTTP | Testing the remote transport locally | Each caller sends `X-Bunpro-Token` |
| Railway or another HTTPS host | Multiple users or devices | Each caller sends `X-Bunpro-Token` |

Never configure a shared `BUNPRO_API_TOKEN` on an HTTP deployment. Every HTTP caller must supply their own credential.

## Local stdio

Requirements:

- Node.js 20 or newer
- Git

```bash
git clone https://github.com/yash-278/bunpro-mcp.git
cd bunpro-mcp
npm ci
npm run build
```

Configure the MCP client with absolute paths:

```json
{
  "command": "/absolute/path/to/node",
  "args": ["/absolute/path/to/bunpro-mcp/dist/index.js"],
  "env": {
    "BUNPRO_API_TOKEN": "your Bunpro Account API Token"
  }
}
```

The token remains in the local process memory while the server runs. Bunpro MCP does not write it to disk, although the MCP client may persist its own secret configuration.

## Local Docker HTTP

Build and start the included image:

```bash
docker build -t bunpro-mcp .
docker run --rm -p 8080:8080 \
  -e TRANSPORT=http \
  -e PORT=8080 \
  -e PUBLIC_BASE_URL=http://localhost:8080 \
  bunpro-mcp
```

The local endpoint is:

```text
http://localhost:8080/mcp
```

Configure the MCP client with a protected `X-Bunpro-Token` header containing the raw Account API Token. Leave Bearer authentication blank.

## Railway

1. Fork or clone `https://github.com/yash-278/bunpro-mcp`.
2. Create a Railway service from the repository.
3. Railway will build the included `Dockerfile` and use `railway.json` for the health check.
4. Set these variables:

   ```dotenv
   TRANSPORT=http
   PUBLIC_BASE_URL=https://your-domain.example
   ```

   Railway supplies `PORT`. If you use Railway's generated domain, `RAILWAY_PUBLIC_DOMAIN` can supply the canonical hostname and `PUBLIC_BASE_URL` may be omitted.

5. Do **not** add `BUNPRO_API_TOKEN`, Bunpro username/password values, Auth0 variables, database variables, or encryption keys.
6. Add an HTTPS public domain and confirm `GET /healthz` returns `{"status":"ok"}`.
7. Configure each MCP client with `https://your-domain.example/mcp` and its own protected `X-Bunpro-Token` value.

## Another HTTPS host

The same container works on platforms that can:

- build the included Dockerfile;
- expose the configured `PORT`;
- provide HTTPS termination; and
- set `TRANSPORT=http` plus a canonical `PUBLIC_BASE_URL`.

Non-local `PUBLIC_BASE_URL` values must use HTTPS. Host-header validation rejects alternate hostnames.

## Credential contract

Preferred HTTP configuration:

```text
X-Bunpro-Token: <raw Bunpro Account API Token>
```

`Authorization: Bearer <token>` remains available for clients that cannot set a custom protected header. Configure exactly one method. Requests with missing, malformed, oversized, or ambiguous credentials receive HTTP 401.

Never place a token in:

- a URL or query string;
- an MCP tool argument;
- a repository or `.env` file committed to Git;
- a log, screenshot, issue, or support message; or
- a shared deployment variable for HTTP mode.

## Verification

Without a token, `/mcp` should return HTTP 401 without echoing request data. `/healthz` intentionally requires no credential and exposes no account data.

With a valid token configured in an MCP client, call `get_connection_status`. A successful response reports that authentication passed, the transport is stateless, and the server did not persist the token.

For maintainers, the repository includes deliberately paced live smoke scripts:

```bash
BUNPRO_API_TOKEN="your token" npm run live:test:auth
BUNPRO_API_TOKEN="your token" npm run live:test:http
BUNPRO_API_TOKEN="your token" BUNPRO_MCP_URL="https://your-domain.example/mcp" npm run live:test:tools
```

## Operational limits

- Keep traffic low-volume and do not retry aggressively.
- Bunpro may throttle requests or change its route whitelist without notice.
- The server bounds request sizes, response sizes, concurrent upstream work, and timeouts.
- Authentication rejection, throttling, unavailable routes, malformed responses, and schema drift fail closed.
- The service stores no token, account profile, study history, cookie, session, or watermark.

Anyone operating a hosted instance can technically inspect process memory or traffic where TLS terminates. Users who do not accept that trust boundary should run the stdio transport locally.
