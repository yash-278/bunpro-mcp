# Domain Context

## Bunpro Account API Token

A credential generated from Bunpro's account settings page. It is the only Bunpro credential this project accepts.

## Frontend Session Token

A credential associated with a logged-in Bunpro browser session. It is not a Bunpro Account API Token and is outside this project's permitted authentication boundary.

## Study Day

One calendar day interpreted in an explicitly supplied timezone. Atlas uses `Asia/Kolkata`.

## Study Day Summary

A read-only, source-backed account of Bunpro study activity during one Study Day. A value is reported only when the source supports it; missing evidence remains unavailable rather than estimated.

## Source Coverage

The MCP's statement of which requested study facts Bunpro supplied, which were unavailable, and which source or compatibility failure prevented retrieval.

## Bunpro Watermark

Atlas's record of the latest Study Day successfully summarized from Bunpro. The MCP does not own or persist this state.

## Atlas Daily Review

Atlas's daily evidence-gathering process. It requests every Study Day after the Bunpro Watermark through the previous calendar day and preserves the resulting summaries.

## MCP Server

The stateless boundary that authenticates to Bunpro, retrieves study evidence and returns normalized tool results. It does not persist credentials, activity history or watermarks.

