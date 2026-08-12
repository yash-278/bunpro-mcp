# Security policy

## Supported version

Security fixes are applied to the latest commit on `main`. There is no stable release branch during the early preview.

## Report a vulnerability

Use GitHub's private vulnerability-reporting or security-advisory feature for this repository. Do not open a public issue containing:

- Bunpro usernames or passwords;
- Auth0 access or refresh tokens;
- Bunpro cookies or frontend tokens;
- setup URLs or setup tokens;
- encryption keys, database URLs, or raw API responses; or
- details that would allow another user to be identified or impersonated.

Include the affected version or commit, expected impact, and minimal reproduction steps using synthetic data. Please allow a reasonable period for investigation before public disclosure.

If a real secret was exposed, revoke or rotate it immediately. For a Bunpro password, change it through Bunpro. For deployment secrets, rotate them in the hosting and OAuth providers and redeploy.

## Deployment expectations

Public deployments must:

- require OAuth on every `/mcp` request;
- validate issuer, audience, signature, expiry, and `bunpro.read` scope;
- use HTTPS;
- use independent 32-byte values for `BUNPRO_CREDENTIALS_ENCRYPTION_KEY` and `SETUP_TOKEN_SECRET`;
- store no deployment-wide Bunpro username or password;
- protect PostgreSQL and encryption-key access; and
- preserve the self-service account-disconnection tool.

This project integrates with an undocumented frontend interface. A Bunpro contract change should fail closed rather than return guessed or malformed data.
