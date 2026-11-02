# Claude plugin packaging from this repository

Research date: 2026-11-02

Ticket: [#83](https://github.com/yash-278/bunpro-mcp/issues/83), on map [#80](https://github.com/yash-278/bunpro-mcp/issues/80).

> [!NOTE]
> This note records what the format allows. It does not choose the plugin's contents, name, or layout. Those decisions belong to a later ticket. Anthropic directory submission exists but is out of scope, so directory rules appear only where they explain a behavior.

## Question

What can a Claude plugin installed from this public GitHub repository carry, and how does each part behave in claude.ai chat, Cowork and Claude Code?

## Decision-ready answer

A plugin from this repository can carry the connector entry, skills and commands on all three surfaces, and agents and hooks on Cowork and Claude Code. One repository can hold the plugin next to the server source. Users add it as a Git marketplace with `owner/repo` shorthand, in **Customize > Plugins** or in Claude Code.

The packaging works. The credential does not work everywhere:

- **Claude Code has a documented per-user path.** A `sensitive` `userConfig` option prompts the user, stores the value in the platform's secure credential store, and substitutes it into the remote server's `headers`. That matches `X-Bunpro-Token` directly.
- **Chat and Cowork have no general per-user path for this server today.** Their documented per-user path is OAuth, and this server has no OAuth. Their request-header path is a beta for a limited set of organizations, and the docs describe it as an organization credential, which on a Team or Enterprise plan would mean one Bunpro token for every member. Chat and Cowork do not prompt for `userConfig`.

The gap belongs to the connector, not the plugin. Rich widgets come from MCP Apps on the server (map #80), so the same gap also applies to Study Views on claude.ai. A later ticket has to resolve it before the plugin can promise working tools in chat or Cowork.

## What a plugin can carry

### Folder layout

A plugin is a folder with a manifest at `.claude-plugin/plugin.json` and component directories beside it. Only the manifest goes inside `.claude-plugin/` ([Plugin structure and testing](https://claude.com/docs/plugins/build.md#lay-out-the-plugin-folder)).

```text
<plugin>/
├── .claude-plugin/
│   └── plugin.json
├── .mcp.json
├── skills/
│   └── <skill-name>/
│       ├── SKILL.md
│       └── references/
├── commands/
│   └── <command>.md
├── agents/
│   └── <agent>.md
├── hooks/
│   └── hooks.json
├── README.md
└── LICENSE
```

The [standard layout](https://code.claude.com/docs/en/plugins/manifest-reference.md#standard-layout) also lists `.lsp.json`, `output-styles/`, `workflows/`, `themes/`, `monitors/monitors.json`, `settings.json` and `bin/`. Those are Claude Code features, and a top-level `bin/` stops claude.ai and Cowork from installing the plugin at all ([component support table](https://claude.com/docs/plugins/platform-support.md#compare-component-support-by-app)).

A skill folder can hold `references/`, `assets/` and `scripts/`, and `SKILL.md` has to mention each file so Claude knows when to load it ([build docs](https://claude.com/docs/plugins/build.md#folder-layout)). The Claude Code manifest reference says to prefer `skills/` over `commands/` for new plugins ([standard layout](https://code.claude.com/docs/en/plugins/manifest-reference.md#standard-layout)).

A `CLAUDE.md` at the plugin root is not loaded as context, and `claude plugin validate` warns about it ([standard layout](https://code.claude.com/docs/en/plugins/manifest-reference.md#standard-layout)).

### Manifest fields

`name` is the only required key in `plugin.json` for Claude Code, which can also load a plugin with no manifest ([manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference.md#fields)). For chat and Cowork, the upload path expects `.claude-plugin/plugin.json` in the archive ([test docs](https://claude.com/docs/plugins/build.md#test-the-plugin-on-each-surface)), and the build docs list these as the fields every surface reads:

```json
{
  "name": "example-plugin",
  "displayName": "Example Plugin",
  "version": "1.0.0",
  "description": "What the plugin does.",
  "author": { "name": "Example Maintainer", "url": "https://example.com" },
  "license": "MIT"
}
```

| Field | What matters here |
| --- | --- |
| `name` | Permanent identity. Kebab-case, namespaces every component, and should never change after release ([build docs](https://claude.com/docs/plugins/build.md#write-the-manifest)). |
| `displayName` | UI label. Safe to change later. |
| `version` | Not checked against semver. Setting it pins users until it changes (see [Updates](#how-updates-reach-installed-users)). |
| `description` | Shown before install. |
| `author`, `homepage`, `repository`, `license`, `keywords` | Metadata. `homepage` must parse as a URL or the plugin fails to load. |
| `userConfig` | Values Claude Code prompts for. Strict schema: an unknown key inside an option fails validation. See [Per-user credential](#how-a-user-supplies-a-per-user-credential). |
| `skills`, `commands`, `agents`, `hooks`, `mcpServers`, `outputStyles`, `workflows`, `lspServers` | Component paths or inline definitions, needed only when a component sits outside its default location. |
| `dependencies`, `defaultEnabled`, `settings`, `metadata`, `channels`, `types`, `experimental` | Claude Code behavior and author data. |
| `icon`, `documentationUrl`, `supportUrl`, `privacyPolicyUrl`, `termsOfServiceUrl` | Directory listing fields. Claude Code ignores them at load time. |

An unrecognized top-level key is stripped and the plugin still loads ([unrecognized fields](https://code.claude.com/docs/en/plugins/manifest-reference.md#unrecognized-fields)).

The validator refuses plugin names that start with `claude-`, `anthropic-`, `anthropics-` or `cc-plugin-`, and warns when `claude` or `anthropic` appears as a whole word elsewhere in the name ([name rules](https://code.claude.com/docs/en/plugins/manifest-reference.md#name)). This matters for the repository's rule against implying endorsement.

### Marketplace file

A plugin reaches users from GitHub through a marketplace: a repository with `.claude-plugin/marketplace.json` that lists plugins and where to fetch each one ([Create a marketplace](https://code.claude.com/docs/en/plugins/create-marketplace.md)). The file requires `name`, `owner` and `plugins`. Each plugin entry requires `name` and `source` ([marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference.md#top-level-fields)).

```json
{
  "name": "example-marketplace",
  "description": "Example catalog",
  "owner": { "name": "Example Maintainer" },
  "plugins": [
    {
      "name": "example-plugin",
      "source": "./plugins/example-plugin",
      "description": "What the plugin does."
    }
  ]
}
```

Rules that apply to this repository:

- The default file location is `.claude-plugin/marketplace.json`. Keeping it elsewhere forces users to declare it in `extraKnownMarketplaces`, because `claude plugin marketplace add` has no option for it ([marketplace file](https://code.claude.com/docs/en/plugins/marketplace-reference.md#marketplace-file)).
- Relative sources resolve from the directory that contains `.claude-plugin/`. They must start with `./` and cannot contain `..`.
- Keep the entry `name` and the `plugin.json` `name` identical. A mismatch is a common cause of failed installs ([entry rules](https://code.claude.com/docs/en/plugins/create-marketplace.md#keep-the-entry-name-and-the-manifest-name-the-same)).
- Do not set `version` in both the entry and `plugin.json` ([release docs](https://code.claude.com/docs/en/plugins/host-marketplace.md#release-a-new-version)).
- Marketplace names such as `claude-plugins-official`, impersonating names, `github` and `npm` are reserved ([reserved names](https://code.claude.com/docs/en/plugins/marketplace-reference.md#reserved-names)).

Users install it this way:

| Where | Steps |
| --- | --- |
| claude.ai, desktop app, Cowork | **Customize > Plugins > Add > Add marketplace**, enter `owner/repo`, then add the plugin ([overview](https://claude.com/docs/plugins/overview.md#find-and-add-a-plugin)). The install is saved to the account and also reaches Claude Code as `<name>@synced`. |
| Claude Code | `/plugin marketplace add owner/repo`, then `/plugin install <entry>@<marketplace>` ([host docs](https://code.claude.com/docs/en/plugins/host-marketplace.md#host-your-marketplace)). The install stays on that machine and is not added to the account. |

Marketplaces added from a URL or file are not covered by Anthropic's review, so the docs tell users to add them only from sources they trust ([overview](https://claude.com/docs/plugins/overview.md#before-you-add-a-plugin)). Limits for chat and Cowork are 200 MB and 5,000 files per plugin, 512 MB for the marketplace repository archive, and 25 self-added marketplaces ([Cowork limits](https://claude.com/docs/cowork/guide/plugins.md#limits)).

On Team and Enterprise plans, an Owner controls which sources members see and whether they can add their own ([overview](https://claude.com/docs/plugins/overview.md#before-you-add-a-plugin)).

## How a plugin bundles a remote MCP connector

A plugin references a remote server by URL in `.mcp.json` at the plugin root. It does not contain the server ([bundle a connector](https://claude.com/docs/plugins/build.md#bundle-an-mcp-connector-with-its-skill)):

```json
{
  "mcpServers": {
    "example": {
      "type": "http",
      "url": "https://mcp.example.com/mcp"
    }
  }
}
```

What happens next depends on the surface:

- **Claude Code** connects to the server when the plugin is enabled. The server appears as `plugin:<plugin>:<server>`, and its tools as `mcp__plugin_<plugin>_<server>__<tool>`. Permission rules and skill `allowed-tools` lists must use that full name ([MCP docs](https://code.claude.com/docs/en/mcp.md#plugin-provided-mcp-servers)).
- **Chat and Cowork** list the entry on the plugin's **Connectors** tab. Adding a plugin does not add a connector or sign the user in to anything ([bundled connectors](https://claude.com/docs/plugins/overview.md#bundled-connectors)). The tab shows **Connected**, **Not connected** or **Not added**.
- **A URL outside the directory**, which applies here, is added as a custom connector from that tab and carries the **Custom** label. On Team and Enterprise plans an Owner adds it, and members then connect with their own account ([package and list](https://claude.com/docs/connectors/building/what-to-build.md#package-and-list-the-plugin)).

The plugin's skills load whether or not the connector is connected, but a skill cannot reach the service until the connector shows **Connected** ([bundled connectors](https://claude.com/docs/plugins/overview.md#bundled-connectors)).

Every installer receives the plugin's files, so `.mcp.json` must never hold a key or other secret ([build docs](https://claude.com/docs/plugins/build.md#bundle-an-mcp-connector-with-its-skill)).

MCP Apps are not a plugin component. They are UI on the server, and they "reach people the same way the rest of your plugin's connector does" ([MCP Apps](https://claude.com/docs/connectors/building/mcp-apps/getting-started.md)). This matches the standing decision on map #80.

## How a user supplies a per-user credential

Install is not one step across surfaces. The credential has a different path on each, and only Claude Code's matches this server as it stands.

### This server's contract

Confirmed in this repository:

- `src/http-server.ts:262-287` reads the token from `X-Bunpro-Token`, or from `Authorization: Bearer <token>`, and rejects a request that carries both.
- `src/http-server.ts:226-235` answers any `/mcp` POST without a valid credential with HTTP 401 and a JSON body. That includes `initialize`, so an unauthenticated client cannot list tools.
- `src/` contains no OAuth endpoints, discovery metadata or `WWW-Authenticate` header.
- [ADR-0004](../adr/0004-direct-account-token-passthrough.md) says the remote server does not authenticate a separate MCP identity, and it removed the Auth0 tenant, account-link page and credential database from the target system.
- `AGENTS.md` forbids a shared Bunpro token or a credential database on a hosted deployment. The README forbids putting the token in a chat, prompt, URL or tool argument.

### Comparison by surface

| Surface | Documented mechanism | Each user's own token? | Works with this server today? |
| --- | --- | --- | --- |
| Claude Code, marketplace install through `/plugin` | `userConfig` with `sensitive: true`, referenced as `${user_config.KEY}` in `headers` | Yes | Yes, by documentation. The fixture below validated. No live connection was tested. |
| Claude Code, shell environment | `${VAR}` expansion in `headers` | Yes | Yes, by documentation, with no prompt. The user manages the variable. |
| Chat and Cowork, OAuth | Sign-in through the server's OAuth flow | Yes | No. The server has no OAuth. |
| Chat, **No sign-in** plus **Request headers** | Beta. The credential is entered when the connector is added | Personal plan: yes, by inference. Team or Enterprise: no, one key for the organization | Only with beta access. Conflicts with the per-user rule on shared plans. |
| Chat and Cowork, `userConfig` | Not prompted | Not applicable | No |
| Token in the connector URL | Prohibited by the docs and the README | Not applicable | No |
| Claude Desktop, separate MCPB extension | Local server with `user_config` | Yes | Outside the plugin. Desktop only, and it depends on the local stdio mode. |

### Claude Code

`userConfig` is the documented path ([configuration values](https://code.claude.com/docs/en/plugins/components.md#ask-the-user-for-configuration-values)). `sensitive: true` masks input and stores the value in the platform's secure credential store rather than `settings.json` ([where values are stored](https://code.claude.com/docs/en/plugins/manifest-reference.md#where-values-are-stored)). `${user_config.KEY}` is substituted in MCP server config, and `headers` is a resolved field for `http`, `sse` and `ws` servers ([reference a saved value](https://code.claude.com/docs/en/plugins/manifest-reference.md#reference-a-saved-value), [where each variable resolves](https://code.claude.com/docs/en/plugins/manifest-reference.md#where-each-variable-resolves)).

```json
{
  "userConfig": {
    "example_token": {
      "type": "string",
      "title": "Example token",
      "description": "Your own token",
      "sensitive": true,
      "required": true
    }
  }
}
```

```json
{
  "mcpServers": {
    "example": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": { "X-Example-Token": "${user_config.example_token}" }
    }
  }
}
```

Limits and traps:

- The dialog appears when installing through `/plugin`, when running `/plugin install` in a session, and when enabling from the **Installed** tab. `/plugin configure <plugin>@<marketplace>` reopens it. The VS Code extension shows a form after install ([dialog timing](https://code.claude.com/docs/en/plugins/components.md#when-the-configuration-dialog-appears)).
- `claude plugin install` in a shell never prompts. Its `--config KEY=VALUE` flag would put a token in shell history, which conflicts with the README's handling rules. `claude plugin configure <id> --values-stdin` reads from a file instead, but that file then holds the token ([plugin configure](https://code.claude.com/docs/en/plugins/cli-reference.md#plugin-configure)). The interactive dialog is the path that avoids both.
- `--plugin-dir` does not show the dialog ([create docs](https://code.claude.com/docs/en/plugins/create.md#the-userconfig-dialog-never-appears)).
- `headersHelper` rejects `${user_config.*}` ([fields that run through a shell](https://code.claude.com/docs/en/plugins/manifest-reference.md#fields-that-run-through-a-shell)).
- Sensitive values are not substituted into skill or agent content, where they become a placeholder ([reference a saved value](https://code.claude.com/docs/en/plugins/manifest-reference.md#reference-a-saved-value)).
- `${VAR}` expansion works in `headers`, and names such as `ANTHROPIC_API_KEY` and `NPM_TOKEN` read as empty, while other names expand as written ([credential variables](https://code.claude.com/docs/en/mcp.md#credential-variables-that-read-as-empty)). The directory checklist holds a plugin that reads a credential from the environment for review ([checklist](https://claude.com/docs/plugins/pre-submission-checklist.md)). That rule does not bind a GitHub install, but it shows Anthropic's preference.

### Chat

The docs offer three authentication types for a connector: OAuth, a static credential, or none ([Authentication for connectors](https://claude.com/docs/connectors/building/authentication.md)).

**OAuth.** This is the documented per-user answer: "If each person needs to sign in with their own account, use OAuth instead" ([request headers](https://claude.com/docs/connectors/custom/add-unlisted.md#authenticate-with-request-headers)). The plugin docs assume it: the user "signs in through your server's OAuth flow". Sign-in starts from a `401` whose `WWW-Authenticate` header points at discovery metadata ([discovery](https://claude.com/docs/connectors/building/authentication.md#serve-discovery-metadata)). This server's `401` carries no such header and it serves no metadata, so by inference sign-in cannot complete. Adding OAuth would mean a new ADR, because ADR-0004 removed that layer.

**Request headers.** The **Add custom connector** dialog can store a fixed credential and send it on every request, with these constraints ([request headers](https://claude.com/docs/connectors/custom/add-unlisted.md#authenticate-with-request-headers)):

- It is in beta for a limited set of organizations. If the section is missing, the organization has no access.
- Anthropic reviews custom header names. `authorization`, `x-api-key` and `x-auth-token` work for every connector, so `X-Bunpro-Token` would need approval, and an unapproved name is rejected at save.
- This server also accepts `Authorization: Bearer`, and Claude sends the value exactly as entered, so the user would enter `Bearer ` plus the token. That route avoids the approval step.
- Authentication settings cannot change after the connector is added. A rotated token means removing the connector and adding it again.
- The docs describe it as a shared credential: "Treat it as the organization's credential, not a person's" ([static credentials](https://claude.com/docs/connectors/building/authentication.md#static-credentials-in-request-headers)). On Team and Enterprise plans an Owner enters it and every member's requests carry the same key, which would break the repository's per-user rule. On a personal plan the account holder enters their own token, so the rule holds by inference, if the account has beta access.
- Claude stores the key as the connector's credential. The server stays stateless, but `PRIVACY.md` and the setup docs would need to say where the token lives.

**`userConfig`.** The support table marks a chat server as ignored when its URL contains a `${user_config.*}` reference ([component support](https://claude.com/docs/plugins/platform-support.md#compare-component-support-by-app)). It says nothing about a reference that appears only in `headers`, but no chat prompt for these values is documented.

### Cowork

Cowork uses the same **Connectors** tab, so OAuth and request headers carry the same limits ([Cowork plugins](https://claude.com/docs/cowork/guide/plugins.md#install-a-plugin)). A server that references `${user_config.*}` is ignored when a referenced option has no default, because "Cowork doesn't prompt for values" ([component support](https://claude.com/docs/plugins/platform-support.md#compare-component-support-by-app)). A default value is not a way out, since it would be a shared token in a public file.

A local stdio server does load in a Cowork session on the user's computer, but the same `${user_config.*}` rule applies, and no other way to hand it a per-user secret is documented.

### Desktop extension, outside the plugin

A `.mcpb` extension installed in the Claude desktop app gets a settings UI from its `user_config` section ([MCPB docs](https://claude.com/docs/connectors/building/mcpb.md#user-configuration)), and the [manifest spec](https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md) masks and securely stores `sensitive` values and suggests passing them through environment variables. This repository's stdio mode already reads `BUNPRO_API_TOKEN`. The extension runs in Desktop only, users install the file themselves, and a `.mcpb` inside a plugin is ignored in chat. The MCP Apps quickstart runs example servers locally in Claude Desktop, so a local server can render UI there, by inference from those examples.

## Whether one repository can hold the plugin next to the server source

Yes. The docs describe "a repository that is both a project and a plugin" ([submodules](https://code.claude.com/docs/en/plugins/marketplace-reference.md#git-submodules-in-the-marketplace-repository)), and relative sources are the documented choice for a plugin inside the marketplace repository ([plugin sources](https://code.claude.com/docs/en/plugins/marketplace-reference.md#plugin-sources)).

A plugin can sit in a subfolder or at the repository root. The two differ here:

| | Subfolder, for example `./plugins/<name>` | Repository root, `"source": "./"` |
| --- | --- | --- |
| Files users receive | Only the plugin directory is copied to the cache ([copied plugins](https://code.claude.com/docs/en/plugins/loading.md#in-place-and-copied-plugins)) | All tracked files, including `src/`, `tests/` and `docs/` |
| Dependency install | None, unless the plugin adds its own `package.json` | Runs automatically. This repository has `package.json` and `package-lock.json` at the root, and no setting disables the install ([Node dependencies](https://code.claude.com/docs/en/plugins/loading.md#nodejs-package-dependencies)) |
| `.mcp.json` | Inside the plugin folder | At the repository root, where it would also act as the project-scope config for contributors |
| `bin/` | No effect at the repository root | A future top-level `bin/` would stop chat and Cowork installs |
| Marketplace clone | Claude Code clones the whole tree for a Git marketplace ([host docs](https://code.claude.com/docs/en/plugins/host-marketplace.md#avoid-relative-path-entries-in-a-url-hosted-marketplace)). The repository has 64 tracked files, well inside the limits | Same |

Confirmed in this repository, a plugin folder would not change the server's builds. The `Dockerfile` copies only `package.json`, `package-lock.json`, `tsconfig.json` and `src`. The npm `files` allowlist in `package.json` includes only `dist`, `README.md` and `LICENSE`. There is no top-level `bin/` directory today, and `package.json`'s `bin` field is a different thing.

Files outside the plugin directory are not copied, and a component path that escapes the plugin root is rejected, so a plugin cannot reuse files from `docs/` or `src/` at runtime ([paths that escape](https://code.claude.com/docs/en/plugins/loading.md#paths-that-escape-the-plugin-directory)).

For claude.ai, the closest public evidence on relative sources is organization sync, which accepts a relative path that starts with `./` and rejects a bare name under `metadata.pluginRoot` ([org sync](https://claude.com/docs/plugins/org-sync.md#plugin-sources-that-organization-sync-accepts)). The docs do not state source rules for a personal **Add marketplace**. Organization sync itself requires a private or internal repository on github.com, so it does not apply to this public one.

## How updates reach installed users

The plugin and the server update separately. Tools added to the server "reach every plugin that references it without a new plugin release" ([what to build](https://claude.com/docs/connectors/building/what-to-build.md#reach-your-product-with-an-mcp-connector)). The same holds for MCP Apps on the server, by inference. Only plugin files, such as skills and commands, need a plugin update.

| Install path | How a new version arrives | Default | When it takes effect |
| --- | --- | --- | --- |
| Chat and Cowork, marketplace added from github.com | **Check for updates** on the marketplace, or the per-user **Sync automatically** toggle ([manage plugins](https://claude.com/docs/plugins/overview.md#manage-installed-plugins)) | Not stated. The toggle is described as something the user can turn on | After a sync, applied to the account with nothing to accept. Cowork loads it at the next task |
| Claude Code, `<name>@synced` | Background sync at each start, while signed in with the claude.ai account ([synced plugins](https://code.claude.com/docs/en/plugins/loading.md#plugins-synced-from-claudeai)) | On, from v2.1.273 | `/reload-plugins` or the next start |
| Claude Code, marketplace install | `/plugin marketplace update <name>` or `claude plugin update <plugin>@<name>`, or the per-user **Enable auto-update** toggle ([keep users up to date](https://code.claude.com/docs/en/plugins/host-marketplace.md#keep-users-up-to-date)) | Auto-update off. `marketplace.json` has no field to change that | `/reload-plugins` or the next launch |

A Claude Code user gets a new copy only when the computed version changes. The order is the `plugin.json` `version`, then the marketplace entry's `version`, then for a relative path in a Git-hosted marketplace, the commit SHA of the installed directory ([versions and updates](https://code.claude.com/docs/en/plugins/loading.md#versions-and-updates)). So there are two valid release styles:

- Bump `version` on every release. Pushing commits without a bump delivers nothing.
- Omit `version` everywhere, so users track commits.

The claude.com build docs say to raise `version` on every release ([write the manifest](https://claude.com/docs/plugins/build.md#write-the-manifest)). They do not say whether an unchanged `version` blocks a chat or Cowork sync.

Skew is likely (inference). A hosted server deploy reaches everyone at once, while a Claude Code user with auto-update off keeps old skills until they update. A skill that names a renamed tool would fail for that user, and the docs give no way to force an update on a third-party marketplace.

Removing or renaming a plugin has its own support: `renames` and `forceRemoveDeletedPlugins` in `marketplace.json` ([top-level fields](https://code.claude.com/docs/en/plugins/marketplace-reference.md#top-level-fields)). Cowork warns before an update overwrites locally edited plugin files ([Cowork plugins](https://claude.com/docs/cowork/guide/plugins.md#update-and-remove-plugins)).

## Component support by surface

Chat means claude.ai on web, desktop and mobile. Cowork means tasks in the desktop app. Claude Code means the terminal, IDE extensions and the desktop app's Code tab. Source: [Plugin feature support across platforms](https://claude.com/docs/plugins/platform-support.md#compare-component-support-by-app), except where the last column cites another page.

| Component | Chat | Cowork | Claude Code | Notes for this repository |
| --- | --- | --- | --- | --- |
| Skills, `skills/<name>/SKILL.md` | Loads | Loads | Loads | Loads even when the connector is not connected. |
| Commands, `commands/*.md` | Loads as a skill, which Claude applies when it fits | Loads, run as `/plugin-name:command` | Loads | Chat also lists commands in the `/` menu ([use a plugin](https://claude.com/docs/plugins/overview.md#use-a-plugin)). |
| Agents, `agents/*.md` | Ignored | Loads | Loads | |
| Hooks, `hooks/hooks.json` | Ignored | Loads | Loads | Hooks run commands on the user's computer ([overview](https://claude.com/docs/plugins/overview.md#before-you-add-a-plugin)). |
| Remote MCP server with a fixed URL | Listed on **Connectors**, works once added or connected | Loads, connect from **Connectors** | Loads | Requires a credential path. See [Per-user credential](#how-a-user-supplies-a-per-user-credential). |
| Local MCP server, including `.mcpb` | Ignored | Loads when the session runs on the user's computer | Loads | |
| Server that references `${user_config.*}` | Ignored when the URL contains the reference | Ignored when a referenced option has no default | Loads and prompts | A token has no safe default. |
| Top-level `bin/` | Can't be installed | Can't be installed | Loads | Refuses the whole plugin on two surfaces. |
| LSP servers, output styles, themes, `settings` | Ignored | Ignored | Loads | |
| MCP App UI on the server | Renders inline ([MCP Apps](https://claude.com/docs/connectors/building/mcp-apps/getting-started.md), [design guidelines](https://claude.com/docs/connectors/building/mcp-apps/design-guidelines.md)) | Not stated | Not stated as rendering. Claude Code excludes UI resources from `@` suggestions and the resource list ([MCP docs](https://code.claude.com/docs/en/mcp.md)) | Server feature, not a plugin component. Ticket #53 owns widget design. |

Installs do not travel both ways. An account install reaches Claude Code as a synced plugin, but a command-line install stays on that machine ([compare installation](https://claude.com/docs/plugins/platform-support.md#compare-installation-sync-and-admin-controls)). A cloud session, including the browser at claude.ai/code, does not load plugins installed on the user's own machine ([install docs](https://code.claude.com/docs/en/plugins/install.md)).

Terminal sync does not run in every session. It needs a claude.ai sign-in, so sessions using `ANTHROPIC_AUTH_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN` or an `apiKeyHelper` do not load synced plugins ([sign-in requirements](https://code.claude.com/docs/en/plugins/loading.md#plugins-synced-from-claudeai)).

## Implementation consequences

These are constraints for the later spec. None of them chooses the plugin's contents.

- A skills-and-commands package works on all three surfaces with no server change.
- Only Claude Code has a documented token path that fits ADR-0004 without changes.
- Working tools or Study Views on claude.ai for ordinary users need one of these, each a human decision: OAuth on the server through a new ADR, a documented limit to request-header beta accounts, or a Desktop-only local path.
- A plugin at this repository's root would trigger an automatic dependency install of the server's packages. A subfolder avoids it.
- `.mcp.json` must stay free of tokens in every variant.
- A release needs a version policy, because a pinned `version` without a bump delivers nothing to Claude Code users.

## Method and sources

Read on 2026-11-02 from public documentation, using the raw Markdown pages from the docs indexes at [claude.com/docs/llms.txt](https://claude.com/docs/llms.txt) and [code.claude.com/docs/llms.txt](https://code.claude.com/docs/llms.txt):

- [Connectors, skills, and plugins](https://claude.com/docs/extend/overview.md)
- [Plugins overview](https://claude.com/docs/plugins/overview.md), [Build your first plugin](https://claude.com/docs/plugins/quickstart.md), [Plugin structure and testing](https://claude.com/docs/plugins/build.md), [Plugin feature support](https://claude.com/docs/plugins/platform-support.md), [Share a plugin](https://claude.com/docs/plugins/share.md), [Organization sync](https://claude.com/docs/plugins/org-sync.md), [Pre-submission checklist](https://claude.com/docs/plugins/pre-submission-checklist.md)
- [Decide what to include](https://claude.com/docs/connectors/building/what-to-build.md), [Add an unlisted connector](https://claude.com/docs/connectors/custom/add-unlisted.md), [Authentication for connectors](https://claude.com/docs/connectors/building/authentication.md), [MCP Apps](https://claude.com/docs/connectors/building/mcp-apps/getting-started.md), [MCPB](https://claude.com/docs/connectors/building/mcpb.md)
- [Cowork plugins](https://claude.com/docs/cowork/guide/plugins.md)
- Claude Code: [components](https://code.claude.com/docs/en/plugins/components.md), [manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference.md), [create a marketplace](https://code.claude.com/docs/en/plugins/create-marketplace.md), [marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference.md), [host a marketplace](https://code.claude.com/docs/en/plugins/host-marketplace.md), [loading](https://code.claude.com/docs/en/plugins/loading.md), [install](https://code.claude.com/docs/en/plugins/install.md), [plugin commands](https://code.claude.com/docs/en/plugins/cli-reference.md), [troubleshooting](https://code.claude.com/docs/en/plugins/troubleshooting.md), [MCP](https://code.claude.com/docs/en/mcp.md)

Repository evidence came from `src/http-server.ts`, `README.md`, `AGENTS.md`, `docs/adr/0004-direct-account-token-passthrough.md`, `Dockerfile` and `package.json`.

One local check: Claude Code 2.1.316 ran `claude plugin validate` on a synthetic fixture in a temporary directory outside the repository. The fixture had a root `.claude-plugin/marketplace.json`, a root `package.json`, a `src/` folder, and a subfolder plugin with a `sensitive` `userConfig` option referenced from an `http` server's `headers` at `mcp.example.com`. Both the plugin and the marketplace returned `Validation passed with warnings`, and the warnings covered missing optional metadata and directory listing items. This confirms the schema only. It connected to nothing.

No authenticated Bunpro route, hosted server request, real token or account data was used. No Claude surface was tested with a live install.

## Remaining uncertainty

- Whether a chat plugin's **Connectors** tab offers **Request headers** when it adds a custom connector. The docs describe that section only in the **Add custom connector** dialog.
- Whether a chat server that references `${user_config.*}` only in `headers` is listed, ignored or broken. The support table covers only a reference in the URL.
- How a `<name>@synced` plugin gets its `userConfig` values in Claude Code. `/plugin configure` is documented with a `<plugin>@<marketplace>` id, and the support table says Claude Code prompts, but neither addresses synced plugins.
- What Claude Code sends when a `${user_config.*}` used in `headers` is unset. Troubleshooting covers the `url` case only.
- Which plans can use **Add marketplace**. The docs state plans for the directory and for custom connectors, where the Free plan gets one custom connector, but not for this path.
- Whether beta request headers are available to personal plans. The docs say "a limited set of organizations".
- Whether an unchanged `version` blocks a chat or Cowork marketplace sync, and whether **Sync automatically** starts on or off.
- Whether MCP Apps render in Cowork. The public pages reviewed do not say. Claude Code rendering is also not stated.
- Whether an OAuth layer could stay stateless under ADR-0004. The docs do not cover this and it was not evaluated.
- These docs change often. Recheck the support table and the beta status before the build.
