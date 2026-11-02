import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { build } from "esbuild";

const stage = "dist/mcpb";

await rm(stage, { recursive: true, force: true });
await mkdir(`${stage}/server`, { recursive: true });

const { metafile } = await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  metafile: true,
  outfile: `${stage}/server/index.mjs`
});

// The bundle has no package.json, so index.js loads as CommonJS and index.mjs
// holds the server, which needs ESM for its top-level await. This is the layout
// issue #95 ran in Claude Desktop.
await writeFile(`${stage}/server/index.js`, 'import("./index.mjs");\n');

// Bundling leaves node_modules behind, so the license text of each inlined
// package has to travel with the server.
const inlinedPackages = new Set(
  Object.keys(metafile.inputs).flatMap(path => path.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\//)?.[1] ?? [])
);
const licenses = await Promise.all(
  [...inlinedPackages].sort().map(async name => `\n--- License for ${name} ---\n\n${await readFile(`node_modules/${name}/LICENSE`, "utf8")}`)
);
await writeFile(`${stage}/LICENSE`, [await readFile("LICENSE", "utf8"), ...licenses].join("\n"));

const { version } = JSON.parse(await readFile("package.json", "utf8")) as { version: string };
const manifest = JSON.parse(await readFile("mcpb/manifest.json", "utf8")) as Record<string, unknown>;
const tools = await listBundledTools();
await writeFile(`${stage}/manifest.json`, `${JSON.stringify({ ...manifest, version, tools }, null, 2)}\n`);

// Reading the list from the built server keeps the install page in step with
// the tools, with nothing to update when one is added.
async function listBundledTools(): Promise<Array<{ name: string; description: string | undefined }>> {
  const client = new Client({ name: "build-mcpb", version: "0" });
  await client.connect(new StdioClientTransport({
    command: process.execPath,
    args: [`${stage}/server/index.js`]
  }));
  try {
    const { tools } = await client.listTools();
    return tools.map(({ name, description }) => ({ name, description }));
  } finally {
    await client.close();
  }
}
