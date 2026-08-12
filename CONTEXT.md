# Domain Context

## Account API Token

A secret generated for a Bunpro user on the Settings > API page. It is the only Bunpro credential accepted by the target MCP design. It is distinct from the temporary token formerly issued in a browser cookie.

## Frontend API

Bunpro's private, undocumented `/api/frontend/*` interface. Its routes, response shapes, authentication behavior, whitelist, and throttling may change without notice.

## Token-Authenticated Frontend Request

A read-only Frontend API request that presents the user's Account API Token and opts into Bunpro's temporary Account API Token authentication mechanism. It does not create or refresh a Bunpro browser session.

## Frontend Cookie Token

A short-lived credential issued through Bunpro's browser-login flow. It is not the Account API Token and is excluded from the target MCP design.

## MCP Principal

An identity authenticated by the remote MCP host. A principal may link one Bunpro Account API Token. It is not a Bunpro user record and is never inferred from an email supplied by a client.

## Hosted Credential Link

The private association between one MCP Principal and one protected Bunpro Account API Token. The link is credential state, not study history or MCP protocol-session state.

## Stateless MCP

An MCP whose requests do not depend on a Bunpro browser session, process-local cookies, conversational state, stored study history, or an MCP-owned watermark. A Hosted Credential Link does not make the MCP protocol stateful.

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
