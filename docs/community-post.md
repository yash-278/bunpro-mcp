# Draft private Bunpro community post

## Title

I built a private, read-only Bunpro MCP with Account API Token passthrough

## Post

Hey everyone — I've been working on a small, unofficial MCP server for Bunpro.

The goal is to let ChatGPT, Codex, or another MCP client read useful Bunpro study information without manually copying it over. The repository is staying private, and I'm sharing this only in the Bunpro community group where the temporary Account API Token workaround was documented.

The project is read-only. It does not submit reviews, start lessons, or change anything in your Bunpro account.

Source code: https://github.com/yash-278/bunpro-mcp

### Hosted version

Add this as a Streamable HTTP MCP:

`https://bunpro-mcp-production.up.railway.app/mcp`

In the ChatGPT/Codex desktop app:

1. Store the token from Bunpro Settings → API as a secret environment variable named `BUNPRO_API_TOKEN`.
2. Go to Settings → Plugins → MCPs → Add custom MCP.
3. Choose Streamable HTTP and paste the URL above.
4. Set Bearer token env var to `BUNPRO_API_TOKEN`.
5. Leave custom headers empty, save, and ask it to check your Bunpro connection.

There is no Auth0 login or Bunpro password form. The MCP host sends your Account API Token with each request, and the server does not save it in a database or create a browser session.

The hosted operator and platform can technically inspect request memory, so use the local option if you do not want to trust that boundary.

### Local version

```bash
git clone https://github.com/yash-278/bunpro-mcp.git
cd bunpro-mcp
npm ci
npm run build
```

Then add `dist/index.js` as an STDIO MCP and provide `BUNPRO_API_TOKEN` through your MCP client's secret environment configuration.

### Current limitations

- This is an early private preview. The connection check works; the date-based study-summary tool is next.
- It uses Bunpro's experimental, undocumented Frontend API token mechanism, so routes or response shapes may change without warning.
- Bunpro has added stricter throttling and plans to move to a route whitelist. The MCP stays read-only and low-volume and does not retry aggressively.
- The server cannot promise that today's available routes will remain available.

If something fails, please share only a sanitized error. Never post your Account API Token, Authorization header, or raw account responses.
