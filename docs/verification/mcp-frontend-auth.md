# MCP frontend authentication verification

Verification date: 2026-08-11

## Result

The compiled stdio MCP server successfully performed a fresh Bunpro login using `BUNPRO_USERNAME` and `BUNPRO_PASSWORD` from the host environment. A real MCP v2 client then called `get_connection_status` and verified:

- the Bunpro web session was authenticated;
- the login response supplied a frontend token;
- the frontend token authenticated `/api/frontend/user`;
- Bunpro's source timezone matched the Atlas timezone;
- the tool reported the server-side adapter as stateless.

The web cookie jar exists only inside one `BunproClient` instance. Web cookies are sent only to `bunpro.jp`; API requests to `api.bunpro.jp` receive only the frontend authorization header. The tool returns neither credential, cookie, CSRF value, nor token.

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
- rejected credentials produce a sanitized error;
- missing environment configuration fails without exposing secrets.
