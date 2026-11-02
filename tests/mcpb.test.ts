import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const run = promisify(execFile);
const mcpbCli = join("node_modules", ".bin", "mcpb");

const syntheticToken = "synthetic-account-token";

interface Manifest {
  version: string;
  tools: Array<{ name: string; description: string }>;
  server: { mcp_config: { command: string; args: string[]; env: Record<string, string> } };
  user_config: Record<string, Record<string, unknown>>;
}

let unpacked: string;

async function readManifest(): Promise<Manifest> {
  return JSON.parse(await readFile(join(unpacked, "manifest.json"), "utf8")) as Manifest;
}

/** Starts the bundled server the way the manifest tells Claude Desktop to. */
async function startAsHost(extraEnvironment: Record<string, string> = {}): Promise<Client> {
  const { command, args, env } = (await readManifest()).server.mcp_config;
  const substitute = (value: string) =>
    value.replaceAll("${__dirname}", unpacked).replaceAll("${user_config.bunpro_token}", syntheticToken);
  const client = new Client({ name: "mcpb-test-host", version: "0" });
  await client.connect(new StdioClientTransport({
    command,
    args: args.map(substitute),
    cwd: unpacked,
    env: {
      PATH: process.env.PATH ?? "",
      ...extraEnvironment,
      ...Object.fromEntries(Object.entries(env).map(([name, value]) => [name, substitute(value)]))
    }
  }));
  return client;
}

before(async () => {
  await run("npm", ["run", "build:mcpb"]);
  // Outside the repository, so the server cannot fall back to its node_modules.
  unpacked = await mkdtemp(join(tmpdir(), "bunpro-mcpb-"));
  await run(mcpbCli, ["unpack", join("dist", "bunpro-mcp.mcpb"), unpacked]);
}, { timeout: 60_000 });

after(async () => {
  await rm(unpacked, { recursive: true, force: true });
});

test("build:mcpb packs a single-file server with no node_modules", async () => {
  const entries = await readdir(unpacked, { recursive: true, withFileTypes: true });
  const files = entries
    .filter(entry => entry.isFile())
    .map(entry => relative(unpacked, join(entry.parentPath, entry.name)))
    .sort();

  assert.deepEqual(files, ["LICENSE", "manifest.json", "server/index.js", "server/index.mjs"]);
});

test("the bundle carries the license notices of the packages it inlines", async () => {
  const license = await readFile(join(unpacked, "LICENSE"), "utf8");
  assert.match(license, /Copyright \(c\) \d{4} Yash Kadam/);
  for (const name of ["zod", "@modelcontextprotocol/server", "@modelcontextprotocol/core"]) {
    assert.ok(license.includes(`License for ${name}`), name);
  }
});

test("the packed manifest passes mcpb validate", async () => {
  const { stdout } = await run(mcpbCli, ["validate", join(unpacked, "manifest.json")]);
  assert.match(stdout, /valid/i);
});

test("the bundle carries the package version", async () => {
  const manifest = await readManifest();
  const packageJson = JSON.parse(await readFile("package.json", "utf8")) as { version: string };
  assert.equal(manifest.version, packageJson.version);
});

test("installing asks for the token in a required, sensitive field with no default", async () => {
  const { user_config: userConfig } = await readManifest();
  assert.deepEqual(Object.keys(userConfig), ["bunpro_token"]);
  assert.equal(userConfig.bunpro_token?.type, "string");
  assert.equal(userConfig.bunpro_token?.sensitive, true);
  assert.equal(userConfig.bunpro_token?.required, true);
  assert.equal("default" in (userConfig.bunpro_token ?? {}), false);
});

test("the bundled server sends the installed token to Bunpro as BUNPRO_API_TOKEN", async () => {
  const log = join(unpacked, "fake-bunpro.log");
  const preload = resolve("tests/fixtures/fake-bunpro-fetch.mjs");
  const client = await startAsHost({ FAKE_BUNPRO_LOG: log, NODE_OPTIONS: `--import=${preload}` });
  try {
    await client.callTool({ name: "get_connection_status", arguments: {} });
  } finally {
    await client.close();
  }

  const [request] = (await readFile(log, "utf8")).trim().split("\n").map(line =>
    JSON.parse(line) as { url: string; authorization: string }
  );
  assert.equal(new URL(request?.url ?? "").origin, "https://api.bunpro.jp");
  assert.equal(request?.authorization, `Token token=${syntheticToken}`);
});

test("the manifest lists the tools the bundled server serves", async () => {
  const client = await startAsHost();
  try {
    const { tools } = await client.listTools();
    const manifest = await readManifest();
    assert.ok(tools.length > 0);
    assert.deepEqual(
      manifest.tools,
      tools.map(({ name, description }) => ({ name, description }))
    );
  } finally {
    await client.close();
  }
});
