# ADR 0003: Public multi-user remote MCP

## Status

Superseded by [ADR 0004](0004-direct-account-token-passthrough.md).

## Context

The original stdio server is intentionally single-user and reads Bunpro credentials from its host process. A public Railway service cannot use deployment-wide Bunpro credentials: every caller would otherwise reach the same Bunpro account.

ChatGPT remote MCP connections support OAuth, while Bunpro does not currently expose a documented OAuth flow for third-party apps. Bunpro authentication therefore remains an upstream implementation detail behind this service.

## Decision

- Keep the local stdio transport and its environment configuration unchanged.
- Add a stateless Streamable HTTP endpoint at `/mcp` for remote clients.
- Require OAuth bearer authentication and the `bunpro.read` scope on every MCP request.
- Derive an opaque principal ID from the validated OAuth issuer and subject. Never key data by an email address supplied by a client.
- Let each principal link exactly one Bunpro account through a short-lived signed HTTPS setup link. Bunpro credentials are never MCP tool arguments.
- Encrypt Bunpro credentials, cookies, and the frontend API token with AES-256-GCM before storing them in Railway Postgres.
- Cache hydrated clients per principal in a process only as an optimization. Postgres remains the restart-safe source for authentication material.
- Reuse the cached Bunpro session, refresh it through the web session after an authentication rejection, and perform a new credential login only after both fail.
- Let an authenticated user permanently delete their linked Bunpro credentials and session through an explicit destructive MCP tool.
- Do not expose a shared `BUNPRO_USERNAME` or `BUNPRO_PASSWORD` in the Railway service.

## Consequences

The MCP protocol layer remains stateless and safe to scale across instances, while user-specific upstream authentication persists securely. Running more than one instance may produce occasional duplicate refreshes because no distributed session lock is held; successful results converge in the encrypted store.

An external OAuth provider is required before the public endpoint can be attached to ChatGPT. The first deployment uses Auth0 because the official OpenAI authenticated-app example documents that integration and recommends an established identity provider.

The project later adopted Bunpro's temporary Account API Token mechanism. Direct per-request token passthrough removes the identity, setup, database, encryption, and browser-session requirements described here.
