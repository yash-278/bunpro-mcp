# Draft Bunpro community post

## Title

I built an unofficial read-only Bunpro MCP (local + hosted preview)

## Post

Hey everyone — I've been working on a small, unofficial MCP server for Bunpro.

The idea is to let ChatGPT, Codex, or another MCP client read useful Bunpro study information without manually copying it over. The authentication and connection layer is working now, and I'm opening it up early so people can review the approach and try the setup before I add the date-based study-summary tools.

The project is read-only. It does not submit reviews, start lessons, or change anything in your Bunpro account.

I'm sharing it in the spirit of [Sean's earlier response](https://community.bunpro.jp/t/permission-to-reverse-engineer-the-bunpro-api/164173/2) that community developers may reverse-engineer and publicly document the website API, with the important caveat that it can change without warning.

Source code: https://github.com/yash-278/bunpro-mcp

### Easiest option: hosted version

Add this as a Streamable HTTP MCP:

`https://bunpro-mcp-production.up.railway.app/mcp`

In the ChatGPT/Codex desktop app:

1. Go to Settings → Plugins → MCPs → Add custom MCP.
2. Choose Streamable HTTP and paste the URL above.
3. Leave the bearer-token and header fields empty.
4. Save, then click Authenticate.
5. Ask it to check your Bunpro connection.
6. Open the one-time setup link it gives you and connect your Bunpro account.

The Auth0 login identifies you to the MCP; it is separate from your Bunpro login.

For the hosted version, your Bunpro credentials and derived session are encrypted before being saved in PostgreSQL. I still want to be clear about the trust model: the hosted operator controls the encryption key and can technically decrypt that data. If you are not comfortable with that, please use the local version or self-host it. You can remove a hosted account link at any time through the `disconnect_bunpro_account` tool.

### Local version

If you would rather keep everything on your machine:

```bash
git clone https://github.com/yash-278/bunpro-mcp.git
cd bunpro-mcp
npm ci
npm run build
```

Then add `dist/index.js` as an STDIO MCP and provide `BUNPRO_USERNAME` and `BUNPRO_PASSWORD` through your MCP client's secret environment configuration. In local mode, the derived Bunpro cookies and frontend token stay in process memory and disappear when the MCP stops.

Full setup and self-hosting instructions are in the README.

### Current limitations

- This is an early preview. Right now it verifies and maintains the Bunpro connection; the daily study-summary tool is next.
- It uses Bunpro's private frontend interface, not a supported public API, so it may break when Bunpro changes the site.
- MFA, CAPTCHA, or other login challenges may not work yet.
- I am deliberately keeping the integration read-only and low volume.

I'd appreciate feedback on the setup, security model, and which read-only study summaries would actually be useful. If something fails, please share a sanitized error only — never post your Bunpro credentials, cookies, tokens, or raw account responses.
