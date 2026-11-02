# Claude connector authentication for Bunpro MCP

Research date: 2026-11-02

> [!CAUTION]
> This note rests on public documentation and on this repository at commit `7739c4b`. Nothing here was tested against claude.ai, the mobile apps, Claude Desktop, or Bunpro. Anthropic describes request headers as a limited beta, so that section may change without notice.

This note reports options. It does not choose an authentication path. That decision belongs to [issue #90](https://github.com/yash-278/bunpro-mcp/issues/90).

## Question

Which credential paths let a Bunpro learner reach this MCP from claude.ai web, claude.ai mobile, Claude Desktop, and Claude Code, given that the hosted server takes the Account API Token in `X-Bunpro-Token` or `Authorization: Bearer`?

## Decision-ready answer

- Claude Code works today with the current server. Either header can be set in its MCP configuration, and no Anthropic approval is documented for that.
- claude.ai web, mobile, and Desktop connectors have no generally available path to this server today. Request headers are a beta for "a limited set of organizations" ([add-unlisted]), and the server offers no OAuth.
- A connector may use `Authorization` with no OAuth, but only inside that beta. `authorization` is a pre-approved header name, and `X-Bunpro-Token` is not on the documented list ([add-unlisted]).
- Anthropic does not treat request headers as a per-person credential. On Team and Enterprise an Owner enters one value, and "every member's requests carry the same key" ([authentication]). That conflicts with the per-caller rule in `AGENTS.md`.
- A plugin can prompt each user for a token in Claude Code only. Chat and Cowork do not prompt ([platform-support]).
- A local `.mcpb` fits ADR-0004 without changes and needs no Anthropic approval. It reaches Claude Desktop, and Claude Code through a plugin. It cannot reach claude.ai web or mobile.
- OAuth is the only documented path that gives each person their own credential on every surface and plan without the directory. Bunpro has no public OAuth, so this MCP would have to run its own authorization server.
- An OAuth layer can avoid storing per-user credentials at rest, but it cannot do so within ADR-0004. It needs an encryption key and a token-entry page, and ADR-0004 rules out both. OAuth therefore needs a superseding ADR.

The target in [issue #80](https://github.com/yash-278/bunpro-mcp/issues/80) of Study Views in claude.ai depends on this result. A Study View in claude.ai needs a remote connector, and today that connector needs the beta or a new OAuth layer.

## Surface-by-path matrix

Each cell uses one of four states:

- **Available now** means it works with the current server and needs no Anthropic approval.
- **Gated** means the current server can accept it, but Anthropic must enable something first.
- **Needs build** means public documentation supports it, but this repository lacks the code.
- **Not available** means the surface does not support it.

| Surface | Request header `X-Bunpro-Token` | Bearer header | Local `.mcpb` | OAuth |
| --- | --- | --- | --- | --- |
| claude.ai web | Gated. Needs the beta and Anthropic approval of the header name. | Gated. Needs the beta. The header name is pre-approved. | Not available. Chat ignores local servers. | Needs build. Then available on every plan. |
| claude.ai mobile | Gated as on web. Add the connector on web or desktop first. Header use on mobile is inferred. | Gated as on web, with the same inference. | Not available. Mobile supports remote connectors only. | Needs build. Add the connector on web or desktop first. |
| Claude Desktop | Gated as on web for a connector. | Gated as on web for a connector. | Needs build. No bundle exists yet. No Anthropic gate. macOS and Windows. | Needs build. Sign-in opens in the browser. |
| Claude Code | Available now. | Available now. | Needs build through a plugin. Plain stdio with `BUNPRO_API_TOKEN` is available now. | Needs build, plus loopback redirect support. |

Evidence for the rows:

- Connectors run from Anthropic's side on every client. The support article says this covers "claude.ai, Claude Desktop, Cowork, and the mobile apps" ([support-remote]). Anthropic also says "the same authentication infrastructure" backs all surfaces ([authentication]).
- "A connected connector is available in your conversations on the web, desktop, and mobile" ([getting-started]). No mobile add flow appears in the pages I read, and the getting-started page addresses claude.ai and the desktop app only.
- Mobile supports "remote connectors", and the desktop app supports remote connectors "plus local connectors installed as desktop extensions" ([getting-started]).
- Chat ignores a local MCP server, including `.mcpb` bundles ([platform-support]).
- Claude Code loads connectors added in claude.ai only under a claude.ai subscription login, not under `ANTHROPIC_API_KEY` or a third-party provider ([claude-code-mcp]). A server added locally takes precedence over a connector at the same URL ([claude-code-mcp]).

Two related routes sit outside the matrix. MCP tunnels are an Enterprise research preview for private networks and tell operators to require OAuth ([tunnels]). Putting a token in the connector URL is forbidden by Anthropic ([authentication]), the MCP specification ([mcp-auth]), and `SECURITY.md`.

## Request-header authentication

Confirmed from the documentation:

- Request headers are "in beta and available to a limited set of organizations". If the **Request headers** section is missing from the dialog, the organization lacks access ([add-unlisted]). I found no published application form, plan rule, or timeline.
- To use `Authorization` with no OAuth, choose **No sign-in** and add the credential under **Request headers** ([add-unlisted]). On an OAuth connection, `Authorization` cannot be a request header because OAuth uses it.
- Standard names such as `authorization`, `x-api-key`, and `x-auth-token` work for every connector. Anthropic must approve a custom name, and an unapproved name is rejected at save ([add-unlisted], [authentication]). I treat `X-Bunpro-Token` as custom, because the docs give no full list.
- Claude sends the value exactly as entered and adds no scheme ([add-unlisted]). The server requires the `Bearer ` prefix (`src/http-server.ts:253`), so a learner must type `Bearer <token>`. `X-Bunpro-Token` takes the raw token.
- A connector can hold up to four headers. Header values are stored by Claude and not shown again ([add-unlisted]). The support article says they are stored encrypted ([support-remote]).
- Authentication settings cannot change after a connector is added. Changing them means removing the connector and adding it again ([add-unlisted]). Rotating a Bunpro token on claude.ai therefore means a remove and re-add, which is more work than "update the secret in your MCP host" in `PRIVACY.md`.

The documented purpose does not match this project. Anthropic writes that request headers "suit services where everyone in your organization shares one credential", and "If each person needs to sign in with their own account, use OAuth instead" ([add-unlisted]). A server whose tools act as an individual should "use OAuth instead" ([authentication]).

By plan:

- On Team and Enterprise, an Owner adds the connector, and members connect afterwards ([add-unlisted]). A header value the Owner enters goes out on every member's requests ([authentication]). This is unusable for more than one learner under `AGENTS.md`.
- On Free, Pro, Max, and Ultra, a person adds connectors to their own account ([add-unlisted]). If such an account has the beta, one person holds one credential, so per-caller isolation holds. The documentation does not say whether an individual account can count as one of the "limited set of organizations".

Per-person header values exist on one route. For a directory listing, leaving **Anthropic holds one shared value** unchecked means "each person who adds your connector enters their own value" ([authentication]). That route is out of scope for #80. It also collides with two directory rules: "use OAuth 2.0 for authenticated services" ([submission]), and calling "your own first-party APIs, or APIs you legitimately proxy" ([review-criteria]).

Without the beta, a connector cannot connect to the hosted server. Every unauthenticated `/mcp` request gets a 401 with no `WWW-Authenticate` header (`src/http-server.ts:230`), and no `/.well-known` route exists (`src/http-server.ts:190-210`). Anthropic documents that case as failing with "Couldn't reach the MCP server" ([authentication]). The match to this server is my inference.

## Plugins

A plugin can prompt each user in Claude Code only.

- Claude Code supports `userConfig` with `"sensitive": true`. That masks input and stores the value in secure storage, not `settings.json` ([manifest]).
- `${user_config.KEY}` substitutes into MCP server config ([manifest]), and `headers` is a substituted field for HTTP servers ([manifest]).
- The dialog appears in the interactive `/plugin` flow. `claude plugin install` in a shell never prompts and takes `--config` or `claude plugin configure --values-stdin` instead ([components]).
- `headersHelper` cannot use `${user_config.*}` ([manifest]).
- Chat ignores a server "when the URL contains the reference". Cowork ignores a server when a referenced option has no default, and "doesn't prompt for values" ([platform-support]).
- The plugin docs say a chat user "signs in through your server's OAuth flow", and warn against secrets in `.mcp.json` because "every person who installs the plugin receives its files" ([plugin-build]).
- A plugin URL outside the directory reaches chat as a custom connector the user adds from the plugin's **Connectors** tab ([what-to-build]). The request-header gate therefore still applies.

Installing the plugin from GitHub does not change any of this on claude.ai. In chat, the plugin carries skills and a connector entry, and the connector still needs its own credential path.

## Local `.mcpb` desktop extension

- An MCPB is a zip of a local server and `manifest.json`, which runs over stdio and needs no OAuth ([mcpb]).
- The server runs on the user's machine, and Node.js ships with Claude Desktop on macOS and Windows, so learners need no separate runtime ([mcpb]).
- `user_config` drives a settings form. `sensitive` masks the input and stores it securely, and `${user_config.KEY}` reaches the server through `mcp_config` ([mcpb-manifest]). The manifest example passes a key through `env`, which matches `BUNPRO_API_TOKEN`.
- Claude Desktop encrypts sensitive values with operating system storage, such as Keychain on macOS and Credential Manager on Windows ([support-local]).
- Installation is per user, and an organization can turn extensions off ([add-unlisted], [mcpb]).
- The directory no longer accepts MCPB submissions, so users install the file themselves ([mcpb]). A GitHub release can carry the file. This also keeps `package.json` private as `AGENTS.md` requires, because a bundle ships its dependencies and needs no registry publication (inference).
- Claude Code can load a `.mcpb` named in a plugin's `mcpServers`, and the user supplies its `user_config` in `/plugin` ([components]).

Limits of this path:

- It reaches one machine. A token on a desktop does not help claude.ai web or mobile.
- The repository has no `manifest.json` or bundle today.
- I found no statement that MCP Apps render from a `.mcpb` server. Anthropic's examples render from local servers set up in `claude_desktop_config.json` ([mcp-apps]), so this looks plausible but is unconfirmed. Study Views through `.mcpb` need a check on the ticket that owns them.

## Claude Code

These forms need no server change. Both use placeholders.

```bash
claude mcp add --transport http bunpro https://bunpro.yashkadam.com/mcp \
  --header "X-Bunpro-Token: <token>"
```

```json
{
  "mcpServers": {
    "bunpro": {
      "type": "http",
      "url": "https://bunpro.yashkadam.com/mcp",
      "headers": { "X-Bunpro-Token": "${BUNPRO_API_TOKEN}" }
    }
  }
}
```

- `--header` is documented with an `Authorization: Bearer` example, and header values accept `${VAR}` expansion ([claude-code-mcp]). I found no header-name approval rule on the page.
- Local and user scope servers live in `~/.claude.json`, and the page does not say static header values are encrypted ([claude-code-mcp]). Treat a literal value there as a plain file on disk. The `${BUNPRO_API_TOKEN}` form or a sensitive `userConfig` value avoids that.
- If the server rejects a configured `headers.Authorization`, Claude Code reports a failure and does not fall back to OAuth ([claude-code-mcp]).
- Local stdio also works today, with `BUNPRO_API_TOKEN` in the server's `env`. The MCP specification tells stdio implementations to take credentials from the environment ([mcp-auth]).

## What OAuth would require

Bunpro documents no OAuth flow for third-party apps (ADR-0003), and a public search on 2026-11-02 found none. A consent redirect to Bunpro is therefore impossible, and this MCP must be its own authorization server.

Requirements from Claude and the MCP specification:

- Answer unauthenticated requests with a 401 and `WWW-Authenticate: Bearer resource_metadata="..."` ([authentication]).
- Serve protected resource metadata whose `resource` equals `https://bunpro.yashkadam.com/mcp`, including the path ([authentication]).
- Serve authorization server metadata that advertises S256 PKCE ([authentication]).
- Identify Claude with a Client ID Metadata Document by advertising `client_id_metadata_document_supported: true` and `"none"` for token endpoint authentication, or expose a `registration_endpoint` ([authentication]). Revision `2026-07-28` deprecates Dynamic Client Registration ([mcp-auth-current]). Fetching client documents brings SSRF duties ([mcp-security-current]).
- Accept the redirect `https://claude.ai/api/mcp/auth_callback` for hosted apps, and loopback redirects on any port for both `localhost` and `127.0.0.1` for Claude Code ([authentication]).
- Accept `application/x-www-form-urlencoded` at `/token`, answer within 10 seconds, and answer refresh within 30 seconds ([authentication]).
- Validate that each access token was issued for this server ([mcp-auth-current]).
- Show the redirect hostname during authorization ([mcp-security-spec]), and protect the page against CSRF and framing ([mcp-security-current]). The specification words the CSRF and framing rules for proxy servers, and I apply them here as good practice.

Anthropic-held client credentials are not available to custom connectors ([directory-vs-custom]), so a custom connector must use a Client ID Metadata Document, Dynamic Client Registration, or a client ID the user enters ([authentication]).

## Can OAuth keep the server free of stored credentials?

Partly. No primary source documents the pattern below. It is my inference from the requirements above.

1. The learner pastes the Account API Token into a form at `/authorize`.
2. The server encrypts the token and the OAuth parameters with a server-held key, and returns the ciphertext as the authorization code.
3. `/token` decrypts the code, checks PKCE, and returns an access token that holds the encrypted Bunpro token, an audience, and an expiry.
4. On each `/mcp` request, the server decrypts the token in memory and calls Bunpro as it does today.

The server keeps no per-user record at rest, and Claude holds only ciphertext. The token sent to Bunpro stays separate from the token Claude presents, which resolves conflict 4 below. Rotating the Bunpro token still cuts off access.

The design has these costs:

- It requires an encryption key and a token-entry page. ADR-0004 rules out both by name.
- OAuth 2.1 says the server "MUST return an access token only once for a given authorization code" ([oauth21] section 4.1.3). A code that decrypts anywhere cannot enforce that alone, so the server needs a replay record. That record can hold a code ID and no credential, but it is still state.
- For public clients, OAuth 2.1 requires a way to detect refresh token replay ([oauth21] section 4.3.1), and the MCP specification requires rotation ([mcp-security-spec]). Claude treats DCR and CIMD clients as public ([authentication]). Rotation cannot be enforced without state.
- Issuing no refresh token is allowed, because "the AS retains discretion" ([mcp-auth-current]). The learner would then repeat the token entry at each expiry, or the access token would be long-lived against the advice to "issue short-lived access tokens" ([mcp-security-spec]).
- Rotating the server key disconnects every learner. Each self-hoster would need their own key.
- The operator trust boundary in ADR-0004 stays the same, since the server still sees the plaintext token in memory.
- Learners would paste a Bunpro secret into a page that Bunpro does not run. `AGENTS.md` forbids implying endorsement, so the page must not resemble a Bunpro login.

An external identity provider does not help. It yields an MCP identity, not a Bunpro token, so the server would have to map one to the other. That mapping is the credential database `AGENTS.md` forbids.

One undocumented variant is worth a test before anyone rules it in or out. The **Use your own OAuth client** fields are not described as beta ([add-unlisted]). A learner could enter the Bunpro token as the client secret, so the token never touches a server page or a redirect URL. The documentation does not say when Claude sends that secret. The variant misuses the field, still needs a server key, and on Team plans raises the same sharing question as request headers.

## Conflicts with ADR-0004

| # | ADR-0004 text | Path | Conflict |
| --- | --- | --- | --- |
| 1 | Context: "every caller can supply their own Account API Token through the MCP host's protected-header configuration" | Connectors on claude.ai, mobile, Desktop | This premise is false outside the beta, and it applies today with no change to the server. |
| 2 | Decision: `X-Bunpro-Token` is primary and Bearer is "backwards-compatible" | Request headers on connectors | Claude reverses the ranking. `authorization` is pre-approved, and `X-Bunpro-Token` needs Anthropic's approval. `SECURITY.md` ("retained only for backwards compatibility") and the Direct Token Passthrough entry in `CONTEXT.md` carry the same ranking. |
| 3 | Consequences: the server "naturally isolates callers because every request carries that caller's Bunpro credential" | Request headers on Team and Enterprise | An Owner's single value goes out for every member ([authentication]). This also breaks the `AGENTS.md` rule against a shared Bunpro token, even though the value sits in Claude and not in the deployment. |
| 4 | Title and Decision: direct passthrough of the token | Bearer header, any host | The MCP specification says "MCP servers **MUST NOT** accept or transit any other tokens" ([mcp-auth-current]) and calls token passthrough an anti-pattern ([mcp-security-current]). This is not a violation today, because MCP authorization is optional ([mcp-auth-current]) and the server does not claim to implement it. It becomes a real conflict if OAuth shares the `Authorization` header on the same endpoint. |
| 5 | Decision: "does not authenticate a separate MCP identity" and headers are "only protected transport containers" | OAuth | The server would become an OAuth resource server that validates tokens issued for it. |
| 6 | Decision: "No Auth0 tenant, account-link page, PostgreSQL database, encryption key, or disconnect tool" | OAuth | An encrypted-token design needs an encryption key and a token-entry page. An external provider needs a tenant and a credential mapping. |
| 7 | Decision: the server never "creates cookies" or "refreshes a session" | OAuth | A consent page may need a cookie, unless a signed form field covers CSRF. OAuth refresh adds a token lifecycle the ADR removed. |
| 8 | Consequences: "genuinely stateless". Also the Stateless MCP entry in `CONTEXT.md` | OAuth | Single-use codes and refresh rotation need server-side state, as shown above. |
| 9 | Direct Token Passthrough in `CONTEXT.md`: reads "exactly one of those values" | OAuth | Existing Bearer callers send a raw Bunpro token, while OAuth callers would send an access token. The server would have to tell them apart, or end the Bearer compatibility path. |

Related repository statements that OAuth would also contradict:

- `SECURITY.md` says "never put tokens in URLs". An encrypted code still carries the token in a redirect URL. Whether ciphertext counts is a human call, and holding the token in server memory instead would conflict with "never stores the token".
- `README.md` says the service "receives the token only in a protected request header". A form POST would change that, along with the matching text in `PRIVACY.md`.
- `docs/self-hosting.md` says the server needs no OAuth provider or encryption key.

These paths have no conflict with ADR-0004:

- A local `.mcpb` passing `BUNPRO_API_TOKEN` matches "Local stdio reads it from `BUNPRO_API_TOKEN`".
- Claude Code with either header matches the ADR, and a Bearer entry uses the compatibility path.
- A plugin `userConfig` value in Claude Code matches the ADR's host-held protected configuration.
- Request headers on a single-person account match the per-caller rule, apart from conflict 2.

## Reach by audience

This table gives #90 the reach of each path for its three audiences. It does not rank them.

| Audience | Claude Code | claude.ai web and mobile | Claude Desktop |
| --- | --- | --- | --- |
| The maintainer alone | Headers now | Beta if the account has it, otherwise OAuth | `.mcpb` or stdio, or a connector on the same terms as web |
| Community members who self-host | Headers now, with their own URL | Beta per account. OAuth means each host runs a key and an authorization server. | `.mcpb` needs no hosting at all |
| All hosted service users | Headers now | OAuth. Directory per-person headers are out of scope for #80. | `.mcpb` runs locally and bypasses the hosted service |

## Limitations

- I could not see whether any account has the beta, or whether `x-bunpro-token` is approved. Opening **Add custom connector** on the maintainer's account answers the first question.
- Request headers on mobile are inferred from the shared infrastructure. No page states it directly.
- The chat behaviour of a plugin entry with `${user_config.*}` only in `headers` is undocumented. The table covers only a reference in the URL.
- I found no statement on whether `userConfig` prompts for a plugin synced from claude.ai ([loading]).
- I found no statement on how Claude treats an OAuth token response with no refresh token or no expiry. `getting-started` says a connector that loses access shows **Reconnect**.
- The server's 401 reading comes from source code. I did not probe the hosted service.

Public sources disagree in these places:

- The support article shows **Request headers** in the setup steps and does not mention a beta ([support-remote]). The claude.com docs state the beta plainly, and I treat that as binding.
- `authentication` says an organization Owner enters the static credential. `add-unlisted` describes the same dialog for individual plans.
- Header-name approval goes through `mcp-review@anthropic.com` in `authentication` and through Claude support in `add-unlisted`.
- The MCPB page says Claude Desktop runs on macOS and Windows ([mcpb]), while the support article mentions a Linux keychain manager ([support-local]).
- The MCPB manifest says only "store securely" ([mcpb-manifest]). The operating system storage detail comes from the support article and the [desktop extensions post][desktop-extensions].
- Claude's docs cite MCP revision `2025-11-25`, while the current revision is `2026-07-28` ([mcp-versioning]). The token passthrough rule appears in both.
- `https://claude.com/docs/connectors/custom/remote-mcp` returned the same content as `add-unlisted`, so I cite the latter.

## Sources

Retrieved 2026-11-02.

Claude documentation:

- [Add a connector that isn't in the directory][add-unlisted]
- [Authentication for connectors][authentication]
- [Directory connectors vs custom connectors][directory-vs-custom]
- [Build a desktop extension with MCPB][mcpb]
- [Plugin structure and testing][plugin-build]
- [Plugin feature support across platforms][platform-support]
- [Decide what to include in your plugin][what-to-build]
- [Get started with connectors][getting-started]
- [Submit a connector to the directory][submission]
- [Connector pre-submission checklist][review-criteria]
- [Get started with MCP Apps][mcp-apps]
- [MCP tunnels][tunnels]
- [Claude Code MCP][claude-code-mcp]
- [Claude Code plugin manifest reference][manifest]
- [Claude Code plugin components][components]
- [Claude Code plugin loading reference][loading]
- [Custom connectors using remote MCP, support article][support-remote]
- [Local MCP servers on Claude Desktop, support article][support-local]
- [Desktop Extensions engineering post][desktop-extensions]

Specifications:

- [MCPB manifest][mcpb-manifest]
- [MCP versioning][mcp-versioning]
- [MCP authorization 2026-07-28][mcp-auth-current]
- [MCP authorization security considerations 2026-07-28][mcp-security-spec]
- [MCP security best practices 2026-07-28][mcp-security-current]
- [MCP authorization 2025-11-25][mcp-auth]
- [OAuth 2.1 draft 13][oauth21]

Repository:

- `AGENTS.md`, `CONTEXT.md`, `PRIVACY.md`, `README.md`, `SECURITY.md`
- `docs/adr/0003-public-multi-user-remote-mcp.md`
- `docs/adr/0004-direct-account-token-passthrough.md`
- `docs/self-hosting.md`
- `src/http-server.ts`

[add-unlisted]: https://claude.com/docs/connectors/custom/add-unlisted.md
[authentication]: https://claude.com/docs/connectors/building/authentication.md
[directory-vs-custom]: https://claude.com/docs/connectors/building/directory-vs-custom.md
[mcpb]: https://claude.com/docs/connectors/building/mcpb.md
[plugin-build]: https://claude.com/docs/plugins/build.md
[platform-support]: https://claude.com/docs/plugins/platform-support.md
[what-to-build]: https://claude.com/docs/connectors/building/what-to-build.md
[getting-started]: https://claude.com/docs/connectors/getting-started.md
[submission]: https://claude.com/docs/connectors/building/submission.md
[review-criteria]: https://claude.com/docs/connectors/building/review-criteria.md
[mcp-apps]: https://claude.com/docs/connectors/building/mcp-apps/getting-started.md
[tunnels]: https://claude.com/docs/connectors/mcp-tunnels/overview.md
[claude-code-mcp]: https://code.claude.com/docs/en/mcp
[manifest]: https://code.claude.com/docs/en/plugins/manifest-reference
[components]: https://code.claude.com/docs/en/plugins/components
[loading]: https://code.claude.com/docs/en/plugins/loading
[support-remote]: https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp
[support-local]: https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop
[desktop-extensions]: https://www.anthropic.com/engineering/desktop-extensions
[mcpb-manifest]: https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md
[mcp-versioning]: https://modelcontextprotocol.io/specification/versioning
[mcp-auth-current]: https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
[mcp-security-spec]: https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization/security-considerations
[mcp-security-current]: https://modelcontextprotocol.io/docs/2026-07-28/tutorials/security/security_best_practices
[mcp-auth]: https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
[oauth21]: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-13
