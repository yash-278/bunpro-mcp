# Bunpro frontend authentication and study API evidence

Research date: 2026-08-11

> Authentication update (2026-08-12): the browser-login and frontend-cookie authentication conclusion in this historical note is superseded by [Bunpro Account API Token request contract](./bunpro-account-token-api.md). The route shapes and Study Day source limitations remain relevant. The target MCP now uses only `BUNPRO_API_TOKEN` with Bunpro's temporary opt-in query parameter.

## Question

Can environment-provided Bunpro login credentials establish an authenticated frontend API session entirely in memory, and which current read-only endpoints can support an Atlas Study Day Summary?

## Authentication result

The credential flow works with `BUNPRO_USERNAME` (or `BUNPRO_EMAIL`) and `BUNPRO_PASSWORD`:

1. `GET https://bunpro.jp/login` returns the Rails authenticity token.
2. `POST https://bunpro.jp/users/sign_in` establishes the web session.
3. Bunpro sets a `frontend_api_token` cookie.
4. `Authorization: Token token=<frontend_api_token>` authenticates requests to `https://api.bunpro.jp/api/frontend/**`.

The research scripts kept login credentials, cookies, authenticity values, and the frontend token only in process memory. They printed neither secrets nor raw response bodies. This historical flow did not use the Account API Token. Later authorized testing confirmed that the Account API Token authenticates the required frontend endpoints when Bunpro's temporary opt-in query parameter is supplied; see the superseding research note above.

## Current read-only study surfaces

The authenticated Stats page and its current JavaScript assets identify the following routes. Each listed route returned HTTP 200 with JSON on 2026-08-11.

| Endpoint | Structural evidence | Study Day use |
| --- | --- | --- |
| `/api/frontend/user` | Account attributes include `time_zone_iana` | Connection check and source-timezone validation |
| `/api/frontend/user_stats/review_heatmap` | Sparse `grammar`, `vocab`, and `mixed` maps keyed by `YYYY-MM-DD`, with integer values and multi-year account history | Primary historical review counts |
| `/api/frontend/user_stats/new_content_heatmap` | Sparse `grammar`, `vocab`, and `mixed` maps keyed by `YYYY-MM-DD`, with integer values | Historical newly studied content counts |
| `/api/frontend/user_stats/accuracy_over_time` | Date-keyed number-or-null map covering approximately three months | Accuracy percentage when the requested date is covered |
| `/api/frontend/user_stats/activity_daily` | `grammar` and `vocab` date-keyed integer maps covering the recent 29-day window | Recent cross-check for review counts |
| `/api/frontend/user_stats/activity_hourly` | `grammar` and `vocab` hour-keyed integer maps covering 24 hours | Recent diagnostic only; not a historical calendar-day source |
| `/api/frontend/user_stats/last_done_reviews` | Recent attempt records with `time`, `status`, `type`, and `reviewable` identity | Recent item-level evidence only; not complete history |
| `/api/frontend/summary/last_24_hours` | Recent `history_objects` and `review_sessions` | Rolling-window diagnostic only; not an arbitrary Study Day source |

Additional successful endpoints expose current queue/due state, forecasts, JLPT/SRS progress, badges, and all-time aggregate review/cram statistics. They do not add trustworthy date-bounded evidence for v1.

No probed response exposed rate-limit, retry, pagination, cursor, or `Link` headers.

## Known-day verification

The normalized `probe_study_day.rb` check found source records for both known active Study Days, `2026-08-10` and `2026-08-11`. Grammar plus vocabulary counts agreed with Bunpro's `mixed` total on both dates. Bunpro reported `Asia/Kolkata` as the account timezone, matching Atlas. The probe emitted normalized summaries only; the repository retains no personal counts or raw payloads.

## Supported and unsupported measures

The frontend API can directly support these date-bounded measures:

- grammar review count;
- vocabulary review count;
- total review count supplied by Bunpro;
- grammar, vocabulary, and total newly studied content when a source record exists;
- accuracy percentage when the requested date is within the available accuracy window;
- source timezone and whether it matches the requested Atlas timezone.

The current evidence does not support these measures for an arbitrary historical Study Day:

- study duration;
- exact correct and incorrect counts;
- a complete list of reviewed item identities;
- a complete list of review timestamps;
- review-session duration;
- documented pagination or rate-limit behavior.

A missing key in a sparse heatmap has not yet been proven equivalent to zero. Until the source-to-summary mapping decision explicitly establishes that semantic, the MCP must return an unavailable or absent-source state instead of inventing a zero.

## Compatibility and security constraints

- These are private frontend contracts, not a supported public API. Bunpro may change them without notice.
- Authentication must fail closed. The MCP must never return, print, or log tokens. Cookies, authenticity values, and frontend-cookie tokens are no longer part of the target design.
- All Bunpro calls remain read-only and low volume.
- Local mode reads the Account API Token from `BUNPRO_API_TOKEN`; hosted deployments isolate OAuth identities and encrypt each identity's Account API Token at rest.

## Answer

The route research established trustworthy historical daily aggregate review counts and new-content counts, plus a shorter accuracy window. Its username/password authentication design is superseded by the Account API Token contract. The sources are enough to proceed with the Atlas-facing Study Day mapping, provided unsupported measures remain explicitly unavailable and sparse-key semantics are resolved before implementation.

## Sources

- Live, read-only authenticated probes run on 2026-08-11 with `scripts/research/probe_frontend_auth.rb`, `scripts/research/discover_frontend_api.rb`, and `scripts/research/probe_study_day.rb`
- Current Bunpro Dashboard and Profile Stats JavaScript assets inspected in memory on 2026-08-11
- [Bunpro Personalized stat page](https://bunpro.jp/support/using-bunpro/Personalized-Stat-Page)
- [Prior Bunpro API evidence](./bunpro-api-evidence.md)

## Research limitations

- Only one authorized account was tested.
- No mutation endpoints were called.
- No secrets, raw payloads, or personal study counts were persisted.
- Endpoint stability, authentication expiry, challenges, and server-side throttling remain undocumented.
