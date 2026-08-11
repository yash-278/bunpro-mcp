Type: prototype
Status: open
Blocked by: 04

## Question

Does the proposed secret configuration and connection-diagnostic experience work clearly across the intended local stdio and remote Streamable HTTP host modes without exposing Bunpro login credentials, web cookies, or the Frontend Session Token?

## Comments

- Local stdio is implemented with `BUNPRO_USERNAME` (or `BUNPRO_EMAIL`) and `BUNPRO_PASSWORD` supplied by the MCP host environment.
- The MCP process lazily creates one Bunpro client. It reuses the in-memory cookies and frontend token, attempts web-session refresh after `401`/`403`, and performs a clean credential re-login only if refresh and retry fail.
- `get_connection_status` proves frontend API access and reports whether it used a fresh, cached, refreshed, or re-logged session without returning secret material.
- A two-call live MCP v2 client-to-server smoke test passed on 2026-08-11: the first call logged in and the second reused the cached session. Remote Streamable HTTP configuration remains unimplemented, so this ticket stays open.
