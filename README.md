# Bunpro MCP

[![CI](https://github.com/yash-278/bunpro-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/yash-278/bunpro-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An open-source, stateless, read-only Model Context Protocol (MCP) server for asking ChatGPT, Codex, and other MCP clients about your Bunpro studies.

- **Hosted service:** [bunpro.yashkadam.com](https://bunpro.yashkadam.com/)
- **Hosted MCP endpoint:** `https://bunpro.yashkadam.com/mcp`
- **Self-hosting:** [Local, Docker, and Railway guide](docs/self-hosting.md)
- **Tools:** Eight read-only workflows for activity, reviews, decks, progress, and trends

> [!IMPORTANT]
> Bunpro MCP is an unofficial community project. It is not affiliated with or endorsed by Bunpro or OpenAI. It uses experimental, undocumented Bunpro functionality that may change, become unavailable, or be rate-limited without notice.

## What you can ask

- “What did I study yesterday?”
- “How many reviews are due, and what does this week look like?”
- “Summarize my Bunpro activity over the last 14 days.”
- “Which study decks are active?”
- “How far along am I from JLPT N5 through N1?”
- “How has my review volume and accuracy changed this month?”

Every tool is read-only. Bunpro MCP cannot answer reviews, start lessons or crams, change SRS progress, edit decks, or update account settings.

## Use the hosted service

### 1. Get your Bunpro token

Open **Bunpro → Settings → API** and copy your Account API Token. Treat it like a password. Never paste it into a chat, prompt, URL, screenshot, issue, log, or tool argument.

### 2. Add the MCP to ChatGPT

In the ChatGPT/Codex desktop app:

1. Open **Settings → Plugins → MCPs → Add custom MCP**.
2. Enter `Bunpro MCP` and choose **Streamable HTTP**.
3. Set the URL to `https://bunpro.yashkadam.com/mcp`.
4. Leave **Bearer token env var** blank.
5. Add a protected custom header named `X-Bunpro-Token`.
6. Paste the raw Bunpro Account API Token as the header value—without `Bearer` or another prefix.
7. Save, enable the MCP in a new chat, and ask: `Check my Bunpro connection.`

The hosted deployment has no shared Bunpro credential or account database. Your MCP client attaches your token to each request, and the server does not persist it.

Clients already configured with `Authorization: Bearer <token>` remain compatible. Configure exactly one credential method; requests containing both headers are rejected.

## Self-host locally with stdio

Requirements:

- Node.js 20 or newer
- Git

```bash
git clone https://github.com/yash-278/bunpro-mcp.git
cd bunpro-mcp
npm ci
npm run build
```

Configure your MCP client to start the compiled server and provide the token through its secret environment configuration:

```json
{
  "command": "/absolute/path/to/node",
  "args": ["/absolute/path/to/bunpro-mcp/dist/index.js"],
  "env": {
    "BUNPRO_API_TOKEN": "your Bunpro Account API Token"
  }
}
```

Use absolute paths. The stdio server writes protocol messages only to stdout and operational messages to stderr.

## Self-host with Docker

```bash
docker build -t bunpro-mcp .
docker run --rm -p 8080:8080 \
  -e TRANSPORT=http \
  -e PORT=8080 \
  -e PUBLIC_BASE_URL=http://localhost:8080 \
  bunpro-mcp
```

Your endpoint will be `http://localhost:8080/mcp`. Each caller must still provide their own token through `X-Bunpro-Token`; do not configure a deployment-wide `BUNPRO_API_TOKEN` for HTTP mode.

For an HTTPS deployment on Railway or another host, follow [docs/self-hosting.md](docs/self-hosting.md).

## Available tools

| Tool | What it returns |
| --- | --- |
| `get_connection_status` | Authentication status and Bunpro’s source timezone |
| `get_study_day_summary` | Source-backed activity evidence for one Bunpro calendar day |
| `get_study_range_summary` | Daily activity evidence for an inclusive range of up to 93 days |
| `get_review_schedule` | Reviews due now and Bunpro’s current daily forecast |
| `list_study_decks` | Active study decks, daily goals, and completion counts |
| `get_recent_activity` | Last-24-hours activity or Bunpro’s latest review attempts |
| `get_learning_progress` | Account totals, JLPT progress, reviews, and cram aggregates |
| `get_activity_trend` | Daily evidence with derived totals and averages for a date range |

Missing source data is reported as unavailable, not silently converted to zero.

## Privacy and security

- The application does not persist tokens, cookies, sessions, study history, or raw Bunpro responses.
- The hosted service uses HTTPS and receives the token only in a protected request header.
- A hosted operator and infrastructure provider can technically inspect request memory or traffic termination. Run the stdio server locally if you do not accept that trust boundary.
- Requests are bounded, validated, timed out, and not retried aggressively after Bunpro throttling.
- Authentication rejection, unavailable routes, and schema drift fail closed with sanitized errors.
- Rotate an exposed token immediately from **Bunpro → Settings → API**.

Read [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md) before operating a public deployment.

## Development

```bash
npm ci
npm run check
```

Optional live tests use your own Bunpro token and perform read-only, deliberately paced requests:

```bash
BUNPRO_API_TOKEN="your token" npm run live:test:auth
BUNPRO_API_TOKEN="your token" npm run live:test:tools
BUNPRO_API_TOKEN="your token" BUNPRO_MCP_URL="https://your-host.example/mcp" npm run live:test:tools
```

The live scripts print only bounded status information. Never attach raw Bunpro responses or credentials to an issue.

## Contributing and support

Issues and focused pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), [SUPPORT.md](SUPPORT.md), and the [Code of Conduct](CODE_OF_CONDUCT.md).

Security vulnerabilities should be reported privately through GitHub as described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE). Bunpro names, content, and trademarks belong to their respective owners.
