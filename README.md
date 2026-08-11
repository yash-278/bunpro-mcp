# Bunpro MCP

Private MCP project for exposing trustworthy, date-bounded Bunpro study summaries to Atlas and other MCP hosts.

The current implementation provides a stdio MCP server with `get_connection_status`. Each invocation performs a fresh Bunpro login from the MCP host environment, keeps the web cookies and frontend API token in memory only, verifies both the authenticated web session and frontend API, and then discards that client instance.

## Configuration

Configure these secrets in the MCP host application:

```text
BUNPRO_USERNAME=your Bunpro login email
BUNPRO_PASSWORD=your Bunpro password
```

Do not provide a browser cookie or frontend token. The MCP obtains them during login and never returns or persists them.

For an MCP host configuration page, use the equivalent of:

```json
{
  "command": "node",
  "args": ["/absolute/path/to/bunpro-mcp/dist/index.js"],
  "env": {
    "BUNPRO_USERNAME": "your Bunpro login email",
    "BUNPRO_PASSWORD": "your Bunpro password"
  }
}
```

The first available tool is `get_connection_status`. It performs the fresh login and returns only safe booleans plus Bunpro's configured source timezone.

## Development

```bash
npm install
npm test
npm run build
```

Run the opt-in live MCP authentication smoke test only when the two Bunpro environment variables are configured:

```bash
npm run live:test:auth
```

That smoke test launches the compiled server through a real MCP stdio client, lists its tools, calls `get_connection_status`, and fails unless the authenticated web session and frontend API both work.

The current Wayfinder map lives at [`.scratch/bunpro-mcp/map.md`](.scratch/bunpro-mcp/map.md).
