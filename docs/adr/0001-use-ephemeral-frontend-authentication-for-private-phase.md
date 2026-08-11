---
status: accepted
---

# Use ephemeral frontend authentication during the private phase

The Bunpro Account API Token no longer reaches a usable read API. During the private phase, the MCP may use environment-provided login credentials to establish a Bunpro web session and retain the resulting Frontend Session Token only in process memory. This enables read-only API discovery without persisting passwords, cookies, or tokens, but it depends on an unstable internal contract and must be reconsidered before public release.
