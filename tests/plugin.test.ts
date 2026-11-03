import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { basename, join, sep } from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { TOOL_DECLARATIONS } from "../src/tools.js";

const run = promisify(execFile);
const pluginRoot = join("plugins", "bunpro-mcp");
const evalRoot = join(pluginRoot, "evals");
const registeredTools = TOOL_DECLARATIONS.map(tool => tool.name);

const expectedConnector = {
  mcpServers: {
    bunpro: {
      type: "http",
      url: "https://bunpro.yashkadam.com/mcp",
      headers: { Authorization: "Bearer ${user_config.bunpro_token}" }
    }
  }
};

interface PluginPackage {
  packageVersion: string;
  marketplace: { plugins: Array<Record<string, unknown>> };
  manifest: {
    name: string;
    displayName: string;
    version: string;
    userConfig: Record<string, Record<string, unknown>>;
  };
  connector: unknown;
  skill: string;
}

async function readJson<Shape>(path: string): Promise<Shape> {
  return JSON.parse(await readFile(path, "utf8")) as Shape;
}

async function readPluginPackage(): Promise<PluginPackage> {
  const { version } = await readJson<{ version: string }>("package.json");
  return {
    packageVersion: version,
    marketplace: await readJson(join(".claude-plugin", "marketplace.json")),
    manifest: await readJson(join(pluginRoot, ".claude-plugin", "plugin.json")),
    connector: await readJson(join(pluginRoot, ".mcp.json")),
    skill: await readFile(join(pluginRoot, "skills", "study-plan", "SKILL.md"), "utf8")
  };
}

/** Backticked identifiers catch a tool with any verb, and the prefix catches one left unquoted. */
function toolNamesIn(skill: string): string[] {
  const quoted = [...skill.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map(match => match[1] as string);
  const bare = skill.match(/\b(?:get|list)_[a-z_]+\b/g) ?? [];
  return [...new Set([...quoted, ...bare])];
}

function pluginProblems(plugin: PluginPackage, tools: readonly string[]): string[] {
  const problems: string[] = [];
  const { manifest, marketplace, packageVersion, skill } = plugin;

  if (manifest.version !== packageVersion) problems.push("plugin version differs from package.json");

  const entries = marketplace.plugins;
  if (entries.length !== 1) problems.push("marketplace must list one plugin");
  if (entries[0]?.name !== manifest.name) problems.push("marketplace and plugin names differ");
  if (entries.some(entry => "version" in entry)) problems.push("marketplace entry sets a version");

  try {
    assert.deepEqual(plugin.connector, expectedConnector);
  } catch {
    problems.push("connector holds something other than the hosted URL and the token placeholder");
  }

  const option = manifest.userConfig.bunpro_token;
  if (option === undefined || option.sensitive !== true || option.required !== true) {
    problems.push("bunpro_token must be a required, sensitive option");
  }
  if (option !== undefined && "default" in option) problems.push("bunpro_token has a default");

  for (const name of toolNamesIn(skill)) {
    if (!tools.includes(name)) problems.push(`SKILL.md names an unregistered tool: ${name}`);
  }
  if (/^allowed-tools:/m.test(skill)) problems.push("SKILL.md sets allowed-tools");

  return problems;
}

/** A deep copy, so a broken case never leaks into the next one. */
function broken(plugin: PluginPackage, breakIt: (copy: PluginPackage) => void): PluginPackage {
  const copy = structuredClone(plugin);
  breakIt(copy);
  return copy;
}

function serverOf(plugin: PluginPackage): { url: string; headers: Record<string, string> } {
  return (plugin.connector as typeof expectedConnector).mcpServers.bunpro;
}

test("the repository's plugin package passes every check", async () => {
  assert.deepEqual(pluginProblems(await readPluginPackage(), registeredTools), []);
});

test("the plugin is named and displayed as decided", async () => {
  const { manifest } = await readPluginPackage();
  assert.equal(manifest.name, "bunpro-mcp");
  assert.equal(manifest.displayName, "Bunpro MCP (unofficial)");
});

const failures: Array<[string, string, (plugin: PluginPackage) => void]> = [
  ["a version mismatch", "plugin version differs from package.json", plugin => {
    plugin.manifest.version = "9.9.9";
  }],
  ["a marketplace name mismatch", "marketplace and plugin names differ", plugin => {
    (plugin.marketplace.plugins[0] as Record<string, unknown>).name = "bunpro";
  }],
  ["a second marketplace entry", "marketplace must list one plugin", plugin => {
    plugin.marketplace.plugins.push({ name: "bunpro-mcp-extra" });
  }],
  ["a version on the marketplace entry", "marketplace entry sets a version", plugin => {
    (plugin.marketplace.plugins[0] as Record<string, unknown>).version = "0.4.0";
  }],
  ["a literal token in the connector",
    "connector holds something other than the hosted URL and the token placeholder", plugin => {
      serverOf(plugin).headers.Authorization = "Bearer synthetic-account-token";
    }],
  ["an extra connector header",
    "connector holds something other than the hosted URL and the token placeholder", plugin => {
      serverOf(plugin).headers["X-Bunpro-Token"] = "synthetic-account-token";
    }],
  ["a placeholder in the connector URL",
    "connector holds something other than the hosted URL and the token placeholder", plugin => {
      serverOf(plugin).url = "https://${user_config.bunpro_host}/mcp";
    }],
  ["an option default", "bunpro_token has a default", plugin => {
    (plugin.manifest.userConfig.bunpro_token as Record<string, unknown>).default = "synthetic-account-token";
  }],
  ["an empty option default", "bunpro_token has a default", plugin => {
    (plugin.manifest.userConfig.bunpro_token as Record<string, unknown>).default = "";
  }],
  ["an option that isn't sensitive", "bunpro_token must be a required, sensitive option", plugin => {
    (plugin.manifest.userConfig.bunpro_token as Record<string, unknown>).sensitive = false;
  }],
  ["a skill naming an unregistered tool in backticks",
    "SKILL.md names an unregistered tool: start_reviews", plugin => {
      plugin.skill += "\nCall `start_reviews`.\n";
    }],
  ["a skill naming an unregistered tool without backticks",
    "SKILL.md names an unregistered tool: get_weak_spots", plugin => {
      plugin.skill += "\nCall get_weak_spots first.\n";
    }],
  ["a skill with an allowed-tools list", "SKILL.md sets allowed-tools", plugin => {
    plugin.skill = plugin.skill.replace("name: study-plan", "name: study-plan\nallowed-tools: list_weak_spots");
  }]
];

for (const [description, problem, breakIt] of failures) {
  test(`the package check rejects ${description}`, async () => {
    const plugin = broken(await readPluginPackage(), breakIt);
    assert.ok(pluginProblems(plugin, registeredTools).includes(problem));
  });
}

test("every packaged description says unofficial and experimental", async () => {
  const marketplace = await readJson<{ description: string; plugins: Array<{ description: string }> }>(
    join(".claude-plugin", "marketplace.json")
  );
  const plugin = await readJson<{ description: string }>(join(pluginRoot, ".claude-plugin", "plugin.json"));
  const bundle = await readJson<{ description: string }>(join("mcpb", "manifest.json"));
  const descriptions = [
    marketplace.description,
    ...marketplace.plugins.map(entry => entry.description),
    plugin.description,
    bundle.description
  ];

  for (const description of descriptions) {
    assert.match(description, /unofficial/i);
    assert.match(description, /experimental/i);
  }
});

test("the plugin ships one skill, one connector and no other components", async () => {
  const entries = await readdir(pluginRoot, { recursive: true });
  const topLevel = [...new Set(entries.map(entry => entry.split(sep)[0]))].sort();
  assert.deepEqual(topLevel, [".claude-plugin", ".mcp.json", "LICENSE", "README.md", "evals", "skills"]);
  assert.deepEqual(await readdir(join(pluginRoot, "skills")), ["study-plan"]);
  assert.deepEqual(entries.filter(entry => entry.endsWith(".mcpb")), []);
});

test("the plugin carries the repository license", async () => {
  assert.equal(await readFile(join(pluginRoot, "LICENSE"), "utf8"), await readFile("LICENSE", "utf8"));
});

test("skill evaluation results stay out of Git", async () => {
  await run("git", ["check-ignore", join(pluginRoot, "evals", "results", "run", "report.html")]);
});

test("the skill evaluations cover the six decided cases", async () => {
  const entries = await readdir(evalRoot, { withFileTypes: true });
  const cases = entries.filter(entry => entry.isDirectory() && entry.name !== "mocks" && entry.name !== "results");
  assert.deepEqual(cases.map(entry => entry.name).sort(), [
    "declines-start-reviews",
    "empty-weak-spots",
    "no-unsupported-claims",
    "normal-plan",
    "refuses-pasted-token",
    "tool-failure"
  ]);
});

test("every registered tool has a suite mock, so a run can see each tool it must not call", async () => {
  const files = await readdir(join(evalRoot, "mocks", "bunpro"));
  assert.deepEqual(files.map(file => file.replace(/\.md$/, "")).sort(), [...registeredTools].sort());
});

test("every mock of a successful call matches the tool's output schema", async () => {
  const entries = await readdir(evalRoot, { recursive: true });
  const mocks = entries.filter(entry => /(^|\/)mocks\/bunpro\/[a-z_]+\.md$/.test(entry));
  assert.ok(mocks.length >= registeredTools.length);

  for (const mock of mocks) {
    const text = await readFile(join(evalRoot, mock), "utf8");
    if (text.startsWith("---\nerror: true\n")) continue;
    const name = basename(mock, ".md");
    const tool = TOOL_DECLARATIONS.find(declaration => declaration.name === name);
    assert.ok(tool, `${mock} mocks an unregistered tool`);
    tool.outputSchema.parse(JSON.parse(text));
  }
});
