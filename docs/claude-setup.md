# Use Bunpro MCP with Claude

Bunpro MCP is an unofficial, experimental community project. It is not affiliated with or endorsed by Bunpro, OpenAI or Anthropic.

Every path below uses your own Account API Token. Copy it from **Bunpro > Settings > API** and treat it like a password. Never paste it into a chat, prompt, URL, screenshot, issue or log. [PRIVACY.md](../PRIVACY.md) lists where each app holds the token and how to replace it.

## Claude Desktop

This path needs no Anthropic approval and keeps your token away from the hosted service. The server runs on your computer and sends the token only to Bunpro. Claude Desktop includes Node.js, so you don't need to install it.

1. Download `bunpro-mcp.mcpb` from the [latest GitHub release](https://github.com/yash-278/bunpro-mcp/releases/latest). Releases before 0.5.0 don't include it.
2. In Claude Desktop, open **Settings > Extensions**. In some versions, you go to **Settings > Desktop app** and select **Manage** next to **Extensions**.
3. Drag the file onto the page, or double-click the file instead.
4. Follow the prompts to install it. Paste your token into the masked **Bunpro Account API Token** field when Claude Desktop asks for it.
5. Start a new chat and ask `Check my Bunpro connection.`

If **Extensions** doesn't appear in settings, your organization has turned extensions off. To update, install the `.mcpb` from the newer release.

## Claude Code

Claude Code connects to a Bunpro MCP server with `Authorization: Bearer`, and it reads the token from an environment variable.

1. Set `BUNPRO_API_TOKEN` in the environment that starts Claude Code.
2. Add this to `.mcp.json`:

   ```json
   {
     "mcpServers": {
       "bunpro": {
         "type": "http",
         "url": "https://bunpro.yashkadam.com/mcp",
         "headers": {
           "Authorization": "Bearer ${BUNPRO_API_TOKEN}"
         }
       }
     }
   }
   ```

3. Start Claude Code, run `/mcp`, and check that `bunpro` shows as connected.

Keep the `${BUNPRO_API_TOKEN}` placeholder in the file. Never write the token itself into `.mcp.json`. If the variable isn't set, Claude Code sends the placeholder text and the server returns HTTP 401.

To run the server on your own computer instead, follow [Local stdio](self-hosting.md#local-stdio) and set `"BUNPRO_API_TOKEN": "${BUNPRO_API_TOKEN}"` in the server's `env`.

## claude.ai web and mobile (untested)

> [!WARNING]
> Do not use a claude.ai connector on a Team or Enterprise plan. An Owner's header value goes out on every member's requests, so an Owner's token would return the Owner's study data to every member. The server can't detect this. Use Claude Desktop or Claude Code instead.

If the **Add custom connector** dialog has no **Request headers** section, claude.ai isn't available to you. Request headers are a limited Anthropic beta, and Anthropic publishes no way to apply. Use Claude Desktop or Claude Code instead. A connector added without the header should fail with "Couldn't reach the MCP server".

This path is untested. No account with the beta has confirmed these steps yet, and mobile use is inferred from Anthropic's shared connector setup.

On a Free, Pro, Max or Ultra plan:

1. Go to **Customize > Connectors** and click **Add custom connector**.
2. Set the name to `Bunpro MCP` and the MCP server URL to `https://bunpro.yashkadam.com/mcp`.
3. Under **Authentication**, choose **No sign-in**.
4. Under **Request headers**, select `authorization` and enter this exact value, with your token in place of `<token>`:

   ```text
   Bearer <token>
   ```

   Claude sends the value exactly as you enter it, and the server rejects a value without the `Bearer ` prefix.

5. Click **Add**.
6. Start a new chat and ask `Check my Bunpro connection.`

To use a new token, remove the connector under **Customize > Connectors** and add it again with the new value. Claude doesn't let you change authentication settings after you add a connector.
