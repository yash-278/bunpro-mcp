# Privacy

This document explains how Bunpro MCP handles authentication data. It applies to the source code and to the hosted preview at `https://bunpro-mcp-production.up.railway.app/mcp`.

## Local mode

In local stdio mode:

- Your Bunpro login is supplied by your MCP host through `BUNPRO_USERNAME` and `BUNPRO_PASSWORD`.
- The MCP keeps Bunpro web cookies and the derived frontend token in process memory.
- The MCP itself does not persist credentials, sessions, or study data.
- Restarting the MCP process clears its derived session.

Your MCP host may persist environment configuration according to that application's own privacy and security behavior.

## Hosted mode

The hosted service handles two separate identities:

1. Auth0 authenticates you to the MCP.
2. A short-lived, identity-bound setup link lets you connect one Bunpro account.

The service stores:

- a one-way hash derived from the validated OAuth issuer and subject;
- your Bunpro username and password;
- the Bunpro web cookies and frontend token obtained after login; and
- the time the encrypted payload was last updated.

The Bunpro authentication payload is encrypted with AES-256-GCM before it is written to PostgreSQL. The application does not intentionally store Bunpro study history or raw API responses.

The hosted operator controls the application and encryption key and can technically decrypt the payload. Encryption protects the database contents from being useful without that key; it does not remove the need to trust the operator. Use local mode or self-host if you do not accept that trust model.

## Removing hosted data

Run `disconnect_bunpro_account` and confirm the destructive action. The service deletes the linked account row and clears its process cache. Reconnecting requires entering your Bunpro credentials again.

Infrastructure backups, if enabled by the deployment provider, may retain deleted encrypted rows for the provider's backup-retention period. Changing your Bunpro password invalidates the stored password independently of deletion.

## Logs and telemetry

The application does not include analytics or advertising code. It logs sanitized operational errors, not credentials, cookies, setup tokens, frontend tokens, or raw Bunpro responses. Hosting, OAuth, MCP-client, and network providers may process their normal connection metadata under their own policies.

## Security reports

Do not post credentials or security-sensitive data in a public issue. Follow the private reporting process in [SECURITY.md](SECURITY.md).
