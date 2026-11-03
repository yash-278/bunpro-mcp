# Changelog

Notable changes to Bunpro MCP are recorded here. The project follows semantic versioning.

## Unreleased

- Redesigned the homepage around Claude. The first screen shows an example study-plan chat with made-up data, and its main button leads to the Claude setup. That setup is one tabbed panel with numbered steps, ordered Claude Code plugin, Claude Desktop `.mcpb`, then claude.ai. The nine tools are a grid with copyable example questions, the token path is a four-step slider, and the FAQ is an accordion. ChatGPT setup follows with the same values. The page keeps every existing anchor and uses a stone and green palette with system fonts.
- Moved the hosted Railway settings from `railway.json`, which Railway stops reading on 2026-12-01, to `.railway/railway.ts`, applied with `railway config apply`. A Railway self-host now sets the start command and `/healthz` healthcheck in its service settings, as `docs/self-hosting.md` describes.

## 0.5.0 — 2026-11-03

### Breaking

- Made the aggregates in `get_study_range_summary` and `get_activity_trend` nullable. An unavailable source now reports `source_record_days: null` and a null total instead of `0`. An available source with no records in the period reports `source_record_days: 0` and a null total. A recorded zero stays `0`. There is no compatibility alias, so a caller that reads these fields as numbers must handle null.

### Added

- Added `list_weak_spots`, which lists the items Bunpro currently marks as Troubled Content with Bunpro's reported accuracy and streak. It costs one Bunpro request per call, takes `period` and `limit`, and sorts lowest accuracy first. An empty list means Bunpro lists nothing right now, not that the learner has no weak spots.
- Added the `bunpro-mcp` Claude plugin in `plugins/bunpro-mcp`, listed in this repository's marketplace. It connects to the hosted server with `Authorization: Bearer` from a sensitive `bunpro_token` option, and its `study-plan` skill suggests a plan for today from due reviews and weak spots. `npm run check` now fails if the plugin version differs from `package.json`, the connector holds anything but the token placeholder, or the skill names an unregistered tool.
- Added a Claude Desktop `.mcpb`, built by `npm run build:mcpb` and attached to each GitHub release. It runs the stdio server locally and gets the token from a sensitive install field. Added `docs/claude-setup.md`, and `PRIVACY.md` now lists where each Claude app holds the token.
- Added a "Connect it to Claude" section to the homepage, after the ChatGPT one. It gives copyable steps for the Claude Code plugin, the Claude Desktop extension and the claude.ai connector, and replaces the "Using Claude?" note. The page navigation links to it.
- Added `BUNPRO_INVALID_INPUT` for caller mistakes. An invalid calendar date, a `start_date` after `end_date`, more than 93 days, or a future end date now returns it instead of `BUNPRO_CONTRACT_CHANGED`. Error text now says "Study Period" instead of "Study range", and every future date returns "Study Period cannot end in the future."
- Added `BUNPRO_SMOKE_AUTH=bearer` to the all-tools smoke. Its default stays `X-Bunpro-Token`.
- Added an "Every release" section to `docs/release-checklist.md`, with the 0.4.0 checklist kept below it as a record.

### Changed

- Made `Authorization: Bearer <token>` a supported hosted credential path alongside `X-Bunpro-Token`. The `Bearer ` prefix stays required, and a request with both headers is still rejected. The 401 response for a missing or invalid credential now names both methods.
- Gave each tool call one 30-second deadline across all its Bunpro requests. It starts at the first request, and `get_connection_status` now has it too.
- Extended the 10-second request timer and the request slot through the response body read, so a stalled body can no longer hang a tool call or free its slot early.
- Changed a timeout, abort, or network failure during the body read from `BUNPRO_CONTRACT_CHANGED` to `BUNPRO_UPSTREAM_UNAVAILABLE`. Study History reports `upstream_unavailable` for that source.
- Study History now stops at the deadline, keeps the results that arrived, and marks the remaining sources `not_queried`.
- Cut the Request Budget to 4 running and 6 queued requests from 4 and 16, keeping the 2-second start interval. More callers see an immediate `BUNPRO_BUSY`, and a queued request returns `BUNPRO_UPSTREAM_UNAVAILABLE` when its deadline passes.
- A missing token now outranks an impossible calendar date such as `2026-02-30`. A stdio call with no `BUNPRO_API_TOKEN` and such a date returns `BUNPRO_CONFIG_MISSING` instead of `BUNPRO_INVALID_INPUT`. A malformed value such as `not-a-date` still fails schema validation first.
- Renamed the `get_study_range_summary` title and its homepage label to "Study Period". The tool name is unchanged.
- Corrected the `end_date` description. The limit is 93 Study Days counting the start and end dates, so `end_date` can be at most 92 days after `start_date`.
- Changed the `User-Agent` sent to Bunpro from `bunpro-mcp-server/0.4` to the full server version, such as `bunpro-mcp-server/0.5.0`.
- Updated `@modelcontextprotocol/server` to 2.4.0 and `zod` to 4.6.6.

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
