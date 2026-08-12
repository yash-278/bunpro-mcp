# Hosted community release checklist

The hosted MCP may be announced publicly. The repository and Bunpro-specific request mechanism must remain private.

## Repository boundary

- [x] Repository policy explicitly requires GitHub visibility to remain private.
- [x] Public documentation excludes private routes, authentication translation, opt-in parameters, schemas, reverse-engineering notes, and source code.
- [x] README documents the implemented read-only catalog and maintainer setup.
- [x] Privacy, security, contribution, and conduct policies are present.
- [ ] Re-scan the current tree and Git history for credentials immediately before merge.
- [ ] Confirm `yash-278/bunpro-mcp` reports `PRIVATE` before and after the release merge.

## Hosted service

- [ ] Railway deploys automatically from the private repository's `main` branch.
- [ ] Set `PUBLIC_BASE_URL=https://bunpro.yashkadam.com`.
- [ ] Remove obsolete Auth0, database, encryption-key, setup-token, username, password, and deployment-wide Bunpro token variables.
- [ ] Confirm `GET /healthz` returns HTTP 200 on the canonical domain.
- [ ] Confirm the generated Railway domain is not an alternate public entry point after the canonical domain works.
- [ ] Confirm a missing or malformed Bearer token receives HTTP 401 without leaking request data.
- [ ] Run one low-volume live smoke pass across every published tool with a valid caller token.
- [ ] Confirm one invalid token produces a sanitized authentication error.
- [ ] Review edge rate limits and abuse controls without logging Authorization headers or response bodies.

## Product behavior

- [x] All published tools are read-only, stateless, bounded, and annotated as non-destructive.
- [x] Authentication, throttling, route removal, and schema drift fail closed.
- [x] Sparse historical absence is not silently represented as zero study.
- [x] The server stores no caller credential, session, cookie, account profile, watermark, or study history.
- [ ] Complete the final automated verification suite and private pull-request review.

## Public announcement

- [x] The draft explains setup using only the hosted URL and standard protected Bearer header.
- [x] The draft explains all eight capabilities in user-facing language.
- [x] The draft discloses the unofficial/experimental status, partial failures, throttling, hosted-operator trust boundary, best-effort availability, and token rotation.
- [x] The draft does not link to or describe how to reproduce the private implementation.
- [x] Reader-test [the public announcement draft](community-post.md) for clarity and accidental disclosure.
- [ ] Publish only after every hosted-service gate above is complete.

Atlas integration is intentionally out of scope for this release. Do not edit the Atlas vault or infer an Atlas watermark from MCP output during release work.
