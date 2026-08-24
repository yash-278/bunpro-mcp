# Bunpro MCP

An unofficial, stateless, read-only Model Context Protocol (MCP) service for asking ChatGPT, Codex, and other MCP clients about your Bunpro studies.

The hosted community service is available at [bunpro.yashkadam.com](https://bunpro.yashkadam.com/). Each person connects with their own Bunpro Account API Token; the service does not use a shared Bunpro account or retain credentials between requests.

> [!IMPORTANT]
> This private project uses Bunpro's experimental Account API Token support for its undocumented Frontend API. It is not affiliated with or endorsed by Bunpro. Routes, schemas, throttling, and whitelist access may change without notice.

> [!CAUTION]
> The repository must remain private. Do not publish, mirror, package, or publicly document the temporary Account API Token mechanism unless Bunpro provides new written permission specifically allowing public disclosure. The agent-enforced policy is recorded in [AGENTS.md](AGENTS.md).

## Project status

The hosted MCP is live, and the complete read-only tool catalog is implemented.

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

## Connect the hosted version

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

## Source and self-hosting status

The hosted service is available to Bunpro users, but this source repository is currently private. Bunpro shared the temporary integration details under a restricted disclosure boundary, so the project cannot offer public clone, local-install, package, container, or self-hosting instructions yet.

A public source release requires new written permission from Bunpro that specifically allows disclosure of the integration mechanism. Until that happens, use the hosted endpoint above. If you have been explicitly invited to this private repository, contributor-only local and deployment instructions remain in [docs/self-hosting.md](docs/self-hosting.md).

## Authentication boundary

Each caller supplies their own token through the MCP client's protected credential configuration. The hosted deployment has no shared Bunpro credential. Tokens remain in request memory only; missing, malformed, or ambiguous credentials fail closed.

## Security and limitations

- The model never receives the Account API Token; the MCP host attaches it at the transport layer.
- The application does not persist tokens, sessions, cookies, study history, or raw Bunpro responses.
- A hosted operator and infrastructure provider can technically inspect request memory or traffic termination. If that trust boundary is unacceptable, do not use the hosted service; public self-hosting is not available while the source remains private.
- Use HTTPS for every non-local HTTP deployment.
- Bunpro has announced stricter throttling and a future route whitelist. Keep calls low-volume and do not retry aggressively.
- Absence of study data is not automatically evidence of zero activity.

See [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md) for the full disclosures.

## Private-repository development

The commands below are for invited repository contributors. They are not a public installation path.

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

## Contributing and support

Bug reports, compatibility reports, and focused pull requests are welcome from people who already have access to the private project. Read [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md), and the [Code of Conduct](CODE_OF_CONDUCT.md) first.

If you use only the hosted service, do not include your Bunpro token or raw study data in a support message. The public website includes setup help and a token-safe health check.

Release history is recorded in [CHANGELOG.md](CHANGELOG.md). The repository's future public-source release remains gated by the Bunpro permission requirements in [docs/public-source-release.md](docs/public-source-release.md).

## License

[MIT](LICENSE). Bunpro names and trademarks belong to their respective owner.
