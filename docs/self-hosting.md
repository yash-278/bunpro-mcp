# Self-hosting Bunpro MCP

The remote deployment uses stateless Streamable HTTP, OAuth, PostgreSQL, and per-user encrypted Bunpro account storage. Railway and Auth0 are the documented reference deployment, but equivalent providers can be used.

## Requirements

- A public HTTPS hostname
- Node.js 20 or newer, or Docker
- PostgreSQL
- An OAuth authorization server supporting authorization code with PKCE and Dynamic Client Registration (DCR)
- Independent encryption and setup-token secrets

## 1. Configure Auth0

1. Create an Auth0 API.
2. Set its identifier to the final MCP URL, for example `https://mcp.example.com/mcp`.
3. Add the `bunpro.read` permission and include it in access tokens.
4. Make at least one user-login connection available to dynamically registered third-party clients.
5. Open **Auth0 Dashboard → Settings → Advanced** and enable **Dynamic Client Registration (DCR)**.
6. Configure default API permissions for DCR-created third-party applications so they can request `bunpro.read`.

Auth0 warns that open DCR lets callers register applications in the tenant. Review Auth0's [Dynamic Client Registration](https://auth0.com/docs/get-started/applications/dynamic-client-registration) and [third-party application configuration](https://auth0.com/docs/get-started/applications/third-party-applications/configure-third-party-applications) guidance before enabling it.

## 2. Configure Railway

Create a Railway service from the repository and attach PostgreSQL. The included `Dockerfile` and `railway.json` build and start the server and use `/healthz` for health checks.

Configure these variables:

```text
TRANSPORT=http
PUBLIC_BASE_URL=https://mcp.example.com
AUTHORIZATION_SERVER_URL=https://your-tenant.auth0.com/
AUTH_AUDIENCE=https://mcp.example.com/mcp
AUTH_SCOPE=bunpro.read
DATABASE_URL=<provided by PostgreSQL>
BUNPRO_CREDENTIALS_ENCRYPTION_KEY=<base64 32-byte key>
SETUP_TOKEN_SECRET=<different base64 32-byte key>
```

Generate the secrets independently:

```bash
openssl rand -base64 32
openssl rand -base64 32
```

Do not configure `BUNPRO_USERNAME` or `BUNPRO_PASSWORD` on the public service. Users link their own account after OAuth authentication.

`PUBLIC_BASE_URL` may be omitted on Railway when `RAILWAY_PUBLIC_DOMAIN` is available. `AUTH_AUDIENCE` must still match the Auth0 API identifier exactly.

## 3. Verify the deployment

```bash
curl https://mcp.example.com/healthz
curl https://mcp.example.com/.well-known/oauth-protected-resource/mcp
curl -i https://mcp.example.com/mcp
```

Expected results:

- `/healthz` returns HTTP 200 with `{"status":"ok"}`.
- protected-resource metadata identifies the MCP URL, authorization server, and `bunpro.read` scope.
- an unauthenticated `/mcp` request returns HTTP 401 with a `WWW-Authenticate` challenge.

Then add the Streamable HTTP URL to a fresh MCP client, complete OAuth, run `get_connection_status`, and link a test Bunpro account through the returned setup URL.

## Operations

- Protect and back up the encryption key separately from PostgreSQL. Losing the key makes linked accounts unrecoverable.
- Rotating the encryption key currently requires re-linking accounts; there is no envelope-key migration command yet.
- Keep one application instance while validating the preview. Multiple instances are safe for data isolation but may occasionally duplicate an upstream refresh.
- Monitor sanitized error rates and Bunpro contract failures without logging request bodies or secrets.
- Preserve `disconnect_bunpro_account` so users can remove their stored authentication.
