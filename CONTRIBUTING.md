# Contributing

Thanks for helping improve Bunpro MCP.

## Before opening an issue

- Search existing issues first.
- Remove all personal data, Bunpro credentials, cookies, frontend tokens, setup links, and raw API responses.
- Include the MCP transport (`stdio` or `Streamable HTTP`), Node.js version, client, and a sanitized error message.
- For a Bunpro compatibility problem, say when it occurred and which read-only workflow failed without pasting the response body.

Security issues belong in the private process described in [SECURITY.md](SECURITY.md).

## Development setup

```bash
git clone https://github.com/yash-278/bunpro-mcp.git
cd bunpro-mcp
npm ci
npm run check
```

## Pull-request expectations

- Keep Bunpro integration read-only.
- Use the modern MCP `registerTool` API with strict Zod input and output schemas.
- Add correct MCP annotations, especially for destructive operations.
- Return structured content and actionable, sanitized errors.
- Add automated tests for behavior and contract changes.
- Use synthetic fixtures. Never commit raw responses from a real Bunpro account.
- Keep live discovery low volume and run it only against an account you are authorized to use.
- Update the README, privacy disclosure, or self-hosting guide when behavior changes.

Run `npm run check` before submitting a pull request.
