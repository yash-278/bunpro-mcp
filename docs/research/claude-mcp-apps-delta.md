# Claude MCP Apps delta for Study Views

Research date: 2026-11-02

Issue: [#82](https://github.com/yash-278/bunpro-mcp/issues/82). Baseline: the [ChatGPT Study View integration contract](https://github.com/yash-278/bunpro-mcp/blob/research/chatgpt-study-view-contract/docs/research/chatgpt-study-view-contract.md) (the "baseline" below), plus the decisions recorded on [#56](https://github.com/yash-278/bunpro-mcp/issues/56) and [#62](https://github.com/yash-278/bunpro-mcp/issues/62).

This note reports differences only. It does not decide the rollout, which belongs to [#93](https://github.com/yash-278/bunpro-mcp/issues/93) and [#59](https://github.com/yash-278/bunpro-mcp/issues/59). Authentication belongs to [#81](https://github.com/yash-278/bunpro-mcp/issues/81) and [#90](https://github.com/yash-278/bunpro-mcp/issues/90), so this note covers only how it affects rendering.

## Question

What does Claude require of an MCP App beyond the portable contract chosen for Study Views, and which parts of that contract need to change?

## Answer

The architecture carries over. A versioned `ui://` resource attached by `_meta.ui.resourceUri`, rendering unchanged `structuredContent`, works in Claude, and the installed SDK can declare every server-side field with no new server dependency.

The changes sit in the widget and in a few metadata choices:

1. Claude renders MCP Apps. The baseline lists Claude among the clients that only consume the structured or text result, and that is no longer true for claude.ai, Claude Desktop or the Claude mobile apps.
2. `ui.domain` must stay unset. Claude validates it against the connector URL and shows an error instead of the app when it fails, so one value cannot serve ChatGPT, Claude and self-hosters.
3. Theming needs its own contract. Claude expects host style variables, no hardcoded colors, and a transparent or deliberately bordered frame.
4. An empty CSP still works, but Anthropic Sans then cannot load. The widget falls back to `sans-serif` unless the resource allowlists `https://assets.claude.ai`.
5. Display modes and links move from `window.openai` to `ui/request-display-mode` and `ui/open-link`. Claude has no resource-level link declaration, and a custom connector always shows the confirmation modal.
6. Claude's inline guidance of 4-5 data points conflicts with a 14-bucket Review Forecast. That needs a design decision in [#53](https://github.com/yash-278/bunpro-mcp/issues/53).

One blocker sits outside the widget. Every `POST /mcp` needs a credential, including `resources/read`, so no Study View can render until a Claude connector can send one. The `static_headers` route is a limited beta.

## How to read the evidence

- **Docs** means the cited first-party page states it.
- **Tested** means a local probe confirmed it. The probe ran `@modelcontextprotocol/server` 2.0.0 (the [locked version](../../package-lock.json)) and 2.4.0 (latest), with `createMcpHandler` using this repository's options and a fake tool. It sent no Bunpro request and used no credential. The packages were installed outside the repository.
- **Inference** means a conclusion drawn from those facts that no source states directly.

Nothing here was tested against a live Claude host.

## What carries over unchanged

| Baseline decision | Status in Claude | Evidence |
| --- | --- | --- |
| `ui://` HTML resource with `text/html;profile=mcp-app` | Same | Docs: [quickstart](https://claude.com/docs/connectors/building/mcp-apps/quickstart.md) |
| `_meta.ui.resourceUri` on the tool | Same. The host reads it, fetches with `resources/read`, and renders | Docs: quickstart |
| Versioned URI per view | Same, and the spec lets hosts prefetch and cache | Docs: [spec, Resource Discovery](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx) |
| `_meta.ui` on the `resources/read` content item | Same. The draft spec also allows the listing entry, and the content item wins | Docs: [draft spec](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx) |
| Render from unchanged `structuredContent` | Same. Text `content` stays for hosts that do not render UI | Docs: quickstart |
| Default `visibility` of `["model", "app"]` | Same | Docs: spec |
| Refresh through host `tools/call` | Same. `callServerTool` is the SDK name | Docs: quickstart |
| Explain action through `ui/message` | Same. Claude's guidelines send anything needing Claude's interpretation through chat | Docs: [design guidelines](https://claude.com/docs/connectors/building/mcp-apps/design-guidelines.md) |
| Widget never sees the token | Same, with stronger evidence. Tool calls are proxied through Claude's backend and leave from Anthropic's IP ranges, not the user's device | Docs: [troubleshooting](https://claude.com/docs/connectors/building/mcp-apps/troubleshooting.md) |
| `connectDomains: []` | Same, because the widget makes no direct requests | Docs: design guidelines |
| Two actions at most, no nested scrolling, no deep navigation | Same | Docs: design guidelines |
| No polling, no browser-side study data | Same | Baseline rule, nothing in Claude changes it |
| Component or refresh failure never hides the prior result, and never retries automatically | Same. The tool call stays visible when an app fails to render | [#56](https://github.com/yash-278/bunpro-mcp/issues/56), Docs: troubleshooting |

## What must change

### Claude is a rendering host

Correct the baseline's compatibility paragraph. Any Study View attached to a tool will appear in those Claude apps, because a stateless server cannot hide UI metadata from one host (see [Resource fetching](#resource-fetching-on-a-stateless-server)). Only Claude Code stays on the text path.

### Leave `ui.domain` unset

The field is host-defined, and the spec tells servers to consult each host's format. Claude requires exactly `{hash}.claudemcpcontent.com`, where the hash is the first 32 hex characters of the SHA-256 of the full connector URL. A failed check shows `Invalid ui.domain format` or `ui.domain mismatch` instead of the app ([getting started](https://claude.com/docs/connectors/building/mcp-apps/getting-started.md), [troubleshooting](https://claude.com/docs/connectors/building/mcp-apps/troubleshooting.md)).

The consequences for this project:

- A constant value breaks every self-hosted deployment, because their connector URLs hash differently.
- A trailing slash changes the hash.
- Local stdio connectors have no URL, so the field is unavailable there.
- An OpenAI-format value would fail Claude's format check (inference from the rule above).
- The server cannot switch the value per host, because `resources/read` on a stateless instance has no client information (Tested).

Unset is safe here. Claude needs the field only for a stable origin, such as a widget running its own OAuth flow. Without it, Claude derives the origin from the conversation and connector ([instance supersession](https://claude.com/docs/connectors/building/mcp-apps/instance-supersession.md)). A widget that makes no network requests needs no stable origin.

The baseline says OpenAI requires `ui.domain` when submitting a published plugin. If that path is ever taken, the single-resource design needs revisiting. Directory submission is out of scope for [#80](https://github.com/yash-278/bunpro-mcp/issues/80).

For reference, the value for the hosted endpoint `https://bunpro.yashkadam.com/mcp` would be `8dc2ef3780d8ec71f09977b0b55694ad.claudemcpcontent.com`.

### Make `prefersBorder` a deliberate choice

The baseline sets `prefersBorder: true`. Claude's theming guide requests `false`, so the host adds no card around the widget. If the field is unset, Claude renders borderless on web and bordered on mobile. Either explicit value is valid, and the spec recommends being explicit. With `false`, the widget must honor `safeAreaInsets` itself because the host adds no padding ([design guidelines](https://claude.com/docs/connectors/building/mcp-apps/design-guidelines.md)). The value is one field per resource, so one choice applies to both hosts.

### Add a host theming contract

The baseline has no theming rules. Claude's are in [design guidelines](https://claude.com/docs/connectors/building/mcp-apps/design-guidelines.md) and [transparent theming](https://claude.com/docs/connectors/building/mcp-apps/transparent-theming.md):

- All views must support light and dark themes, and must not hardcode colors. Brand colors are for accents only.
- Read `theme`, `styles.variables` and `styles.css.fonts` from `hostContext`. Apply updates on `hostcontextchanged`, which carries only changed fields. Register the listener before `connect()`.
- Use `applyDocumentTheme`, `applyHostStyleVariables` and `applyHostFonts`, or the React `useHostStyles` hook.
- Set `html, body { background: transparent }` for the blended look, and always include `<meta name="color-scheme" content="light dark">`. Without the tag, the browser can paint an opaque backdrop.
- Claude's token values use CSS `light-dark()`, so colors resolve once the root `color-scheme` is set.
- Give every `var()` a fallback. The spec lets a host send any subset of variables or none, and the fallbacks keep the view readable in hosts that send fewer.
- Use the three-size type scale, regular and emphasized weights, and host radius and border tokens.
- Meet WCAG AA contrast, keyboard navigation and text alternatives for charts.

### Replace `window.openai` paths with the MCP Apps bridge

The ext-apps [migration guide](https://github.com/modelcontextprotocol/ext-apps/blob/main/docs/migrate_from_openai_apps.md) maps the baseline's extensions:

| Baseline path | Portable replacement | Note |
| --- | --- | --- |
| `requestDisplayMode` | `app.requestDisplayMode` (`ui/request-display-mode`) | Declare `availableDisplayModes` in `appCapabilities`, and check the host's list first |
| `sendFollowUpMessage` | `app.sendMessage` (`ui/message`) | Baseline already prefers this |
| `openExternal` | `app.openLink` (`ui/open-link`) | Param changes from `href` to `url` |
| `setWidgetState` | None | Keep state in memory. Do not use `localStorage` for study data |
| `openai/toolInvocation/*` | None | Status copy has no MCP equivalent yet |

Prefer the SDK `App` class over a hand-written bridge, which the baseline left open. Claude's docs recommend it for production because a minimal bridge drops host requests such as `ping` and `ui/resource-teardown`. claude.ai on the web sends neither, and Claude iOS sends teardown only on navigation, so dropping them is survivable but not recommended.

### Handle links without a declaration

The baseline's `redirect_domains` has no Claude equivalent. In Claude, `ui/open-link` shows a modal with the destination URL, and custom and local connectors always show it. The skip-the-modal allowlist is the **Allowed link URIs** field on a directory listing, not resource metadata ([external links](https://claude.com/docs/connectors/building/mcp-apps/external-links.md)).

This project could not use that allowlist even if it were listed. Listed origins must be owned by the submitter, and entries you do not own are removed in review ([submission](https://claude.com/docs/connectors/building/submission.md)). A link to Bunpro is a third-party link here.

Design for the modal:

- Show the destination in the UI.
- Treat a dismissal as a normal outcome. Docs say the request resolves as cancelled, while the spec shows an error response, so handle both.
- A successful response does not prove the tab opened.

### Reconcile the pilot with inline limits

Claude's inline card guidance is at most 2 actions at the bottom, at most 4-5 data points, height fitted to content, and no menus or popovers. `get_review_schedule` returns up to 14 forecast buckets plus `due_now` ([schemas](../../src/bunpro/schemas.ts)), so a full 14-day chart inline exceeds the data-point guidance.

These are design guidelines, and no doc says the host enforces the data-point count (inference). The guidelines point dashboards at fullscreen, and suggest a summary inline with detail in fullscreen. The baseline says inline is sufficient for the pilot, so [#53](https://github.com/yash-278/bunpro-mcp/issues/53) needs to confirm or change that.

## Claude-only requirements

### Display modes

Claude describes three presentations: inline card, inline carousel and full screen. The protocol modes are `inline`, `fullscreen` and `pip`.

- The app provides its own fullscreen button. Claude adds a close button in the native header bar.
- The composer stays visible in fullscreen, so layouts must work with it.
- Fullscreen forbids floating panels. Use collapsible sidebars, tabs or pagination.
- A view must handle receiving a mode other than the one it requested (spec).
- The docs do not list which modes each Claude app actually offers, so read `hostContext.availableDisplayModes` at runtime.

### Mobile layout

From [design guidelines](https://claude.com/docs/connectors/building/mcp-apps/design-guidelines.md) unless noted:

- Claude renders in a native `WKWebView` or Android `WebView`, not a sandboxed iframe.
- Apps always fill the container width. Design from 320px up with container queries, not fixed breakpoints.
- Inline cards are full-width with no horizontal scrolling.
- Tap targets are at least 44 x 44pt, with primary actions in the lower part of the card.
- Apply `safeAreaInsets` as padding on the root container. Web and desktop composers can also overlay the bottom of an inline app, so keep controls off the edges.
- Vertical pans inside an inline app go to the conversation. The host caps inline height and clips overflow, so an internal vertical scroller does not work. The cap is not published.
- Use skeletons, not spinners, for inline loading.
- Users must add a connector on web or desktop before it appears on mobile.
- On iOS rehydration `hostContext.toolInfo.id` is `undefined`, so the view must not depend on it ([instance supersession](https://claude.com/docs/connectors/building/mcp-apps/instance-supersession.md)).
- The iOS `Referer` failure in [troubleshooting](https://claude.com/docs/connectors/building/mcp-apps/troubleshooting.md) affects only requests the widget makes itself, so a self-contained view avoids it.

### Multiple live instances

Each tool call mounts a separate iframe, no host API unmounts older ones, and each stays interactive ([instance supersession](https://claude.com/docs/connectors/building/mcp-apps/instance-supersession.md)). Claude's recipe stamps `{createdAt, seq}` into `structuredContent`, which would break the unchanged-output decision and needs durable server state this server does not have.

Study Views are read-only snapshots, not one shared piece of state, so the recipe is not needed (inference). Two things follow from the same page:

- Stored conversations remount widgets lazily from the transcript. A view must show `retrieved_at` or its equivalent so an old snapshot does not read as current.
- All widgets from one connector in a conversation share an origin with `allow-same-origin`, so `localStorage` is shared between them. The baseline's ban on browser storage of study data covers this.

Keep `ui/update-model-context` unused. Each live instance would push its own updates.

### Permission prompt

Claude asks permission to display an app, with **Allow** and **Always allow** ([getting started](https://claude.com/docs/connectors/building/mcp-apps/getting-started.md)). The docs describe this for a local example. A denied view should leave the text result usable (inference), which the existing fallback does.

### Sandbox limits

`frameDomains` is restricted in Claude pending security review, and mobile apps have no camera, microphone or location access. Study Views need none of these.

## Claude surfaces

| Surface | Study View | What the user gets | Evidence |
| --- | --- | --- | --- |
| claude.ai on the web | Renders | Sandboxed iframe inline | Docs: [client matrix](https://modelcontextprotocol.io/extensions/client-matrix.md), [quickstart](https://claude.com/docs/connectors/building/mcp-apps/quickstart.md) |
| Claude Desktop | Renders | Same, for remote connectors and local servers | Docs: client matrix, [getting started](https://claude.com/docs/connectors/building/mcp-apps/getting-started.md) |
| Claude iOS and Android | Renders | Native WebView, after the connector is added on web or desktop | Docs: design guidelines, troubleshooting |
| Cowork | Unknown | No page says whether MCP Apps render there | Docs are silent |
| Claude Code, terminal | Does not render | Text-only client | Docs: quickstart |
| Claude Code, IDE and Desktop Code tab | Should not render | Text, assuming these match the terminal | Inference: [platform support](https://claude.com/docs/plugins/platform-support.md) groups them as Claude Code |

The client matrix is community-maintained and lists web and Desktop with MCP Apps, and leaves Claude Code empty. The Claude design guidelines are the source for mobile.

### What Claude Code shows instead

- It calls the tool as text. No widget, no bridge, no theming.
- Because the tools return `structuredContent`, the `tool_result` the model receives is that object as a JSON string, not the `content` text ([quickstart](https://claude.com/docs/connectors/building/mcp-apps/quickstart.md)). For Bunpro this is the same data, because `content` is the same object pretty-printed ([server](../../src/server.ts)).
- `ui://` resources stay out of `@` suggestions and the resource list tool. A server offering only UI resources shows an empty resource list, and reading by URI still works ([Claude Code MCP](https://code.claude.com/docs/en/mcp.md)).
- Claude Code sends `resources/list` on connect. That call never reaches Bunpro.
- `X-Bunpro-Token` works directly through `--header` or the `headers` field, so the Claude Code path has no header restriction.

No Claude Code change is needed beyond the size note below.

## Tool result limits

| Limit | claude.ai and Desktop | Claude Code |
| --- | --- | --- |
| Result size | About 150,000 characters | 25,000 tokens by default, set by `MAX_MCP_OUTPUT_TOKENS` |
| Warning | None documented | Above 10,000 tokens |
| Text result saved to file | Not applicable | Above 50,000 characters, unless the tool sets `_meta["anthropic/maxResultSizeChars"]`, up to 500,000 |
| Tool call timeout | 240 seconds | `MCP_TOOL_TIMEOUT` |
| HTTP response | Not documented | 16 MiB |

Sources: [connector limits](https://claude.com/docs/connectors/building/index.md), [Claude Code MCP](https://code.claude.com/docs/en/mcp.md).

The hosted failure mode matters. Above the threshold, with the code execution sandbox active, Claude writes the result to the sandbox filesystem and the app receives a pointer instead of data, so it never hydrates ([troubleshooting](https://claude.com/docs/connectors/building/mcp-apps/troubleshooting.md)).

Estimated worst cases, from synthetic objects filled to each schema's maximum (80-character titles and labels assumed):

| Tool result | `content` (pretty JSON) | `structuredContent` (compact) | Sum |
| --- | --- | --- | --- |
| Range or trend, 93 days | 64,293 | 43,647 | 107,940 |
| `list_study_decks`, 100 decks | 60,835 | 43,723 | 104,558 |
| `get_recent_activity`, 100 attempts | 29,529 | 23,672 | 53,201 |
| `get_review_schedule`, 14 buckets | 2,131 | 1,386 | 3,517 |

All are under about 150,000 characters even if Claude counts both fields, so no output needs to change for the hosted limit. The docs do not say which fields count.

In Claude Code the compact forms stay under 50,000 characters. A 93-day result would pass 50,000 only if Claude Code measured the pretty text, which the quickstart suggests it does not. Long ranges will likely trigger the 10,000-token warning, though this was not measured. Over a limit, Claude Code saves the result to a file instead of dropping it. `anthropic/maxResultSizeChars` is available if needed, and Claude Code is the only documented consumer of that key.

## CSP

| Field | Portable value | Claude note |
| --- | --- | --- |
| `connectDomains` | `[]` | No change |
| `resourceDomains` | `[]` | `https://assets.claude.ai` is needed only for Anthropic Sans |
| `frameDomains` | Omit | Restricted in Claude |
| `baseUriDomains` | Omit | Not in the baseline. Omitted means `base-uri 'self'` |

The font is the one real tradeoff. `styles.css.fonts` points at `https://assets.claude.ai`, and `applyHostFonts` needs that origin allowlisted. Claude warns that `resourceDomains` also adds the origin to `script-src` and `style-src` ([transparent theming](https://claude.com/docs/connectors/building/mcp-apps/transparent-theming.md)).

- Keeping `resourceDomains` empty preserves the recorded decision. `--font-sans` then falls back to `sans-serif`, which differs slightly from Claude's own text.
- Adding the origin gets the native font, at the cost of a Claude-specific script-capable origin in a resource shared with ChatGPT.

Bundling Anthropic Sans is not a documented option. Claude says only that the host supplies it at runtime. [#53](https://github.com/yash-278/bunpro-mcp/issues/53) should choose.

The quickstart's `unpkg.com` import is a no-build convenience. Claude's quickstart itself says to bundle for production, which matches the baseline.

## Resource fetching on a stateless server

The current transport can serve Study Views. Tested on SDK 2.0.0 and 2.4.0 with `legacy: "stateless"`, using a 2025-11-25 client:

- `initialize` returned capabilities with `resources` added automatically by `registerResource`.
- `tools/list` returned `_meta.ui` intact.
- `resources/read` returned the MIME type and `_meta.ui` intact, and `resources/list` listed the view.
- `resources/templates/list` returned an empty list, and `GET /mcp` returned 405, which Claude's [connector troubleshooting](https://claude.com/docs/connectors/building/troubleshooting.md) accepts as a healthy response.

Five points need attention.

**The server cannot tailor by client.** The spec says servers should check client capabilities before registering UI tools. On a stateless server, `getClientCapabilities()` returned nothing during `resources/read` and `tools/call`, and `getClientVersion()` returned nothing during `tools/call` (Tested). UI metadata must therefore be unconditional. That is safe because clients that do not support MCP Apps treat the tool as a standard tool (Docs: spec), and it fits [#56](https://github.com/yash-278/bunpro-mcp/issues/56), which attaches each view directly to its existing tool.

**The credential gate covers the view.** `routeRequest` rejects any `POST /mcp` without a credential before the MCP handler runs ([`src/http-server.ts`](../../src/http-server.ts), lines 225-236). The HTML holds no study data, but `resources/read`, `tools/list` and `initialize` are all gated. Claude sends configured headers on every request ([add a connector](https://claude.com/docs/connectors/custom/add-unlisted.md)), so this works if the connector has a credential. A "connect first, sign in when needed" flow would fail at this gate, which [#90](https://github.com/yash-278/bunpro-mcp/issues/90) must account for.

**The authentication route is the real blocker for hosted surfaces.** Per [authentication](https://claude.com/docs/connectors/building/authentication.md) and [add a connector](https://claude.com/docs/connectors/custom/add-unlisted.md):

- `static_headers` is a beta for a limited set of organizations, and a Team or Enterprise Owner enters the value.
- Custom header names need Anthropic's approval. The offered names are `authorization`, `x-api-key` and `x-auth-token`, so `X-Bunpro-Token` is not on the list. The server also accepts `Authorization: Bearer`.
- Claude's docs say request headers suit one shared organization credential, and that per-person sign-in should use OAuth. Bunpro tokens are per-caller, so that guidance does not fit them.

Claude Desktop's local configuration is a separate path, since example apps render from local servers there.

**Keep `legacy: "stateless"`.** Claude's published authorization specs stop at 2025-11-25, and its docs say draft capabilities are unsupported. That suggests Claude arrives as a legacy client (inference), so `legacy: "reject"` would be unsafe.

The repository also fails modern-era traffic today. `nodeHeadersToWebHeaders` forwards a fixed list that omits `Mcp-Method` ([`src/http-server.ts`](../../src/http-server.ts), lines 305-321). A `server/discover` request with the repository's forwarded headers got `-32020`, while the same request with `Mcp-Method` succeeded (Tested). This is outside the Study View contract, and it matters only if a host moves to 2026-07-28 without falling back.

**The response cap is enough.** `MAX_MCP_RESPONSE_BYTES` is 2 MiB and applies after buffering ([`src/http-server.ts`](../../src/http-server.ts), lines 20 and 371). The prebuilt ext-apps `app-with-deps.js` is 541,828 bytes, and inlining it gave a 559,418-byte `resources/read` body (Tested), which leaves about 1.5 MiB. Claude publishes no limit for resource size.

## SDK coverage

| Item | `@modelcontextprotocol/server` 2.0.0 | Evidence |
| --- | --- | --- |
| `_meta.ui.resourceUri` and `visibility` on a tool | Yes. `_meta` is `Record<string, unknown>` | Types, Tested |
| `anthropic/maxResultSizeChars` on a tool | Yes | Tested |
| Static `ui://` resource with the MCP Apps MIME type | Yes | Tested |
| Content-level `_meta.ui` with `csp`, `prefersBorder`, `domain` | Yes | Tested |
| `baseUriDomains` inside `csp` | Yes | Tested |
| `capabilities.extensions["io.modelcontextprotocol/ui"]` | Yes, through `McpServer` options | Tested |
| UI metadata conditional on the client | No, a stateless limit rather than a typing gap | Tested |
| Allowed link URIs | Not applicable. It is a directory listing field | Docs |

Declaring the extension is optional in practice for Claude. Neither Claude's quickstart nor `registerAppTool` declares it, and a server using those helpers still reported no `extensions` capability (Tested). The [client matrix](https://modelcontextprotocol.io/extensions/client-matrix.md) says a client uses an extension only if both sides declare it, so declaring it is a cheap safeguard for other hosts.

Use the right helper package. Claude's quickstart installs `@modelcontextprotocol/ext-apps@^1`, which peers on the v1 `@modelcontextprotocol/sdk` and does not fit this server. `ext-apps` 2.0.4 peers on `@modelcontextprotocol/server` `^2`, and also requires `@modelcontextprotocol/client` and `@modelcontextprotocol/core`. Its `registerAppTool` and `registerAppResource` worked against server 2.0.0 (Tested).

The server does not need those helpers. Plain `registerTool` and `registerResource` produce the same wire shape, without the flat `ui/resourceUri` key that the helper adds and the spec marks for removal. The `App` class is a widget concern, so only the widget build needs `ext-apps`.

## Input for other tickets

- [#89](https://github.com/yash-278/bunpro-mcp/issues/89): a tool declaration needs an optional view that sets `_meta.ui.resourceUri` and registers one resource. It needs no per-client branching. Set `prefersBorder` and `csp` on the content item, and do not set `domain`.
- [#90](https://github.com/yash-278/bunpro-mcp/issues/90): the chosen route must supply a credential on `resources/read`, and any connect-before-credential flow must change the gate.
- [#93](https://github.com/yash-278/bunpro-mcp/issues/93): a ChatGPT-only pilot cannot be enforced from server metadata. Once a Claude connector can reach the server, any attached view appears there too (inference from the stateless test). Claude verification needs light and dark, a 320px mobile width, safe areas, a stored-conversation remount, a dismissed link modal, and Claude Code text output.
- [#53](https://github.com/yash-278/bunpro-mcp/issues/53) and [#60](https://github.com/yash-278/bunpro-mcp/issues/60): decide inline content against the 4-5 data point guidance, `prefersBorder`, and the font tradeoff. A 14-bucket inline chart may need a summary inline with detail in fullscreen.

## Limitations

- No live Claude test. All rendering, theming and mobile claims come from documentation.
- These are unverified:
  - whether Claude re-reads a `ui://` resource for stored conversations, which decides how long an old versioned URI must stay served
  - whether a widget-initiated `tools/call` triggers an approval prompt
  - how quickly Claude picks up changed tool metadata
  - which fields count toward the 150,000-character threshold
  - the mobile inline height cap, and which display modes each Claude app offers
  - whether MCP Apps render in Cowork
  - whether the permission prompt applies to remote connectors, and what the user sees after denying it
  - whether Claude ever sends modern-era requests, and whether it falls back after a failure
- The size table is an estimate from schema maximums and assumed string lengths, not measured account data.
- The ChatGPT side of the baseline was not re-verified. Only its Claude-relevant statements were checked.
- The client matrix is community-maintained. Claude's quickstart was verified against `ext-apps` 1.7.5 and SDK v1, not this server's v2 stack.
- The stable spec is `2026-01-26`. The draft adds items such as `ui/download-file`, which Study Views do not need.
- These docs change often, so recheck them before implementation.

## Primary sources

Claude:

- [Get started with MCP Apps](https://claude.com/docs/connectors/building/mcp-apps/getting-started.md)
- [Add an interactive UI to your MCP server](https://claude.com/docs/connectors/building/mcp-apps/quickstart.md)
- [Design guidelines](https://claude.com/docs/connectors/building/mcp-apps/design-guidelines.md)
- [Blend your MCP App with Claude's theme](https://claude.com/docs/connectors/building/mcp-apps/transparent-theming.md)
- [Open external links from MCP Apps](https://claude.com/docs/connectors/building/mcp-apps/external-links.md)
- [Supersede older widget instances](https://claude.com/docs/connectors/building/mcp-apps/instance-supersession.md)
- [Troubleshoot MCP Apps](https://claude.com/docs/connectors/building/mcp-apps/troubleshooting.md)
- [Build an MCP server for Claude](https://claude.com/docs/connectors/building/index.md)
- [Authentication for connectors](https://claude.com/docs/connectors/building/authentication.md)
- [Add a connector that isn't in the directory](https://claude.com/docs/connectors/custom/add-unlisted.md)
- [Submit a connector to the directory](https://claude.com/docs/connectors/building/submission.md)
- [Troubleshoot your connector](https://claude.com/docs/connectors/building/troubleshooting.md)
- [Plugin feature support across platforms](https://claude.com/docs/plugins/platform-support.md)
- [Claude Code MCP](https://code.claude.com/docs/en/mcp.md)

MCP:

- [MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview.md)
- [Extension support matrix](https://modelcontextprotocol.io/extensions/client-matrix.md)
- [MCP Apps specification, 2026-01-26](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx)
- [MCP Apps specification, draft](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx)
- [Migrate from the OpenAI Apps SDK](https://github.com/modelcontextprotocol/ext-apps/blob/main/docs/migrate_from_openai_apps.md)
- [MCP Apps CSP and CORS](https://github.com/modelcontextprotocol/ext-apps/blob/main/docs/csp-cors.md)

Packages and repository:

- Published `@modelcontextprotocol/server` 2.0.0 and 2.4.0, `@modelcontextprotocol/core` 2.0.0, and `@modelcontextprotocol/ext-apps` 1.7.5 and 2.0.4
- [`src/http-server.ts`](../../src/http-server.ts), [`src/server.ts`](../../src/server.ts), [`src/bunpro/schemas.ts`](../../src/bunpro/schemas.ts), [`package-lock.json`](../../package-lock.json)
