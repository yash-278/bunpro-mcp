# Public announcement draft

## A read-only Bunpro connection for ChatGPT and other MCP clients

I’ve built a small, unofficial MCP server that lets ChatGPT, Codex, and other MCP-compatible apps read your Bunpro study data.

It is useful for questions such as:

- How many reviews are due, and what does the forecast look like?
- What did I study on a particular day or during a date range?
- Which study decks are active, and how am I progressing through them?
- What have I reviewed recently?
- How is my JLPT progress or study trend changing?

The connection is read-only. It cannot answer reviews, start lessons, run crams, change your SRS state, or edit your Bunpro account.

### Connect it to ChatGPT

First, copy your Account API Token from **Bunpro → Settings → API**. Treat this token like a password.

In the ChatGPT desktop app, open **Settings → Plugins → MCPs → Add custom MCP**. Enter these settings:

- **Name:** Bunpro MCP
- **Type:** Streamable HTTP
- **URL:** `https://bunpro.yashkadam.com/mcp`
- **Bearer token environment variable:** leave blank
- **Protected header name:** `Authorization`
- **Protected header value:** `Bearer <your Bunpro Account API Token>`

Replace everything inside `<...>` with the token itself; do not include the angle brackets. For example, the value should begin with `Bearer ` followed immediately by your token.

Save the connection and ask: **“Use Bunpro to check my connection.”** If it fails, reopen the connection and check the URL, the `Authorization` spelling, the space after `Bearer`, and whether the token is still valid.

Other MCP apps can use the same URL and Authorization header, although their menu and field names may differ.

The protected header is connection configuration, not something you should paste into a chat message. Never put your token in a prompt, screenshot, URL, support post, or tool argument.

### What is available

The MCP currently provides eight read-only tools:

- connection status;
- one-day study summaries;
- date-range summaries of up to 93 days, including both dates you choose;
- reviews due now and the current forecast;
- active study decks and their goals;
- recent activity from the last 24 hours or the latest reviews Bunpro provides;
- account and JLPT learning progress; and
- daily activity trends with review, new-content, and accuracy coverage.

Some useful prompts to try:

- “How many Bunpro reviews are due, and what does the next week look like?”
- “Summarize my Bunpro activity for yesterday.”
- “Compare my study activity over the last 14 days.”
- “Show my progress from N5 through N1.”
- “Which Bunpro study decks are currently active?”

### Privacy and security

Your MCP app sends your token to the hosted server over HTTPS whenever it asks for Bunpro data. The application uses the token for that request and has no token database, user profile, or saved study history. Its own application logs are designed not to include tokens, request headers, or returned study data.

This is still my hosted service, running through a hosting provider. Anyone with privileged access to that infrastructure could technically inspect data while a request is being handled. Only connect if you are comfortable trusting both me and the hosting provider. “Read-only” describes the actions exposed by this MCP; your token can still reveal private Bunpro account and study information, so continue to treat it like a password.

Removing the connection stops the app from sending your token, but it does not invalidate the token. To revoke an exposed or previously saved token, rotate it from **Bunpro → Settings → API**. Update the saved header only if you want to reconnect with the new token.

### Important limitations

This project is unofficial and is not affiliated with or endorsed by Bunpro. It depends on experimental Bunpro functionality that is not supported as a stable public integration. It may become unavailable, be rate-limited, or return incomplete results after future changes. If a date has no available record, the MCP reports that uncertainty instead of claiming you studied zero items.

The hosted server is a free, best-effort community service with no uptime or support guarantee. Access may be limited or suspended if necessary to avoid putting excessive traffic on Bunpro. The MCP remains read-only even when a request fails.

If you run into a problem, reply or contact me privately with the tool name, approximate time, and a sanitized error message. Please never send your token, Authorization header, screenshots containing credentials, or raw account data.
