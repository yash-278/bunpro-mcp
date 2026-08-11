Type: prototype
Status: open
Blocked by: 04

## Question

Does the proposed secret configuration and connection-diagnostic experience work clearly across the intended local stdio and remote Streamable HTTP host modes without exposing Bunpro login credentials, web cookies, or the Frontend Session Token?

## Comments

- Local stdio is implemented with `BUNPRO_USERNAME` (or `BUNPRO_EMAIL`) and `BUNPRO_PASSWORD` supplied by the MCP host environment.
- `get_connection_status` creates a fresh Bunpro client per invocation, proves both the authenticated web session and frontend API access, and returns no secret material.
- A live MCP v2 client-to-server smoke test passed on 2026-08-11. Remote Streamable HTTP configuration remains unimplemented, so this ticket stays open.
