# Domain Context

## Bunpro Account API Token

A credential generated from Bunpro's account settings page. Bunpro's removed legacy API used it, but no currently tested read endpoint accepts it.

## Bunpro Login Credentials

The email and password a user supplies through the private MCP host environment solely to establish a Bunpro web session. They are never study data and never belong in Atlas or project storage.

## Frontend Session Token

A credential derived from a successful Bunpro web login and held ephemerally only in MCP process memory. It is distinct from the Bunpro Account API Token; its actual lifetime remains unverified.

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
