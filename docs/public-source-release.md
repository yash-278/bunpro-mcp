# Public-source release gate

The hosted Bunpro MCP is a public community product. The source repository is not currently authorized for public disclosure and must remain private.

## Blocking approval

Before changing repository visibility or publishing any source artifact, obtain new written permission from Bunpro that explicitly covers all intended channels:

- a public GitHub repository containing the temporary integration code;
- public disclosure of the request mechanism, route names, and authentication translation present in source and technical documentation;
- any package registry, container registry, mirror, generated documentation site, or downloadable release artifact; and
- any public forum announcement that links to or explains the source implementation.

Store the approval privately. Record only its date, approver, authorized scope, and durable private reference in the release issue; do not commit confidential correspondence.

General encouragement, permission to operate the hosted service, ownership of the repository, or permission to include code in a repository without permission to publicly disclose the mechanism does not satisfy this gate.

## Preparation complete while private

- [x] MIT license and copyright notice.
- [x] README with capabilities, local and hosted setup, limitations, and trust boundary.
- [x] Security, privacy, support, contribution, and conduct policies.
- [x] Bug, feature, and pull-request templates that prohibit credential disclosure.
- [x] CI on supported Node.js versions and weekly dependency update configuration.
- [x] Stateless, read-only tools with strict schemas, bounded responses, timeouts, and sanitized failures.
- [x] Docker and Railway deployment configuration with no database or deployment-wide Bunpro credential.
- [x] Public hosted service and health check.
- [x] Repository-level guardrail that blocks accidental visibility and artifact publication.

## Actions permitted only after approval

1. Review the written permission against each intended publication channel.
2. Decide whether private research notes and superseded authentication ADRs are within scope; remove them from the public history if they are not.
3. Scan the complete Git history for credentials, private correspondence, raw account data, and out-of-scope implementation details.
4. Re-run `npm ci`, `npm run check`, dependency auditing, the synthetic evaluation, and a low-volume hosted smoke test.
5. Verify branch protection, private vulnerability reporting, issue settings, and least-privilege workflow permissions.
6. Keep `package.json` marked `private` unless package-registry publication is separately approved.
7. Change visibility only after a final maintainer review, then verify the repository and all artifacts expose only the authorized scope.
8. Re-check the Railway deployment and public disclosures after the visibility change.

If approval is narrower than this plan, narrow the release to match it. Do not infer permission for another channel.
