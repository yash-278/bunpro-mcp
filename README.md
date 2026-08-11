# Bunpro MCP

MCP server for exposing trustworthy, date-bounded Bunpro study summaries to Atlas and other MCP hosts.

The first tool is `get_connection_status`. In either transport, the server logs in lazily and reuses the Bunpro web session. If Bunpro rejects a cached token, it first refreshes through the stored web session and only performs a fresh credential login if that fails.

Two deployment modes are supported:

- Local stdio: one user, with credentials in the MCP host's secret environment configuration.
- Remote Streamable HTTP: public, multi-user, OAuth-protected, with one independently encrypted Bunpro account per identity.

## Local stdio configuration

Configure these secrets in the MCP host application:

```text
BUNPRO_USERNAME=your Bunpro login email
BUNPRO_PASSWORD=your Bunpro password
```

Do not provide a browser cookie or frontend token. The MCP obtains and reuses them during the process lifetime and never returns them.

For an MCP host configuration page, use the equivalent of:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/bunpro-mcp/dist/index.js"],
  "env": {
    "BUNPRO_USERNAME": "your Bunpro login email",
    "BUNPRO_PASSWORD": "your Bunpro password"
  }
}
```

The tool returns only safe booleans, Bunpro's configured source timezone, and whether authentication used a fresh login, cached session, refreshed session, or fallback re-login.

## Public Railway deployment

The remote service exposes:

- `GET /healthz` for Railway health checks.
- `POST /mcp` for stateless Streamable HTTP MCP traffic.
- OAuth protected-resource metadata under `/.well-known/oauth-protected-resource/mcp`.
- `/setup` for short-lived, identity-bound Bunpro account linking.

Every MCP request must carry an OAuth access token with `bunpro.read`. The OAuth issuer and audience are validated cryptographically on every request. Each user's Bunpro credentials, cookies, and frontend token are encrypted with AES-256-GCM before they reach Postgres. The Railway deployment must not define `BUNPRO_USERNAME` or `BUNPRO_PASSWORD`.

Required Railway variables are shown in [`.env.example`](.env.example). Generate the two 32-byte secrets independently and store them only as Railway secrets. The service can derive `PUBLIC_BASE_URL` from `RAILWAY_PUBLIC_DOMAIN`; `AUTH_AUDIENCE` should be the final public `/mcp` URL.

Before deploying, configure an OAuth provider that supports authorization code with PKCE and dynamic client registration. For Auth0:

1. Create an API whose identifier is the final `https://<railway-domain>/mcp` URL.
2. Add the `bunpro.read` permission and enable it for requested access tokens.
3. Enable OIDC Dynamic Application Registration and at least one user login connection.
4. Set `AUTHORIZATION_SERVER_URL` to the Auth0 issuer and `AUTH_AUDIENCE` to the API identifier.

The remote transport is deliberately not started unless its database, encryption, public URL, and OAuth settings are complete.

## Development

```bash
npm install
npm test
npm run build
```

Run the opt-in live MCP authentication smoke test only when the two Bunpro environment variables are configured:

```bash
npm run live:test:auth
```

That smoke test launches the compiled server through a real MCP stdio client, lists its tools, calls `get_connection_status`, and fails unless the authenticated web session and frontend API both work.

The current Wayfinder map lives at [`.scratch/bunpro-mcp/map.md`](.scratch/bunpro-mcp/map.md).
