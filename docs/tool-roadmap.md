# Bunpro MCP tool roadmap

Status: design inventory for the private, read-only MCP

This roadmap translates the confirmed Bunpro Frontend API surfaces into agent-facing workflows. It is intentionally not a one-tool-per-endpoint wrapper. Each tool should answer a recognizable user question, return structured content, disclose source coverage, and stay within a conservative Bunpro request budget.

## Design rules

- Keep every tool read-only, stateless, and scoped to the caller's Account API Token.
- Never accept or return a token as a tool argument. Authentication remains transport configuration.
- Prefer one fetched payload serving several output fields. Do not fetch the same route repeatedly during one tool call.
- Return explicit coverage for missing dates, unavailable measures, throttling, route removal, and schema drift.
- Treat a missing sparse-heatmap key as `no_source_record`, not automatically as zero activity.
- Use the Bunpro account timezone as the source boundary. A caller-supplied timezone is only an expected-timezone check, not a reinterpretation of Bunpro dates.
- Bound all ranges and list sizes. Do not automatically retry a rate-limited request.
- Keep the existing unprefixed naming style because MCP hosts already namespace these tools under the Bunpro server and `get_connection_status` is deployed. A future breaking release may add service-prefixed aliases if a client needs them.

## Priority 0: connection and Atlas daily-review evidence

### `get_connection_status` — implemented

Answers: "Can this MCP access my Bunpro account?"

- Source: `/api/frontend/user`
- Input: none
- Output: authentication status, source timezone, token source, stateless/persistence guarantees
- Request cost: 1 Bunpro request

### `get_study_day_summary` — implement next

Answers: "What Bunpro study activity is supported for 2026-08-11?"

- Sources: `/api/frontend/user`, `/api/frontend/user_stats/review_heatmap`, `/api/frontend/user_stats/new_content_heatmap`, `/api/frontend/user_stats/accuracy_over_time`
- Input:
  - `date`: required ISO calendar date
  - `expected_timezone`: optional IANA timezone used only to detect a boundary mismatch
- Output:
  - study day and Bunpro source timezone
  - grammar, vocabulary, and total review counts when a source record exists
  - grammar, vocabulary, and total newly studied counts when a source record exists
  - accuracy percentage when the shorter accuracy source covers the date
  - independent activity, new-content, and accuracy coverage plus overall query status
  - supported source routes and explicitly unavailable measures
- Request cost: 4 Bunpro requests
- Primary consumer: Atlas Daily Review

The result must distinguish at least `complete`, `partial`, `no_source_record`, and `unavailable`. Study duration, exact correct/incorrect totals, and complete item history remain unavailable unless a future source proves them.

### `get_study_range_summary` — implement with the day mapper

Answers: "Summarize every Bunpro study day from 2026-08-01 through 2026-08-11."

- Sources: the same four sources as `get_study_day_summary`
- Input:
  - `start_date` and `end_date`: required inclusive ISO dates
  - `expected_timezone`: optional IANA timezone check
  - maximum range: 93 calendar days initially
- Output: requested bounds, one normalized entry per requested day, aggregate supported totals, independent coverage counts/windows, and a contiguous checked-through date for watermark-safe callers
- Request cost: 4 Bunpro requests for the whole range, not 4 per day
- Primary consumer: Atlas watermark catch-up and weekly/monthly synthesis

This is a separate tool because it makes catch-up cheap and prevents an agent from issuing dozens of single-day calls.

## Priority 1: current review planning

These tools are useful to people directly, but they are not required for the first Atlas ingestion milestone. Their routes were successful in the earlier authenticated Frontend API inventory; Account API Token access and current response schemas must be revalidated with one low-volume probe per route before implementation.

### `get_review_schedule`

Answers: "How many reviews are due now, and what does the next week look like?"

- Candidate sources: `/api/frontend/user/due`, `/api/frontend/user_stats/forecast_daily`
- Input: optional bounded forecast horizon, initially 1–14 days
- Output: due-now summary, daily forecast buckets, source timezone, generated-at time, and coverage
- Important boundary: forecast values are projections, not completed study activity

### `list_study_decks`

Answers: "Which Bunpro study decks are active, and what are their goals and completion counts?"

- Source: `/api/frontend/user/queue` (verified to contain study-deck configuration, not review items)
- Input: `active_only` defaulting to true and `limit` defaulting to 50 with maximum 100
- Output: bounded deck identity, active status, batch size, daily goals, and grammar/vocabulary completion counts plus `count` and `has_more`
- Important boundary: never describe these records as queued review items or return an unbounded raw payload

### `get_recent_activity`

Answers: "What did I review recently?" or "What happened in the last 24 hours?"

- Candidate sources: `/api/frontend/user_stats/last_done_reviews`, `/api/frontend/summary/last_24_hours`
- Input: bounded `limit`; optional grammar/vocabulary filter only if locally supported
- Output: recent normalized attempts or sessions, rolling-window boundaries, and completeness warning
- Important boundary: this is a recent rolling window, not complete historical evidence for an arbitrary Study Day

## Priority 2: progress and trends

### `get_learning_progress`

Answers: "How far along am I in Bunpro?"

- Candidate sources: `/api/frontend/user_stats/base_stats`, `/api/frontend/user_stats/jlpt_progress_mixed`, `/api/frontend/user_stats/total_review_stats`, `/api/frontend/user_stats/total_cram_stats`
- Input: optional view selection only if it reduces output materially
- Output: normalized JLPT/SRS progress, supported account aggregates, review totals, cram totals, and coverage
- Important boundary: avoid returning cosmetic, subscription, or unrelated profile fields from `/user`

### `get_activity_trend`

Answers: "How has my study consistency and accuracy changed over the last 30 days?"

- Candidate sources: `/api/frontend/user_stats/activity_daily`, `/api/frontend/user_stats/review_heatmap`, `/api/frontend/user_stats/new_content_heatmap`, `/api/frontend/user_stats/accuracy_over_time`
- Input: inclusive bounded range, initially no more than 93 days
- Output: daily series, active-day count, supported aggregates, and independent coverage windows for activity and accuracy
- Important boundary: this tool may derive trends but must preserve the underlying daily values and label every derived measure

## Deliberately excluded tools

Do not create these under the current project contract:

- a raw `call_frontend_api` or arbitrary-path proxy;
- login, cookie, token-refresh, account-link, or token-management tools;
- starting reviews, submitting answers, changing SRS state, adding lessons, running crams, or editing settings;
- an MCP-owned Atlas watermark or study-history store;
- tools claiming study duration, exact correct/incorrect daily totals, or complete historical item lists without a proven source;
- separate tools for badges, cosmetics, profile decoration, subscription state, or unrelated account metadata.

## Implementation order

1. Resolve the Study Day source-to-summary vocabulary and sparse-key behavior.
2. Implement the shared daily-series parser and `get_study_day_summary` with schema, mapping, and failure tests.
3. Add `get_study_range_summary` using the same fetched payloads and mapper.
4. Prototype the Atlas ingestion contract and watermark behavior against the two tools.
5. Implement the verified review schedule, study-deck, and recent-activity contracts.
6. Revalidate and implement Priority 2 progress/trend tools only after the Atlas path is functional.

## Minimum test matrix for every new tool

- valid response mapping;
- malformed input and bounded ranges/limits;
- valid authentication and rejected token;
- HTTP 429 without automatic retry;
- route 404 or schema drift reported as unavailable coverage;
- partial source coverage;
- no token, raw upstream body, or unrelated personal fields in output or logs;
- stdio environment-token and HTTP request-bearer parity.
