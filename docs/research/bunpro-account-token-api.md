# Bunpro Account API Token request contract

Research date: 2026-08-12

> [!CAUTION]
> This note records a temporary Bunpro authentication workaround shared in a private Bunpro community group. Keep this repository private and do not reproduce the mechanism in public forums. Bunpro describes it as experimental, undocumented, subject to stricter throttling and a future route whitelist, and changeable without notice. Any invited-user documentation must disclose those risks.

## Question

Using only an authorized `BUNPRO_API_TOKEN`, what request contract authenticates the read-only Frontend API routes needed by Atlas, how do bounded authentication failures present, and what throttling or whitelist signals are observable without exposing personal data?

## Decision-ready answer

The Account API Token from **Bunpro Settings > API** works as the sole Bunpro credential for the required `/api/frontend/*` routes. The canonical request contract is:

```http
GET https://api.bunpro.jp/api/frontend/<route>?dangerously_authenticate_using_api_token=true
Authorization: Token token=<BUNPRO_API_TOKEN>
Accept: application/json
```

The query parameter is part of the authentication contract. The same valid Account API Token returned HTTP 401 when the parameter was omitted. No Bunpro username, password, web cookie, frontend-cookie token, login scrape, or refresh lifecycle is required.

A standard `Authorization: Bearer <BUNPRO_API_TOKEN>` header also returned HTTP 200 in the bounded live check. The adapter uses `Token token=...` upstream because that matches Bunpro's existing Frontend API syntax. Remote MCP callers may safely transport the same secret to the adapter in their MCP connection's Bearer header.

## Required Atlas routes

One sequential, read-only request per required route returned HTTP 200 with JSON on 2026-08-12:

| Route | Sanitized response-shape evidence | Atlas use |
| --- | --- | --- |
| `/api/frontend/user` | Object containing `user.data.attributes`; `time_zone_iana` was a string | Connection check and source-timezone boundary |
| `/api/frontend/user_stats/review_heatmap` | `grammar`, `vocab`, and `mixed` objects; observed keys were ISO calendar dates and values were integers | Date-bounded review counts |
| `/api/frontend/user_stats/new_content_heatmap` | `grammar`, `vocab`, and `mixed` objects; observed keys were ISO calendar dates and values were integers | Date-bounded newly studied content counts |
| `/api/frontend/user_stats/accuracy_over_time` | ISO-date-keyed object; observed values were numbers or null | Accuracy when the requested date is covered |

These successes establish current availability through the temporary mechanism. They do not establish a stability guarantee or prove that a future whitelist will retain the routes.

The study semantics and historical limitations in [Bunpro frontend authentication and study API evidence](./bunpro-frontend-api.md) remain applicable: sparse-key absence has not been proven equivalent to zero, accuracy has a shorter coverage window, and the current sources do not establish arbitrary-day study duration, exact correct/incorrect counts, or complete item-level history.

## Bounded failure behavior

The authentication checks used only `/api/frontend/user`, sequentially, without retries:

| Request variation | Result |
| --- | --- |
| Valid Account API Token plus `dangerously_authenticate_using_api_token=true` | HTTP 200 JSON |
| Valid Account API Token without the opt-in parameter | HTTP 401 JSON |
| Opt-in parameter without an Authorization header | HTTP 401 JSON |
| Opt-in parameter with a deliberately invalid token | HTTP 401 JSON |

The 401 responses did not include a `WWW-Authenticate` challenge. The MCP must classify HTTP 401 as rejected or missing Bunpro token configuration and fail closed. It must not attempt browser login, cookie refresh, aggressive retries, or surface the upstream response body.

Only the literal `true` parameter value was tested. Other values are unsupported.

## Throttling and whitelist observations

No `Retry-After`, standard `RateLimit-*`, or `X-RateLimit-*` headers appeared on the eight naturally observed responses. No route-whitelist metadata was exposed in response headers.

This is absence of an observed signal, not evidence that throttling is absent. The private Bunpro update says stricter throttling was added on 2026-08-12 and a whitelisted-route system is planned. The research deliberately did not induce HTTP 429, discover unrelated routes, parallelize calls, or approach a limit. Exact quotas, reset behavior, 429 response semantics, and future whitelist membership remain unknown.

## Implementation consequences

- Local stdio reads only `BUNPRO_API_TOKEN` from the MCP host's secret environment configuration.
- Remote HTTP receives the same caller-owned token through the MCP connection's Bearer header and never persists it.
- Every Frontend API request adds the opt-in query parameter without deleting existing query parameters.
- The token is sent upstream only in the Authorization header; it never appears in a URL, MCP tool input/output, log, error, fixture, or committed file.
- Calls stay read-only and conservatively bounded. The MCP does not automatically retry throttling or authentication failures.
- HTTP 401 is an authentication/configuration failure, HTTP 429 is throttling, and 404/schema mismatch may indicate whitelist or contract drift.
- Response schemas remain validated and coverage must be explicit. Missing data must not be invented as zero.

## Method and sources

Primary sources:

- Bunpro private community group update supplied by the project owner, last updated 2026-08-12.
- The repository's previously verified Frontend API request implementation and study-route evidence.
- Eight authorized live HTTP GET requests on 2026-08-12 using the user's `BUNPRO_API_TOKEN`: four required-route successes and four bounded authentication checks.

The live probe emitted only HTTP status, content type, selected header presence, and schema/type facts. It did not print, log, or persist the token, cookies, raw bodies, account identity, dates present in the account, or personal study counts.

## Remaining uncertainty

- Bunpro has not documented exact quotas, retry timing, pagination behavior, whitelist rollout timing, or the whitelist's eventual route set.
- Only one authorized account and one request per successful route were tested.
- Endpoint and schema stability are explicitly not guaranteed.
- Account-token behavior outside the four Atlas-required routes was intentionally not explored.
