# Repository Safety and Release Policy

## Public-source authorization

Bunpro authorized this MCP to be released as open source on 2026-08-17. The approval was given by Sean in the private Bunpro community thread titled **API access request for a read-only Bunpro MCP integration**. The private correspondence itself must not be copied into the repository or public announcements.

The repository may publicly include the MCP source, Bunpro integration implementation, documented request mechanism, self-hosting instructions, and links to the hosted service.

## Protected constraints

- Keep every Bunpro operation read-only and low-volume.
- Never commit, log, print, echo, or publish a real Account API Token, credential-bearing header, cookie, password, raw account response, or personal study data.
- Use only synthetic fixtures and sanitized examples.
- Do not copy private community posts or private correspondence verbatim into public files.
- Describe the project as unofficial and experimental; do not imply Bunpro or OpenAI endorsement, an official listing, or a stability guarantee.
- Preserve the stateless per-caller credential design. A hosted deployment must never use a shared Bunpro token or credential database.
- Keep `package.json` marked `private` unless package-registry publication receives separate approval.

For the visibility cutover, verify that `yash-278/bunpro-mcp` is `PRIVATE` immediately before the change, switch it once, and then verify that it reports `PUBLIC`. After the cutover, verify `PUBLIC` before and after release operations. Pull requests and branches must target that repository.
