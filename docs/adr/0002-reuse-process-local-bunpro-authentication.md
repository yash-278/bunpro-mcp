---
status: superseded
---

# Reuse process-local Bunpro authentication

Each MCP server process retains Bunpro web cookies and the Frontend Session Token only in memory and reuses them across tool calls. An API `401` or `403` triggers one refresh attempt through the cached authenticated web session, followed by one API retry. If authentication is still rejected, the client clears all cached cookies and tokens and performs a fresh credential login. Authentication operations are serialized so concurrent calls do not create duplicate login sessions. No credential, cookie, token, study record, or watermark is written to persistent storage; process restart always begins with an empty authentication cache.

This historical decision is fully superseded by [ADR 0004](0004-direct-account-token-passthrough.md). The MCP no longer creates or reuses a Bunpro browser session.
