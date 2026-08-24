# Support

## Setup and usage help

Before reporting a problem:

1. Confirm the hosted health check returns `{"status":"ok"}` at `https://bunpro.yashkadam.com/healthz`.
2. Confirm the MCP URL is exactly `https://bunpro.yashkadam.com/mcp`.
3. Confirm the protected header name is exactly `X-Bunpro-Token` and its value contains only the current Bunpro Account API Token.
4. Start a new chat with Bunpro MCP enabled and ask: `Check my Bunpro connection.`

For a normal bug, use the repository's public bug-report form. Include the client, transport, Node.js version when self-hosting, approximate time, affected tool, and sanitized error message.

Never include an Account API Token, token-bearing header, credential screenshot, raw Bunpro response, or personal study data. If a token was exposed, rotate it in Bunpro Settings → API before doing anything else.

## Security problems

Do not open a public issue. Use GitHub private vulnerability reporting as described in [SECURITY.md](SECURITY.md).

## Service expectations

This is an unofficial, experimental, best-effort community service. Bunpro may change or restrict the temporary interface without notice. The maintainer may limit or pause the hosted service to protect Bunpro from excessive traffic.
