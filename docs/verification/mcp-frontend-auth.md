# MCP frontend authentication verification

Verification date: 2026-08-11

## Result

The compiled stdio MCP server successfully performed a fresh Bunpro login using `BUNPRO_USERNAME` and `BUNPRO_PASSWORD` from the host environment. A real MCP v2 client then called `get_connection_status` twice in the same process and verified:

- the Bunpro web session was authenticated;
- the login response supplied a frontend token;
- the frontend token authenticated `/api/frontend/user`;
- the second call reused the cached authentication without another credential login;
- Bunpro's source timezone matched the Atlas timezone;
- the tool reported the server-side adapter as stateless.

One `BunproClient` is shared for the MCP process lifetime. Its web cookie jar and frontend token exist only in memory. Web cookies are sent only to `bunpro.jp`; API requests to `api.bunpro.jp` receive only the frontend authorization header. The tool returns neither credential, cookie, CSRF value, nor token.

When an API call receives `401` or `403`, the client requests the authenticated account page with its cached web cookies and absorbs any rotated session cookie or frontend token. It retries the API once, then clears the cache and performs a fresh credential login if authentication is still rejected. Unit tests cover both recovery paths.

## Reproduction

With credentials configured in the environment:

```bash
npm run live:test:auth
```

This command builds the server, launches it over stdio through `@modelcontextprotocol/client`, lists the registered tools, and calls `get_connection_status`. It exits nonzero if any authentication assertion fails.

## Supporting automated checks

The unit tests verify that:

- the login form receives the expected credentials and decoded authenticity token;
- the authenticated account request receives the fresh web cookies;
- the API request receives the frontend token but no web cookies;
- concurrent calls share one serialized login;
- a rejected token refreshes through the cached web session;
- a failed refresh falls back to a clean credential login;
- rejected credentials produce a sanitized error;
- missing environment configuration fails without exposing secrets.
