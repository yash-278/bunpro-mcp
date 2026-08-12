# Bunpro MCP

An unofficial, stateless, read-only Model Context Protocol (MCP) server for connecting Bunpro to ChatGPT, Codex, and other MCP clients.

> [!IMPORTANT]
> This private project uses Bunpro's experimental Account API Token support for its undocumented Frontend API. It is not affiliated with or endorsed by Bunpro. Routes, schemas, throttling, and whitelist access may change without notice.

> [!CAUTION]
> The repository must remain private. Do not publish, mirror, package, or publicly document the temporary Account API Token mechanism unless Bunpro provides new written permission specifically allowing public disclosure. The agent-enforced policy is recorded in [AGENTS.md](AGENTS.md).

## Project status

The direct Account API Token connection and the complete read-only tool catalog are implemented.

Available tools:

- `get_connection_status` verifies that the caller's Bunpro Account API Token can access Bunpro and returns the source timezone.
- `get_study_day_summary` returns source-backed activity evidence for one exact Bunpro calendar day.
- `get_study_range_summary` returns every inclusive calendar day in a bounded range using one upstream evidence fetch.
- `get_review_schedule` returns reviews due now and Bunpro's current daily forecast.
- `list_study_decks` returns bounded active study-deck goals and completion counts.
- `get_recent_activity` returns a bounded last-24-hours or latest-attempts view.
- `get_learning_progress` returns normalized account totals, JLPT progress, review totals, and cram aggregates.
- `get_activity_trend` returns preserved daily evidence plus explicitly derived range totals and averages.

The prioritized tool catalog and explicit non-goals are tracked in [docs/tool-roadmap.md](docs/tool-roadmap.md).

All Bunpro requests are read-only. The server does not submit reviews, start lessons, change progress, or modify account settings.

## Get your Bunpro token

Open **Bunpro → Settings → API** and copy your Account API Token. Treat it like a password. Do not paste it into chat, tool arguments, repository files, screenshots, logs, or support posts.

## Use the hosted version

The hosted Streamable HTTP endpoint is:

```text
https://bunpro.yashkadam.com/mcp
```

In the ChatGPT/Codex desktop app:

1. Open **Settings → Plugins → MCPs → Add custom MCP**.
2. Enter `Bunpro MCP`, choose **Streamable HTTP**, and paste the URL above.
3. Leave **Bearer token env var** blank.
4. Add a protected custom header named `X-Bunpro-Token` and paste your Bunpro API token as its value.
5. Save and ask: `Check my Bunpro connection.`

There is no Auth0 login, Bunpro password form, account-link page, database, or server-side token store. The MCP host attaches the token as a protected request header. The server uses it for that request and does not persist it.

Existing clients configured with `Authorization: Bearer <token>` remain compatible, but new connections should use `X-Bunpro-Token`. Do not configure both headers. Never put the token in the URL or a tool argument.

## Run it locally

Local mode runs over stdio and reads the same Account API Token from the MCP host's secret environment configuration.

Requirements:

- Node.js 20 or newer
- Git

```bash
git clone https://github.com/yash-278/bunpro-mcp.git
cd bunpro-mcp
npm ci
npm run build
```

Add an **STDIO** MCP server using absolute paths on your machine:

```json
{
  "command": "/absolute/path/to/node",
  "args": ["/absolute/path/to/bunpro-mcp/dist/index.js"],
  "env": {
    "BUNPRO_API_TOKEN": "your Bunpro Account API Token"
  }
}
```

Use the MCP client's secret environment fields when available. The MCP does not create cookies, perform a browser login, refresh a session, or write the token to disk.

## Self-host the remote version

The remote transport is stateless Streamable HTTP. It requires no Auth0 tenant, OAuth setup, PostgreSQL service, encryption key, or Bunpro credential configured on the deployment. See [docs/self-hosting.md](docs/self-hosting.md).

Each caller must configure their own Bunpro Account API Token in the connection's `X-Bunpro-Token` protected header. Never set a deployment-wide `BUNPRO_API_TOKEN` for HTTP mode.

## Request contract

For each allowed read-only Frontend API route, the adapter transforms the incoming protected token into Bunpro's temporary request contract:

```http
GET /api/frontend/<route>?dangerously_authenticate_using_api_token=true
Authorization: Token token=<account-api-token>
```

The token remains in request memory only. Missing, malformed, or ambiguous credentials fail with HTTP 401. Bunpro authentication failures, throttling, unavailable routes, and schema drift fail closed without login fallback or automatic retry.

## Security and limitations

- The model never receives the Account API Token; the MCP host attaches it at the transport layer.
- The application does not persist tokens, sessions, cookies, study history, or raw Bunpro responses.
- A hosted operator and infrastructure provider can technically inspect request memory or traffic termination. Use local mode if that trust boundary is unacceptable.
- Use HTTPS for every non-local HTTP deployment.
- Bunpro has announced stricter throttling and a future route whitelist. Keep calls low-volume and do not retry aggressively.
- Absence of study data is not automatically evidence of zero activity.

See [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md) for the full disclosures.

## Development

```bash
npm ci
npm run check
```

The opt-in live connection test uses your own Account API Token and performs read-only requests:

```bash
BUNPRO_API_TOKEN="your token" npm run live:test:auth
BUNPRO_API_TOKEN="your token" npm run live:test:http
BUNPRO_API_TOKEN="your token" npm run live:test:tools
BUNPRO_API_TOKEN="your token" BUNPRO_MCP_URL="https://your-host.example/mcp" npm run live:test:tools
```

The first command tests stdio. The second tests the HTTP `X-Bunpro-Token` passthrough. The third makes one deliberately paced pass through every published tool in process; adding `BUNPRO_MCP_URL` runs the same sweep against a deployed Streamable HTTP endpoint. All use the real Bunpro API, and the tool sweep prints only tool names and success states. Do not attach raw Bunpro responses or secrets to issues.

## Contributing

Bug reports, compatibility reports, and focused pull requests are welcome within the private project. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md) first.

## License

[MIT](LICENSE). Bunpro names and trademarks belong to their respective owner.
