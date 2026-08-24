---
status: accepted
---

# Direct Account API Token passthrough

## Context

Bunpro introduced an experimental opt-in parameter that lets its Account API Token authenticate Frontend API requests. Authorized, low-volume testing confirmed that the four read-only routes required by Atlas return JSON when the Account API Token and opt-in parameter are supplied together.

The previous hosted design used Auth0 identity, a setup page, encrypted Bunpro username/password storage, PostgreSQL, browser cookies, and frontend-token refresh. Those layers are unnecessary when every caller can supply their own Account API Token through the MCP host's protected-header configuration.

## Decision

- The Account API Token is the only Bunpro credential.
- Local stdio reads it from `BUNPRO_API_TOKEN`.
- Remote Streamable HTTP reads it from the request's `X-Bunpro-Token` header. `Authorization: Bearer ...` remains a backwards-compatible transport for existing connections.
- The remote server does not authenticate a separate MCP identity. These headers are only protected transport containers for the Bunpro credential.
- Every Bunpro Frontend API request uses `Authorization: Token token=<account-token>` and `dangerously_authenticate_using_api_token=true`.
- The server never stores the token, creates cookies, logs into Bunpro, refreshes a session, or retries authentication.
- No Auth0 tenant, account-link page, PostgreSQL database, encryption key, or disconnect tool is part of the target system.
- Missing, malformed, or ambiguous HTTP credentials fail at the transport boundary. Bunpro authentication rejection, throttling, route unavailability, and schema drift fail closed.

## Consequences

The hosted server is genuinely stateless and naturally isolates callers because every request carries that caller's Bunpro credential. Operation is simpler and no credential database exists to breach.

The hosted operator and infrastructure can still inspect request memory or TLS termination, so local stdio remains the lowest-trust option. Bunpro's temporary mechanism, stricter throttling, and planned route whitelist remain compatibility risks.
