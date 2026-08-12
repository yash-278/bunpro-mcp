# Security policy

## Supported version

Security fixes are applied to the latest commit on `main`. There is no stable release branch during the private preview.

## Report a vulnerability

Use GitHub's private vulnerability-reporting or security-advisory feature for this repository. Do not open an issue containing:

- Bunpro Account API Tokens;
- HTTP Authorization headers;
- raw Bunpro responses or personal study data; or
- details that would allow another user to be identified or impersonated.

Include the affected version or commit, expected impact, and minimal reproduction steps using synthetic data. If a real Account API Token was exposed, rotate it immediately through Bunpro Settings → API.

## Deployment expectations

Remote deployments must:

- use HTTPS;
- accept each caller's Bunpro Account API Token only through the `Authorization: Bearer ...` header;
- never configure a deployment-wide Bunpro token;
- never put tokens in URLs, tool arguments, logs, fixtures, errors, or persistent storage;
- keep the Streamable HTTP transport stateless;
- preserve host-header validation and request-size limits; and
- fail closed on Bunpro authentication rejection, throttling, unavailable routes, or schema drift.

The Bearer header is a secure transport container for the caller's Bunpro credential, not a separate OAuth identity system. The server does not validate an Auth0 issuer or maintain user accounts; Bunpro determines whether the passed token is valid.

This project integrates with an undocumented, experimental frontend interface. A Bunpro contract or whitelist change must fail closed rather than return guessed or malformed data.
