# Privacy

This document explains how Bunpro MCP handles the Bunpro Account API Token and study data. It applies to the private source project and to the hosted service at `https://bunpro.yashkadam.com/mcp`.

## Local stdio mode

- Your MCP host supplies `BUNPRO_API_TOKEN` through its secret environment configuration.
- The MCP reads the token into process memory only while it runs.
- The MCP does not persist the token, cookies, sessions, study data, or raw Bunpro responses.
- Your MCP host may persist its environment configuration according to that application's own privacy and security behavior.

## Hosted Streamable HTTP mode

- Your MCP host sends your Account API Token in the HTTPS `X-Bunpro-Token` header.
- The server uses it only to make the Bunpro requests needed to answer that MCP call.
- The application does not create an identity profile, account link, setup session, or database record.
- The application does not intentionally log or persist token-bearing request headers, the token, Bunpro response bodies, or study history.

The hosted operator and infrastructure provider can technically inspect application memory or traffic where TLS terminates. Stateless passthrough reduces retained data; it does not eliminate the need to trust the hosted service. If that trust boundary is unacceptable, do not use the hosted service. Public local installation and self-hosting are not available while the source repository remains private.

## Logs and telemetry

The application includes no analytics or advertising code. It emits bounded operational telemetry containing a generated request ID, method/path, status, duration, and active-request count. It does not intentionally log request headers, token values, MCP arguments, raw Bunpro responses, or returned study data. Hosting, MCP-client, and network providers may process normal connection metadata under their own policies.

## Revocation

There is no MCP-side account data to disconnect or delete. To invalidate a token, rotate it through Bunpro Settings → API and update the secret in your MCP host.

## Security reports

Do not post tokens or security-sensitive data in an issue. Follow the private reporting process in [SECURITY.md](SECURITY.md).
