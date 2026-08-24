# Public-source release record

## Authorization

Bunpro authorized an open-source release of Bunpro MCP.

- **Date:** 2026-08-17
- **Approver:** Sean, Bunpro
- **Authorized scope:** Public GitHub source for the read-only MCP, including the integration implementation and self-hosting documentation
- **Durable private reference:** Bunpro community thread, **API access request for a read-only Bunpro MCP integration**

The confidential conversation and screenshots are not committed. Public materials should summarize the permission only as needed and must continue to protect user API keys.

## Release checklist

- [x] Written Bunpro approval recorded without publishing private correspondence.
- [x] MIT license, contribution policy, security policy, privacy disclosure, support guide, and code of conduct present.
- [x] README covers hosted use, local stdio, Docker, remote hosting, tools, risks, and token handling.
- [x] Public website links the source and explains self-hosting.
- [x] Current tree and complete Git history scanned for committed credentials.
- [x] Obsolete private-source warnings removed from public documentation.
- [x] CI covers supported Node.js versions.
- [ ] Release pull request passes CI and review.
- [ ] Repository visibility reports `PUBLIC` after merge.
- [ ] GitHub security settings and branch protection are verified.
- [ ] Railway deploys the public-release commit successfully.
- [ ] Public website, health check, and MCP authentication boundary pass final smoke checks.

Package-registry or container-registry publication is not part of this release. `package.json` remains marked `private` to prevent accidental npm publication.
