---
status: accepted
---

# Direct Account API Token passthrough

## Context

Bunpro introduced an experimental opt-in parameter that lets its Account API Token authenticate Frontend API requests. Authorized, low-volume testing confirmed that the four read-only routes required by Atlas return JSON when the Account API Token and opt-in parameter are supplied together.

The previous hosted design used Auth0 identity, a setup page, encrypted Bunpro username/password storage, PostgreSQL, browser cookies, and frontend-token refresh. Those layers are unnecessary when the MCP host holds the caller's own Account API Token in protected configuration and sends it with each request. Not every host offers that. claude.ai web and mobile can set a request header only with Anthropic's request-headers beta, so a learner without the beta uses a local path or another host. The server does not add a credential store or an account link to cover that gap.

## Decision

- The Account API Token is the only Bunpro credential.
- Local stdio reads it from `BUNPRO_API_TOKEN`.
- Remote Streamable HTTP reads it from exactly one of two supported request headers. `X-Bunpro-Token` carries the raw token for ChatGPT and other hosts. `Authorization: Bearer ...` carries it for Claude, which can't use a custom header without Anthropic's approval. The `Bearer ` prefix is required.
- The remote server does not authenticate a separate MCP identity. These headers are only protected transport containers for the Bunpro credential.
- Every Bunpro Frontend API request uses `Authorization: Token token=<account-token>` and `dangerously_authenticate_using_api_token=true`.
- The server never stores the token, creates cookies, logs into Bunpro, refreshes a session, or retries authentication.
- No Auth0 tenant, account-link page, PostgreSQL database, encryption key, or disconnect tool is part of the target system.
- Missing, malformed, or ambiguous HTTP credentials fail at the transport boundary. Bunpro authentication rejection, throttling, route unavailability, and schema drift fail closed.

## Consequences

The hosted server is genuinely stateless and naturally isolates callers because every request carries that caller's Bunpro credential. Operation is simpler and no credential database exists to breach.

The hosted operator and infrastructure can still inspect request memory or TLS termination, so local stdio remains the lowest-trust option. Bunpro's temporary mechanism, stricter throttling, and planned route whitelist remain compatibility risks.
