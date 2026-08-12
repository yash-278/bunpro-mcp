# Self-hosting the Streamable HTTP server

The remote deployment is a stateless Streamable HTTP server. It does not need Auth0, an OAuth authorization server, PostgreSQL, an encryption key, a setup page, or a deployment-wide Bunpro credential.

Each MCP caller supplies their own Bunpro Account API Token in the HTTP Bearer header. The application uses the token for that request and does not persist it.

## Requirements

- Node.js 20 or newer, or the included Dockerfile
- An HTTPS deployment target such as Railway
- A public hostname

## Environment

```dotenv
TRANSPORT=http
PUBLIC_BASE_URL=https://mcp.example.com
```

Railway sets `PORT` and `RAILWAY_PUBLIC_DOMAIN`; when the latter is present, `PUBLIC_BASE_URL` may be omitted. Do not configure `BUNPRO_API_TOKEN` on the HTTP service. That variable is only for local stdio mode.

No database service is required.

## Railway deployment

1. Deploy this private repository using the included Dockerfile.
2. Set `TRANSPORT=http`.
3. Generate a Railway public domain or set `PUBLIC_BASE_URL` to the HTTPS domain.
4. Remove obsolete Auth0, database, setup-token, encryption-key, Bunpro username, and Bunpro password variables from the service.
5. Confirm `GET /healthz` returns HTTP 200.

## Configure a caller

Use:

```text
https://mcp.example.com/mcp
```

Configure the caller's Bunpro Account API Token as the MCP connection's Bearer token. In clients that offer **Bearer token env var**, store the token in a secret environment variable such as `BUNPRO_API_TOKEN` and enter that variable name in the field.

Do not add an Authorization custom header in addition to the bearer configuration, and never place the token in the URL or tool arguments.

## Smoke checks

Without a bearer token, `/mcp` should return HTTP 401 without echoing request data. With a valid token configured in an MCP client, `get_connection_status` should report:

- `authentication_method: account_api_token`
- `token_source: request_bearer`
- `token_persisted_by_server: false`
- `api_authenticated: true`
- `stateless: true`

The health endpoint intentionally requires no token and reveals no account data.

## Trust boundary

The application does not persist tokens, but the hosting operator and platform can technically inspect request memory or traffic termination. Users who do not accept that boundary should run the stdio transport locally.

Keep use low-volume. Bunpro's temporary mechanism has stricter throttling, an evolving route whitelist, and no compatibility guarantee.
