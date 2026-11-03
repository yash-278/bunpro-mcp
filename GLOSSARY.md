# Domain Context

## Account API Token

A secret generated for a Bunpro user on the Settings > API page. It is the only Bunpro credential accepted by the MCP. It is distinct from the temporary token formerly issued in a browser cookie.

## Frontend API

Bunpro's internal, undocumented `/api/frontend/*` interface. Its routes, response shapes, authentication behavior, whitelist, and throttling may change without notice.

## Direct Token Passthrough

The remote MCP host sends the caller's Account API Token in either the protected `X-Bunpro-Token` header or `Authorization: Bearer ...`. The MCP reads exactly one of those values for one request, translates it into Bunpro's expected Account API Token header, and does not persist it. Local stdio obtains the same token from `BUNPRO_API_TOKEN`.

## Token-Authenticated Frontend Request

A read-only Frontend API request that presents the Account API Token and adds `dangerously_authenticate_using_api_token=true`. It does not create or refresh a Bunpro browser session.

## Source Operation

One tool call's bounded read of Bunpro. All of its Frontend API requests share one deadline.

## Request Budget

The limit on how many Frontend API requests one MCP process may run, queue, and start per unit of time, across all callers.

## Frontend Cookie Token

A short-lived credential issued through Bunpro's browser-login flow. It is not the Account API Token and is excluded from the MCP.

## Stateless MCP

An MCP whose requests do not depend on user identity, a Bunpro browser session, process-local cookies, stored credentials, conversational state, stored study history, or an MCP-owned watermark.

## Study Day

One calendar day interpreted in an explicitly named source timezone.

## Study Period

An inclusive sequence of Study Days bounded by a start date and an end date, all interpreted in the same source timezone.

## Study Day Summary

A read-only, source-backed account of Bunpro activity during one Study Day. A measure is reported only when the available Frontend API evidence supports it.

## Source Coverage

The summary's statement of which requested facts Bunpro supplied, which were unavailable, and whether authentication, throttling, whitelisting, or contract drift prevented retrieval.

## Weak Spot

A study item Bunpro currently lists as Troubled Content, with the accuracy and streak Bunpro reports for it. It reflects Bunpro's unpublished selection rule. It is not a complete or all-time ranking of what a learner finds hard.

## Bunpro Watermark

Atlas's record of the latest Study Day successfully summarized from Bunpro. The MCP never owns or advances this watermark.

## Atlas Daily Review

Atlas's evidence-gathering process. It requests each unprocessed Study Day through the previous calendar day, stores accepted summaries, and advances the Bunpro Watermark only after a successful source-backed result.

## Study View

An optional visual presentation of an existing MCP tool result inside an MCP Apps host, such as Claude or ChatGPT. A Study View may help a learner inspect, filter, or discuss the returned facts, but it does not replace or change the portable structured result and never writes to Bunpro.

## Daily Study Brief

A Study View focused on source-backed evidence for one Study Day, including activity, accuracy, and the limits of the available evidence.

## Review Forecast

A Study View that separates reviews currently due from Bunpro's projected future review workload so a learner can decide what to study next.

## Study Period Explorer

A Study View for examining source-backed daily evidence and derived trends across an inclusive Study Period.

## Learning Progress Dashboard

A Study View for inspecting long-term Bunpro learning progress across JLPT levels, SRS stages, review outcomes, streaks, and cram activity.
