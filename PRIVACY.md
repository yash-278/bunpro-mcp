# Privacy

This document explains how Bunpro MCP handles the Bunpro Account API Token and study data. It applies to the open-source server and the hosted service at `https://bunpro.yashkadam.com/mcp`.

## Local stdio mode

- Your MCP host supplies `BUNPRO_API_TOKEN` through its secret environment configuration.
- The MCP reads the token into process memory only while it runs.
- The MCP does not persist the token, cookies, sessions, study data, or raw Bunpro responses.
- Your MCP host may persist its environment configuration according to that application's own privacy and security behavior.

## Hosted Streamable HTTP mode

- Your MCP host sends your Account API Token in the HTTPS `X-Bunpro-Token` or `Authorization: Bearer` header.
- The server uses it only to make the Bunpro requests needed to answer that MCP call.
- The application does not create an identity profile, account link, setup session, or database record.
- The application does not intentionally log or persist token-bearing request headers, the token, Bunpro response bodies, or study history.

The hosted operator and infrastructure provider can technically inspect application memory or traffic where TLS terminates. Stateless passthrough reduces retained data; it does not eliminate the need to trust the hosted service. If that trust boundary is unacceptable, run the stdio server locally or self-host the HTTP service.

## Where Claude holds the token

| Surface | Where the token is held |
| --- | --- |
| Plugin in Claude Code | System secure store |
| Manual Claude Code config | Environment variable |
| Desktop `.mcpb` | Operating system secure storage, never sent to the hosted service |
| claude.ai | Stored by Claude as the connector's credential |

## Study data in your MCP host

Study data returned by a tool goes to your MCP host and its model provider. This applies on every host, including ChatGPT and Claude, and that provider's terms cover what happens to it next.

## Logs and telemetry

The application includes no analytics or advertising code. It emits bounded operational telemetry containing a generated request ID, method/path, status, duration, and active-request count. It does not intentionally log request headers, token values, MCP arguments, raw Bunpro responses, or returned study data. Hosting, MCP-client, and network providers may process normal connection metadata under their own policies.

## Revocation

There is no MCP-side account data to disconnect or delete. To invalidate a token, rotate it through Bunpro Settings → API. Then replace it in each place you use it:

| Surface | How to replace or remove the token |
| --- | --- |
| Plugin in Claude Code | Update the `bunpro_token` option in `/plugin`, or uninstall the plugin |
| Manual Claude Code config | Change the `BUNPRO_API_TOKEN` environment variable |
| Desktop `.mcpb` | Open the extension in Claude Desktop's **Extensions** settings and replace the token, or remove the extension |
| claude.ai | Remove the connector and add it again with the new value, because authentication settings can't change after a connector is added |
| ChatGPT and other MCP hosts | Update the secret in your MCP host |

## Security reports

Do not post tokens or security-sensitive data in an issue. Follow the private reporting process in [SECURITY.md](SECURITY.md).
