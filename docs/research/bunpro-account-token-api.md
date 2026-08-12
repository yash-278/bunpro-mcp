# Bunpro Account API Token request contract

Research date: 2026-08-12

> [!CAUTION]
> This note records a temporary Bunpro authentication workaround shared in a private Bunpro community group. Keep this repository private and do not reproduce the mechanism in public forums. Bunpro describes the mechanism as experimental, undocumented, subject to stricter throttling and a future route whitelist, and changeable without notice. Any invited-user documentation must disclose those risks.

## Question

Using only an authorized `BUNPRO_API_TOKEN`, what request contract authenticates the read-only Frontend API routes needed by Atlas, how do bounded authentication failures present, and what throttling or whitelist signals are observable without exposing personal data?

## Decision-ready answer

The Account API Token from **Bunpro Settings > API** works as the sole Bunpro credential for the required `/api/frontend/*` routes. The project should use this canonical request contract:

```http
GET https://api.bunpro.jp/api/frontend/<route>?dangerously_authenticate_using_api_token=true
Authorization: Token token=<BUNPRO_API_TOKEN>
Accept: application/json
```

The query parameter is part of the authentication contract, not an optional feature flag. The same valid Account API Token returned HTTP 401 when the parameter was omitted. No Bunpro username, password, web cookie, frontend-cookie token, login scrape, or refresh lifecycle is required.

A standard `Authorization: Bearer <BUNPRO_API_TOKEN>` header also returned HTTP 200 in the bounded live check. This is useful upstream compatibility evidence, but the MCP uses `Token token=...` with Bunpro because it matches the existing Frontend API authorization syntax. Remote MCP callers transport the same secret to the stateless adapter through the protected `X-Bunpro-Token` header.

## Required Atlas routes

One sequential, read-only request per required route returned HTTP 200 with JSON on 2026-08-12:

| Route | Sanitized response-shape evidence | Atlas use |
| --- | --- | --- |
| `/api/frontend/user` | Object containing `user.data.attributes`; `time_zone_iana` was a string | Connection check and source-timezone boundary |
| `/api/frontend/user_stats/review_heatmap` | `grammar`, `vocab`, and `mixed` objects; observed keys were ISO calendar dates and values were integers | Date-bounded review counts |
| `/api/frontend/user_stats/new_content_heatmap` | `grammar`, `vocab`, and `mixed` objects; observed keys were ISO calendar dates and values were integers | Date-bounded newly studied content counts |
| `/api/frontend/user_stats/accuracy_over_time` | ISO-date-keyed object; observed values were numbers or null | Accuracy when the requested date is covered |

These successes establish that the four routes are currently available through the temporary token mechanism. They do not establish a stability guarantee or prove that a future whitelist will retain them.

The study semantics and historical limitations established in [Bunpro frontend authentication and study API evidence](./bunpro-frontend-api.md) remain applicable: sparse-key absence has not been proven equivalent to zero, accuracy has a shorter coverage window, and the current sources do not establish arbitrary-day study duration, exact correct/incorrect counts, or complete item-level history.

## Bounded failure behavior

The authentication checks used only `/api/frontend/user`, sequentially, without retries:

| Request variation | Result |
| --- | --- |
| Valid Account API Token plus `dangerously_authenticate_using_api_token=true` | HTTP 200 JSON |
| Valid Account API Token without the opt-in parameter | HTTP 401 JSON |
| Opt-in parameter without an Authorization header | HTTP 401 JSON |
| Opt-in parameter with a deliberately invalid token | HTTP 401 JSON |

The 401 responses did not include a `WWW-Authenticate` challenge. The MCP should therefore classify HTTP 401 as rejected or missing Bunpro token configuration and fail closed. It must not attempt browser login, cookie refresh, aggressive retries, or surface the upstream response body.

Only the literal `true` parameter value was tested. Other values must not be treated as supported.

## Throttling and whitelist observations

No `Retry-After`, standard `RateLimit-*`, or `X-RateLimit-*` headers appeared on the eight naturally observed responses. No route-whitelist metadata was exposed in response headers.

This is absence of an observed signal, not evidence that throttling is absent. The private Bunpro update says stricter throttling was added on 2026-08-12 and that a whitelisted-route system is planned. The research deliberately did not induce HTTP 429, discover unrelated routes, parallelize calls, or approach any limit. Exact quotas, reset behavior, 429 response semantics, and future whitelist membership remain unknown.

## Implementation consequences

- Local stdio must read only `BUNPRO_API_TOKEN` from the MCP host's secret environment configuration.
- Remote HTTP must receive the caller-owned token through the MCP connection's protected `X-Bunpro-Token` header and must not persist it. The standard Bearer form remains compatibility-only for existing clients.
- Every Frontend API request must add the query parameter without deleting existing route query parameters.
- Every upstream Bunpro request must send the token only in the Authorization header; never include it in a URL, MCP input/output, log, error, fixture, or committed file.
- The hosted transport needs no Auth0 identity, credential database, account-link flow, or Bunpro browser-session state.
- Keep calls read-only, sequential or conservatively bounded, and cache a single fetched payload within an MCP operation when multiple output fields derive from it.
- Treat HTTP 401 as an authentication/configuration failure, HTTP 429 as a non-retryable-in-request throttling result with any safe retry timing preserved, and 404/schema mismatch as possible whitelist or contract drift.
- Continue validating response schemas and report coverage explicitly. Do not invent zeroes or unsupported study facts.

## Method and sources

Primary sources:

- Bunpro private community group update supplied by the project owner, last updated 2026-08-12. It defines the temporary opt-in parameter, identifies the Settings > API Account API Token, permits inclusion in public repositories while prohibiting public-forum disclosure, warns of endpoint instability, requests low-impact use and user risk disclosure, and announces stricter throttling plus a planned route whitelist.
- The repository's current Frontend API request implementation in [`src/bunpro/client.ts`](../../src/bunpro/client.ts), which established the existing `Token token=...` header syntax to test with the Account API Token.
- The previously verified route inventory and response semantics in [Bunpro frontend authentication and study API evidence](./bunpro-frontend-api.md).
- Eight authorized live HTTP GET requests on 2026-08-12 using the user's `BUNPRO_API_TOKEN`: four required-route successes and four bounded authentication-contract checks. The temporary probe held the token and parsed payloads only in process memory and was deleted immediately afterward.

The live probe emitted only HTTP status, content type, selected header presence, and schema/type facts. It did not print, log, or persist the token, cookies, raw bodies, account identity, dates present in the account, or personal study counts.

## Remaining uncertainty

- Bunpro has not documented exact quotas, retry timing, pagination behavior, whitelist rollout timing, or the whitelist's eventual route set.
- Only one authorized account and one request per successful route were tested.
- Endpoint and schema stability are explicitly not guaranteed.
- Account-token behavior for endpoints outside the four Atlas-required routes was intentionally not explored.
