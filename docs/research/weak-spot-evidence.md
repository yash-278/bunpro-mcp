# Weak-spot evidence sources

Research date: 2026-11-02

> [!CAUTION]
> Every route below belongs to Bunpro's internal, undocumented Frontend API. Nothing here is a supported contract. No authenticated Bunpro route was called for this note, and it holds no token, account response or personal study data.

## Question

Which read-only Bunpro source could show the grammar points a learner keeps missing? For each candidate, what evidence exists, what is its response shape and request cost, is it complete or only recent, and how exposed is it to Bunpro's planned route whitelist? This answers [issue #84](https://github.com/yash-278/bunpro-mcp/issues/84).

## Answer

**No supported source exists today.** Bunpro publishes no API documentation for weak-spot data, and the Frontend API has no stability promise.

**No candidate is confirmed for this MCP yet.** Two unreleased candidates could carry item-level weak-spot evidence, but neither has been shown to work with the Account API Token:

- `/user_stats/troubled_content` is Bunpro's own "Troubled Content" list on the Stats page. Bunpro's current public JavaScript calls it, and one request returns item identity plus accuracy. Nobody has published a live result for it. Its selection rule and size limit are unknown.
- `/user_stats/srs_level_details` returns per-item `accuracy`, `times_studied`, `review_misses` and `streak`. Two public projects use it live with browser frontend tokens. Reading every item takes at least 5 requests for grammar alone, plus more for extra pages.

**No proven source supports a claim about all-time weak spots.** `get_recent_activity` covers Bunpro's last 50 reviewed sentences or a rolling 24 hours. The all-time aggregates have no item identity. `troubled_content` is described by Bunpro as "recently missed". The SRS sweep is the closest thing to a lifetime view, but its completeness is unproven and resets erase its history.

Confirming either candidate needs a live call, which belongs to a human. See [Follow-up probe](#follow-up-probe-for-a-human).

## Confirmed facts

These facts come from Bunpro's own public pages and this repository.

**Bunpro has a Troubled Content section.** The current Stats page calls `/user_stats/troubled_content` with `?period=last_month` for "Last Month" and no query for "Overall". [Chunk 975](https://bunpro.jp/_next/static/chunks/975-0aaee7fd605ca9a4.js) holds the route template and both period labels. The section also offers a Cram button for the listed items, which this MCP must not use because crams are excluded.

**Bunpro's public copy defines the list loosely.** The [Stats page](https://bunpro.jp/profile/stats) text says "Items that you have a gotten wrong frequently over multiple Review sessions" and "items that you've recently missed the most". It states no threshold.

**The latest-attempts route is capped.** The same page's empty-state text says "in the last 50 Reviewed sentences". This applies to `/user_stats/last_done_reviews`, which [chunk 894](https://bunpro.jp/_next/static/chunks/894-562f0026985606e7.js) calls for the Recent Reviews card with its Correct and Missed tabs.

**Ghosts are sentence-level and removable.** The [Bunpro FAQ](https://community.bunpro.jp/t/bunpro-faq-frequently-asked-questions/876) calls ghost reviews "leeches" and says they use "a separate SRS". It also says a Reset removes "any statistics or SRS level" for the reset items. Its header reads "Updated November 26, 2020", so this may be out of date.

**This MCP sends GET requests only.** See [`src/bunpro/frontend-source.ts:661`](../../src/bunpro/frontend-source.ts). Requests start at least 2 seconds apart ([`src/bunpro/client.ts:9`](../../src/bunpro/client.ts)), and each response is capped at 2 MiB ([`src/bunpro/frontend-source.ts:29`](../../src/bunpro/frontend-source.ts)).

## Item-level candidates

### `/user_stats/troubled_content`

| Field | Finding |
| --- | --- |
| Evidence | Primary for route and client parsing: Bunpro's public bundle, fetched 2026-11-02, build `6YU_QpHizgAtiK0oce1G7`. [Kakehashi's inventory](https://github.com/Portego-00/Kakehashi/blob/cef3b74544a2/docs/bunpro-web-analytics.md) lists it as found in the client, not live verified. A GitHub code search found no public project calling it. |
| Response shape | Read from the client parser, not from a response. A JSON array whose entries hold `data.attributes.accuracy` (number or null), `data.attributes.streak`, and a `reviewable` object. The client reads `id`, `title`, `meaning`, `slug`, `type_snake` and `type_pascal` from the reviewable. |
| Request cost | 1 request per view, 2 for both views. The route has no type or page parameter. The client filters grammar and vocabulary locally and pages through the array itself. |
| Complete or recent | Neither is proven. "Overall" exists, but Bunpro still calls the list "recently missed". The selection rule and any item cap are unpublished. A [March 2026 forum post](https://community.bunpro.jp/t/feedback-suggested-improvements-feature-request/131/3957) says the section "will just show ~1 item at a time". |
| Whitelist risk | Unknown. It is not in this MCP's route list, so an allowlist built from current use would not cover it. |

The threshold is also unsettled. The FAQ says "missed more than four times". A [2019 update reply](https://community.bunpro.jp/t/major-update-november-24-2019/13702) by Pushindawood says below 75% correct, replacing the four-miss rule. The March 2026 post above guesses "50% or below" for the Cram list. The Cram list and the Stats list may not share one rule, so no threshold should be stated as fact.

### `/user_stats/srs_level_details`

| Field | Finding |
| --- | --- |
| Evidence | Live use with browser frontend tokens in two independent projects: [`bunpro-mcp-server` `get_weak_items`](https://github.com/Alexxanddr/bunpro-mcp-server/blob/52f081884cb9/src/client.ts#L102-L145) (October 2026) and [`bunbuddy`](https://github.com/dylangierok/bunbuddy/blob/b3d930d1f831/src/bunpro.mjs#L50-L60) (July 2026). The [community spec](https://github.com/cbullard-dev/bunpro-community-api/blob/ab4fcc7a316a/spec/frontend.yaml#L1765-L1804) documents its parameters only. I did not find this route in the two bundle chunks I read. |
| Response shape | From third-party code, not a sanitized response. `reviews.data[]` holds `attributes` with `accuracy`, `times_studied`, `review_misses` and `streak`, plus `relationships.reviewable.data.id`. `reviews.included[]` holds the reviewable, and `pagy.pages` gives the page count. |
| Request cost | One sequence per stage: `beginner`, `adept`, `seasoned`, `expert`, `master`. That is 5 requests for grammar alone, plus one per extra page. Page size is unpublished. `bunbuddy` reports about 20 requests for grammar and vocabulary together. At this MCP's 2-second start interval, 20 sequential requests take at least 38 seconds. |
| Complete or recent | A current per-item snapshot, not a time series. It could cover all reviewed items in the five stages if every page is read, but no source proves that. It cannot answer "recently". Reset items lose their statistics, per the FAQ. Ghost and self-study items come from separate routes. |
| Whitelist risk | Unknown. It is not in this MCP's route list, and a multi-page sweep is the highest-volume pattern in this note. |

Three cautions apply:

- `bunpro-mcp-server` [reports](https://github.com/Alexxanddr/bunpro-mcp-server/blob/52f081884cb9/docs/MCP_CONTRACTS.md#L41) that `review_misses` was zero for vocabulary with low historical accuracy, so it ranks by a derived `estimated_misses`. That is a calculation, not a Bunpro fact. Grammar behavior is unknown.
- Its implementation fans out with `Promise.all`, which does not fit this project's low-volume rule. A sequential sweep would be needed.
- The `reviewable_type` value is disputed. Both live projects send `Grammar`. [Kakehashi](https://github.com/Portego-00/Kakehashi/blob/cef3b74544a2/docs/bunpro-web-analytics.md) says the official client sends `GrammarPoint`. The [one reported 500](https://github.com/Alexxanddr/bunpro-mcp-server/blob/52f081884cb9/RESEARCH-patvandyke-comparison.md) with `GrammarPoint` also used `level=1`, so it settles nothing.

### `/user_stats/srs_ghost_level_details`

| Field | Finding |
| --- | --- |
| Evidence | Listed in the [community spec](https://github.com/cbullard-dev/bunpro-community-api/blob/ab4fcc7a316a/spec/frontend.yaml#L1840-L1866) and wrapped by `bunpro-mcp-server`. No published response or live result was found. |
| Response shape | Unknown. The spec types it as a generic object. |
| Request cost | At least 1 request per reviewable type. Pagination is not documented. |
| Complete or recent | Current state only. Ghosts are sentence-level, can be turned to Minimal, and can be cleared by Reset, so a missing ghost does not show that a point is strong. A [community thread](https://community.bunpro.jp/t/view-grammar-by-srs-success-rate/37192) notes that ghosts miss points answered correctly often enough to avoid ghosting. |
| Whitelist risk | Unknown. Not in this MCP's route list. |

### `/user_stats/last_done_reviews`

| Field | Finding |
| --- | --- |
| Evidence | Repository: [implemented](../../src/bunpro/frontend-source.ts) and [researched](./bunpro-frontend-api.md). Primary: Bunpro's Stats page calls it. |
| Response shape | Array of attempts with `id`, `time`, boolean `status`, and `reviewable.data` with `id`, `type`, `attributes.title` and `attributes.slug`. See [`src/bunpro/frontend-source.ts:95-122`](../../src/bunpro/frontend-source.ts). |
| Request cost | 1 request. |
| Complete or recent | Recent only, the last 50 reviewed sentences per Bunpro's copy. It can show repeated misses inside that window. It cannot support all-time claims. |
| Whitelist risk | Unknown, but shared with the released `get_recent_activity`. A whitelist that drops it breaks a tool already in use. |

### `/summary/last_24_hours`

| Field | Finding |
| --- | --- |
| Evidence | Repository: implemented, schema at [`src/bunpro/frontend-source.ts:118-121`](../../src/bunpro/frontend-source.ts). |
| Response shape | `history_objects` uses the same attempt shape as above, and `review_sessions.data` holds session records. |
| Request cost | 1 request. |
| Complete or recent | Recent only, a rolling 24 hours and [not guaranteed complete](./bunpro-frontend-api.md). |
| Whitelist risk | Unknown, but shared with the released `get_recent_activity`. |

### `/reviews`

| Field | Finding |
| --- | --- |
| Evidence | The [community spec](https://github.com/cbullard-dev/bunpro-community-api/blob/ab4fcc7a316a/spec/frontend.yaml#L1470-L1508) documents it, but live reports say it fails. HTTP 500 is reported in [February 2026](https://community.bunpro.jp/t/openclaw-skill-for-bunpro-progress-tracking/175471), by [`bunbuddy`](https://github.com/dylangierok/bunbuddy/blob/b3d930d1f831/src/bunpro.mjs#L2-L3) in July 2026, and by [`bunpro-mcp-server`](https://github.com/Alexxanddr/bunpro-mcp-server/blob/52f081884cb9/RESEARCH-patvandyke-comparison.md) on 2026-10-21. All used browser tokens on single accounts. |
| Response shape | Unknown for the current API. The `times_correct`, `times_incorrect` and `history` fields in [`nihongo-stats`](https://github.com/ranger-ross/nihongo-stats/blob/main/src/bunpro/models/raw/RawBunProReview.ts) describe the legacy API, which [Bunpro removed](./bunpro-api-evidence.md). |
| Request cost | One request per page, with an undocumented total. |
| Complete or recent | Would be the fullest item list if it worked. Three reports say it does not. |
| Whitelist risk | Unknown. Unusable today regardless. |

### `/reviews/hydrate` and `/reviews/hydrate_reviewables`

| Field | Finding |
| --- | --- |
| Evidence | The GET form appears in a [2025 forum post](https://community.bunpro.jp/t/bunpro-api-when/100574/20) as "get stats for a certain grammar point", with `reviewable_id` and `reviewable_type=GrammarPoint`. The POST form is used by [`better-bunpro`](https://github.com/mwsmws22/better-bunpro/blob/24cb38f0ea77/src/bunpro/user-reviews.ts) and Kakehashi. |
| Response shape | The GET response is undescribed. The POST returns `review` records with `id`, `user_synonyms`, `complete`, `reviewable_id` and `reviewable_type`. No source shows accuracy in either. |
| Request cost | 1 GET per item, or 1 POST per batch. |
| Complete or recent | Lookup only. The caller must already know which items to ask about, so neither route can find weak points alone. |
| Whitelist risk | Unknown. The POST form also conflicts with this MCP's GET-only client. |

### `/decks/{deckCode}/contents` with a `system` filter

| Field | Finding |
| --- | --- |
| Evidence | The [community spec](https://github.com/cbullard-dev/bunpro-community-api/blob/ab4fcc7a316a/spec/frontend.yaml#L916-L1006) says the `troubled` and `ghost` filter values came from web client requests "without checking their results". |
| Response shape | `contents.data[]`, `contents.included[]` and `pagy`. The spec shows no accuracy field. |
| Request cost | 1 POST per page, per deck. It needs a deck code, so it does not cover the whole account in one call. |
| Complete or recent | Unknown, and scoped to one deck. The spec says unknown filter values return 200 with the full list, so a rejected filter would look like success and return the whole deck as "troubled". |
| Whitelist risk | Unknown. POST also conflicts with this MCP's GET-only client. |

## Aggregate sources

These routes are already implemented, but none of them identifies a grammar point.

| Route | Shape | Cost | Coverage | Weak-spot use |
| --- | --- | --- | --- | --- |
| `/user_stats/total_review_stats` | `accuracy`, `correct`, `incorrect`, `total` by JLPT level, split into grammar, vocabulary and mixed ([schema](../../src/bunpro/frontend-source.ts)) | 1 | All-time aggregate | Shows the weakest JLPT level, not the weakest points |
| `/user_stats/accuracy_over_time` | Date-keyed number or null | 1 | About three months | Shows a trend only |

Both carry the same unknown whitelist risk as other current routes, and released tools depend on them.

## Rejected leads

- **`is_leech` on `/user/due`.** [`bunpro-sync` notes](https://github.com/johnalbertini14-glitch/openclaw-skills/blob/87ab19434710/skills/mart1n-xyz/bunpro-sync/references/api-structure.md) show a due-item list with this flag. That conflicts with this repository's schema for the route, which reads totals ([`src/bunpro/frontend-source.ts:59-62`](../../src/bunpro/frontend-source.ts)). The same notes describe `/user/queue` as review items, while this repository found [deck configuration](../tool-roadmap.md). I treat the notes as unreliable.
- **`/review_histories/last_session` and `/review_histories/last_24_hours`.** Both returned [HTTP 500](https://github.com/Alexxanddr/bunpro-mcp-server/blob/52f081884cb9/RESEARCH-patvandyke-comparison.md) on 2026-10-21. This MCP already has a working 24-hour route.
- **Scraping the Stats page.** [`bunpro-llm`](https://github.com/enjuichang/bunpro-llm/blob/3331a25a50ac/bunpro.py) did this with a login session in 2025. Login scraping is excluded by the [roadmap](../tool-roadmap.md).
- **Cram sessions.** Running crams is excluded by the [roadmap](../tool-roadmap.md).
- **`/share_data/{username}/*` and `/teacher/*` variants.** They appear in the bundle, but they read another account's or a student's data, which falls outside this MCP's per-caller scope.

## Inference

These conclusions go beyond what the sources state.

- `troubled_content` is the cheapest way to get Bunpro's own judgment of troubled items, while `srs_level_details` is the closest to raw per-item evidence. They answer different questions, and a choice between them belongs to the feature work.
- The Account API Token probably reaches both routes. The [community reference](https://github.com/cbullard-dev/bunpro-community-api/blob/ab4fcc7a316a/README.md) describes the opt-in as current all-routes access. No published test confirms it for either route, and [this repository's token note](./bunpro-account-token-api.md) did not test outside its four required routes.
- Whitelist risk cannot be ranked with confidence. No route list is public, and a probe cannot reveal future membership. Only Bunpro can answer that.
- All-time weak-spot wording needs proof that `srs_level_details` is complete, which a low-volume probe alone will not supply. The [roadmap exclusion](../tool-roadmap.md) on complete historical item lists still applies.

## Follow-up probe for a human

Purpose: confirm the shapes and token access above. The account owner runs this with their own Account API Token, using the contract in [the token note](./bunpro-account-token-api.md).

Send at most 5 sequential GET requests, at least 2 seconds apart, with no retries. Stop at the first 401, 403 or 429.

| Order | Route | Question answered |
| --- | --- | --- |
| 1 | `/user_stats/troubled_content?period=last_month` | Does the token reach it? Is it an array with the expected keys? How many items? |
| 2 | `/user_stats/troubled_content` | Does "Overall" return more items? Is there a visible cap? |
| 3 | `/user_stats/srs_level_details?level=beginner&reviewable_type=Grammar&page=1` | Does the token reach it? Which fields exist? What are `pagy.count`, `pagy.items` and `pagy.pages`? |
| 4 | Same route with `reviewable_type=GrammarPoint`, only if request 3 fails | Which type value is accepted? |
| 5 | `/user_stats/srs_ghost_level_details?reviewable_type=Grammar` | What is the shape? Is it paginated? |

Record only the HTTP status, content type, response byte size, key names, value types, array length and `pagy` numbers. For grammar items, record whether `review_misses` is ever non-zero, without recording its values. Hold the token and bodies in memory only. Do not print or save titles, dates, accuracy values or raw responses.

This probe will not reveal Bunpro's selection rule for troubled items, full-sweep cost for other accounts, or future whitelist membership.

## Sources

Primary, fetched 2026-11-02 without credentials:

- [Bunpro Stats page](https://bunpro.jp/profile/stats) and its embedded English copy
- Bunpro client chunks [975](https://bunpro.jp/_next/static/chunks/975-0aaee7fd605ca9a4.js), [894](https://bunpro.jp/_next/static/chunks/894-562f0026985606e7.js) and [`_app`](https://bunpro.jp/_next/static/chunks/pages/_app-b1d685c88f24de21.js). These hashed paths will change with later builds.
- [Bunpro Personalized stat page](https://bunpro.jp/support/using-bunpro/Personalized-Stat-Page), which mentions "review history" and nothing about mistakes or weak points

Repository:

- [Frontend API evidence](./bunpro-frontend-api.md), [API evidence](./bunpro-api-evidence.md), [Account API Token contract](./bunpro-account-token-api.md), [tool roadmap](../tool-roadmap.md) and [`src/bunpro/frontend-source.ts`](../../src/bunpro/frontend-source.ts)

Bunpro community posts, all public:

- [Bunpro FAQ](https://community.bunpro.jp/t/bunpro-faq-frequently-asked-questions/876)
- [Major update, November 2019](https://community.bunpro.jp/t/major-update-november-24-2019/13702)
- [Feature requests, March 2026](https://community.bunpro.jp/t/feedback-suggested-improvements-feature-request/131/3957)
- [View grammar by SRS/success rate](https://community.bunpro.jp/t/view-grammar-by-srs-success-rate/37192)
- [Cram on missed grammar?](https://community.bunpro.jp/t/cram-on-missed-grammar/49058)
- [Bunpro API when?](https://community.bunpro.jp/t/bunpro-api-when/100574/20)
- [OpenClaw skill thread](https://community.bunpro.jp/t/openclaw-skill-for-bunpro-progress-tracking/175471)

Third-party code and notes, unofficial and read as data, are linked in place with pinned commits where available. They are evidence of what other projects do, not of Bunpro's contract.

## Research limitations

- The client parser shows what Bunpro's UI reads, not everything the server sends. No response body was seen for any new route.
- I read 4 of the page's 21 script files plus the page HTML. The SRS detail client lives in a chunk I did not fetch, so the `Grammar` versus `GrammarPoint` question stays open.
- Requests used: 6 to `bunpro.jp` (the Stats page, 4 script files, the support page) and 11 public `community.bunpro.jp` pages. The forum count is more than a handful. All were single unauthenticated GETs.
- The [Postman collection](https://www.postman.com/technical-meteorologist-63813544/bunpro-api/collection/a7eufz9/bunpro-frontend-api) rendered empty and was not reviewed. The `bunpro-sync` listing page timed out, so I read a mirrored copy on GitHub.
- GitHub code search covers indexed public code only, so private or unindexed use of `troubled_content` may exist.
- Third-party live results come from single accounts and browser tokens. A 500 for one account may not hold for another.
- Forum authors carry no staff badge in the fetched text, so staff status is not asserted here.
