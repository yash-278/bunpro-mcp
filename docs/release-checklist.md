# Open-source community release checklist

## Authorization and repository

- [x] Bunpro open-source approval is recorded in [the release record](public-source-release.md).
- [x] Private correspondence and screenshots are excluded from the repository.
- [x] Current source and full Git history were scanned for credentials and personal data.
- [x] README documents hosted use, local stdio, Docker, and remote HTTPS deployment.
- [x] Security, privacy, support, contribution, conduct, and license files are present.
- [ ] Release pull request passes all required checks.
- [ ] Repository visibility reports `PUBLIC` after merge.
- [ ] Branch protection, vulnerability reporting, secret scanning, and workflow permissions are verified.

## Hosted service

- [x] Railway deploys automatically from `main` using the included Dockerfile.
- [x] The production service has no Auth0, database, encryption-key, setup-token, username, password, or deployment-wide Bunpro token variables.
- [x] Every caller provides their own token through a protected request header.
- [x] Host validation, body limits, response limits, timeouts, and bounded upstream concurrency are enabled.
- [x] Bunpro throttling is not retried automatically.
- [ ] Railway deploys the v0.4.0 public-release commit successfully.
- [ ] `GET /healthz` returns HTTP 200 on the canonical domain.
- [ ] Missing and ambiguous token requests return HTTP 401 without leaking request data.
- [ ] A low-volume tool smoke passes with a valid caller-owned token.

## Product and documentation

- [x] All eight tools are read-only, stateless, bounded, and annotated as non-destructive.
- [x] Authentication, throttling, unavailable routes, malformed responses, and schema drift fail closed.
- [x] Sparse historical absence is not silently represented as zero.
- [x] Public website links the GitHub repository and self-hosting guide.
- [x] FAQ states that the project is open source and can run locally or remotely.
- [x] Public copy explains unofficial status, experimental access, hosted-operator trust, and token rotation.
- [ ] Production website shows the open-source release content.

Atlas integration remains out of scope for this release.
