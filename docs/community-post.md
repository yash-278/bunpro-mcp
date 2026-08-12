# I made a read-only Bunpro connector for ChatGPT

Hey everyone — I’m Yash. I kept copying review counts and study progress out of Bunpro whenever I wanted ChatGPT to help me look at my study habits, so I made a connector that can read that information directly.

It is called **Bunpro MCP**. MCP is simply the connection format ChatGPT and other AI apps use to call tools.

You can ask it things like:

- “How many Bunpro reviews are due, and what does the next week look like?”
- “What did I study yesterday?”
- “Compare my Bunpro activity over the last 14 days.”
- “Which study decks are active?”
- “Show my progress from N5 through N1.”

It is completely read-only. It cannot answer reviews, start lessons or crams, change your SRS progress, or edit your Bunpro account.

## How to connect it to ChatGPT

These steps use the ChatGPT desktop app. If your version does not show the custom MCP screen, it may not support this setup yet.

1. In Bunpro, open **Settings → API** and copy your Account API Token. Treat it like a password.
2. In ChatGPT, open **Settings → Plugins → MCPs → Add custom MCP**.
3. Enter the following:

   - **Name:** Bunpro MCP
   - **Type:** Streamable HTTP
   - **URL:** `https://bunpro.yashkadam.com/mcp`
   - **Bearer token environment variable:** leave this blank
   - **Protected header name:** `Authorization`
   - **Protected header value:** `Bearer <your Bunpro Account API Token>`

Replace `<your Bunpro Account API Token>` with the token you copied. Do not include the angle brackets. The final value should be the word `Bearer`, one space, and then your token.

Save it, then try:

> Use Bunpro to check my connection.

If it does not connect, check these four things:

- the URL is exactly `https://bunpro.yashkadam.com/mcp`;
- `Authorization` is spelled correctly;
- there is one space between `Bearer` and the token; and
- the token is still current in Bunpro.

Other MCP-compatible apps can use the same URL and Authorization header, although their menus may look different.

Please put the token only in the protected connection field. Never paste it into a chat message, screenshot, URL, support post, or tool argument.

## What it can show you

The current version can read:

- your Bunpro account timezone;
- reviews, new items, and accuracy recorded for a particular day;
- day-by-day study summaries and trends for ranges up to 93 days;
- reviews due now and the forecast through the next 14 calendar days;
- active study decks, daily goals, and grammar/vocabulary completion counts;
- activity from the last 24 hours or Bunpro’s latest available review attempts;
- account study totals and JLPT progress from N5 through N1; and
- review, new-content, and accuracy trends.

Bunpro does not always return a record for every date. When that happens, the connector says the data is unavailable instead of pretending you studied zero items.

## A few important things to know

This is an unofficial community project. It is not affiliated with or endorsed by Bunpro.

It relies on experimental Bunpro functionality, so Bunpro changes, rate limits, or outages may make a tool temporarily stop working or return incomplete information. I’m running the server for free, so please treat it as a useful community tool rather than a guaranteed service. I may limit or pause it if that is necessary to avoid putting too much traffic on Bunpro.

Your MCP app sends your Bunpro token to the server over HTTPS when it requests data. The connector does not have a token database, create user accounts, or save your study history. Its application logs are designed not to include tokens, Authorization headers, or returned study data.

The server is hosted on Railway. As with any hosted service, I and the hosting provider could technically inspect data while a request is being handled. Please connect only if you are comfortable trusting both of us. If you are not, do not use the hosted version.

“Read-only” describes what this connector can do, not how sensitive the token is. The token can reveal private Bunpro account and study information, so continue to treat it like a password.

## How to disconnect or revoke access

To stop ChatGPT from sending the token, open **Settings → Plugins → MCPs → Bunpro MCP** and remove the connection.

Removing the connection does not invalidate the token. If the token was exposed, or you no longer trust where it was saved, rotate it from **Bunpro → Settings → API**. Rotating it invalidates the old token. If you want to reconnect later, save the new token in the protected header field.

If something goes wrong, send me a private message here with the tool you were using, the approximate time, and the sanitized error message. Please do not send your token, Authorization header, credential screenshots, or raw account data.

I’d love to hear what you use it for and what read-only information would be most useful next.
