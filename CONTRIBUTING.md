# Contributing

Thanks for helping improve Bunpro MCP.

## Before opening an issue

- Search existing issues first.
- Remove all personal data, Account API Tokens, Authorization headers, and raw API responses.
- Include the MCP transport (`stdio` or `Streamable HTTP`), Node.js version, client, and a sanitized error message.
- For a Bunpro compatibility problem, say when it occurred and which read-only workflow failed without pasting the response body.

Security issues belong in the private process described in [SECURITY.md](SECURITY.md).
General setup and usage questions belong in the process described in [SUPPORT.md](SUPPORT.md).

## Development setup

```bash
git clone https://github.com/yash-278/bunpro-mcp.git
cd bunpro-mcp
npm ci
npm run check
```

## Pull-request expectations

- Keep Bunpro integration read-only.
- Keep authentication stateless: direct Account API Token passthrough only, with no login scraping or credential storage.
- Use the modern MCP `registerTool` API with strict Zod input and output schemas.
- Add correct MCP annotations, especially for destructive operations.
- Return structured content and actionable, sanitized errors.
- Add automated tests for behavior and contract changes.
- Use synthetic fixtures. Never commit raw responses from a real Bunpro account.
- Keep live discovery low volume and run it only against an account you are authorized to use.
- Update the README, privacy disclosure, or self-hosting guide when behavior changes.

Run `npm run check` before submitting a pull request.

## Publication boundary

The hosted MCP may be used publicly, but the repository must remain private until Bunpro gives written permission that specifically allows public disclosure of the temporary integration mechanism. Do not publish source excerpts, packages, containers, mirrors, or implementation documentation from this repository. See [AGENTS.md](AGENTS.md) and [the source-release gate](docs/public-source-release.md).
