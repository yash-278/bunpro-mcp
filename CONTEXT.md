# Domain Context

## Account API Token

A secret generated for a Bunpro user on the Settings > API page. It is the only Bunpro credential accepted by the MCP. It is distinct from the temporary token formerly issued in a browser cookie.

## Frontend API

Bunpro's private, undocumented `/api/frontend/*` interface. Its routes, response shapes, authentication behavior, whitelist, and throttling may change without notice.

## Direct Token Passthrough

The remote MCP host sends the caller's Account API Token in the protected `X-Bunpro-Token` header. `Authorization: Bearer ...` remains a compatibility path for existing connections. The MCP reads exactly one of those values for one request, translates it into Bunpro's expected Account API Token header, and does not persist it. Local stdio obtains the same token from `BUNPRO_API_TOKEN`.

## Token-Authenticated Frontend Request

A read-only Frontend API request that presents the Account API Token and adds `dangerously_authenticate_using_api_token=true`. It does not create or refresh a Bunpro browser session.

## Frontend Cookie Token

A short-lived credential issued through Bunpro's browser-login flow. It is not the Account API Token and is excluded from the MCP.

## Stateless MCP

An MCP whose requests do not depend on user identity, a Bunpro browser session, process-local cookies, stored credentials, conversational state, stored study history, or an MCP-owned watermark.

## Study Day

One calendar day interpreted in an explicitly named source timezone.

## Study Day Summary

A read-only, source-backed account of Bunpro activity during one Study Day. A measure is reported only when the available Frontend API evidence supports it.

## Source Coverage

The summary's statement of which requested facts Bunpro supplied, which were unavailable, and whether authentication, throttling, whitelisting, or contract drift prevented retrieval.

## Bunpro Watermark

Atlas's record of the latest Study Day successfully summarized from Bunpro. The MCP never owns or advances this watermark.

## Atlas Daily Review

Atlas's evidence-gathering process. It requests each unprocessed Study Day through the previous calendar day, stores accepted summaries, and advances the Bunpro Watermark only after a successful source-backed result.
