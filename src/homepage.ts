const MCP_ENDPOINT = "https://bunpro.yashkadam.com/mcp";
const CHATGPT_PLUGINS_URL = "https://chatgpt.com/plugins";
const OPENAI_MCP_GUIDE_URL = "https://developers.openai.com/plugins/deploy/connect-chatgpt";
const BUNPRO_TOKEN_HEADER = "X-Bunpro-Token";

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
  <rect width="64" height="64" rx="16" fill="#1f2923"/>
  <path d="M14 39c0-15 9-25 24-25 7 0 12 2 15 5-17-1-27 7-27 20 0 5 2 9 5 12-10-1-17-5-17-12Z" fill="none" stroke="#f3ede0" stroke-width="5" stroke-linecap="round"/>
  <circle cx="45" cy="40" r="6" fill="#b74632"/>
</svg>`;

type IconName =
  | "arrow"
  | "book"
  | "calendar"
  | "chart"
  | "check"
  | "clock"
  | "copy"
  | "external"
  | "layers"
  | "lock"
  | "menu"
  | "message"
  | "plug"
  | "shield"
  | "spark"
  | "target"
  | "terminal"
  | "trend"
  | "x";

const iconPaths: Record<IconName, string> = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  calendar: '<path d="M8 2v4M16 2v4M3 10h18"/><rect x="3" y="4" width="18" height="18" rx="2"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>',
  external: '<path d="M15 3h6v6M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"/>',
  plug: '<path d="M8 2v5M16 2v5M5 7h14v2a7 7 0 0 1-14 0V7ZM12 16v6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  spark: '<path d="m12 3-1.5 4.5L6 9l4.5 1.5L12 15l1.5-4.5L18 9l-4.5-1.5L12 3Z"/><path d="m5 15-.75 2.25L2 18l2.25.75L5 21l.75-2.25L8 18l-2.25-.75L5 15Z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  terminal: '<path d="m4 17 6-5-6-5M12 19h8"/>',
  trend: '<path d="m3 17 6-6 4 4 8-9"/><path d="M15 6h6v6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>'
};

function icon(name: IconName, className = "icon"): string {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
}

const tools = [
  {
    name: "Connection check",
    key: "get_connection_status",
    icon: "plug" as const,
    description: "Make sure ChatGPT can connect to your Bunpro account.",
    prompt: "Check my Bunpro connection."
  },
  {
    name: "Study day",
    key: "get_study_day_summary",
    icon: "calendar" as const,
    description: "See what you studied on a particular day.",
    prompt: "What did I study on 2026-08-11?"
  },
  {
    name: "Study range",
    key: "get_study_range_summary",
    icon: "layers" as const,
    description: "Look back across a week, month, or any period up to 93 days.",
    prompt: "Summarize my Bunpro study from August 1 to 11."
  },
  {
    name: "Review schedule",
    key: "get_review_schedule",
    icon: "clock" as const,
    description: "See what is due now and how busy the next few days look.",
    prompt: "How many reviews are due, and what is coming this week?"
  },
  {
    name: "Study decks",
    key: "list_study_decks",
    icon: "book" as const,
    description: "Check your active decks, daily goals, and progress.",
    prompt: "Which study decks are active and how are they progressing?"
  },
  {
    name: "Recent activity",
    key: "get_recent_activity",
    icon: "spark" as const,
    description: "Catch up on what you have reviewed recently.",
    prompt: "What have I reviewed recently?"
  },
  {
    name: "Learning progress",
    key: "get_learning_progress",
    icon: "target" as const,
    description: "See your overall progress from JLPT N5 through N1.",
    prompt: "How far along am I at each JLPT level?"
  },
  {
    name: "Activity trend",
    key: "get_activity_trend",
    icon: "trend" as const,
    description: "See how your reviews, new lessons, and accuracy change over time.",
    prompt: "How has my consistency changed over the last 30 days?"
  }
];

export function renderHomepage(_url: URL): string {
  return `<!doctype html>
<html lang="en" data-site="shibui">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f4f0e7">
  <meta name="description" content="Ask ChatGPT about your Bunpro reviews, study schedule, JLPT progress, and learning habits with an unofficial read-only connection.">
  <meta property="og:title" content="Bunpro MCP — Your Japanese study data, ready to talk">
  <meta property="og:description" content="Ask ChatGPT about your Bunpro study data with an unofficial read-only connection.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://bunpro.yashkadam.com/">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="canonical" href="https://bunpro.yashkadam.com/">
  <title>Bunpro MCP — Talk to ChatGPT about your Bunpro progress</title>
  <style>${styles()}</style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <div class="grain" aria-hidden="true"></div>
  ${header()}
  <main id="main">
    ${hero()}
    ${trustStrip()}
    ${useCases()}
    ${explanation()}
    ${setupGuide()}
    ${toolCatalog()}
    ${promptGallery()}
    ${privacy()}
    ${limitations()}
    ${troubleshooting()}
    ${faq()}
    ${closingCta()}
  </main>
  ${footer()}
  <div class="toast" role="status" aria-live="polite" aria-atomic="true"></div>
  <script>${pageScript()}</script>
</body>
</html>`;
}

function header(): string {
  return `<header class="site-header">
    <div class="shell header-inner">
      <a class="brand" href="#top" aria-label="Bunpro MCP home">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="brand-copy"><strong>Bunpro MCP</strong><small>UNOFFICIAL COMMUNITY TOOL</small></span>
      </a>
      <nav class="desktop-nav" aria-label="Primary navigation">
        <a href="#possibilities">What it does</a>
        <a href="#setup">Set up</a>
        <a href="#tools">Tools</a>
        <a href="#privacy">Privacy</a>
        <a href="#help">Help</a>
      </nav>
      <a class="button button-small header-cta" href="#setup">Connect to ChatGPT ${icon("arrow")}</a>
      <button class="menu-button" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open navigation">
        <span class="menu-open">${icon("menu")}</span><span class="menu-close">${icon("x")}</span>
      </button>
    </div>
    <nav class="mobile-nav" id="mobile-menu" aria-label="Mobile navigation" hidden>
      <a href="#possibilities">What it does</a><a href="#setup">Set up</a><a href="#tools">Tools</a><a href="#privacy">Privacy</a><a href="#help">Help</a>
      <a class="button button-primary" href="#setup">Connect to ChatGPT ${icon("arrow")}</a>
    </nav>
  </header>`;
}

function hero(): string {
  return `<section class="hero" id="top">
    <div class="shell hero-grid">
      <div class="hero-copy reveal">
        <div class="eyebrow"><span class="status-dot"></span> Unofficial community tool · read only</div>
        <h1>Your Japanese study data, <em>ready to talk.</em></h1>
        <p class="hero-lede">Ask ChatGPT about your Bunpro reviews, schedule, JLPT progress, and study habits. It can read your study data, but it can never change your account.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="#setup">Set up in ChatGPT ${icon("arrow")}</a>
          <a class="button button-ghost" href="#possibilities">See what you can ask</a>
        </div>
        <p class="micro-trust">${icon("shield")} No extra account. Nothing saved. Nothing changed.</p>
      </div>
      <div class="hero-visual reveal" aria-label="Example Bunpro study conversation">
        <div class="enso" aria-hidden="true"></div>
        <span class="jp-type" aria-hidden="true">文法</span>
        <article class="study-card">
          <div class="study-card-head"><span>今日の学習</span><small>THIS WEEK</small></div>
          <div class="question-row"><span>YOU</span><p>How is my study rhythm this week?</p></div>
          <div class="answer-row">
            <div class="answer-label">${icon("spark")} BUNPRO MCP</div>
            <p>You studied on <strong>5 of the past 7 days</strong> and completed <strong>184 reviews</strong>.</p>
            <div class="rhythm" aria-hidden="true">${[40, 75, 28, 88, 64, 18, 72].map((height, index) => `<i style="--h:${height}%"><span>${"MTWTFSS"[index]}</span></i>`).join("")}</div>
          </div>
          <footer><span>${icon("check")} From your Bunpro data</span><span>Read only</span></footer>
        </article>
        <div class="floating-note"><span>今</span><small>YOUR DATA<br>IN CONTEXT</small></div>
      </div>
    </div>
  </section>`;
}

function trustStrip(): string {
  return `<section class="trust-strip" aria-label="Product characteristics">
    <div class="shell trust-grid">
      <div>${icon("lock")}<span><b>Your token stays protected</b><small>It is handled like a password.</small></span></div>
      <div>${icon("shield")}<span><b>Completely read only</b><small>It cannot change anything in Bunpro.</small></span></div>
      <div>${icon("layers")}<span><b>Nothing is stored</b><small>No extra account or saved study history.</small></span></div>
      <div>${icon("spark")}<span><b>Made for useful questions</b><small>Reviews, progress, plans, and trends.</small></span></div>
    </div>
  </section>`;
}

function useCases(): string {
  const cases = [
    { number: "01", icon: "clock" as const, title: "Plan what is next", copy: "See reviews due now, scan the current forecast, and decide when to make time for Bunpro.", prompt: "What is due today, and how heavy does this week look?" },
    { number: "02", icon: "chart" as const, title: "Understand your rhythm", copy: "Compare study days, review volume, new content and accuracy without manually reading charts.", prompt: "Compare my last 30 days with the 30 days before that." },
    { number: "03", icon: "target" as const, title: "See the bigger picture", copy: "Ask about JLPT progress, deck goals and account totals in plain language.", prompt: "Where am I making the strongest progress toward N3?" }
  ];
  return `<section class="section possibilities" id="possibilities">
    <div class="shell">
      <div class="section-heading reveal">
        <div><span class="kicker">What it is for</span><h2>Less dashboard reading.<br><em>More useful reflection.</em></h2></div>
        <p>Connect Bunpro once, then ask about your studies in everyday language. ChatGPT works out which information it needs and explains the answer clearly.</p>
      </div>
      <div class="use-case-grid">
        ${cases.map(item => `<article class="use-case reveal">
          <div class="case-top"><span class="case-icon">${icon(item.icon)}</span><small>${item.number}</small></div>
          <h3>${item.title}</h3><p>${item.copy}</p>
          <button class="prompt-copy" type="button" data-copy="${item.prompt}" aria-label="Copy prompt: ${item.prompt}"><span>“${item.prompt}”</span>${icon("copy")}</button>
        </article>`).join("")}
      </div>
    </div>
  </section>`;
}

function explanation(): string {
  return `<section class="section explainer">
    <div class="shell explainer-grid">
      <div class="explainer-copy reveal">
        <span class="kicker">The simple version</span>
        <h2>How does it work?</h2>
        <p>MCP is simply the connection that lets ChatGPT ask Bunpro for the study information needed to answer your question.</p>
        <p>You set up the connection once in ChatGPT. After that, you can ask questions naturally—there is nothing new to install inside Bunpro.</p>
      </div>
      <div class="flow-card reveal" aria-label="How a Bunpro question is answered">
        <div><span>1</span>${icon("message")}<b>You ask</b><small>“How consistent was I?”</small></div>
        <i>${icon("arrow")}</i>
        <div><span>2</span>${icon("plug")}<b>ChatGPT checks</b><small>The Bunpro data it needs</small></div>
        <i>${icon("arrow")}</i>
        <div><span>3</span>${icon("book")}<b>You get an answer</b><small>Grounded in your study data</small></div>
      </div>
    </div>
  </section>`;
}

function setupGuide(): string {
  return `<section class="section setup" id="setup">
    <div class="shell">
      <div class="setup-heading reveal">
        <div><span class="kicker kicker-light">Manual setup · about 3 minutes</span><h2>Connect it to ChatGPT</h2></div>
        <p>This is a community-made connection, so it is not available in ChatGPT's official directory. Follow the steps below and enter the provided details yourself.</p>
      </div>

      <aside class="availability-note reveal">
        <span class="note-icon">${icon("terminal")}</span>
        <div><b>Before you start</b><p>Your ChatGPT account needs access to Developer mode and custom MCPs. Work accounts may require an administrator to enable them.</p></div>
        <a href="${OPENAI_MCP_GUIDE_URL}" target="_blank" rel="noreferrer">Official OpenAI guide ${icon("external")}</a>
      </aside>

      <div class="setup-layout">
        <ol class="setup-steps">
          <li class="step reveal">
            <span class="step-number">01</span>
            <div><h3>Copy your Bunpro Account API Token</h3><p>Open <strong>Bunpro → Settings → API</strong> and copy your Account API Token. Treat it like a password: do not paste it into a chat message, prompt, screenshot, URL, or support post.</p></div>
          </li>
          <li class="step reveal">
            <span class="step-number">02</span>
            <div><h3>Enable Developer mode in ChatGPT</h3><p>Open ChatGPT Settings and turn on <strong>Developer mode</strong>. It is usually under <strong>Security and login</strong>, although its location may vary by app or workspace.</p></div>
          </li>
          <li class="step reveal">
            <span class="step-number">03</span>
            <div><h3>Open the custom MCP screen</h3><p>Go to the ChatGPT Plugins page, select the <strong>+</strong> button, then choose the option to create a custom MCP connection.</p><a class="inline-link" href="${CHATGPT_PLUGINS_URL}" target="_blank" rel="noreferrer">Open ChatGPT Plugins ${icon("external")}</a></div>
          </li>
          <li class="step reveal">
            <span class="step-number">04</span>
            <div><h3>Enter the connection details</h3><p>Copy the exact values shown in the form preview. Leave the <strong>Bearer token env var</strong> field empty.</p></div>
          </li>
          <li class="step reveal">
            <span class="step-number">05</span>
            <div><h3>Save and test it</h3><p>Save the connection, start a new chat with Bunpro MCP enabled, and ask <button class="inline-copy" type="button" data-copy="Check my Bunpro connection.">“Check my Bunpro connection.” ${icon("copy")}</button></p></div>
          </li>
        </ol>

        <div class="connection-panel reveal">
          <div class="panel-title"><span><i></i><i></i><i></i></span><b>Custom MCP connection</b><small>EXACT VALUES</small></div>
          ${copyField("Name", "Bunpro MCP")}
          ${copyField("Description", "Read-only Bunpro study activity, reviews, schedule, decks, progress, and trends.")}
          <div class="form-row"><label>Connection type</label><div class="select-look">Streamable HTTP <span>⌄</span></div></div>
          ${copyField("MCP server URL", MCP_ENDPOINT)}
          <div class="form-row"><label>Bearer token env var</label><div class="empty-field">Leave blank</div></div>
          <div class="header-field">
            <div class="header-label"><label>Protected custom header</label><span>SECRET</span></div>
            ${copyField("Header name", BUNPRO_TOKEN_HEADER, true)}
            <div class="form-row nested"><label>Header value</label><div class="secret-look"><span>Paste your Bunpro Account API Token</span>${icon("lock")}</div></div>
          </div>
          <div class="panel-check">${icon("check")} Your token is entered only once</div>
        </div>
      </div>

      <aside class="auth-fallback reveal">
        <span>${icon("plug")}</span><div><b>Using another MCP app?</b><p>Use the same server URL and add your token as a protected <code>${BUNPRO_TOKEN_HEADER}</code> header. If your app only offers Bearer authentication, use your token there instead. Choose one method, never both.</p></div>
      </aside>
    </div>
  </section>`;
}

function copyField(label: string, value: string, nested = false): string {
  return `<div class="form-row${nested ? " nested" : ""}"><label>${label}</label><div class="copy-field"><code>${value}</code><button type="button" data-copy="${value}" aria-label="Copy ${label}">${icon("copy")}</button></div></div>`;
}

function toolCatalog(): string {
  return `<section class="section tools" id="tools">
    <div class="shell">
      <div class="section-heading reveal">
        <div><span class="kicker">What you can ask</span><h2>Eight ways to understand<br><em>your learning.</em></h2></div>
        <p>From today's workload to long-term JLPT progress, each tool answers a familiar study question without changing your Bunpro account.</p>
      </div>
      <div class="tool-grid">
        ${tools.map((tool, index) => `<article class="tool-card reveal">
          <div class="tool-top"><span class="tool-icon">${icon(tool.icon)}</span><span class="read-badge">READ ONLY</span></div>
          <small>0${index + 1} · ${tool.key}</small><h3>${tool.name}</h3><p>${tool.description}</p>
          <button type="button" class="tool-prompt" data-copy="${tool.prompt}" aria-label="Copy example prompt for ${tool.name}"><span>${tool.prompt}</span>${icon("copy")}</button>
        </article>`).join("")}
      </div>
      <p class="catalog-note reveal">It cannot submit answers, start lessons, change your review level, edit decks, or update account settings.</p>
    </div>
  </section>`;
}

function promptGallery(): string {
  const prompts = [
    ["TODAY", "What Bunpro activity is supported for today? Separate missing source data from zero activity."],
    ["PLAN", "Show my reviews due now and the forecast. What is projected rather than already completed?"],
    ["REFLECT", "Summarize the last 14 days. Which days had activity, and where is source coverage incomplete?"],
    ["PROGRESS", "Explain my JLPT progress in plain language and tell me which level has the most material in progress."],
    ["DECKS", "List my active study decks, daily goals, and completion counts."],
    ["TREND", "How did my review volume and accuracy change over the last 30 days? Show the underlying evidence."],
  ];
  return `<section class="section prompts">
    <div class="shell prompt-layout">
      <div class="prompt-intro reveal"><span class="kicker">Try asking</span><h2>Good questions make the data useful.</h2><p>Start with one of these after your connection test passes. Every card is copyable.</p></div>
      <div class="prompt-list">
        ${prompts.map(([label, prompt]) => `<button class="prompt-row reveal" type="button" data-copy="${prompt}"><small>${label}</small><span>“${prompt}”</span>${icon("copy")}</button>`).join("")}
      </div>
    </div>
  </section>`;
}

function privacy(): string {
  return `<section class="section privacy" id="privacy">
    <div class="shell">
      <div class="privacy-heading reveal"><span class="kicker kicker-light">Privacy and trust</span><h2>Your token is used to answer—<em>then forgotten.</em></h2><p>There is no extra account and your token or study history is not saved by this service. ChatGPT sends the protected token only when it asks Bunpro a question for you.</p></div>
      <div class="request-flow reveal" aria-label="Request privacy flow">
        <div><span>${icon("message")}</span><b>ChatGPT</b><small>Keeps your token protected</small></div><i>${icon("arrow")}</i>
        <div><span>${icon("lock")}</span><b>Secure request</b><small>Sends it with your question</small></div><i>${icon("arrow")}</i>
        <div><span>${icon("plug")}</span><b>Bunpro MCP</b><small>Passes the request along</small></div><i>${icon("arrow")}</i>
        <div><span>${icon("book")}</span><b>Bunpro</b><small>Returns your study data</small></div>
      </div>
      <div class="privacy-grid">
        <article class="reveal"><span>${icon("check")}</span><h3>What it does</h3><ul><li>Uses an encrypted connection</li><li>Uses your token only for your request</li><li>Returns only the study data needed</li><li>Stops safely if Bunpro cannot be reached</li></ul></article>
        <article class="reveal"><span>${icon("x")}</span><h3>What it does not do</h3><ul><li>Store tokens, sessions, or study history</li><li>Send your token to the language model</li><li>Retry aggressively after Bunpro rate limiting</li><li>Modify reviews, lessons, progress, decks, or settings</li></ul></article>
        <article class="reveal trust-boundary"><span>${icon("shield")}</span><h3>Who you are trusting</h3><p>As with any hosted service, the service owner and hosting provider could technically see data while a request is being handled. If you are not comfortable with that, run Bunpro MCP on your own computer instead.</p></article>
      </div>
    </div>
  </section>`;
}

function limitations(): string {
  return `<section class="section limitations">
    <div class="shell limitations-grid">
      <div class="limitations-title reveal"><span class="kicker">Know before you connect</span><h2>Useful, careful,<br><em>and experimental.</em></h2></div>
      <div class="limits-list">
        <article class="reveal"><span>01</span><div><h3>Unofficial community project</h3><p>This MCP is not affiliated with or endorsed by Bunpro or OpenAI, and it is not an official ChatGPT plugin listing.</p></div></article>
        <article class="reveal"><span>02</span><div><h3>Bunpro access can change</h3><p>This uses Bunpro's experimental Account API Token. Bunpro may change or limit what the connection can access.</p></div></article>
        <article class="reveal"><span>03</span><div><h3>Missing does not always mean zero</h3><p>Bunpro does not provide the same amount of history for every feature. When information is missing, the answer will say so instead of assuming you did nothing.</p></div></article>
        <article class="reveal"><span>04</span><div><h3>Kept deliberately lightweight</h3><p>You can look back up to 93 days at a time. If Bunpro asks the service to slow down, it waits for you to try again rather than repeatedly sending requests.</p></div></article>
      </div>
    </div>
  </section>`;
}

function troubleshooting(): string {
  return `<section class="section help" id="help">
    <div class="shell">
      <div class="section-heading reveal">
        <div><span class="kicker">Troubleshooting</span><h2>If setup does not work,<br><em>start here.</em></h2></div>
        <p>Most problems are fixed by checking Developer mode, your Bunpro token, or the saved connection details.</p>
      </div>
      <div class="help-grid">
        ${helpItem("I cannot see the + or custom MCP option", "Confirm Developer mode is enabled. Custom MCP creation can depend on your ChatGPT plan, app version, workspace policy, and administrator approval.")}
        ${helpItem("ChatGPT says a token is required", `Check the header name is exactly ${BUNPRO_TOKEN_HEADER}. Paste the raw Account API Token as its protected value, leave the Bearer env-var field blank, and do not use both auth methods.`)}
        ${helpItem("The connection used to work", "Confirm the Bunpro token is still current. Remove or disable stale Bunpro connections, recreate this one with the current URL and protected header, then test from a new chat.")}
        ${helpItem("A day looks empty or incomplete", "Ask ChatGPT to show coverage. A missing source record means the source did not provide evidence for that date; it does not automatically prove zero activity.")}
        ${helpItem("Bunpro asked me to slow down", "Wait a little before trying again. Bunpro MCP will not keep retrying in the background.")}
        ${helpItem("I need to verify the service itself", "Open the public health check. It confirms the hosted process is reachable, but it does not test or expose your Bunpro token.", `<a class="inline-link" href="/healthz" target="_blank">Open health check ${icon("external")}</a>`)}
      </div>
    </div>
  </section>`;
}

function helpItem(title: string, copy: string, extra = ""): string {
  return `<article class="help-card reveal"><span>${icon("terminal")}</span><div><h3>${title}</h3><p>${copy}</p>${extra}</div></article>`;
}

function faq(): string {
  const items = [
    ["Is this an official Bunpro or OpenAI plugin?", "No. It is an unofficial community MCP, is not affiliated with or endorsed by Bunpro or OpenAI, and is not published as an official ChatGPT plugin listing."],
    ["Can a link install it or prefill the ChatGPT form?", "No supported deep link currently pre-populates the custom MCP creation form. The ChatGPT Plugins URL can take you to the area, but you must enter and review the connection values yourself."],
    ["Can it change anything in Bunpro?", "No. All eight published tools are read only. The server does not start or submit reviews, change SRS state, add lessons, run crams, edit decks, or modify account settings."],
    ["Does the website receive my token?", "No. This page is static and contains no token field. You paste the token only into your MCP client's protected credential configuration—not into this website or a chat message."],
    ["Does the server store my data?", "No. This service has no account or saved study-history database. It uses your token and Bunpro data only while answering the current request."],
    ["Is the source code public?", "Not yet. Bunpro's temporary integration details were shared under a restricted disclosure boundary, so the repository remains private unless Bunpro gives written permission for a public source release."],
    ["Will it work in every ChatGPT account?", "Not necessarily. Developer mode and custom MCP creation availability can depend on your plan, app version, workspace policy, and administrator. Other Streamable HTTP MCP clients may also connect."],
    ["Why are some dates marked as missing?", "Bunpro does not provide the same amount of history for every feature. The answer marks missing information clearly instead of pretending it means zero activity."],
    ["What should I do if I exposed my token?", "Rotate or replace the Account API Token in Bunpro, then update or recreate the protected credential in every MCP client where you configured it."]
  ];
  return `<section class="section faq">
    <div class="shell faq-grid">
      <div class="faq-intro reveal"><span class="kicker">Questions, answered</span><h2>The details that matter.</h2><p>Clear expectations make experimental tools safer to use.</p></div>
      <div class="accordion">
        ${items.map(([question, answer], index) => `<details class="reveal"${index === 0 ? " open" : ""}><summary><span>${question}</span><i></i></summary><p>${answer}</p></details>`).join("")}
      </div>
    </div>
  </section>`;
}

function closingCta(): string {
  return `<section class="closing">
    <div class="shell closing-inner reveal">
      <span class="closing-jp" aria-hidden="true">学</span>
      <div><span class="kicker kicker-light">Ready when you are</span><h2>Turn study history into<br><em>a better next question.</em></h2></div>
      <div class="closing-actions"><a class="button button-light" href="#setup">Follow the setup guide ${icon("arrow")}</a><p>${icon("shield")} Manual connection · protected token · read only</p></div>
    </div>
  </section>`;
}

function footer(): string {
  return `<footer class="site-footer">
    <div class="shell footer-grid">
      <div class="footer-brand"><a class="brand" href="#top"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span class="brand-copy"><strong>Bunpro MCP</strong><small>UNOFFICIAL COMMUNITY TOOL</small></span></a><p>Ask better questions about your Bunpro studies, with a connection that can read your data but never change it.</p></div>
      <div><b>Explore</b><a href="#possibilities">What it does</a><a href="#tools">Tools</a><a href="#setup">Setup guide</a><a href="#help">Troubleshooting</a></div>
      <div><b>Trust</b><a href="#privacy">Privacy</a><a href="#privacy">Security boundary</a><a href="#help">Health and help</a><a href="${OPENAI_MCP_GUIDE_URL}" target="_blank" rel="noreferrer">OpenAI MCP guide ${icon("external")}</a></div>
    </div>
    <div class="shell footer-bottom"><span>© ${new Date().getUTCFullYear()} Bunpro MCP community project</span><span>Not affiliated with Bunpro or OpenAI.</span><a href="#top">Back to top ↑</a></div>
  </footer>`;
}

function pageScript(): string {
  return `(() => {
    const menuButton = document.querySelector('.menu-button');
    const mobileMenu = document.querySelector('.mobile-nav');
    const toast = document.querySelector('.toast');
    const closeMenu = () => {
      if (!menuButton || !mobileMenu) return;
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open navigation');
      mobileMenu.hidden = true;
    };
    menuButton?.addEventListener('click', () => {
      const opening = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(opening));
      menuButton.setAttribute('aria-label', opening ? 'Close navigation' : 'Open navigation');
      if (mobileMenu) mobileMenu.hidden = !opening;
    });
    mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

    let toastTimer;
    const showToast = (message) => {
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add('visible');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 1800);
    };
    const copyText = async (value) => {
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
      showToast('Copied to clipboard');
    };
    document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', () => {
      const value = button.getAttribute('data-copy');
      if (value) void copyText(value);
    }));

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
      document.documentElement.classList.add('has-motion');
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -7% 0px', threshold: 0.08 });
      document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
    }
  })();`;
}

function styles(): string {
  return `
    :root {
      --paper: #f4f0e7;
      --paper-deep: #e8e0d1;
      --paper-light: #fbf8f1;
      --ink: #20231f;
      --muted: #64675f;
      --line: #d4cbbb;
      --forest: #1f2923;
      --forest-2: #2d3a32;
      --red: #a93f2d;
      --red-dark: #8a3022;
      --moss: #65715f;
      --gold: #b49054;
      --serif: Georgia, 'Times New Roman', serif;
      --sans: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --mono: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
      --shadow: 0 24px 70px rgba(41, 36, 28, .13);
      --radius: 2px;
      --shell: min(1180px, calc(100% - 40px));
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; scroll-padding-top: 88px; }
    body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--sans); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
    body, button, a { font-size: 16px; }
    button, a { -webkit-tap-highlight-color: transparent; }
    button { font-family: inherit; }
    a { color: inherit; text-decoration: none; }
    p { line-height: 1.72; }
    code { font-family: var(--mono); }
    .shell { width: var(--shell); margin-inline: auto; }
    .icon { width: 20px; height: 20px; flex: 0 0 auto; }
    .skip-link { position: fixed; left: 16px; top: -70px; z-index: 1000; padding: 12px 18px; background: var(--ink); color: white; transition: top .2s; }
    .skip-link:focus { top: 16px; }
    :focus-visible { outline: 3px solid var(--red); outline-offset: 4px; }
    .grain { position: fixed; inset: 0; pointer-events: none; z-index: 100; opacity: .17; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.09'/%3E%3C/svg%3E"); }
    .site-header { position: sticky; top: 0; z-index: 50; background: rgba(244, 240, 231, .9); border-bottom: 1px solid rgba(164, 153, 135, .42); backdrop-filter: blur(15px); }
    .header-inner { height: 76px; display: flex; align-items: center; gap: 30px; }
    .brand { display: inline-flex; align-items: center; gap: 12px; min-height: 44px; }
    .brand-mark { width: 34px; height: 34px; position: relative; display: inline-block; }
    .brand-mark i { width: 9px; height: 9px; border: 2px solid var(--red); border-radius: 50%; position: absolute; }
    .brand-mark i:nth-child(1) { left: 1px; top: 12px; }
    .brand-mark i:nth-child(2) { right: 2px; top: 2px; }
    .brand-mark i:nth-child(3) { right: 2px; bottom: 2px; }
    .brand-mark::before, .brand-mark::after { content: ''; width: 12px; height: 1.5px; background: var(--red); position: absolute; left: 10px; transform-origin: left center; }
    .brand-mark::before { top: 14px; transform: rotate(-34deg); }
    .brand-mark::after { top: 20px; transform: rotate(34deg); }
    .brand-copy { display: grid; gap: 2px; }
    .brand-copy strong { font-family: var(--serif); font-size: 19px; letter-spacing: -.01em; }
    .brand-copy small { font-size: 8px; font-weight: 800; letter-spacing: .14em; color: var(--muted); }
    .desktop-nav { margin-left: auto; display: flex; align-items: center; gap: 28px; }
    .desktop-nav a { min-width: 44px; min-height: 44px; padding-inline: 4px; display: grid; place-items: center; font-size: 13px; font-weight: 650; color: #4f534c; }
    .desktop-nav a:hover { color: var(--red); }
    .button { min-height: 48px; display: inline-flex; justify-content: center; align-items: center; gap: 10px; padding: 0 22px; border: 1px solid transparent; font-weight: 750; font-size: 14px; letter-spacing: .01em; cursor: pointer; transition: transform .2s ease, background .2s ease, border-color .2s ease, color .2s ease; }
    .button:hover { transform: translateY(-2px); }
    .button-small { min-height: 44px; padding-inline: 17px; background: var(--forest); color: white; }
    .button .icon { width: 17px; }
    .button-primary { background: var(--red); color: white; }
    .button-primary:hover { background: var(--red-dark); }
    .button-ghost { border-color: var(--ink); background: rgba(255,255,255,.2); }
    .button-light { background: var(--paper-light); color: var(--forest); }
    .menu-button, .mobile-nav { display: none; }

    .hero { min-height: 720px; display: grid; align-items: center; position: relative; overflow: hidden; border-bottom: 1px solid var(--line); }
    .hero::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(255,255,255,.25), transparent 45%), repeating-linear-gradient(90deg, transparent 0, transparent calc(8.333% - 1px), rgba(94,87,75,.045) calc(8.333% - 1px), rgba(94,87,75,.045) 8.333%); pointer-events: none; }
    .hero-grid { display: grid; grid-template-columns: 1.02fr .98fr; gap: clamp(48px, 7vw, 100px); align-items: center; padding-block: 92px 104px; position: relative; }
    .hero-copy { position: relative; z-index: 2; }
    .eyebrow, .kicker { display: inline-flex; align-items: center; gap: 9px; color: var(--red); font-size: 11px; font-weight: 850; letter-spacing: .16em; text-transform: uppercase; }
    .status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--red); box-shadow: 0 0 0 5px rgba(169,63,45,.1); }
    h1, h2, h3, p { margin-top: 0; }
    h1 { margin: 24px 0 26px; font: 400 clamp(58px, 6.3vw, 92px)/.94 var(--serif); letter-spacing: -.055em; max-width: 760px; }
    h1 em, h2 em { font-weight: 400; color: var(--red); }
    .hero-lede { color: #50534d; font-size: clamp(17px, 1.6vw, 20px); line-height: 1.72; max-width: 620px; }
    .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 34px; }
    .micro-trust { display: flex; align-items: center; gap: 8px; margin: 20px 0 0; color: var(--muted); font-size: 12px; }
    .micro-trust .icon { width: 16px; }
    .hero-visual { min-height: 570px; position: relative; display: grid; place-items: center; }
    .enso { width: 420px; aspect-ratio: 1; position: absolute; border: 22px solid rgba(73, 83, 72, .15); border-right-color: transparent; border-radius: 50%; transform: rotate(-22deg); }
    .jp-type { position: absolute; right: -18px; top: 8px; font: 400 138px/1 var(--serif); color: rgba(169,63,45,.085); writing-mode: vertical-rl; }
    .study-card { width: min(430px, 88%); padding: 28px; background: var(--paper-light); border: 1px solid #cfc5b5; box-shadow: var(--shadow); position: relative; transform: rotate(1.4deg); z-index: 2; }
    .study-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--red); }
    .study-card-head, .study-card footer { display: flex; align-items: center; justify-content: space-between; }
    .study-card-head span { font-family: var(--serif); font-size: 18px; }
    .study-card-head small { font: 700 9px/1 var(--mono); color: var(--muted); letter-spacing: .1em; }
    .question-row { margin: 28px 0 18px; border-bottom: 1px solid var(--line); padding-bottom: 18px; }
    .question-row span, .answer-label { display: block; margin-bottom: 8px; color: var(--red); font: 800 9px/1 var(--mono); letter-spacing: .13em; }
    .question-row p { font: 400 22px/1.35 var(--serif); margin: 0; }
    .answer-label { display: flex; align-items: center; gap: 7px; color: var(--moss); }
    .answer-label .icon { width: 14px; }
    .answer-row > p { line-height: 1.55; font-size: 14px; color: #424740; }
    .rhythm { height: 88px; display: flex; gap: 8px; align-items: end; border-bottom: 1px solid var(--line); margin: 22px 0 30px; }
    .rhythm i { height: var(--h); flex: 1; background: var(--moss); position: relative; min-height: 6px; }
    .rhythm i:nth-child(5), .rhythm i:nth-child(7) { background: var(--red); }
    .rhythm span { position: absolute; top: calc(100% + 8px); width: 100%; text-align: center; font: 700 8px/1 var(--mono); color: var(--muted); }
    .study-card footer { font-size: 10px; font-weight: 750; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; }
    .study-card footer span { display: flex; gap: 6px; align-items: center; }
    .study-card footer .icon { width: 14px; color: var(--red); }
    .floating-note { position: absolute; right: 8px; bottom: 55px; z-index: 3; width: 122px; height: 110px; padding: 17px; background: var(--red); color: white; box-shadow: 0 16px 40px rgba(104,43,32,.2); transform: rotate(-4deg); }
    .floating-note span { display: block; font: 40px/.9 var(--serif); }
    .floating-note small { display: block; margin-top: 13px; font: 700 8px/1.45 var(--mono); letter-spacing: .12em; }

    .trust-strip { background: var(--forest); color: white; }
    .trust-grid { min-height: 108px; display: grid; grid-template-columns: repeat(4, 1fr); align-items: stretch; }
    .trust-grid > div { display: flex; gap: 14px; align-items: center; padding: 24px 22px; border-right: 1px solid rgba(255,255,255,.12); }
    .trust-grid > div:first-child { border-left: 1px solid rgba(255,255,255,.12); }
    .trust-grid .icon { color: #dac09a; }
    .trust-grid span { display: grid; gap: 5px; }
    .trust-grid b { font: 400 15px/1.2 var(--serif); }
    .trust-grid small { color: rgba(255,255,255,.58); font-size: 10px; line-height: 1.45; }

    .section { padding-block: 118px; }
    .section-heading { display: grid; grid-template-columns: 1.25fr .75fr; gap: 80px; align-items: end; margin-bottom: 58px; }
    h2 { margin: 14px 0 0; font: 400 clamp(42px, 5vw, 68px)/1.02 var(--serif); letter-spacing: -.04em; }
    .section-heading > p { margin: 0; color: var(--muted); max-width: 430px; }
    .use-case-grid { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--line); }
    .use-case { min-height: 420px; display: flex; flex-direction: column; padding: 34px; background: rgba(255,255,255,.17); border-right: 1px solid var(--line); }
    .use-case:last-child { border-right: 0; }
    .case-top { display: flex; align-items: center; justify-content: space-between; }
    .case-icon { width: 52px; height: 52px; display: grid; place-items: center; border: 1px solid var(--line); color: var(--red); }
    .case-top small { color: var(--muted); font: 700 10px/1 var(--mono); }
    .use-case h3, .tool-card h3, .help-card h3 { margin: 34px 0 13px; font: 400 29px/1.1 var(--serif); }
    .use-case > p, .tool-card > p { color: var(--muted); font-size: 14px; }
    .prompt-copy { width: 100%; min-height: 76px; margin-top: auto; padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 14px; text-align: left; background: var(--paper-light); border: 1px solid var(--line); color: var(--ink); cursor: pointer; }
    .prompt-copy span { font: italic 14px/1.5 var(--serif); }
    .prompt-copy:hover, .tool-prompt:hover, .prompt-row:hover { border-color: var(--red); color: var(--red); }
    .prompt-copy .icon, .tool-prompt .icon { width: 17px; }

    .explainer { background: var(--paper-light); border-block: 1px solid var(--line); }
    .explainer-grid { display: grid; grid-template-columns: .75fr 1.25fr; gap: 100px; align-items: center; }
    .explainer-copy h2 { margin-bottom: 24px; }
    .explainer-copy p { color: var(--muted); }
    .flow-card { display: grid; grid-template-columns: 1fr 36px 1fr 36px 1fr; align-items: center; padding: 36px; background: var(--paper); border: 1px solid var(--line); box-shadow: 12px 12px 0 var(--paper-deep); }
    .flow-card > div { min-height: 170px; position: relative; padding: 26px 18px; background: var(--paper-light); border: 1px solid var(--line); display: flex; flex-direction: column; align-items: flex-start; }
    .flow-card > div > span { position: absolute; right: 12px; top: 10px; color: var(--red); font: 700 9px/1 var(--mono); }
    .flow-card > div .icon { color: var(--red); margin-bottom: 28px; }
    .flow-card b { font: 400 17px/1.2 var(--serif); }
    .flow-card small { margin-top: 9px; color: var(--muted); line-height: 1.45; }
    .flow-card > i { display: grid; place-items: center; color: var(--red); }

    .setup { background: var(--forest); color: white; position: relative; overflow: hidden; }
    .setup::before { content: '接続'; position: absolute; right: -15px; top: 120px; font: 220px/1 var(--serif); color: rgba(255,255,255,.025); writing-mode: vertical-rl; }
    .setup-heading { display: grid; grid-template-columns: 1fr 1fr; gap: 90px; align-items: end; position: relative; }
    .setup-heading h2 { color: white; }
    .setup-heading > p { margin: 0; color: rgba(255,255,255,.65); max-width: 560px; }
    .kicker-light { color: #dac09a; }
    .availability-note { margin: 50px 0 68px; padding: 22px 24px; display: grid; grid-template-columns: 44px 1fr auto; gap: 18px; align-items: center; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.055); }
    .note-icon { width: 42px; height: 42px; display: grid; place-items: center; color: #dac09a; border: 1px solid rgba(255,255,255,.18); }
    .availability-note b { font-family: var(--serif); font-weight: 400; }
    .availability-note p { margin: 5px 0 0; color: rgba(255,255,255,.61); font-size: 13px; line-height: 1.55; }
    .availability-note a, .inline-link { display: inline-flex; align-items: center; gap: 7px; min-height: 44px; color: #e0c9a7; font-size: 12px; font-weight: 750; text-decoration: underline; text-underline-offset: 4px; }
    .availability-note a .icon, .inline-link .icon { width: 14px; }
    .setup-layout { display: grid; grid-template-columns: .9fr 1.1fr; gap: clamp(54px, 8vw, 110px); align-items: start; }
    .setup-steps { list-style: none; padding: 0; margin: 0; }
    .step { display: grid; grid-template-columns: 50px 1fr; gap: 22px; padding: 0 0 34px; position: relative; }
    .step:not(:last-child)::before { content: ''; position: absolute; top: 38px; left: 17px; bottom: 0; width: 1px; background: rgba(255,255,255,.16); }
    .step-number { width: 36px; height: 36px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.3); background: var(--forest); color: #dac09a; font: 700 9px/1 var(--mono); position: relative; z-index: 1; }
    .step h3 { margin: 5px 0 9px; font: 400 21px/1.25 var(--serif); }
    .step p { color: rgba(255,255,255,.61); margin: 0; font-size: 13px; line-height: 1.65; }
    .step strong { color: white; }
    .inline-copy { display: inline-flex; align-items: center; gap: 5px; min-height: 44px; padding: 0 6px; background: none; border: 0; border-bottom: 1px solid rgba(224,201,167,.5); color: #e0c9a7; cursor: pointer; }
    .inline-copy .icon { width: 13px; }
    .connection-panel { position: sticky; top: 106px; background: var(--paper-light); color: var(--ink); border: 1px solid #c9bfaf; box-shadow: 18px 18px 0 rgba(0,0,0,.13); }
    .panel-title { height: 58px; display: flex; align-items: center; gap: 13px; padding: 0 20px; border-bottom: 1px solid var(--line); }
    .panel-title > span { display: flex; gap: 5px; }
    .panel-title i { width: 7px; height: 7px; border-radius: 50%; background: var(--line); }
    .panel-title i:first-child { background: var(--red); }
    .panel-title b { font: 400 15px/1 var(--serif); }
    .panel-title small { margin-left: auto; font: 700 8px/1 var(--mono); letter-spacing: .12em; color: var(--muted); }
    .form-row { padding: 14px 20px; border-bottom: 1px solid #e5ded2; }
    .form-row label, .header-label label { display: block; margin-bottom: 7px; font-size: 9px; color: var(--muted); font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
    .copy-field, .select-look, .empty-field, .secret-look { min-height: 44px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 12px; background: var(--paper); border: 1px solid var(--line); }
    .copy-field code { overflow-wrap: anywhere; font-size: 11px; line-height: 1.4; }
    .copy-field button { width: 44px; height: 44px; flex: 0 0 44px; margin-right: -12px; display: grid; place-items: center; background: transparent; border: 0; border-left: 1px solid var(--line); color: var(--muted); cursor: pointer; }
    .copy-field button:hover { color: var(--red); background: rgba(169,63,45,.05); }
    .copy-field .icon { width: 16px; }
    .select-look, .empty-field, .secret-look { font-size: 12px; }
    .empty-field { color: var(--muted); font-style: italic; }
    .header-field { margin: 12px; border: 1px solid var(--red); background: rgba(169,63,45,.03); }
    .header-label { height: 43px; padding: 10px 10px 0; display: flex; justify-content: space-between; }
    .header-label span { height: 18px; padding: 4px 7px; color: var(--red); background: rgba(169,63,45,.09); font: 800 8px/1 var(--mono); }
    .form-row.nested { margin: 0; border-top: 1px solid #e5ded2; border-bottom: 0; }
    .secret-look { color: var(--muted); }
    .secret-look .icon { width: 16px; color: var(--red); }
    .panel-check { display: flex; align-items: center; gap: 8px; min-height: 46px; padding: 0 20px 4px; color: var(--moss); font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; }
    .panel-check .icon { width: 15px; }
    .auth-fallback { display: grid; grid-template-columns: 44px 1fr; gap: 16px; max-width: 900px; padding: 24px; margin: 70px auto 0; background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.14); }
    .auth-fallback > span { width: 42px; height: 42px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.16); color: #dac09a; }
    .auth-fallback b { font: 400 17px/1.2 var(--serif); }
    .auth-fallback p { margin: 7px 0 0; color: rgba(255,255,255,.62); font-size: 12px; line-height: 1.65; }
    .auth-fallback code { color: white; font-size: 11px; }

    .tools { background: var(--paper); }
    .tool-grid { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--line); }
    .tool-card { min-height: 360px; padding: 27px; display: flex; flex-direction: column; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); background: rgba(255,255,255,.17); }
    .tool-card:nth-child(4n) { border-right: 0; }
    .tool-card:nth-child(n+5) { border-bottom: 0; }
    .tool-top { display: flex; align-items: center; justify-content: space-between; }
    .tool-icon { width: 46px; height: 46px; display: grid; place-items: center; color: var(--red); border: 1px solid var(--line); }
    .read-badge { padding: 5px 7px; color: var(--moss); border: 1px solid #adb6a8; font: 800 7px/1 var(--mono); letter-spacing: .08em; }
    .tool-card > small { margin-top: 24px; color: var(--muted); font: 700 8px/1.5 var(--mono); overflow-wrap: anywhere; }
    .tool-card h3 { margin: 10px 0; font-size: 24px; }
    .tool-prompt { width: 100%; min-height: 58px; margin-top: auto; padding: 12px; display: flex; align-items: center; justify-content: space-between; gap: 12px; text-align: left; background: transparent; border: 1px solid var(--line); color: var(--ink); cursor: pointer; }
    .tool-prompt span { font: italic 12px/1.4 var(--serif); }
    .catalog-note { margin: 24px 0 0; color: var(--muted); font-size: 12px; text-align: center; }

    .prompts { background: var(--paper-light); border-block: 1px solid var(--line); }
    .prompt-layout { display: grid; grid-template-columns: .6fr 1.4fr; gap: 100px; }
    .prompt-intro { position: sticky; top: 110px; align-self: start; }
    .prompt-intro h2 { font-size: clamp(40px, 4vw, 58px); margin-bottom: 20px; }
    .prompt-intro p { color: var(--muted); }
    .prompt-list { border-top: 1px solid var(--line); }
    .prompt-row { width: 100%; min-height: 100px; padding: 20px 8px; display: grid; grid-template-columns: 72px 1fr 44px; gap: 16px; align-items: center; text-align: left; background: transparent; border: 0; border-bottom: 1px solid var(--line); color: var(--ink); cursor: pointer; }
    .prompt-row small { color: var(--red); font: 800 9px/1 var(--mono); letter-spacing: .1em; }
    .prompt-row span { font: italic 20px/1.4 var(--serif); }
    .prompt-row .icon { justify-self: end; color: var(--muted); }

    .privacy { background: var(--forest); color: white; }
    .privacy-heading { max-width: 850px; }
    .privacy-heading h2 { margin-bottom: 26px; color: white; }
    .privacy-heading p { max-width: 690px; color: rgba(255,255,255,.64); }
    .request-flow { margin: 64px 0; display: grid; grid-template-columns: 1fr 46px 1fr 46px 1fr 46px 1fr; align-items: center; }
    .request-flow > div { min-height: 145px; padding: 22px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.04); display: flex; flex-direction: column; }
    .request-flow > div > span { color: #dac09a; margin-bottom: 22px; }
    .request-flow b { font: 400 17px/1.2 var(--serif); }
    .request-flow small { margin-top: 7px; color: rgba(255,255,255,.52); line-height: 1.45; }
    .request-flow > i { display: grid; place-items: center; color: #dac09a; }
    .privacy-grid { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid rgba(255,255,255,.15); }
    .privacy-grid article { min-height: 330px; padding: 32px; border-right: 1px solid rgba(255,255,255,.15); }
    .privacy-grid article:last-child { border-right: 0; }
    .privacy-grid article > span { width: 44px; height: 44px; display: grid; place-items: center; color: #dac09a; border: 1px solid rgba(255,255,255,.16); }
    .privacy-grid h3 { margin: 28px 0 16px; font: 400 23px/1.2 var(--serif); }
    .privacy-grid ul { list-style: none; padding: 0; margin: 0; }
    .privacy-grid li { padding: 8px 0 8px 19px; position: relative; color: rgba(255,255,255,.6); font-size: 12px; line-height: 1.55; }
    .privacy-grid li::before { content: '—'; position: absolute; left: 0; color: #dac09a; }
    .privacy-grid p { color: rgba(255,255,255,.6); font-size: 13px; }
    .trust-boundary { background: rgba(169,63,45,.12); }

    .limitations { background: var(--paper-deep); }
    .limitations-grid { display: grid; grid-template-columns: .75fr 1.25fr; gap: 110px; }
    .limitations-title { position: sticky; top: 110px; align-self: start; }
    .limits-list { border-top: 1px solid #bfb5a5; }
    .limits-list article { display: grid; grid-template-columns: 48px 1fr; gap: 18px; padding: 28px 0; border-bottom: 1px solid #bfb5a5; }
    .limits-list article > span { color: var(--red); font: 800 9px/1.5 var(--mono); }
    .limits-list h3 { margin: 0 0 7px; font: 400 21px/1.25 var(--serif); }
    .limits-list p { margin: 0; color: var(--muted); font-size: 13px; }

    .help-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--line); }
    .help-card { min-height: 220px; display: grid; grid-template-columns: 48px 1fr; gap: 22px; padding: 30px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); background: rgba(255,255,255,.17); }
    .help-card:nth-child(2n) { border-right: 0; }
    .help-card:nth-child(n+5) { border-bottom: 0; }
    .help-card > span { width: 44px; height: 44px; display: grid; place-items: center; color: var(--red); border: 1px solid var(--line); }
    .help-card h3 { margin: 4px 0 10px; font-size: 20px; }
    .help-card p { margin: 0; color: var(--muted); font-size: 13px; }
    .help-card .inline-link { color: var(--red); }

    .faq { background: var(--paper-light); border-top: 1px solid var(--line); }
    .faq-grid { display: grid; grid-template-columns: .65fr 1.35fr; gap: 100px; }
    .faq-intro { position: sticky; top: 110px; align-self: start; }
    .faq-intro p { color: var(--muted); }
    .accordion { border-top: 1px solid var(--line); }
    details { border-bottom: 1px solid var(--line); }
    summary { min-height: 78px; padding: 18px 2px; display: flex; align-items: center; justify-content: space-between; gap: 24px; cursor: pointer; list-style: none; font: 400 20px/1.3 var(--serif); }
    summary::-webkit-details-marker { display: none; }
    summary i { width: 20px; height: 20px; position: relative; flex: 0 0 auto; }
    summary i::before, summary i::after { content: ''; position: absolute; left: 4px; right: 4px; top: 9px; height: 1px; background: var(--red); }
    summary i::after { transform: rotate(90deg); transition: transform .2s; }
    details[open] summary i::after { transform: rotate(0); }
    details > p { padding: 0 44px 24px 2px; margin: 0; color: var(--muted); font-size: 14px; }

    .closing { padding-block: 96px; background: var(--red); color: white; overflow: hidden; }
    .closing-inner { min-height: 280px; display: grid; grid-template-columns: 1fr auto; gap: 80px; align-items: center; position: relative; }
    .closing-jp { position: absolute; right: 37%; top: -60px; font: 280px/1 var(--serif); color: rgba(255,255,255,.07); }
    .closing h2 { position: relative; color: white; }
    .closing h2 em { color: #f4d8c9; }
    .closing-actions { position: relative; text-align: center; }
    .closing-actions p { display: flex; align-items: center; gap: 7px; color: rgba(255,255,255,.72); font-size: 10px; }
    .closing-actions .icon { width: 14px; }

    .site-footer { padding-top: 72px; background: #171c18; color: white; }
    .site-footer .brand-mark { filter: brightness(1.5); }
    .site-footer .brand-copy small { color: rgba(255,255,255,.45); }
    .footer-grid { display: grid; grid-template-columns: 1.7fr .65fr .8fr; gap: 90px; padding-bottom: 64px; }
    .footer-brand p { max-width: 390px; margin: 22px 0 0; color: rgba(255,255,255,.48); font-size: 13px; }
    .footer-grid > div:not(:first-child) { display: flex; flex-direction: column; gap: 13px; }
    .footer-grid > div:not(:first-child) b { margin-bottom: 7px; font: 400 17px/1 var(--serif); }
    .footer-grid > div:not(:first-child) a { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; color: rgba(255,255,255,.52); font-size: 12px; }
    .footer-grid a:hover { color: white; }
    .footer-grid a .icon { width: 13px; }
    .footer-bottom { min-height: 70px; display: flex; align-items: center; gap: 32px; border-top: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.38); font-size: 10px; }
    .footer-bottom a { margin-left: auto; min-height: 44px; display: grid; place-items: center; }

    .toast { position: fixed; right: 24px; bottom: 24px; z-index: 200; padding: 13px 18px; background: var(--ink); color: white; box-shadow: var(--shadow); font-size: 12px; transform: translateY(20px); opacity: 0; pointer-events: none; transition: .2s ease; }
    .toast.visible { transform: translateY(0); opacity: 1; }
    .has-motion .reveal { opacity: 0; transform: translateY(18px); transition: opacity .6s ease, transform .6s ease; }
    .has-motion .reveal.is-visible { opacity: 1; transform: translateY(0); }

    @media (max-width: 1050px) {
      .desktop-nav { gap: 17px; }
      .desktop-nav a { font-size: 12px; }
      .hero-grid { grid-template-columns: 1fr .85fr; gap: 24px; }
      .enso { width: 350px; }
      .trust-grid { grid-template-columns: repeat(2, 1fr); }
      .trust-grid > div:nth-child(3) { border-left: 1px solid rgba(255,255,255,.12); border-top: 1px solid rgba(255,255,255,.12); }
      .trust-grid > div:nth-child(4) { border-top: 1px solid rgba(255,255,255,.12); }
      .tool-grid { grid-template-columns: repeat(2, 1fr); }
      .tool-card:nth-child(2n) { border-right: 0; }
      .tool-card:nth-child(4n) { border-right: 0; }
      .tool-card:nth-child(n+5) { border-bottom: 1px solid var(--line); }
      .tool-card:nth-child(n+7) { border-bottom: 0; }
      .explainer-grid, .limitations-grid { gap: 60px; }
      .flow-card { padding: 22px; }
    }

    @media (max-width: 840px) {
      :root { --shell: min(100% - 32px, 700px); }
      .desktop-nav, .header-cta { display: none; }
      .menu-button { margin-left: auto; width: 48px; height: 48px; display: grid; place-items: center; background: transparent; border: 1px solid var(--line); color: var(--ink); }
      .menu-close { display: none; }
      .menu-button[aria-expanded='true'] .menu-open { display: none; }
      .menu-button[aria-expanded='true'] .menu-close { display: inline; }
      .mobile-nav { padding: 10px max(16px, calc((100% - 700px) / 2)) 20px; background: var(--paper); border-bottom: 1px solid var(--line); }
      .mobile-nav:not([hidden]) { display: grid; }
      .mobile-nav a { min-height: 48px; display: flex; align-items: center; border-bottom: 1px solid var(--line); font-weight: 650; font-size: 14px; }
      .mobile-nav .button { margin-top: 12px; border-bottom: 0; }
      .hero { min-height: auto; }
      .hero-grid { grid-template-columns: 1fr; padding-block: 80px; }
      .hero-copy { max-width: 680px; }
      .hero-visual { min-height: 500px; }
      .study-card { width: min(470px, 78%); }
      .jp-type { right: 10%; }
      .floating-note { right: 9%; }
      .section { padding-block: 88px; }
      .section-heading, .setup-heading, .explainer-grid, .setup-layout, .prompt-layout, .limitations-grid, .faq-grid { grid-template-columns: 1fr; gap: 42px; }
      .section-heading { align-items: start; margin-bottom: 45px; }
      .use-case-grid { grid-template-columns: 1fr; }
      .use-case { min-height: 330px; border-right: 0; border-bottom: 1px solid var(--line); }
      .use-case:last-child { border-bottom: 0; }
      .explainer-copy { max-width: 630px; }
      .setup-heading { align-items: start; }
      .connection-panel { position: relative; top: auto; max-width: 620px; justify-self: center; width: 100%; }
      .availability-note { grid-template-columns: 44px 1fr; }
      .availability-note a { grid-column: 2; }
      .prompt-intro, .limitations-title, .faq-intro { position: relative; top: auto; }
      .request-flow { grid-template-columns: 1fr; gap: 10px; }
      .request-flow > div { min-height: 120px; }
      .request-flow > i { transform: rotate(90deg); }
      .privacy-grid { grid-template-columns: 1fr; }
      .privacy-grid article { min-height: auto; border-right: 0; border-bottom: 1px solid rgba(255,255,255,.15); }
      .privacy-grid article:last-child { border-bottom: 0; }
      .closing-inner { grid-template-columns: 1fr; gap: 34px; }
      .closing-actions { text-align: left; justify-self: start; }
      .footer-grid { grid-template-columns: 1.4fr .7fr .9fr; gap: 35px; }
    }

    @media (max-width: 600px) {
      :root { --shell: calc(100% - 28px); }
      html { scroll-padding-top: 72px; }
      .header-inner { height: 68px; }
      .brand-copy strong { font-size: 17px; }
      .brand-copy small { font-size: 7px; }
      h1 { font-size: clamp(51px, 16vw, 68px); }
      h2 { font-size: clamp(40px, 12vw, 54px); }
      .hero-grid { padding-block: 68px 55px; }
      .hero-actions { display: grid; }
      .hero-actions .button { width: 100%; }
      .hero-visual { min-height: 440px; width: calc(100% + 28px); margin-left: -14px; }
      .enso { width: 310px; border-width: 17px; }
      .study-card { width: calc(100% - 52px); padding: 22px; }
      .floating-note { width: 100px; height: 92px; right: 12px; bottom: 34px; }
      .floating-note span { font-size: 31px; }
      .jp-type { font-size: 100px; right: 0; }
      .trust-grid { grid-template-columns: 1fr; padding-block: 4px; }
      .trust-grid > div, .trust-grid > div:first-child, .trust-grid > div:nth-child(3) { border: 0; border-bottom: 1px solid rgba(255,255,255,.12); }
      .trust-grid > div:last-child { border-bottom: 0; }
      .section { padding-block: 72px; }
      .section-heading { gap: 24px; }
      .use-case { padding: 26px; }
      .flow-card { grid-template-columns: 1fr; gap: 10px; box-shadow: 8px 8px 0 var(--paper-deep); }
      .flow-card > div { min-height: 145px; }
      .flow-card > i { transform: rotate(90deg); }
      .availability-note { grid-template-columns: 1fr; padding: 20px; }
      .availability-note a { grid-column: 1; }
      .setup-layout { gap: 38px; }
      .step { grid-template-columns: 40px 1fr; gap: 12px; }
      .step:not(:last-child)::before { left: 17px; }
      .connection-panel { width: calc(100% + 4px); margin-left: -2px; box-shadow: 8px 8px 0 rgba(0,0,0,.13); }
      .panel-title { padding-inline: 14px; }
      .form-row { padding-inline: 13px; }
      .header-field { margin: 8px; }
      .copy-field code { font-size: 10px; }
      .auth-fallback { grid-template-columns: 1fr; margin-top: 52px; }
      .tool-grid { grid-template-columns: 1fr; }
      .tool-card, .tool-card:nth-child(2n), .tool-card:nth-child(4n), .tool-card:nth-child(n+5), .tool-card:nth-child(n+7) { border-right: 0; border-bottom: 1px solid var(--line); }
      .tool-card:last-child { border-bottom: 0; }
      .tool-card { min-height: 330px; }
      .prompt-row { grid-template-columns: 55px 1fr 28px; gap: 10px; }
      .prompt-row span { font-size: 17px; }
      .request-flow { margin-block: 48px; }
      .privacy-grid article { padding: 26px; }
      .limits-list article { grid-template-columns: 36px 1fr; }
      .help-grid { grid-template-columns: 1fr; }
      .help-card, .help-card:nth-child(2n), .help-card:nth-child(n+5) { border-right: 0; border-bottom: 1px solid var(--line); grid-template-columns: 42px 1fr; padding: 24px 20px; }
      .help-card:last-child { border-bottom: 0; }
      summary { font-size: 18px; }
      .closing { padding-block: 72px; }
      .closing-inner { min-height: 320px; }
      .closing-actions { width: 100%; }
      .closing-actions .button { width: 100%; }
      .closing-actions p { justify-content: center; }
      .footer-grid { grid-template-columns: 1fr 1fr; }
      .footer-brand { grid-column: 1 / -1; }
      .footer-bottom { min-height: 100px; flex-wrap: wrap; gap: 8px 20px; padding-block: 20px; }
      .footer-bottom a { margin-left: 0; }
      .toast { right: 14px; left: 14px; bottom: 14px; text-align: center; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { scroll-behavior: auto !important; animation-duration: .01ms !important; transition-duration: .01ms !important; }
    }
  `;
}
