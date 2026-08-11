Label: wayfinder:map

## Destination

A working, private, open-source-ready, stateless Bunpro MCP that exposes trustworthy date-bounded study evidence through `get_study_day_summary` and `get_connection_status`, is usable through local stdio and remote Streamable HTTP, and is proven end to end in the Atlas Daily Review without corrupting Atlas's catch-up watermarks.

## Notes

- The standalone repository is private until Yash explicitly approves public release; the intended release license is MIT.
- Runtime and packaging direction: TypeScript on Node.js, local stdio, remote Streamable HTTP, `npx`, and Docker self-hosting.
- The Account API Token remains unsupported by every tested read surface. During the private phase, hosts may instead provide Bunpro email/password credentials through secret environment configuration.
- The MCP may use those credentials to establish a Bunpro web session and retain its Frontend Session Token only in process memory. Never print, log, persist, or return login credentials, cookies, CSRF values, or frontend tokens.
- Each MCP process may reuse its in-memory Bunpro cookies and Frontend Session Token. On `401`/`403`, retry once after refreshing through the cached web session; if that fails, clear the cache and perform a fresh credential login.
- Reverse-engineering remains limited to read-only requests. Frontend authentication is an unstable private-phase adapter and must be reconsidered before public release.
- The MCP is always stateless. Atlas owns summaries and watermarks.
- V1 tools are `get_connection_status` and `get_study_day_summary` only.
- Results must state the requested date window, timezone, source coverage and compatibility warnings. Never estimate missing study time or activity.
- Testing uses sanitized fixtures, date-window and normalization tests, opt-in live tests, and no persisted raw personal responses.
- Atlas must not be modified until both MCP tools succeed against a live Bunpro account and at least one known Study Day is trustworthy.
- Final acceptance requires a known-day comparison and a simulated MCP failure that leaves the Bunpro Watermark unchanged.
- Every session working this map must consult the Wayfinder, grilling, domain-modeling, and research skills when its ticket type requires them.

## Decisions so far

- [Inventory current Bunpro API evidence](https://github.com/yash-278/bunpro-mcp/issues/2) — Bunpro permits unstable reverse-engineering, but removed `/api/user/**`; no public evidence proves a surviving Account-token study-history route.
- [Provision safe live research input](https://github.com/yash-278/bunpro-mcp/issues/3) — Use the locally configured zsh secret with known active Study Day `2026-08-10`; never print or persist the token or raw personal payloads.
- [Discover frontend authentication and study endpoints](https://github.com/yash-278/bunpro-mcp/issues/4) — Environment login can procure the frontend token in memory; historical heatmaps provide date-bounded aggregate reviews and new content, while arbitrary-day duration and complete item history remain unavailable.

## Not yet specified

- Frontend token expiry, renewal, invalidation, login-challenge, and rate-limit behavior.
- Whether a missing sparse-heatmap key can be treated as an authoritative zero.
- The exact source-to-summary mapping and partial-coverage vocabulary for supported and unavailable measures.
- Endpoint compatibility and drift policy beyond the required fail-closed behavior.
- The detailed host configuration experience after real tool behavior is known.
- Public release readiness, documentation, branding, and Bunpro permission remain later fog after private end-to-end validation.

## Out of scope

- Persisting, logging, returning, or placing Bunpro login credentials, cookies, CSRF values, or Frontend Session Tokens in Atlas, GitHub, research artifacts, or MCP tool results.
- Bunpro write operations, including reviews, lessons, notes, progress changes, or queue mutation.
- A separate MCP settings website.
- Persistent MCP databases, study-history storage, credential storage, or watermark ownership.
- Public repository release before explicit approval.
