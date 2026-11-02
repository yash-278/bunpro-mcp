# Self-hosting Bunpro MCP

Bunpro MCP supports two stateless transports:

- **stdio** for a single local MCP client;
- **Streamable HTTP** for a remote HTTPS service used by one or more clients.

The server needs no Auth0 tenant, OAuth provider, PostgreSQL database, encryption key, setup page, Bunpro username, or Bunpro password.

## Choose a deployment

| Option | Best for | Token location |
| --- | --- | --- |
| Local stdio | One desktop client and the smallest trust boundary | `BUNPRO_API_TOKEN` in the MCP client's secret environment configuration |
| Local Docker HTTP | Testing the remote transport locally | Each caller sends `X-Bunpro-Token` or `Authorization: Bearer` |
| Railway or another HTTPS host | Multiple users or devices | Each caller sends `X-Bunpro-Token` or `Authorization: Bearer` |

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

Configure the MCP client with one protected credential, as described in [Credential contract](#credential-contract).

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
7. Configure each MCP client with `https://your-domain.example/mcp` and its own protected credential, as described in [Credential contract](#credential-contract).

## Another HTTPS host

The same container works on platforms that can:

- build the included Dockerfile;
- expose the configured `PORT`;
- provide HTTPS termination; and
- set `TRANSPORT=http` plus a canonical `PUBLIC_BASE_URL`.

Non-local `PUBLIC_BASE_URL` values must use HTTPS. Host-header validation rejects alternate hostnames.

## Credential contract

The server supports two HTTP credential headers:

```text
X-Bunpro-Token: <raw Bunpro Account API Token>
Authorization: Bearer <raw Bunpro Account API Token>
```

ChatGPT and other hosts use `X-Bunpro-Token`. Claude uses `Authorization: Bearer`, and the value must include the `Bearer ` prefix. Configure exactly one method. Requests with missing, malformed, oversized, or ambiguous credentials receive HTTP 401.

Never place a token in:

- a URL or query string;
- an MCP tool argument;
- a repository or `.env` file committed to Git;
- a log, screenshot, issue, or support message; or
- a shared deployment variable for HTTP mode.

## Use with Claude

The [Claude setup guide](claude-setup.md) has the steps for Claude Code and claude.ai. To use your own server, replace `https://bunpro.yashkadam.com/mcp` in those steps with `https://your-domain.example/mcp`. The Claude Desktop `.mcpb` runs the server locally, so it needs no URL. The Claude plugin's URL is fixed to the hosted service, so configure your server by hand. You can still install the plugin for its `study-plan` skill.

## Verification

Without a token, `/mcp` should return HTTP 401 without echoing request data. `/healthz` intentionally requires no credential and exposes no account data.

With a valid token configured in an MCP client, call `get_connection_status`. A successful response reports that authentication passed, the transport is stateless, and the server did not persist the token.

For maintainers, the repository includes deliberately paced live smoke scripts:

```bash
BUNPRO_API_TOKEN="your token" npm run live:test:auth
BUNPRO_API_TOKEN="your token" BUNPRO_MCP_URL="https://your-domain.example/mcp" npm run live:test:tools
BUNPRO_API_TOKEN="your token" BUNPRO_MCP_URL="https://your-domain.example/mcp" BUNPRO_SMOKE_AUTH=bearer npm run live:test:tools
```

`live:test:tools` sends `X-Bunpro-Token` by default. Set `BUNPRO_SMOKE_AUTH=bearer` to send `Authorization: Bearer` instead.

## Operational limits

- Keep traffic low-volume and do not retry aggressively.
- Bunpro may throttle requests or change its route whitelist without notice.
- The server bounds request sizes, response sizes, concurrent upstream work, and timeouts.
- Authentication rejection, throttling, unavailable routes, malformed responses, and schema drift fail closed.
- The service stores no token, account profile, study history, cookie, session, or watermark.

Anyone operating a hosted instance can technically inspect process memory or traffic where TLS terminates. Users who do not accept that trust boundary should run the stdio transport locally.
