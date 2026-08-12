---
status: superseded
---

# Use ephemeral frontend authentication during the private phase

At the time of this decision, the Bunpro Account API Token did not reach a usable read API. The private phase temporarily allowed environment-provided login credentials to establish a Bunpro web session and retain the resulting Frontend Session Token only in process memory.

This decision is historical and fully superseded by [ADR 0004](0004-direct-account-token-passthrough.md). Username/password login, cookies, and frontend-cookie tokens are no longer part of any transport.
