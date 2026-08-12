# Bunpro MCP

An unofficial, read-only Model Context Protocol (MCP) server for connecting Bunpro to ChatGPT, Codex, and other MCP clients.

> [!IMPORTANT]
> This project uses Bunpro's private frontend interface because the legacy public API is no longer available. It is not affiliated with or endorsed by Bunpro, and Bunpro can change the interface without notice.

## Project status

This is an early preview. The authentication and account-isolation layer is working, but the date-bounded study-summary tool is still under development.

Available tools:

- `get_connection_status` verifies the linked Bunpro account and reports whether the MCP used a cached, refreshed, or new frontend session.
- `disconnect_bunpro_account` removes the current user's encrypted Bunpro credentials and session from active hosted storage. This tool is not needed in local mode because local authentication is never persisted by the MCP.

All Bunpro requests are read-only. The server does not submit reviews, start lessons, change progress, or modify account settings.

## Use the hosted version

The hosted preview is the easiest way to try the connection:

```text
https://bunpro-mcp-production.up.railway.app/mcp
```

In the ChatGPT/Codex desktop app:

1. Open **Settings → Plugins → MCPs → Add custom MCP**.
2. Enter `Bunpro MCP`, select **Streamable HTTP**, and paste the URL above.
3. Leave the bearer-token and custom-header fields empty, then save.
4. Select **Authenticate**. This signs you into the MCP through Auth0; it is separate from your Bunpro login.
5. Ask: `Check my Bunpro connection.`
6. If no Bunpro account is linked, open the short-lived setup URL returned by the tool and enter your Bunpro login there.
7. Run the connection check again.

OpenAI's current MCP setup instructions are available in the [official ChatGPT and Codex documentation](https://learn.chatgpt.com/docs/extend/mcp).

The hosted operator controls the encryption key and can technically decrypt stored authentication data. If that trust model is not acceptable, use the local version or self-host it. Read [PRIVACY.md](PRIVACY.md) before linking an account.

To remove a hosted account link, ask the client to `Disconnect my Bunpro account` and explicitly approve the destructive tool call.

## Run it locally

Local mode runs over stdio for one Bunpro account. Bunpro credentials remain in the MCP host's secret configuration; derived cookies and the frontend token remain only in process memory.

Requirements:

- Node.js 20 or newer
- Git

```bash
git clone https://github.com/yash-278/bunpro-mcp.git
cd bunpro-mcp
npm ci
npm run build
```

Add an **STDIO** MCP server using the absolute paths on your machine:

```json
{
  "command": "/absolute/path/to/node",
  "args": ["/absolute/path/to/bunpro-mcp/dist/index.js"],
  "env": {
    "BUNPRO_USERNAME": "your Bunpro login email",
    "BUNPRO_PASSWORD": "your Bunpro password"
  }
}
```

Use the MCP client's secret environment fields when they are available. Never commit credentials to this repository or place them in tool arguments.

The MCP logs in lazily. It reuses the in-memory session, attempts a web-session refresh after an authentication rejection, and performs a fresh credential login only if refresh fails. Restarting the local process clears the derived session.

## Self-host the remote version

The remote transport is stateless Streamable HTTP with OAuth, per-user account isolation, encrypted PostgreSQL storage, and short-lived setup links. See [docs/self-hosting.md](docs/self-hosting.md) for the Auth0 and Railway configuration.

Do not put a shared `BUNPRO_USERNAME` or `BUNPRO_PASSWORD` in a public deployment. Every OAuth identity must link its own Bunpro account.

## Security model and limitations

- Bunpro credentials, web cookies, and the frontend token are never returned by an MCP tool.
- Local mode keeps derived authentication in process memory only.
- Hosted mode encrypts each user's authentication payload with AES-256-GCM before saving it to PostgreSQL.
- OAuth issuer, audience, scope, and token signatures are validated for every hosted MCP request.
- The current adapter may not handle MFA, CAPTCHA, bot challenges, or future Bunpro login changes.
- Bunpro has not published stability, pagination, or rate-limit guarantees for these frontend endpoints. Keep usage low volume.

See [SECURITY.md](SECURITY.md) for vulnerability reporting and [PRIVACY.md](PRIVACY.md) for the complete data-handling disclosure.

## Development

```bash
npm ci
npm run check
```

The opt-in live authentication test uses your own Bunpro account and performs read-only requests:

```bash
BUNPRO_USERNAME="your login" BUNPRO_PASSWORD="your password" npm run live:test:auth
```

It prints only normalized authentication status. Do not attach raw Bunpro responses or secrets to issues.

## Contributing

Bug reports, compatibility reports, and focused pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md) first.

## License

[MIT](LICENSE). Bunpro names and trademarks belong to their respective owner.
