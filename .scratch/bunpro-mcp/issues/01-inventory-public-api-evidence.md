Type: research
Status: resolved
Blocked by:

## Question

What first-party evidence establishes the current Bunpro Account API Token, removed legacy routes, surviving read-only API surfaces, and any explicit permission or constraints relevant to reverse-engineering them?

## Comments

## Resolution

First-party evidence establishes that Bunpro expressly permits reverse-engineering and public documentation of its website API, while warning that endpoints may change without notice. Bunpro staff also confirmed that the legacy `/api/user/**` API was removed in April 2026. An unauthenticated probe on 2026-08-10 found `/api/frontend/user` authentication-gated (HTTP 401) and a sampled legacy route absent (HTTP 404), but public first-party evidence does not establish any surviving endpoint that accepts the Account API Token or exposes date-bounded study history. That remains the decisive credentialed research question; the project must not substitute the Frontend Session Token.

Research note: [Bunpro API evidence](https://github.com/yash-278/bunpro-mcp/blob/main/docs/research/bunpro-api-evidence.md)
