# Bunpro API evidence

Research date: 2026-08-10

> Authentication-boundary update (2026-08-12): Bunpro's private community has since supplied a temporary Account API Token authentication mechanism for Frontend API routes. Authorized testing confirmed the Atlas-required contract in [Bunpro Account API Token request contract](./bunpro-account-token-api.md). The evidence gaps and intermediate browser-login choice recorded below are historical and superseded.

## Question

What first-party evidence establishes the current Bunpro Account API Token, removed legacy routes, surviving read-only API surfaces, and any explicit permission or constraints relevant to reverse-engineering them?

## Findings

### The legacy documented API is gone

Bunpro staff describe the old API as having once had documentation, then being deprecated because maintaining it slowed other development. In September 2024, Sean said that the documentation had been removed and that the API key and routes were still accessible but unsupported and undocumented at that time. This is historical evidence, not evidence that those routes remain available now. [Bunpro API when? — staff response, 13 September 2024](https://community.bunpro.jp/t/bunpro-api-when/100574/6)

The later status is explicit: in April 2026 Bunpro staff announced that the legacy `/api/user/**` API had been officially removed. In May 2026 Sean repeated that announcement in response to a user reporting 404 from `GET /api/user/{API_KEY}/study_queue`. [Bunpro API when? — removal announcement](https://community.bunpro.jp/t/bunpro-api-when/100574?page=2), [Bunpro bug-report confirmation, 19 May 2026](https://community.bunpro.jp/t/feedback-bug-reports/130?page=364)

An unauthenticated, read-only probe on 2026-08-10 also returned HTTP 404 for `GET https://bunpro.jp/api/user/test/study_queue`. This is consistent with removal, although the staff announcement is the authoritative evidence.

**Decision consequence:** the Account API Token cannot be assumed to work with any former `/api/user/**` route. Those routes must not form the v1 design.

### The Account API Token still lacks a confirmed supported surface

The strongest first-party statement about the Account API Token is Sean's September 2024 statement that the key remained accessible after the old API was deprecated. Bunpro has no current public API documentation linked from that statement, and the April/May 2026 removal announcement eliminates the routes it historically authenticated. [Bunpro API when? — staff response, 13 September 2024](https://community.bunpro.jp/t/bunpro-api-when/100574/6)

The Bunpro-hosted permission thread distinguishes the token in user settings from the token used by the web frontend, but the statements that the settings token “currently does nothing” and “currently doesn't work” are community reports, not a Bunpro staff guarantee. They are useful hypotheses for credentialed testing, not proof. [Permission to reverse engineer the Bunpro API — discussion, January–March 2026](https://community.bunpro.jp/t/permission-to-reverse-engineer-the-bunpro-api/164173/8)

**Evidence gap:** without an authenticated request using the user's Account API Token, first-party public material does not establish any surviving endpoint that accepts it. The next live-research ticket must test that question and may conclude that the credential boundary blocks the project.

### A frontend API surface survives, but it is a different credential boundary

Bunpro staff explicitly refer to the API used by the website as something community developers may reverse-engineer, while warning that it can change at any time. [Bunpro API when? — staff response, 13 September 2024](https://community.bunpro.jp/t/bunpro-api-when/100574/6)

Current Bunpro behavior confirms at least one frontend route still exists: an unauthenticated `GET https://api.bunpro.jp/api/frontend/user` returned HTTP 401 on 2026-08-10. That establishes an authentication-gated route, but not its accepted credential, response schema, or read semantics. In the same probe, `/api/frontend/queue`, `/api/frontend/due`, `/api/frontend/base_stats`, and `/api/frontend/review_activity` returned HTTP 404. An unauthenticated 404 does not prove whether a route is absent for authenticated clients, so no survival claim is made for those four paths.

Bunpro staff also pointed a community developer to the site's Search API and suggested inspecting the request payload from the current UI. That is evidence of an internal surface in January 2026, but it is a content/search surface and does not establish date-bounded personal study history or Account API Token support. [Permission to reverse engineer the Bunpro API — Sean, 26 January 2026](https://community.bunpro.jp/t/permission-to-reverse-engineer-the-bunpro-api/164173/7)

**Historical decision consequence:** the project initially forbade the Frontend Session Token. That boundary was superseded on 2026-08-11 for the private phase after Account-token testing failed; see ADR 0001 and the authenticated frontend research note.

### Bunpro expressly permits reverse-engineering and public documentation, with no stability promise

In December 2025, a developer asked Bunpro for permission both to reverse-engineer the API and share discovered methods in a public GitHub repository. Sean answered affirmatively and warned that the methods may change without warning. [Permission to reverse engineer the Bunpro API — Sean, 18 December 2025](https://community.bunpro.jp/t/permission-to-reverse-engineer-the-bunpro-api/164173/2)

Sean had already given the same technical caveat in September 2024: developers may reverse-engineer the website API, but Bunpro makes no compatibility guarantee because it is not a documented API. [Bunpro API when? — staff response, 13 September 2024](https://community.bunpro.jp/t/bunpro-api-when/100574/6)

This permission supports a community-maintained, reverse-engineered implementation and eventual public repository. It is not a supported API contract, an endorsement of this particular project, permission to use Bunpro trademarks as project identity, or a promise of continued access.

### General service constraints still apply

Bunpro's current Terms say that users must comply with applicable laws, that materials may change without notice, and that Bunpro may suspend or terminate service access. They also say the site's materials are protected by copyright and trademark law. [Bunpro Terms of Service, updated 6 November 2024](https://bunpro.jp/terms)

**Decision consequence:** keep the implementation read-only and user-authenticated, minimize request volume, avoid redistributing Bunpro content, label the integration as unofficial, fail closed on schema drift, and treat access as revocable. These are prudent design constraints inferred from the Terms and the staff stability warning; Bunpro has not published API-specific rate limits or an API-specific license in the sources reviewed.

## Answer

The first-party record establishes that Bunpro permits reverse-engineering and public documentation of its website API, but offers no stability guarantee. It also establishes that the legacy `/api/user/**` API—historically associated with the Account API Token—was removed in April 2026. A current unauthenticated probe confirms `/api/frontend/user` remains authentication-gated, but no public first-party evidence establishes that this or any other surviving route accepts the Account API Token or exposes date-bounded study history. That is the decisive live-research gap, and the project must not substitute the Frontend Session Token if Account-token testing fails.

## Sources reviewed

- [Bunpro API when?](https://community.bunpro.jp/t/bunpro-api-when/100574)
- [Bunpro API when? — legacy removal discussion](https://community.bunpro.jp/t/bunpro-api-when/100574?page=2)
- [Permission to reverse engineer the Bunpro API](https://community.bunpro.jp/t/permission-to-reverse-engineer-the-bunpro-api/164173/1)
- [Bunpro bug reports, page 364](https://community.bunpro.jp/t/feedback-bug-reports/130?page=364)
- [Bunpro Terms of Service](https://bunpro.jp/terms)

## Research limitations

- No credentials were used and no authenticated requests were made.
- The Account API Token's current presence in the account UI was not independently inspected because that page requires authentication.
- HTTP probes recorded only status codes and did not retrieve or retain personal data.
- Community endpoint inventories were not treated as authoritative evidence of current behavior.
