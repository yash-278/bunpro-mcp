# ChatGPT Study View integration contract

Research date: 2026-08-29

## Question

What is the supported contract for adding an optional, rich ChatGPT Study View to the existing remote Bunpro MCP without changing its eight read-only tool contracts, exposing a caller's Bunpro token, or breaking Atlas and other MCP clients that do not render UI?

## Decision-ready answer

The first Study View should be an **inline Review Forecast component attached directly to `get_review_schedule`**. The server should register a versioned `ui://` HTML resource with MIME type `text/html;profile=mcp-app`, then add `_meta.ui.resourceUri` to that tool's descriptor. Keep the tool's existing `inputSchema`, `outputSchema`, annotations, `structuredContent`, and text `content` unchanged.

This is an additive MCP Apps integration. ChatGPT can render the component, while Atlas, Codex, Claude, and basic MCP clients can continue consuming the same structured or text result without understanding the UI resource. OpenAI explicitly requires tools to remain useful without their optional component, and MCP Apps host support varies by client ([OpenAI: Add UI to your MCP server](https://developers.openai.com/plugins/build/chatgpt-ui), [MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview)).

The minimum server-side shape is:

```ts
const REVIEW_FORECAST_URI = "ui://bunpro/review-forecast/v1.html";

server.registerResource(
  "bunpro-review-forecast-v1",
  REVIEW_FORECAST_URI,
  {},
  async () => ({
    contents: [{
      uri: REVIEW_FORECAST_URI,
      mimeType: "text/html;profile=mcp-app",
      text: bundledHtml,
      _meta: {
        ui: {
          prefersBorder: true,
          csp: {
            connectDomains: [],
            resourceDomains: []
          }
        }
      }
    }]
  })
);

server.registerTool("get_review_schedule", {
  // Existing title, description, schemas, annotations...
  _meta: {
    ui: { resourceUri: REVIEW_FORECAST_URI }
  }
}, existingHandler);
```

`_meta["openai/outputTemplate"]` remains a ChatGPT compatibility alias, but new work should prefer the standard `_meta.ui.resourceUri`. OpenAI's current guidance is to start with the MCP Apps fields and bridge, adding `window.openai` only for capabilities that the standard does not cover ([OpenAI plugin UI reference](https://developers.openai.com/plugins/reference)).

## Supported server contract

### Resource registration

An MCP App combines two MCP primitives:

1. A tool descriptor whose `_meta.ui.resourceUri` points at a `ui://` URI.
2. A resource that returns the component HTML using `text/html;profile=mcp-app`.

The host can discover and preload the resource, then render it in a sandboxed iframe and deliver the tool result over the UI bridge. The URI should be treated as a cache key: incompatible HTML, JavaScript, or CSS changes require a new versioned URI ([MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview), [OpenAI: Add UI to your MCP server](https://developers.openai.com/plugins/build/chatgpt-ui)).

The installed `@modelcontextprotocol/server` package already accepts arbitrary tool descriptor `_meta`, exposes static `registerResource(...)`, publishes registered resources through the MCP resource methods, and supports tool results containing `structuredContent`, `content`, and `_meta`. The project does not currently install `@modelcontextprotocol/ext-apps` or `@openai/apps-sdk-ui` ([package.json](../../package.json), [package-lock.json](../../package-lock.json)).

Therefore:

- The server can register the resource and metadata with its existing MCP package.
- `@modelcontextprotocol/ext-apps` is useful for the component-side `App` bridge and its helpers, but the wire protocol can also be implemented directly.
- `@openai/apps-sdk-ui` is optional styling infrastructure, not part of the transport contract.

### Tool descriptor metadata

For the pilot, add only:

```ts
_meta: {
  ui: { resourceUri: REVIEW_FORECAST_URI },
  "openai/toolInvocation/invoking": "Loading review forecast…",
  "openai/toolInvocation/invoked": "Review forecast ready"
}
```

The two invocation strings are optional ChatGPT status copy and must stay within the documented 64-character limit. The UI link belongs only on tools that should render the component. Existing read-only, destructive, idempotent, and open-world annotations remain unchanged; annotations guide host presentation but do not replace server enforcement ([OpenAI plugin UI reference](https://developers.openai.com/plugins/reference)).

Do not set `_meta.ui.visibility` to hide the existing tool from the model. The pilot needs the same tool available to both model and app, which is the default `['model', 'app']` behavior.

### Tool result data and privacy

The three result surfaces have different audiences:

| Result field | Model | Component | Conversation transcript | Bunpro use |
| --- | --- | --- | --- | --- |
| `structuredContent` | Yes | Yes | Yes | Existing bounded Review Schedule object |
| `content` | Yes | Yes | Yes | Existing serialized, no-UI fallback |
| `_meta` | No | Yes | No | Optional presentation-only hydration data |

When `structuredContent` is returned, it must continue matching the declared `outputSchema`. Only `structuredContent` and `content` enter the transcript; result `_meta` is hidden from the model but delivered to browser code in the component ([OpenAI plugin UI reference](https://developers.openai.com/plugins/reference), [MCP tools specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)).

Hidden from the model does **not** mean secret. Never place `X-Bunpro-Token`, an Authorization value, cookies, raw provider responses, or extra personal study data in result `_meta`. The component is browser-visible code and must receive only the same bounded study facts needed for presentation.

The Review Forecast needs no extra result `_meta` in v1 because its existing `structuredContent` already contains the display facts. Keeping one authoritative result also avoids model/UI disagreement.

## Component runtime contract

The component runs in a sandboxed iframe and communicates with the host over JSON-RPC via `postMessage`. New UI should use the portable MCP Apps bridge:

- `ui/initialize` to establish capabilities and initial context.
- `ui/notifications/tool-input` and `ui/notifications/tool-result` to receive the invocation and its result.
- `tools/call` to request another MCP tool call, such as an explicit refresh.
- `ui/message` to ask the host to post a conversational follow-up.
- `ui/update-model-context` only if the component has new, model-relevant state to share.

The `App` class from `@modelcontextprotocol/ext-apps` wraps this protocol but is not required ([MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview), [MCP Apps build guide](https://modelcontextprotocol.io/extensions/apps/build)).

ChatGPT also provides optional `window.openai` capabilities. Feature-detect them rather than branching on the host name:

- `requestDisplayMode({ mode: 'fullscreen' })` for the later period/progress explorers.
- `sendFollowUpMessage(...)` as a compatibility path for a prompt such as “Explain this review load.” Prefer standard `ui/message` for portable UI.
- `setWidgetState(...)` for harmless presentation state.
- `openExternal(...)` for an explicitly allowlisted Bunpro link.

For the Review Forecast pilot, inline mode is sufficient. Every app starts inline; OpenAI recommends inline cards for a small amount of structured data or a scorecard, limiting the card to two primary actions and avoiding tabs, deep navigation, and nested scrolling. Fullscreen is appropriate later for detailed Study Period and Learning Progress exploration. PiP is not justified for a static read-only forecast ([OpenAI UI guidelines](https://developers.openai.com/plugins/concepts/ui-guidelines)).

Recommended pilot interactions:

- **Refresh**: explicit user action invoking `get_review_schedule` through `tools/call`.
- **Explain this load**: `ui/message`, allowing ChatGPT to reason about the already-returned facts.
- No automatic polling, silent refresh, Bunpro mutation, or direct widget-to-Bunpro request.

## Caller credentials and authentication boundary

The component must not receive the caller's Bunpro Account API Token.

The existing hosted server accepts exactly one credential on each `/mcp` request: raw `X-Bunpro-Token` or the compatibility Bearer header. It derives one operation-scoped source from that credential and does not persist it ([`src/http-server.ts`](../../src/http-server.ts), [`src/server.ts`](../../src/server.ts)). A component-initiated `tools/call` asks the **host** to call the same connected MCP server. It does not need a direct HTTP request from the iframe, so the configured connection credential remains at the host-to-MCP transport boundary.

This conclusion follows from the MCP Apps architecture: iframe code calls tools through the host bridge, and the iframe cannot read the host's cookies or local storage ([MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview)). It should still be verified end to end in ChatGPT with two synthetic caller tokens before release because OpenAI's public documentation does not specify arbitrary static custom-header persistence as a portable MCP Apps feature.

There is an important distribution boundary:

- The current developer-mode custom remote MCP connection can continue using its configured `X-Bunpro-Token` header, subject to live verification after metadata refresh.
- OpenAI's documented authentication contract for an authenticated **published plugin** is OAuth 2.1 with MCP protected-resource metadata, authorization-server discovery, PKCE, and a supported client registration mechanism. The official publication path does not document a raw user-entered custom header as a general authentication substitute ([OpenAI authentication guide](https://developers.openai.com/plugins/build/auth)).

This Study View effort can enhance the existing custom connection without adopting OAuth. Directory submission or a broadly published ChatGPT plugin would be a separate decision and may require an OAuth/account-link design.

## CSP, resources, and bundling

The resource content owns its UI metadata. For a self-contained v1 component:

```ts
_meta: {
  ui: {
    prefersBorder: true,
    csp: {
      connectDomains: [],
      resourceDomains: []
    }
  }
}
```

- `connectDomains` allowlists widget fetch, XHR, and WebSocket origins.
- `resourceDomains` allowlists external scripts, styles, images, and fonts.
- `frameDomains` allowlists nested iframes, which are blocked by default and should not be needed.
- `ui.domain` assigns a dedicated component origin. It defaults to OpenAI's sandbox origin for development and is required when submitting a plugin with UI.
- ChatGPT's legacy `_meta['openai/widgetCSP'].redirect_domains` remains necessary for vetted `openExternal` redirect targets because the standard CSP object has no redirect-domain field.

OpenAI recommends narrow allowlists, and MCP Apps use deny-by-default CSP. Bundle the Review Forecast's JavaScript, CSS, icons, and chart primitives into a single HTML resource so both domain lists can remain empty. OpenAI demonstrates an esbuild-produced JavaScript module inlined into the resource; the MCP Apps guide demonstrates Vite plus `vite-plugin-singlefile`. Either is supported. Keep the UI source separate from server logic and keep dependencies lean ([OpenAI: Add UI to your MCP server](https://developers.openai.com/plugins/build/chatgpt-ui), [MCP Apps CSP and CORS](https://apps.extensions.modelcontextprotocol.io/api/documents/csp-and-cors.html)).

If a later version loads a font, image, analytics endpoint, or external link, declare only the exact required origin and update the versioned resource contract. The widget should not need `connectDomains` for Bunpro because all Bunpro access stays behind MCP tools.

## No-UI fallback and compatibility

The existing eight tools already implement the correct fallback:

1. Each declares an `outputSchema`.
2. Each returns matching `structuredContent`.
3. Each returns the same result serialized as text `content`.

See [`src/server.ts`](../../src/server.ts). Attaching a UI resource to `get_review_schedule` does not require changing any of those fields. Clients that ignore `_meta.ui.resourceUri`, cannot read resources, or do not support MCP Apps still receive the existing tool result.

The fallback is a release requirement, not a best-effort enhancement. OpenAI's test guidance says to test both the component and the model-readable result, refresh the MCP connection after UI metadata changes, and start a new conversation before rerunning evaluations ([OpenAI: Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt)).

## Recommended implementation sequence

1. Add a separate `web/` component source and deterministic single-file build.
2. Register `ui://bunpro/review-forecast/v1.html` as an MCP resource.
3. Add `_meta.ui.resourceUri` to `get_review_schedule` only.
4. Render solely from the existing Review Schedule `structuredContent`.
5. Add explicit Refresh and Explain actions through the host bridge.
6. Keep CSP external-domain lists empty and keep the token out of all UI data.
7. Verify resource discovery and tool metadata with MCP Inspector.
8. Deploy, refresh the custom connection's metadata, and test a new ChatGPT conversation.
9. Verify UI and no-UI results, mobile inline layout, optional fullscreen capability detection, and per-caller token isolation.

Do not add a new aggregation tool, make the widget call Bunpro directly, persist study data in browser storage, or attach UI to every tool in the pilot.

## Remaining uncertainty

- The official docs establish MCP Apps UI on ChatGPT but do not guarantee that arbitrary custom connection headers are a portable authentication mechanism across other MCP Apps hosts or the public plugin directory.
- Display-mode availability can vary by client and surface. The component must feature-detect ChatGPT extensions and remain useful inline.
- Published-plugin review can impose requirements beyond developer-mode custom connection behavior, including a dedicated `ui.domain` and OAuth for customer-specific data.
- The current server package can register the needed resource and metadata, but the component bridge, bundling setup, and ChatGPT rendering still require a prototype and live host verification.

## Primary sources

- [OpenAI: Add UI to your MCP server](https://developers.openai.com/plugins/build/chatgpt-ui)
- [OpenAI plugin UI reference](https://developers.openai.com/plugins/reference)
- [OpenAI UI guidelines](https://developers.openai.com/plugins/concepts/ui-guidelines)
- [OpenAI authentication guide](https://developers.openai.com/plugins/build/auth)
- [OpenAI: Connect and test your plugin](https://developers.openai.com/plugins/deploy/connect-chatgpt)
- [MCP Apps overview](https://modelcontextprotocol.io/extensions/apps/overview)
- [MCP Apps build guide](https://modelcontextprotocol.io/extensions/apps/build)
- [MCP tools specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [MCP Apps CSP and CORS](https://apps.extensions.modelcontextprotocol.io/api/documents/csp-and-cors.html)
- Installed TypeScript MCP package declarations and implementation under `node_modules/@modelcontextprotocol/server` and `node_modules/@modelcontextprotocol/core`, version resolved by [package-lock.json](../../package-lock.json)

