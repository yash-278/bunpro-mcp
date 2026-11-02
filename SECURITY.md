# Security policy

## Supported version

Security fixes are applied to the latest commit on `main`. There is no separate stable release branch yet.

## Report a vulnerability

Use GitHub's private vulnerability-reporting or security-advisory feature for this repository. Do not open an issue containing:

- Bunpro Account API Tokens;
- HTTP token-bearing request headers;
- raw Bunpro responses or personal study data; or
- details that would allow another user to be identified or impersonated.

Include the affected version or commit, expected impact, and minimal reproduction steps using synthetic data. If a real Account API Token was exposed, rotate it immediately through Bunpro Settings → API.

## Deployment expectations

Remote deployments must:

- use HTTPS;
- accept each caller's Bunpro Account API Token through `X-Bunpro-Token` or `Authorization: Bearer ...`;
- reject requests that supply both credential headers;
- never configure a deployment-wide Bunpro token;
- never put tokens in URLs, tool arguments, logs, fixtures, errors, or persistent storage;
- keep the Streamable HTTP transport stateless;
- preserve host-header validation and request-size limits; and
- fail closed on Bunpro authentication rejection, throttling, unavailable routes, or schema drift.

`X-Bunpro-Token` and `Authorization: Bearer ...` are protected transport containers for the caller's Bunpro credential, not a separate identity system. The server does not validate an Auth0 issuer or maintain user accounts; Bunpro determines whether the passed token is valid.

A plugin's `.mcp.json` never holds a token, because everyone who installs the plugin receives that file. It may reference only a placeholder that the MCP host fills from sensitive configuration.

This project integrates with an undocumented, experimental frontend interface. A Bunpro contract or whitelist change must fail closed rather than return guessed or malformed data.
