const MCP_ENDPOINT = "https://bunpro.yashkadam.com/mcp";
const CHATGPT_PLUGINS_URL = "https://chatgpt.com/plugins";
const OPENAI_MCP_GUIDE_URL = "https://developers.openai.com/plugins/deploy/connect-chatgpt";
const BUNPRO_TOKEN_HEADER = "X-Bunpro-Token";
const SOURCE_REPOSITORY_URL = "https://github.com/yash-278/bunpro-mcp";
const SELF_HOSTING_GUIDE_URL = `${SOURCE_REPOSITORY_URL}/blob/main/docs/self-hosting.md`;
const CLAUDE_SETUP_GUIDE_URL = `${SOURCE_REPOSITORY_URL}/blob/main/docs/claude-setup.md`;
const PRIVACY_URL = `${SOURCE_REPOSITORY_URL}/blob/main/PRIVACY.md`;
const LATEST_RELEASE_URL = `${SOURCE_REPOSITORY_URL}/releases/latest`;
const CLAUDE_CODE_PROMPT = "I have 20 minutes. What should I study in Bunpro today?";
const CONNECTION_PROMPT = "Check my Bunpro connection.";

export const HOMEPAGE_ROBOTS = `User-agent: *
Allow: /
Disallow: /mcp
Disallow: /healthz
Sitemap: https://bunpro.yashkadam.com/sitemap.xml
`;

export const HOMEPAGE_SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://bunpro.yashkadam.com/</loc></url>
</urlset>`;

export const HOMEPAGE_FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#22251f"/>
  <path d="M14 39c0-15 9-25 24-25 7 0 12 2 15 5-17-1-27 7-27 20 0 5 2 9 5 12-10-1-17-5-17-12Z" fill="none" stroke="#ebece8" stroke-width="5" stroke-linecap="round"/>
  <circle cx="45" cy="40" r="6" fill="#9fb391"/>
</svg>`;

const tools = [
  {
    name: "Connection check",
    key: "get_connection_status",
    description: "Checks that your app can reach your Bunpro account with the token you gave it.",
    prompt: "Check my Bunpro connection."
  },
  {
    name: "Study day",
    key: "get_study_day_summary",
    description: "Shows what you studied on one day.",
    prompt: "What did I study on 2026-08-11?"
  },
  {
    name: "Study Period",
    key: "get_study_range_summary",
    description: "Looks back across a week, a month or any period up to 93 days.",
    prompt: "Summarize my Bunpro study from August 1 to 11."
  },
  {
    name: "Review schedule",
    key: "get_review_schedule",
    description: "Shows what is due now and how busy the next few days look.",
    prompt: "How many reviews are due, and what is coming this week?"
  },
  {
    name: "Study decks",
    key: "list_study_decks",
    description: "Lists your active decks with their daily goals and progress.",
    prompt: "Which study decks are active and how are they progressing?"
  },
  {
    name: "Recent activity",
    key: "get_recent_activity",
    description: "Lists what you have reviewed recently.",
    prompt: "What have I reviewed recently?"
  },
  {
    name: "Learning progress",
    key: "get_learning_progress",
    description: "Shows your overall progress from JLPT N5 through N1.",
    prompt: "How far along am I at each JLPT level?"
  },
  {
    name: "Activity trend",
    key: "get_activity_trend",
    description: "Shows how your reviews, new lessons and accuracy change over time.",
    prompt: "How has my consistency changed over the last 30 days?"
  },
  {
    name: "Weak spots",
    key: "list_weak_spots",
    description: "Lists what Bunpro currently marks as troubled, with the accuracy and streak Bunpro reports.",
    prompt: "What does Bunpro currently list as troubled for me?"
  }
];

export function renderHomepage(_url: URL): string {
  return `<!doctype html>
<html lang="en" data-site="bunpro-mcp">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#ebece8">
  <meta name="description" content="Ask Claude, or ChatGPT, about your Bunpro reviews, weak spots, decks and JLPT progress. An unofficial, experimental, read-only MCP server.">
  <meta property="og:title" content="Bunpro MCP: ask Claude about your Bunpro study">
  <meta property="og:description" content="An unofficial, read-only MCP server for asking Claude or ChatGPT about your Bunpro study data.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://bunpro.yashkadam.com/">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="canonical" href="https://bunpro.yashkadam.com/">
  <title>Bunpro MCP: ask Claude about your Bunpro study</title>
  <style>${styles()}</style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  ${header()}
  <main id="main">
    ${hero()}
    ${claudeSetup()}
    ${toolCatalog()}
    ${chatgptSetup()}
    ${privacy()}
    ${selfHost()}
    ${limitations()}
    ${troubleshooting()}
    ${faq()}
    ${closing()}
  </main>
  ${footer()}
  <div class="toast" role="status" aria-live="polite" aria-atomic="true"></div>
  <script>${pageScript()}</script>
</body>
</html>`;
}

function header(): string {
  const links = `<a href="#claude">Claude</a><a href="#tools">Tools</a><a href="#setup">ChatGPT</a><a href="#privacy">Privacy</a><a href="#self-host">Self-host</a>`;
  return `<header class="site-header">
    <div class="frame header-inner">
      <a class="wordmark" href="#top">Bunpro MCP <span>unofficial</span></a>
      <nav class="desktop-nav" aria-label="Primary navigation">${links}</nav>
      <a class="button header-cta" href="#claude">Add it to Claude</a>
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="mobile-menu">Menu</button>
    </div>
    <nav class="mobile-nav frame" id="mobile-menu" aria-label="Mobile navigation" hidden>
      ${links}<a href="#help">Help</a>
    </nav>
  </header>`;
}

function hero(): string {
  const days = Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const missed = [6, 7, 10, 13, 20, 23, 27, 28].includes(day);
    const weekend = day % 7 === 6 || day % 7 === 0;
    return `<i class="${missed ? "miss" : "hit"}${weekend ? " wkd" : ""}" title="Day ${day}: ${missed ? "no reviews" : "studied"}"></i>`;
  }).join("");
  const levels: Array<[string, number]> = [["N5", 94], ["N4", 63], ["N3", 21], ["N2", 4], ["N1", 0]];
  return `<section class="hero" id="top" aria-labelledby="hero-title">
    <div class="frame hero-copy">
      <h1 id="hero-title">Ask Claude about your Bunpro study</h1>
      <p class="lede">Bunpro MCP is an unofficial, experimental MCP server. Claude reads your due reviews, weak spots, decks and JLPT progress, then answers in plain language. It can't change anything in your Bunpro account.</p>
      <div class="hero-actions">
        <a class="button" href="#claude">Add it to Claude</a>
        <a class="text-link" href="#setup">Using ChatGPT? Set it up here</a>
      </div>
      <p class="hero-paths">Works with the Claude Code plugin, the Claude Desktop extension and a claude.ai connector.</p>
    </div>
    <div class="stage">
      <div class="chat" data-ui>
        <div class="chat-tabs" role="tablist" aria-label="Example questions">
          <button type="button" role="tab" id="ex-tab-plan" aria-controls="ex-plan" aria-selected="true">Today's plan</button>
          <button type="button" role="tab" id="ex-tab-trend" aria-controls="ex-trend" aria-selected="false" tabindex="-1">Last 30 days</button>
          <button type="button" role="tab" id="ex-tab-jlpt" aria-controls="ex-jlpt" aria-selected="false" tabindex="-1">JLPT progress</button>
        </div>
        <div class="chat-panel" role="tabpanel" id="ex-plan" aria-labelledby="ex-tab-plan">
          <p class="who">You</p>
          <p class="you">${CLAUDE_CODE_PROMPT}</p>
          <ul class="calls" aria-label="Tools Claude called"><li>Called <code>get_review_schedule</code></li><li>Called <code>list_weak_spots</code></li></ul>
          <p class="who">Claude</p>
          <div class="reply">
            <p>You have 38 reviews due now. Here is a 20-minute plan.</p>
            <ol class="plan">
              <li><b>12 min</b><span>Clear the 38 due reviews first.</span></li>
              <li><b>6 min</b><span>Go back over two weak spots: <span lang="ja">わけではない</span> at 54% accuracy and <span lang="ja">ばかりに</span> at 61%.</span></li>
              <li><b>2 min</b><span>Skip new lessons today. Tomorrow already has 64 reviews due.</span></li>
            </ol>
          </div>
        </div>
        <div class="chat-panel" role="tabpanel" id="ex-trend" aria-labelledby="ex-tab-trend">
          <p class="who">You</p>
          <p class="you">How consistent was I over the last 30 days?</p>
          <ul class="calls" aria-label="Tools Claude called"><li>Called <code>get_activity_trend</code></li></ul>
          <p class="who">Claude</p>
          <div class="reply">
            <p>You studied on 22 of the last 30 days and finished 1,184 reviews at 86% accuracy. Six of your eight missed days fell on a weekend.</p>
            <div class="days" role="img" aria-label="30 days, 22 studied and 8 missed, 6 of the missed days on weekends">${days}</div>
            <p class="key"><i class="hit"></i> Studied <i class="miss"></i> No reviews</p>
          </div>
        </div>
        <div class="chat-panel" role="tabpanel" id="ex-jlpt" aria-labelledby="ex-tab-jlpt">
          <p class="who">You</p>
          <p class="you">How far along am I at each JLPT level?</p>
          <ul class="calls" aria-label="Tools Claude called"><li>Called <code>get_learning_progress</code></li></ul>
          <p class="who">Claude</p>
          <div class="reply">
            <p>N5 is nearly done and N4 is past halfway. N3 has just started.</p>
            <dl class="levels">${levels.map(([level, percent]) => `<div><dt>${level}</dt><dd><span class="bar"><i style="width:${percent}%"></i></span><span>${percent}%</span></dd></div>`).join("")}</dl>
          </div>
        </div>
        <p class="chat-foot">Example chat with made-up study data.</p>
      </div>
    </div>
  </section>`;
}

function copyField(label: string, value: string): string {
  return `<div class="copy"><code>${value}</code><button type="button" data-copy="${value}" aria-label="Copy ${label}">Copy</button></div>`;
}

function askButton(prompt: string): string {
  return `<button class="ask" type="button" data-copy="${prompt}" aria-label="Copy prompt: ${prompt}">${prompt}</button>`;
}

function step(body: string): string {
  return `<li><div class="step-body">${body}</div></li>`;
}

function claudeSetup(): string {
  return `<section class="section claude" id="claude" aria-labelledby="claude-title">
    <div class="frame claude-grid">
      <div class="claude-intro">
        <h2 id="claude-title">Connect it to Claude</h2>
        <p>Pick the Claude app you use. Each one keeps your Bunpro token in a different place.</p>
        <p class="token-note">Before you start, copy your Account API Token from <strong>Bunpro &gt; Settings &gt; API</strong> and treat it like a password. Paste it only into the masked field your Claude app shows. Never put it in a chat, prompt, URL or screenshot.</p>
        <a class="text-link" href="${CLAUDE_SETUP_GUIDE_URL}" target="_blank" rel="noreferrer">Full Claude setup guide</a>
      </div>

      <div class="paths" data-ui>
        <div class="path-tabs" role="tablist" aria-label="Claude apps">
          <button type="button" role="tab" id="tab-code" aria-controls="path-code" aria-selected="true"><span class="tab-name">Claude Code<span class="tab-extra"> plugin</span></span><span class="tab-note">Adds a study-plan skill</span></button>
          <button type="button" role="tab" id="tab-desktop" aria-controls="path-desktop" aria-selected="false" tabindex="-1"><span class="tab-name">Claude Desktop</span><span class="tab-note">Token stays on your computer</span></button>
          <button type="button" role="tab" id="tab-web" aria-controls="path-web" aria-selected="false" tabindex="-1"><span class="tab-name">claude.ai</span><span class="tab-note">Needs the request-headers beta</span></button>
        </div>

        <div class="path" role="tabpanel" id="path-code" aria-labelledby="tab-code">
          <h3>Claude Code plugin</h3>
          <p class="path-lead">The plugin keeps your token in your system's secure store and adds a <code>study-plan</code> skill. It connects to the hosted service at <code>bunpro.yashkadam.com</code>, so your token reaches that service.</p>
          <ol class="numbered">
            ${step(`<p>Start a Claude Code session, then run these two commands inside that session, not in your shell.</p>${copyField("the marketplace command", "/plugin marketplace add yash-278/bunpro-mcp")}${copyField("the install command", "/plugin install bunpro-mcp@bunpro-mcp")}<p class="caution">Don't run <code>claude plugin install</code> from a shell. It doesn't ask for the token, and its <code>--config</code> flag would put the token in your shell history.</p>`)}
            ${step(`<p>Claude Code asks for your <strong>Bunpro Account API Token</strong> in a masked field. Paste it there and nowhere else.</p>`)}
            ${step(`<p>Run <code>/reload-plugins</code>, then run <code>/mcp</code>. You're done when plugin:bunpro-mcp:bunpro shows as connected.</p>${copyField("the reload command", "/reload-plugins")}${copyField("the MCP status command", "/mcp")}`)}
            ${step(`<p>Try this question.</p>${askButton(CLAUDE_CODE_PROMPT)}`)}
          </ol>
          <p class="path-note">The <code>study-plan</code> skill reads your due reviews and weak spots, then suggests a plan. It saves nothing between chats and can't change anything in Bunpro. The plugin always connects to the hosted service. To point Claude Code at your own server, update the plugin or replace your token, follow the <a class="text-link" href="${CLAUDE_SETUP_GUIDE_URL}" target="_blank" rel="noreferrer">Claude setup guide</a>.</p>
        </div>

        <div class="path" role="tabpanel" id="path-desktop" aria-labelledby="tab-desktop">
          <h3>Claude Desktop</h3>
          <p class="path-lead">The extension runs Bunpro MCP on your computer. Your token stays there and goes only to Bunpro, never to the hosted service. Claude Desktop includes Node.js, so you don't need to install it.</p>
          <ol class="numbered">
            ${step(`<p>Download <code>bunpro-mcp.mcpb</code> from the latest GitHub release. Releases before 0.5.0 don't include it.</p><a class="button button-quiet" href="${LATEST_RELEASE_URL}" target="_blank" rel="noreferrer">Latest release on GitHub</a>`)}
            ${step(`<p>In Claude Desktop, open <strong>Settings &gt; Extensions</strong>. In some versions, go to <strong>Settings &gt; Desktop app</strong> and select <strong>Manage</strong> next to <strong>Extensions</strong>.</p>`)}
            ${step(`<p>Drag the file onto the page, or double-click it, and follow the prompts.</p>`)}
            ${step(`<p>Paste your token into the masked <strong>Bunpro Account API Token</strong> field.</p>`)}
            ${step(`<p>Start a new chat and ask this.</p>${askButton(CONNECTION_PROMPT)}`)}
          </ol>
          <p class="path-note">If <strong>Extensions</strong> doesn't appear in settings, your organization has turned extensions off. To update, install the <code>.mcpb</code> from a newer release.</p>
        </div>

        <div class="path" role="tabpanel" id="path-web" aria-labelledby="tab-web">
          <h3>claude.ai web and mobile</h3>
          <p class="warning"><strong>Don't use this on a Team or Enterprise plan.</strong> An Owner's header value goes out on every member's requests, so every member would get the Owner's study data. The server can't detect this. Use Claude Desktop or Claude Code instead.</p>
          <p class="path-lead">Request headers are a limited Anthropic beta. If the <strong>Add custom connector</strong> dialog has no <strong>Request headers</strong> section, this path isn't open to you. Use Claude Desktop or Claude Code instead.</p>
          <ol class="numbered">
            ${step(`<p>On a Free, Pro, Max or Ultra plan, go to <strong>Customize &gt; Connectors</strong> and click <strong>Add custom connector</strong>.</p>`)}
            ${step(`<p>Name it <code>Bunpro MCP</code> and set the MCP server URL to this value.</p>${copyField("MCP server URL", MCP_ENDPOINT)}`)}
            ${step(`<p>Under <strong>Authentication</strong>, choose <strong>No sign-in</strong>.</p>`)}
            ${step(`<p>Under <strong>Request headers</strong>, select <code>authorization</code> and enter this value, with your token in place of <code>&lt;token&gt;</code>. The server rejects a value without the <code>Bearer </code> prefix.</p>${copyField("authorization header value", "Bearer &lt;token&gt;")}`)}
            ${step(`<p>Click <strong>Add</strong>, start a new chat and ask this.</p>${askButton(CONNECTION_PROMPT)}`)}
          </ol>
          <p class="path-note">The mobile apps use the connectors you add on claude.ai in a browser. To use a new token, remove the connector and add it again with the new value. Claude doesn't let you change authentication settings after you add a connector.</p>
        </div>
      </div>
    </div>
  </section>`;
}

function toolCatalog(): string {
  return `<section class="section tools" id="tools" aria-labelledby="tools-title">
    <div class="frame" id="possibilities">
      <div class="tools-head">
        <h2 id="tools-title">Nine tools, all read only</h2>
        <p>Claude picks the tool it needs for your question. Each one comes with an example you can copy.</p>
      </div>
      <ul class="tool-grid">
        ${tools.map(tool => `<li class="tool">
          <h3>${tool.name}</h3>
          <code class="tool-key">${tool.key}</code>
          <p>${tool.description}</p>
          ${askButton(tool.prompt)}
        </li>`).join("")}
      </ul>
      <p class="tools-note">None of the tools can submit answers, start lessons, change your review level, edit decks, or update account settings.</p>
    </div>
  </section>`;
}

function chatgptSetup(): string {
  return `<section class="section chatgpt" id="setup" aria-labelledby="setup-title">
    <div class="frame chatgpt-grid">
      <div class="chatgpt-copy">
        <h2 id="setup-title">Use it with ChatGPT</h2>
        <p>This is a community-made connection, so it is not available in ChatGPT's official directory. It takes about three minutes to enter the values yourself.</p>
        <p class="soft">Your ChatGPT account needs access to Developer mode and custom MCPs. Work accounts may require an administrator to enable them. <a class="text-link" href="${OPENAI_MCP_GUIDE_URL}" target="_blank" rel="noreferrer">Official OpenAI guide</a></p>
        <ol class="steps">
          <li><h3>Copy your Bunpro Account API Token</h3><p>Open <strong>Bunpro &gt; Settings &gt; API</strong> and copy your Account API Token. Treat it like a password. Don't paste it into a chat message, prompt, screenshot, URL or support post.</p></li>
          <li><h3>Turn on Developer mode</h3><p>Open ChatGPT Settings and turn on <strong>Developer mode</strong>. It is usually under <strong>Security and login</strong>, though its place can vary by app or workspace.</p></li>
          <li><h3>Open the custom MCP screen</h3><p>Go to the ChatGPT Plugins page, select the <strong>+</strong> button, then choose the option to create a custom MCP connection. <a class="text-link" href="${CHATGPT_PLUGINS_URL}" target="_blank" rel="noreferrer">Open ChatGPT Plugins</a></p></li>
          <li><h3>Enter the connection details</h3><p>Copy the exact values from the form shown here. Leave the <strong>Bearer token env var</strong> field empty.</p></li>
          <li><h3>Save and test it</h3><p>Save the connection, start a new chat with Bunpro MCP turned on, and ask this.</p>${askButton(CONNECTION_PROMPT)}</li>
        </ol>
      </div>
      <div class="form-stage">
        <div class="form" data-ui>
          <p class="form-title">Custom MCP connection</p>
          <div class="field"><span class="field-label">Name</span>${copyField("Name", "Bunpro MCP")}</div>
          <div class="field"><span class="field-label">Description</span>${copyField("Description", "Read-only Bunpro study activity, reviews, schedule, decks, progress, and trends.")}</div>
          <div class="field"><span class="field-label">Connection type</span><div class="select">Streamable HTTP</div></div>
          <div class="field"><span class="field-label">MCP server URL</span>${copyField("MCP server URL", MCP_ENDPOINT)}</div>
          <div class="field"><span class="field-label">Bearer token env var</span><div class="empty">Leave blank</div></div>
          <div class="field-group">
            <p class="group-title">Protected custom header</p>
            <div class="field"><span class="field-label">Header name</span>${copyField("Header name", BUNPRO_TOKEN_HEADER)}</div>
            <div class="field"><span class="field-label">Header value</span><div class="secret">Paste your Bunpro Account API Token</div></div>
          </div>
        </div>
        <p class="form-note"><strong>Using another MCP app?</strong> Use the same server URL and add your token as a protected <code>${BUNPRO_TOKEN_HEADER}</code> header. If your app only offers Bearer authentication, use your token there instead. Choose one method, never both.</p>
      </div>
    </div>
  </section>`;
}

function privacy(): string {
  const stages = [
    {
      name: "Saved in your app",
      clause: "Your app keeps the token",
      detail: "You paste the token once. Each app stores it in its own protected place, and this website never sees it.",
      fragment: `<p class="ui-title">Where the token is held</p>
        <dl class="ui-rows">
          <div><dt>Claude Code plugin</dt><dd>System secure store</dd></div>
          <div><dt>Claude Desktop</dt><dd>Your computer's secure storage</dd></div>
          <div><dt>claude.ai</dt><dd>Claude, as the connector's credential</dd></div>
          <div><dt>ChatGPT</dt><dd>A protected custom header</dd></div>
        </dl>`
    },
    {
      name: "Sent with a request",
      clause: "It travels in a request header",
      detail: "When Claude calls a tool, your app sends the token over HTTPS in a header. It never goes into the chat, so the language model doesn't receive it.",
      fragment: `<p class="ui-title">One tool call</p>
        <pre class="ui-code"><code>POST /mcp
Authorization: Bearer &lt;token&gt;

tool: get_review_schedule</code></pre>
        <p class="ui-foot">With Claude Desktop the server runs on your computer, so this request never leaves it.</p>`
    },
    {
      name: "Read from Bunpro",
      clause: "The server reads Bunpro, nothing more",
      detail: "The server makes only the Bunpro requests needed for that answer. If Bunpro asks it to slow down, it stops instead of retrying.",
      fragment: `<p class="ui-title">What the call does</p>
        <dl class="ui-rows">
          <div><dt>Reads</dt><dd>Due reviews and forecast</dd></div>
          <div><dt>Writes</dt><dd>Nothing</dd></div>
          <div><dt>On a rate limit</dt><dd>Stops and reports it</dd></div>
        </dl>`
    },
    {
      name: "Forgotten",
      clause: "Nothing is kept afterwards",
      detail: "There is no extra account and no study-history database. The service logs a request ID, the path, the status and the duration.",
      fragment: `<p class="ui-title">After the answer</p>
        <dl class="ui-rows">
          <div><dt>Token</dt><dd>Not stored</dd></div>
          <div><dt>Study history</dt><dd>Not stored</dd></div>
          <div><dt>Account or session</dt><dd>None created</dd></div>
          <div><dt>Logs</dt><dd>Request ID, path, status, duration</dd></div>
        </dl>`
    }
  ];
  return `<section class="section privacy" id="privacy" aria-labelledby="privacy-title">
    <div class="frame privacy-head">
      <h2 id="privacy-title">Where your token goes</h2>
      <p>There is no extra account, and this service doesn't save your token or study history. Your app sends the token only when it asks Bunpro a question for you.</p>
    </div>
    <div class="flow">
      <div class="flow-stages">
        ${stages.map((stage, index) => `<div class="flow-stage" data-stage="${index}">
          <div class="flow-text"><h3>${stage.clause}</h3><p>${stage.detail}</p></div>
          <div class="flow-ui"><div class="ui-card" data-ui>${stage.fragment}</div></div>
        </div>`).join("")}
      </div>
      <div class="flow-control frame">
        <label class="sr-only" for="flow-range">Step in the request</label>
        <input id="flow-range" type="range" min="0" max="${stages.length - 1}" step="1" value="0" aria-valuetext="${stages[0]!.name}" data-names="${stages.map(stage => stage.name).join("|")}">
        <div class="flow-names">${stages.map((stage, index) => `<button type="button" data-goto="${index}">${stage.name}</button>`).join("")}</div>
      </div>
    </div>
    <div class="frame privacy-lists">
      <div><h3>What the server does</h3><ul><li>Uses an encrypted connection</li><li>Uses your token only for your request</li><li>Returns only the study data needed</li><li>Stops safely if Bunpro can't be reached</li></ul></div>
      <div><h3>What it doesn't do</h3><ul><li>Store tokens, sessions or study history</li><li>Send your token to the language model</li><li>Retry aggressively after Bunpro rate limiting</li><li>Change reviews, lessons, progress, decks or settings</li></ul></div>
      <div class="trust"><h3>Who you are trusting</h3><p>As with any hosted service, the service owner and hosting provider could technically see data while a request is being handled. The study data a tool returns goes to your app and its model provider. If that trust boundary isn't acceptable to you, use Claude Desktop, run Bunpro MCP locally, or deploy your own server. <a class="text-link" href="${PRIVACY_URL}" target="_blank" rel="noreferrer">Read PRIVACY.md</a></p></div>
    </div>
  </section>`;
}

function selfHost(): string {
  return `<section class="section self-host" id="self-host" aria-labelledby="self-host-title">
    <div class="frame self-host-grid">
      <div>
        <h2 id="self-host-title">Run your own server</h2>
        <p>Bunpro MCP is open source under the MIT license. You can read the implementation, run it locally over stdio, or deploy your own stateless Streamable HTTP server.</p>
        <div class="hero-actions"><a class="button" href="${SOURCE_REPOSITORY_URL}" target="_blank" rel="noreferrer">View source on GitHub</a><a class="text-link" href="${SELF_HOSTING_GUIDE_URL}" target="_blank" rel="noreferrer">Self-hosting guide</a></div>
      </div>
      <div class="self-host-list">
        <div><h3>Run with stdio</h3><p>Clone the repository, build it with Node.js 20 or newer, and keep the Account API Token in your MCP client's secret environment configuration.</p></div>
        <div><h3>Deploy with Docker</h3><p>Use the included Dockerfile on Railway or another HTTPS host. Every caller supplies their own token, and the deployment needs no database or shared Bunpro credential.</p></div>
        <div><h3>Read it before you trust it</h3><p>Read the source, the privacy boundary and the operational limits before you connect an account or run a public instance.</p></div>
      </div>
    </div>
  </section>`;
}

function limitations(): string {
  return `<section class="section limits" aria-labelledby="limits-title">
    <div class="frame">
      <h2 id="limits-title">Know this before you connect</h2>
      <div class="limits-grid">
        <div><h3>Unofficial and experimental</h3><p>This MCP is not affiliated with or endorsed by Bunpro, OpenAI or Anthropic, and it is not an official ChatGPT or Claude listing.</p></div>
        <div><h3>Bunpro access can change</h3><p>It uses Bunpro's experimental Account API Token. Bunpro may change or limit what the connection can read.</p></div>
        <div><h3>Missing doesn't always mean zero</h3><p>Bunpro doesn't keep the same amount of history for every feature. When information is missing, the answer says so instead of assuming you did nothing.</p></div>
        <div><h3>Light on purpose</h3><p>You can look back up to 93 days at a time. If Bunpro asks the service to slow down, it waits for you to try again instead of sending more requests.</p></div>
      </div>
    </div>
  </section>`;
}

function helpItem(title: string, copy: string): string {
  return `<div class="help-item"><h4>${title}</h4><p>${copy}</p></div>`;
}

function troubleshooting(): string {
  return `<section class="section help" id="help" aria-labelledby="help-title">
    <div class="frame">
      <h2 id="help-title">If setup doesn't work</h2>
      <div class="help-grid">
        <div class="help-group">
          <h3>Claude</h3>
          ${helpItem("Claude Code doesn't show Bunpro as connected", "Run <code>/reload-plugins</code>, then <code>/mcp</code> again. If you set up Claude Code by hand, set <code>BUNPRO_API_TOKEN</code> before you start it. Without it, Claude Code sends the placeholder text and the server returns HTTP 401.")}
          ${helpItem("Claude Desktop has no Extensions setting", "Your organization has turned extensions off. Use the Claude Code plugin instead.")}
          ${helpItem("claude.ai says it couldn't reach the MCP server", "A connector added without the <code>authorization</code> request header fails this way. Remove it and add it again with <code>Bearer &lt;token&gt;</code> as the value. If the dialog has no Request headers section, use Claude Desktop or Claude Code.")}
        </div>
        <div class="help-group">
          <h3>ChatGPT</h3>
          ${helpItem("I can't see the + or custom MCP option", "Check that Developer mode is on. Custom MCP creation can depend on your ChatGPT plan, app version, workspace policy and administrator approval.")}
          ${helpItem("ChatGPT says a token is required", `Check that the header name is exactly ${BUNPRO_TOKEN_HEADER}. Paste the raw Account API Token as its protected value, leave the Bearer env var field blank, and don't use both methods.`)}
          ${helpItem("The connection used to work", "Check that your Bunpro token is still current. Remove or turn off old Bunpro connections, add this one again with the current URL and protected header, then test from a new chat.")}
        </div>
        <div class="help-group">
          <h3>Either app</h3>
          ${helpItem("A day looks empty or incomplete", "Ask for the coverage. A missing source record means Bunpro gave no evidence for that date. It doesn't prove you did nothing.")}
          ${helpItem("Bunpro asked me to slow down", "Wait a little before you try again. Bunpro MCP doesn't keep retrying in the background.")}
          ${helpItem("I want to check the service itself", `Open the public <a class="text-link" href="/healthz" target="_blank">health check</a>. It confirms the hosted server is reachable. It doesn't test or expose your Bunpro token.`)}
        </div>
      </div>
    </div>
  </section>`;
}

function faq(): string {
  const items = [
    ["Is this an official Bunpro, Anthropic or OpenAI plugin?", "No. It is an unofficial community MCP. It is not affiliated with or endorsed by Bunpro, OpenAI or Anthropic, and it is not published as an official ChatGPT or Claude listing."],
    ["Which Claude app should I use?", "Claude Desktop keeps your token on your computer and sends it only to Bunpro. The Claude Code plugin adds a study-plan skill and sends your token to the hosted service. claude.ai needs the request-headers beta and must not be used on a Team or Enterprise plan."],
    ["Can it change anything in Bunpro?", "No. All nine tools are read only. The server doesn't start or submit reviews, change SRS state, add lessons, run crams, edit decks or change account settings."],
    ["Does this website receive my token?", "No. This page is static and has no token field. You paste the token only into your app's protected credential field, never into this website or a chat message."],
    ["Does the server store my data?", "No. This service has no account or study-history database. It uses your token and Bunpro data only while it answers the current request."],
    ["Is the source code public?", `Yes. Bunpro MCP is open source under the MIT license. You can read, fork and contribute to it on <a class="text-link" href="${SOURCE_REPOSITORY_URL}" target="_blank" rel="noreferrer">GitHub</a>.`],
    ["Can I run it myself?", `Yes. Run it locally over stdio or deploy the included Docker image as a stateless Streamable HTTP service. The <a class="text-link" href="${SELF_HOSTING_GUIDE_URL}" target="_blank" rel="noreferrer">self-hosting guide</a> covers local, Docker, Railway and other HTTPS hosts.`],
    ["Can a link install it or fill in the ChatGPT form?", "No supported link fills in the custom MCP form. The ChatGPT Plugins URL takes you to the right area, but you enter and check the connection values yourself."],
    ["Will it work in every ChatGPT account?", "Not always. Developer mode and custom MCP creation can depend on your plan, app version, workspace policy and administrator. Other Streamable HTTP MCP clients can also connect."],
    ["Why are some dates marked as missing?", "Bunpro doesn't keep the same amount of history for every feature. The answer marks missing information clearly instead of treating it as zero activity."],
    ["What should I do if I exposed my token?", "Rotate or replace the Account API Token in Bunpro, then update or recreate the protected credential in every app where you set it up."]
  ];
  return `<section class="section faq" aria-labelledby="faq-title">
    <div class="frame faq-grid">
      <h2 id="faq-title">Questions people ask</h2>
      <div class="faq-list">
        ${items.map(([question, answer], index) => `<details${index === 0 ? " open" : ""}><summary>${question}</summary><div class="faq-a"><p>${answer}</p></div></details>`).join("")}
      </div>
    </div>
  </section>`;
}

function closing(): string {
  return `<section class="closing" aria-labelledby="closing-title">
    <div class="frame closing-inner">
      <h2 id="closing-title">Ask Claude what to study today</h2>
      <div class="hero-actions"><a class="button" href="#claude">Add it to Claude</a><a class="text-link" href="#setup">Or set it up in ChatGPT</a></div>
    </div>
  </section>`;
}

function footer(): string {
  return `<footer class="site-footer">
    <div class="frame footer-line">
      <span>Bunpro MCP, an unofficial community project</span>
      <nav aria-label="Footer"><a href="${SOURCE_REPOSITORY_URL}" target="_blank" rel="noreferrer">GitHub</a><a href="${CLAUDE_SETUP_GUIDE_URL}" target="_blank" rel="noreferrer">Claude setup guide</a><a href="${SELF_HOSTING_GUIDE_URL}" target="_blank" rel="noreferrer">Self-hosting guide</a><a href="${OPENAI_MCP_GUIDE_URL}" target="_blank" rel="noreferrer">OpenAI MCP guide</a><a href="#help">Help</a></nav>
      <span>© ${new Date().getUTCFullYear()} · Not affiliated with Bunpro, OpenAI or Anthropic.</span>
    </div>
  </footer>`;
}

function pageScript(): string {
  return `(() => {
    const root = document.documentElement;
    root.classList.add('js');

    const menuButton = document.querySelector('.menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const setMenu = open => {
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.textContent = open ? 'Close' : 'Menu';
      mobileMenu.hidden = !open;
    };
    menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));

    const toast = document.querySelector('.toast');
    let toastTimer;
    const copyText = async value => {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        const input = document.createElement('textarea');
        input.value = value;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      toast.textContent = 'Copied to clipboard';
      toast.classList.add('visible');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 1800);
    };
    document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', () => {
      const value = button.getAttribute('data-copy');
      if (value) void copyText(value);
    }));

    document.querySelectorAll('[role="tablist"]').forEach(list => {
      const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
      const select = (tab, focus) => {
        tabs.forEach(other => {
          const selected = other === tab;
          other.setAttribute('aria-selected', String(selected));
          other.tabIndex = selected ? 0 : -1;
          document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
        });
        if (focus) tab.focus();
      };
      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => select(tab, false));
        tab.addEventListener('keydown', event => {
          const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
          if (event.key === 'Home') { event.preventDefault(); select(tabs[0], true); }
          else if (event.key === 'End') { event.preventDefault(); select(tabs[tabs.length - 1], true); }
          else if (step) { event.preventDefault(); select(tabs[(index + step + tabs.length) % tabs.length], true); }
        });
      });
      select(tabs.find(tab => tab.getAttribute('aria-selected') === 'true') || tabs[0], false);
    });

    const range = document.getElementById('flow-range');
    const stages = Array.from(document.querySelectorAll('.flow-stage'));
    const goto = Array.from(document.querySelectorAll('[data-goto]'));
    const names = range.dataset.names.split('|');
    const setStage = value => {
      const current = Number(value);
      range.value = String(current);
      range.setAttribute('aria-valuetext', names[current]);
      stages.forEach((stage, index) => stage.classList.toggle('is-current', index === current));
      goto.forEach((button, index) => button.classList.toggle('is-current', index === current));
    };
    range.addEventListener('input', () => setStage(range.value));
    goto.forEach(button => button.addEventListener('click', () => setStage(button.dataset.goto)));
    setStage(0);

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
      root.classList.add('has-motion');
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -5% 0px', threshold: 0 });
      document.querySelectorAll('.section > .frame > *:not(.tool-grid), .tool-grid > li, .flow, .closing-inner > *').forEach(element => {
        element.classList.add('rise');
        observer.observe(element);
      });
    }
  })();`;
}

function styles(): string {
  return `
    :root {
      --bg: #ebece8;
      --surface: #dfe1db;
      --field: #cdd1c6;
      --ink: #1f211d;
      --soft: #52574e;
      --accent: #4b5b44;
      --accent-press: #3a4834;
      --accent-ink: #ffffff;
      --deep: #22251f;
      --deep-ink: #eef0ea;
      --deep-soft: #b8bdb1;
      --ui: #f8f9f9;
      --ui-line: #cfd2ca;
      --ui-soft: #5f645a;
      --warn: #efe3c2;
      --font: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Hiragino Sans", "Noto Sans JP", sans-serif;
      --code: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; /* taste-skill-ignore: literal code only */
      --s-small: 14px;
      --s-body: clamp(1.0625rem, 1rem + .25vw, 1.1875rem);
      --s-lead: clamp(1.25rem, 1.1rem + .7vw, 1.625rem);
      --s-head: clamp(2rem, 1.3rem + 3.2vw, 4rem);
      --s-display: clamp(2.75rem, 5.2vw, 5rem);
      --margin: clamp(16px, 3vw, 40px);
      --frame: 1360px;
      --gap: clamp(96px, 12vw, 176px);
    }
    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
    body { margin: 0; background: var(--bg); color: var(--ink); font: 400 var(--s-body)/1.55 var(--font); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    h1, h2, h3, h4, p, ul, ol, dl, dd { margin: 0; }
    ul, ol { padding: 0; list-style: none; }
    a { color: inherit; }
    button, input { font: inherit; color: inherit; }
    button { cursor: pointer; }
    code, pre { font-family: var(--code); font-size: .88em; }
    strong { font-weight: 600; }
    [hidden] { display: none !important; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .frame { width: min(100% - 2 * var(--margin), var(--frame)); margin-inline: auto; }
    :focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
    .skip-link { position: absolute; left: 16px; top: -80px; z-index: 100; padding: 12px 18px; background: var(--ink); color: var(--bg); }
    .skip-link:focus { top: 16px; }

    h2 { font-size: var(--s-head); font-weight: 600; line-height: 1.02; letter-spacing: -.035em; max-width: 16ch; text-wrap: balance; }
    h3 { font-size: var(--s-lead); font-weight: 600; line-height: 1.2; letter-spacing: -.015em; }
    h4 { font-size: var(--s-body); font-weight: 600; line-height: 1.35; }
    .section { padding-top: var(--gap); }
    .soft { color: var(--soft); }

    .button { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 22px; background: var(--accent); color: var(--accent-ink); font-size: 16px; font-weight: 600; text-decoration: none; border: 0; transition: background-color .18s ease, transform .18s ease; }
    .button:hover { background: var(--accent-press); }
    .button:active { transform: translateY(1px); }
    .button-quiet { background: var(--ink); color: var(--bg); min-height: 44px; }
    .button-quiet:hover { background: #3a3d36; }
    .text-link { font-weight: 600; text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 4px; text-decoration-color: var(--accent); transition: text-decoration-color .18s ease, color .18s ease; }
    .text-link:hover { text-decoration-color: currentColor; color: var(--accent-press); }
    .hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 16px 28px; margin-top: 32px; }

    .site-header { padding-top: 20px; }
    .header-inner { display: flex; align-items: center; gap: 32px; min-height: 56px; }
    .wordmark { font-size: 20px; font-weight: 700; letter-spacing: -.02em; text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; gap: 10px; }
    .wordmark span { font-size: var(--s-small); font-weight: 500; letter-spacing: 0; color: var(--soft); }
    .desktop-nav { margin-left: auto; display: flex; gap: 28px; }
    .desktop-nav a, .mobile-nav a { font-size: 16px; font-weight: 500; text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; }
    .desktop-nav a:hover { text-decoration: underline; text-underline-offset: 6px; text-decoration-thickness: 2px; }
    .header-cta { min-height: 44px; padding: 0 18px; }
    .menu-button { display: none; margin-left: auto; min-height: 44px; padding: 0 16px; background: var(--surface); border: 0; font-weight: 600; }
    .mobile-nav { display: none; }

    .hero { position: relative; padding-top: clamp(56px, 9vw, 120px); }
    .hero h1 { font-size: var(--s-display); font-weight: 600; line-height: 1; letter-spacing: -.04em; max-width: 9.2em; }
    .lede { margin-top: 32px; max-width: 40ch; font-size: var(--s-body); }
    .hero-paths { margin-top: 24px; max-width: 40ch; font-size: var(--s-small); color: var(--soft); }
    .stage { position: relative; margin-top: clamp(-260px, -18vw, -160px); margin-left: calc(var(--margin) + max(0px, (100vw - 2 * var(--margin) - var(--frame)) / 2) + min(100vw - 2 * var(--margin), var(--frame)) * 5 / 12); background: var(--accent); padding: 80px 0 72px 80px; clip-path: polygon(100px 0, 100% 0, 100% 100%, 0 100%, 0 100px); }

    [data-ui] { font-size: 16px; line-height: 1.5; color: var(--ink); }
    .chat { width: min(640px, 100%); background: var(--ui); border-radius: 10px; padding: 8px 8px 0; }
    .chat-tabs { display: flex; gap: 4px; padding: 4px; background: #eceee8; border-radius: 8px; }
    .chat-tabs [role="tab"] { flex: 1; min-height: 40px; padding: 0 12px; border: 0; border-radius: 6px; background: transparent; font-size: 14px; font-weight: 500; color: var(--ui-soft); transition: background-color .18s ease, color .18s ease; }
    .chat-tabs [role="tab"]:hover { color: var(--ink); }
    .chat-tabs [role="tab"][aria-selected="true"] { background: #ffffff; color: var(--ink); }
    .chat-panel { padding: 22px 22px 8px; min-height: 360px; }
    .who { font-size: 14px; font-weight: 600; color: var(--ui-soft); margin-bottom: 4px; }
    .you { font-size: 18px; margin-bottom: 14px; }
    .calls { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
    .calls li { font-size: 14px; padding: 4px 10px; border-radius: 6px; background: #e9ece4; color: var(--ui-soft); }
    .calls code { color: var(--ink); font-size: 14px; }
    .reply > p { margin-bottom: 12px; }
    .plan { display: grid; gap: 6px; }
    .plan li { display: grid; grid-template-columns: 64px 1fr; gap: 12px; padding: 10px 12px; background: #eef0ea; border-radius: 6px; }
    [lang="ja"] { white-space: nowrap; }
    .plan b { font-weight: 600; font-variant-numeric: tabular-nums; }
    .days { display: grid; grid-template-columns: repeat(15, 1fr); gap: 4px; max-width: 420px; }
    .days i { aspect-ratio: 1; border-radius: 3px; background: var(--accent); }
    .days i.miss { background: #dcdfd6; }
    .key { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 14px; color: var(--ui-soft); }
    .key i { width: 12px; height: 12px; border-radius: 3px; background: var(--accent); display: inline-block; }
    .key i.miss { background: #dcdfd6; margin-left: 10px; }
    .levels { display: grid; gap: 8px; }
    .levels div { display: grid; grid-template-columns: 36px 1fr; align-items: center; gap: 10px; }
    .levels dt { font-weight: 600; }
    .levels dd { display: grid; grid-template-columns: 1fr 44px; align-items: center; gap: 10px; font-variant-numeric: tabular-nums; text-align: right; }
    .bar { height: 10px; background: #e2e4dd; border-radius: 5px; overflow: hidden; }
    .bar i { display: block; height: 100%; background: var(--accent); border-radius: 5px; }
    .chat-foot { padding: 10px 22px 14px; font-size: 14px; color: var(--ui-soft); }

    .claude-grid { display: grid; grid-template-columns: 4fr 8fr; gap: 48px 64px; align-items: start; }
    .claude-intro { display: grid; gap: 20px; justify-items: start; position: sticky; top: 32px; }
    .claude-intro > p:first-of-type { font-size: var(--s-lead); line-height: 1.4; }
    .token-note { padding: 20px 22px; background: var(--surface); }
    .paths { background: var(--ui); border-radius: 12px; padding: 12px 12px 32px; }
    .path-tabs { display: flex; gap: 4px; padding: 4px; background: #e9ece4; border-radius: 8px; }
    .path-tabs [role="tab"] { flex: 1; display: grid; gap: 2px; text-align: left; padding: 10px 14px; border: 0; border-radius: 6px; background: transparent; color: var(--ui-soft); transition: background-color .18s ease, color .18s ease; }
    .path-tabs [role="tab"]:hover { color: var(--ink); }
    .path-tabs [role="tab"][aria-selected="true"] { background: #ffffff; color: var(--ink); }
    .tab-name { font-size: 16px; font-weight: 600; }
    .tab-note { font-size: var(--s-small); }
    .path { padding: 28px 20px 0; }
    .path + .path { margin-top: 40px; }
    .js .path + .path { margin-top: 0; }
    .path h3 { font-size: var(--s-lead); }
    .path-lead { margin-top: 10px; max-width: 64ch; }
    .warning { margin-top: 14px; padding: 16px 20px; background: var(--warn); border-radius: 8px; max-width: 64ch; }
    .numbered { counter-reset: step; display: grid; gap: 22px; margin-top: 28px; }
    .numbered li { counter-increment: step; display: grid; grid-template-columns: 28px 1fr; gap: 16px; }
    .numbered li::before { content: counter(step); width: 28px; height: 28px; border-radius: 50%; background: var(--deep); color: var(--deep-ink); font-size: 14px; font-weight: 600; display: grid; place-items: center; }
    .step-body { display: grid; gap: 12px; justify-items: start; min-width: 0; padding-top: 2px; }
    .caution { font-size: 16px; color: var(--soft); }
    .path-note { margin-top: 28px; padding-top: 20px; max-width: 70ch; color: var(--soft); box-shadow: inset 0 1px 0 #e3e5df; }
    .copy { display: flex; align-items: stretch; max-width: 100%; background: #eef0ea; border-radius: 6px; }
    .copy code { flex: 1; padding: 10px 14px; font-size: 14px; overflow-wrap: anywhere; align-self: center; }
    .copy button { flex: none; min-width: 64px; min-height: 44px; border: 0; background: #e6e9e1; font-size: 14px; font-weight: 600; border-radius: 0 6px 6px 0; transition: background-color .18s ease; }
    .copy button:hover { background: #d6dad0; }
    .ask { text-align: left; padding: 10px 16px; min-height: 44px; border: 0; background: #eef0ea; border-radius: 6px; font-size: 16px; transition: background-color .18s ease, color .18s ease; }
    .ask::after { content: "Copy"; margin-left: 12px; font-size: 14px; font-weight: 600; color: var(--accent); }
    .ask:hover { background: #ffffff; }
    .ask:hover::after { color: var(--accent-press); text-decoration: underline; }

    .tools-head { display: grid; grid-template-columns: 5fr 7fr; gap: 24px 48px; align-items: end; }
    .tools-head p { max-width: 44ch; }
    .tool-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; margin-top: 48px; }
    .tool { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 28px 28px 24px; background: var(--surface); }
    .tool h3 { font-size: 22px; }
    .tool-key { font-size: 14px; color: var(--soft); }
    .tool p { margin-bottom: 12px; }
    .tool .ask { margin-top: auto; background: var(--ui); font-size: 15px; }
    .tools-note { margin-top: 32px; max-width: 64ch; color: var(--soft); }

    .chatgpt-grid { display: grid; grid-template-columns: 5fr 7fr; gap: 64px; align-items: start; }
    .chatgpt-copy > p { margin-top: 20px; max-width: 48ch; }
    .steps { counter-reset: step; display: grid; gap: 28px; margin-top: 40px; }
    .steps li { display: grid; gap: 8px; justify-items: start; }
    .steps h3 { font-size: var(--s-body); }
    .steps p { max-width: 52ch; }
    .form-stage { background: var(--field); padding: clamp(24px, 4vw, 56px); position: sticky; top: 24px; }
    .form { background: var(--ui); border-radius: 10px; padding: 24px; display: grid; gap: 16px; }
    .form-title { font-size: 18px; font-weight: 600; }
    .field { display: grid; gap: 6px; }
    .field-label { font-size: 14px; font-weight: 600; color: var(--ui-soft); }
    .select, .empty, .secret { min-height: 44px; display: flex; align-items: center; padding: 0 14px; border-radius: 6px; font-size: 14px; }
    .select { border: 1px solid var(--ui-line); justify-content: space-between; }
    .select::after { content: ""; width: 8px; height: 8px; border-right: 2px solid var(--ui-soft); border-bottom: 2px solid var(--ui-soft); transform: rotate(45deg) translateY(-3px); }
    .empty { border: 1px solid var(--ui-line); color: var(--ui-soft); font-style: italic; }
    .secret { background: #eef0ea; color: var(--ui-soft); }
    .field-group { display: grid; gap: 12px; padding: 16px; border-radius: 8px; background: #eef0ea; }
    .field-group .copy { background: #ffffff; }
    .field-group .secret { background: #ffffff; border: 1px solid var(--ui-line); }
    .group-title { font-size: 14px; font-weight: 600; }
    .form-note { margin-top: 24px; }

    .privacy-head { display: grid; grid-template-columns: 5fr 7fr; gap: 24px 48px; align-items: end; }
    .privacy-head p { max-width: 46ch; }
    .flow { margin-top: 56px; background: var(--deep); color: var(--deep-ink); }
    .flow-stage { display: grid; grid-template-columns: 1fr 1fr; }
    .js .flow-stage { display: none; }
    .js .flow-stage.is-current { display: grid; animation: fade .2s ease; }
    .flow-text { padding: clamp(40px, 6vw, 88px) var(--margin) 40px max(var(--margin), (100vw - var(--frame)) / 2); }
    .flow-text h3 { font-size: var(--s-head); line-height: 1.04; letter-spacing: -.035em; max-width: 13ch; text-wrap: balance; }
    .flow-text p { margin-top: 24px; max-width: 40ch; color: var(--deep-soft); }
    .flow-ui { background: var(--surface); display: grid; place-items: center; padding: 48px var(--margin); min-height: 420px; }
    .ui-card { width: min(100%, 460px); background: var(--ui); border-radius: 10px; padding: 20px 22px; }
    .ui-title { font-size: 14px; font-weight: 600; color: var(--ui-soft); margin-bottom: 12px; }
    .ui-rows { display: grid; gap: 4px; }
    .ui-rows div { display: grid; grid-template-columns: 1fr 1.2fr; gap: 12px; padding: 10px 12px; background: #eef0ea; border-radius: 6px; }
    .ui-rows dt { font-weight: 600; }
    .ui-code { margin: 0; padding: 16px; background: #eef0ea; border-radius: 6px; font-size: 14px; line-height: 1.6; overflow-x: auto; white-space: pre-wrap; }
    .ui-code code { font-size: inherit; }
    .ui-foot { margin-top: 12px; font-size: 14px; color: var(--ui-soft); }
    .flow-control { display: none; padding: 24px 0 32px; }
    .js .flow-control { display: block; }
    .flow-control input { width: 100%; height: 32px; margin: 0; background: transparent; -webkit-appearance: none; appearance: none; cursor: pointer; }
    .flow-control input::-webkit-slider-runnable-track { height: 8px; background: #4a4e45; }
    .flow-control input::-moz-range-track { height: 8px; background: #4a4e45; }
    .flow-control input::-moz-range-progress { height: 8px; background: var(--deep-ink); }
    .flow-control input::-webkit-slider-thumb { -webkit-appearance: none; width: 32px; height: 32px; margin-top: -12px; background: #9fb391; border: 0; border-radius: 0; }
    .flow-control input::-moz-range-thumb { width: 32px; height: 32px; background: #9fb391; border: 0; border-radius: 0; }
    .flow-control input:focus-visible { outline-color: var(--deep-ink); }
    .flow-names { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 12px; }
    .flow-names button { min-height: 44px; padding: 0; border: 0; background: transparent; text-align: left; font-size: var(--s-body); color: var(--deep-soft); transition: color .18s ease; }
    .flow-names button:nth-child(2) { text-align: center; padding-right: 16%; }
    .flow-names button:nth-child(3) { text-align: center; padding-left: 16%; }
    .flow-names button:last-child { text-align: right; }
    .flow-names button.is-current, .flow-names button:hover { color: var(--deep-ink); }
    .flow-names button:focus-visible { outline-color: var(--deep-ink); }
    .privacy-lists { display: grid; grid-template-columns: 1fr 1fr 1.3fr; gap: 48px; margin-top: 72px; }
    .privacy-lists h3 { margin-bottom: 14px; }
    .privacy-lists li { padding: 8px 0 8px 22px; position: relative; }
    .privacy-lists li::before { content: ""; position: absolute; left: 0; top: 18px; width: 8px; height: 8px; background: var(--accent); }
    .trust { background: var(--surface); padding: 28px; }
    .trust p { margin-bottom: 0; }

    .self-host-grid { display: grid; grid-template-columns: 5fr 7fr; gap: 64px; align-items: start; }
    .self-host-grid > div > p { margin-top: 20px; max-width: 44ch; }
    .self-host-list { display: grid; gap: 40px; padding-top: 8px; }
    .self-host-list p { margin-top: 8px; max-width: 58ch; }

    .limits { padding-bottom: 0; }
    .limits > .frame { background: var(--deep); color: var(--deep-ink); padding: clamp(40px, 6vw, 88px) clamp(24px, 5vw, 72px); width: min(100% - 2 * var(--margin), var(--frame)); }
    .limits-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px 64px; margin-top: 48px; }
    .limits-grid p { margin-top: 10px; color: var(--deep-soft); max-width: 52ch; }

    .help-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 48px; margin-top: 48px; }
    .help-group h3 { padding-bottom: 12px; }
    .help-item { padding: 18px 0; }
    .help-item p { margin-top: 6px; color: var(--soft); }

    .faq-grid { display: grid; grid-template-columns: 4fr 8fr; gap: 32px 64px; align-items: start; }
    .faq-list details { box-shadow: inset 0 -1px 0 var(--ui-line); }
    .faq-list details:first-child { box-shadow: inset 0 1px 0 var(--ui-line), inset 0 -1px 0 var(--ui-line); }
    .faq-list summary { display: flex; justify-content: space-between; align-items: center; gap: 24px; min-height: 64px; padding: 14px 0; cursor: pointer; list-style: none; font-weight: 500; }
    .faq-list summary::-webkit-details-marker { display: none; }
    .faq-list summary::after { content: "+"; flex: none; width: 28px; height: 28px; display: grid; place-items: center; font-size: 22px; font-weight: 400; color: var(--soft); transition: transform .2s ease; }
    .faq-list details[open] summary::after { transform: rotate(45deg); }
    .faq-list summary:hover { color: var(--accent-press); }
    .faq-a { padding: 0 52px 22px 0; color: var(--soft); max-width: 68ch; }
    .closing { margin-top: var(--gap); background: var(--field); }
    .closing-inner { padding-block: clamp(72px, 10vw, 140px); display: grid; grid-template-columns: 7fr 5fr; gap: 24px 48px; align-items: end; }
    .closing h2 { font-size: var(--s-display); letter-spacing: -.04em; line-height: 1; max-width: 13ch; }
    .closing .hero-actions { margin-top: 0; justify-content: flex-end; }

    .site-footer { padding: 28px 0 32px; font-size: 16px; color: var(--soft); }
    .footer-line { display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px 32px; align-items: center; }
    .footer-line nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 24px; }
    .footer-line a { color: var(--ink); text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; }
    .footer-line a:hover { text-decoration: underline; text-underline-offset: 4px; }
    .footer-line > span:last-child { text-align: right; }

    .toast { position: fixed; left: 50%; bottom: 24px; z-index: 60; padding: 12px 18px; background: var(--deep); color: var(--deep-ink); font-size: 16px; font-weight: 500; opacity: 0; pointer-events: none; transform: translate(-50%, 12px); transition: opacity .2s ease, transform .2s ease; box-shadow: 0 8px 24px rgba(0, 0, 0, .18); } /* taste-skill-ignore: floating toast */
    .toast.visible { opacity: 1; transform: translate(-50%, 0); }

    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes shutter { from { clip-path: polygon(100px 0, 100px 0, 100px 100%, 0 100%, 0 100px); } to { clip-path: polygon(100px 0, 100% 0, 100% 100%, 0 100%, 0 100px); } }
    @keyframes settle { from { transform: scale(1.06); opacity: 0; } to { transform: none; opacity: 1; } }
    .has-motion .stage { animation: shutter 1.1s cubic-bezier(.7, 0, .2, 1) both; }
    .has-motion .stage .chat { animation: settle 1s .35s cubic-bezier(.2, .7, .2, 1) both; }
    .has-motion .hero-copy > * { animation: rise .7s cubic-bezier(.2, .7, .2, 1) both; }
    .has-motion .hero-copy > :nth-child(2) { animation-delay: .08s; }
    .has-motion .hero-copy > :nth-child(3) { animation-delay: .16s; }
    @keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
    .has-motion .rise { opacity: 0; transform: translateY(24px); transition: opacity .6s ease, transform .6s cubic-bezier(.2, .7, .2, 1); }
    .has-motion .rise.is-visible { opacity: 1; transform: none; }
    .has-motion .rise:nth-child(2) { transition-delay: .07s; }
    .has-motion .rise:nth-child(3) { transition-delay: .14s; }
    .has-motion .rise:nth-child(4) { transition-delay: .21s; }

    @media (max-width: 1080px) {
      .desktop-nav { display: none; }
      .header-cta { margin-left: auto; }
      .menu-button { display: inline-flex; align-items: center; margin-left: 0; }
      .js .mobile-nav { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 16px; padding: 12px 0 8px; }
      .stage { margin-left: calc(var(--margin) + (100vw - 2 * var(--margin)) / 3); margin-top: 56px; padding-right: var(--margin); }
      .claude-grid, .faq-grid { grid-template-columns: 1fr; }
      .claude-intro { position: static; }
      .tool-grid { grid-template-columns: 1fr 1fr; }
      .chatgpt-grid, .self-host-grid { grid-template-columns: 1fr; gap: 48px; }
      .form-stage { position: static; }
      .privacy-lists { grid-template-columns: 1fr 1fr; }
      .trust { grid-column: 1 / -1; }
      .help-grid { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 760px) {
      :root { --gap: 96px; }
      body { font-size: 17px; }
      .header-cta { display: none; }
      .menu-button { margin-left: auto; }
      .hero h1 { font-size: clamp(2.5rem, 10.5vw, 3.5rem); max-width: none; }
      .lede { margin-top: 24px; }
      .hero-actions { gap: 16px; }
      .hero-actions .button { width: 100%; }
      .stage { margin: 48px 0 0; padding: 88px 16px 24px; clip-path: polygon(72px 0, 100% 0, 100% 100%, 0 100%, 0 72px); }
      @keyframes shutter { from { clip-path: polygon(72px 0, 72px 0, 72px 100%, 0 100%, 0 72px); } to { clip-path: polygon(72px 0, 100% 0, 100% 100%, 0 100%, 0 72px); } }
      .chat { width: 100%; }
      .chat-tabs [role="tab"] { padding: 0 6px; }
      .chat-panel { padding: 18px 14px 6px; min-height: 0; }
      .plan li { grid-template-columns: 52px 1fr; gap: 10px; }
      .days { grid-template-columns: repeat(10, 1fr); }
      .tools-head, .privacy-head { grid-template-columns: 1fr; }
      .tool-grid { grid-template-columns: 1fr; }
      .tool { padding: 22px 18px; }
      .token-note { padding: 18px; }
      .paths { margin-inline: calc(-1 * var(--margin)); border-radius: 0; padding: 8px 8px 24px; }
      .path-tabs [role="tab"] { flex: 1 1 auto; min-height: 48px; padding: 8px 10px; white-space: nowrap; }
      .tab-name { font-size: 15px; }
      .tab-extra { display: none; }
      .path { padding: 22px 8px 0; }
      .tab-note { display: none; }
      .copy code { padding: 10px 12px; }
      .flow-stage, .js .flow-stage.is-current { grid-template-columns: 1fr; }
      .flow-ui { order: -1; min-height: 0; padding: 32px 16px; }
      .flow-text { padding: 28px 16px 32px; }
      .flow-text h3 { font-size: 9vw; }
      .flow-control { padding: 20px 0 8px; }
      .flow-control input::-webkit-slider-thumb { width: 40px; height: 40px; margin-top: -16px; }
      .flow-names { grid-template-columns: 1fr 1fr; gap: 0 12px; }
      .flow-names button, .flow-names button:nth-child(n) { text-align: left; padding: 0; font-size: 16px; }
      .privacy-lists, .limits-grid, .help-grid { grid-template-columns: 1fr; gap: 32px; }
      .faq-a { padding-right: 0; }
      .closing-inner { grid-template-columns: 1fr; }
      .closing h2 { font-size: 10vw; }
      .closing .hero-actions { justify-content: flex-start; }
      .footer-line { grid-template-columns: 1fr; gap: 8px; font-size: 14px; }
      .footer-line nav { justify-content: flex-start; gap: 0 20px; }
      .footer-line > span:last-child { text-align: left; }
    }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after { animation-duration: .01ms !important; animation-delay: 0s !important; transition-duration: .01ms !important; }
    }
  `;
}
