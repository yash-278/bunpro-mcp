# Changelog

Notable changes to Bunpro MCP are recorded here. The project follows semantic versioning.

## Unreleased

- Made `Authorization: Bearer <token>` a supported hosted credential path alongside `X-Bunpro-Token`. The `Bearer ` prefix stays required, and a request with both headers is still rejected.
- Changed the 401 response for a missing or invalid credential to name both methods.
- Added `BUNPRO_SMOKE_AUTH=bearer` to the all-tools smoke. Its default stays `X-Bunpro-Token`.
- Gave each tool call one 30-second deadline across all its Bunpro requests. It starts at the first request, and `get_connection_status` now has it too.
- Extended the 10-second request timer and the request slot through the response body read, so a stalled body can no longer hang a tool call or free its slot early.
- Changed a timeout, abort, or network failure during the body read from `BUNPRO_CONTRACT_CHANGED` to `BUNPRO_UPSTREAM_UNAVAILABLE`. Study History reports `upstream_unavailable` for that source.
- Study History now stops at the deadline, keeps the results that arrived, and marks the remaining sources `not_queried`.
- Cut the Request Budget to 4 running and 6 queued requests from 4 and 16, keeping the 2-second start interval. More callers see an immediate `BUNPRO_BUSY`, and a queued request returns `BUNPRO_UPSTREAM_UNAVAILABLE` when its deadline passes.

## 0.4.0 — 2026-08-25

- Released Bunpro MCP as an open-source MIT-licensed project with Bunpro's permission.
- Added complete hosted, local stdio, Docker, Railway, and generic HTTPS deployment instructions.
- Updated the public website with source links, a self-hosting section, and open-source FAQ answers.
- Replaced the private-release guardrail with public-release credential and data-safety constraints.
- Updated privacy, security, support, contribution, research, and release documentation for public collaboration.

## 0.3.0 — 2026-08-12

- Added `X-Bunpro-Token` as the preferred hosted credential header, accepting the raw Account API Token without a prefix.
- Retained `Authorization: Bearer ...` for existing connections and rejected ambiguous dual credentials.
- Completed the eight-tool read-only catalog for connection checks, study summaries, schedules, decks, recent activity, progress, and trends.
- Added bounded schemas, source-coverage semantics, synthetic evaluations, and full transport verification.

## 0.1.0 — 2026-08-12

- Added stateless stdio and Streamable HTTP transports.
- Added direct per-caller Account API Token passthrough with no credential database, cookies, or login scraping.
