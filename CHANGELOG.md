# Changelog

Notable changes to Bunpro MCP are recorded here. The project follows semantic versioning.

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
