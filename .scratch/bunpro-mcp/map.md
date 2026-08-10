Label: wayfinder:map

## Destination

A working, private, open-source-ready, stateless Bunpro MCP that exposes trustworthy date-bounded study evidence through `get_study_day_summary` and `get_connection_status`, is usable through local stdio and remote Streamable HTTP, and is proven end to end in the Atlas Daily Review without corrupting Atlas's catch-up watermarks.

## Notes

- The standalone repository is private until Yash explicitly approves public release; the intended release license is MIT.
- Runtime and packaging direction: TypeScript on Node.js, local stdio, remote Streamable HTTP, `npx`, and Docker self-hosting.
- Authentication accepts only the Bunpro Account API Token generated on Bunpro's account page. Hosts provide it through secret configuration. Never accept a Bunpro password, browser cookie, or Frontend Session Token.
- Reverse-engineering is limited to read-only requests using the Bunpro Account API Token. If no surviving endpoint accepts that credential, record the blocker rather than changing authentication methods.
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

## Not yet specified

- The exact Bunpro endpoints and payload fields available through the Bunpro Account API Token.
- Which requested study measures can be sourced directly and which must remain unavailable.
- Endpoint compatibility and drift policy beyond the required fail-closed behavior.
- The detailed host configuration experience after real tool behavior is known.
- Public release readiness, documentation, branding, and Bunpro permission remain later fog after private end-to-end validation.

## Out of scope

- Browser-session credential extraction, cookie scraping, password collection, or Frontend Session Token authentication.
- Bunpro write operations, including reviews, lessons, notes, progress changes, or queue mutation.
- A separate MCP settings website.
- Persistent MCP databases, study-history storage, credential storage, or watermark ownership.
- Public repository release before explicit approval.
