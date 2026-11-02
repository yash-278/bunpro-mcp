# Bunpro MCP (unofficial)

Bunpro MCP is an unofficial, experimental community project. It is not affiliated with or endorsed by Bunpro, OpenAI or Anthropic.

This plugin adds two things to Claude:

- A connector to the hosted Bunpro MCP server at `https://bunpro.yashkadam.com/mcp`. It sends your own Account API Token as `Authorization: Bearer`.
- A `study-plan` skill that reads your due reviews and weak spots, then suggests a plan for today based on the time you have.

Every Bunpro tool is read-only. The plugin can't answer reviews, start crams or change anything in Bunpro.

## Install in Claude Code

Run these inside a Claude Code session:

```text
/plugin marketplace add yash-278/bunpro-mcp
/plugin install bunpro-mcp@bunpro-mcp
```

Claude Code asks for your token in a masked field and keeps it in the system secure store. Copy the token from **Bunpro > Settings > API**, and never paste it into a chat.

The [Claude setup guide](https://github.com/yash-278/bunpro-mcp/blob/main/docs/claude-setup.md) has the full steps, the other Claude apps and how to use your own server. The [privacy notes](https://github.com/yash-278/bunpro-mcp/blob/main/PRIVACY.md) explain what the hosted service receives.
