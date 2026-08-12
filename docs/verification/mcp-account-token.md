# MCP Account API Token verification

The direct-token implementation is verified at three boundaries:

1. Local stdio reads only `BUNPRO_API_TOKEN`.
2. Remote Streamable HTTP accepts the caller's token only from `Authorization: Bearer ...` and creates a fresh MCP server for the stateless request.
3. The Bunpro client sends the same token using Bunpro's `Token token=...` header and always adds `dangerously_authenticate_using_api_token=true`.

Automated tests assert that:

- existing route query parameters are preserved;
- external and non-Frontend API URLs are rejected before a network call;
- HTTP 401/403 returns a sanitized authentication failure with no retry;
- HTTP 429 returns a sanitized throttling failure with no retry;
- missing, ambiguous, non-Bearer, and oversized incoming credentials are rejected;
- connection output reports that the server did not persist the token; and
- no cookies or browser-session requests are produced.

The opt-in live tests run the compiled stdio MCP and the Streamable HTTP Bearer-token path with a real `BUNPRO_API_TOKEN`, call `get_connection_status`, and print only normalized status fields.
