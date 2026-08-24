# Changelog

Notable changes to Bunpro MCP are recorded here. The project follows semantic versioning while it remains in private preview.

## 0.3.1 — 2026-08-24

- Added a public, responsive setup and product homepage at `https://bunpro.yashkadam.com/`.
- Added repository support guidance, contribution templates, dependency-update configuration, and an explicit future public-source release gate.

## 0.3.0 — 2026-08-12

- Added `X-Bunpro-Token` as the preferred hosted credential header, accepting the raw Account API Token without a prefix.
- Retained `Authorization: Bearer ...` for existing connections and rejected ambiguous dual credentials.
- Updated hosted setup, privacy, security, and community documentation.

## 0.2.0 — 2026-08-12

- Completed the eight-tool read-only catalog for connection checks, study summaries, schedules, decks, recent activity, progress, and trends.
- Added bounded schemas, source-coverage semantics, synthetic evaluations, and full transport verification.

## 0.1.0 — 2026-08-12

- Added stateless stdio and Streamable HTTP transports.
- Added direct per-caller Account API Token passthrough with no credential database, cookies, or login scraping.
