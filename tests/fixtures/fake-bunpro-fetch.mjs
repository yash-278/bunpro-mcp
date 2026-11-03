// Preloaded into the bundled server so a test can see what it would send to
// Bunpro without contacting Bunpro.
import { appendFileSync } from "node:fs";

globalThis.fetch = async (url, init) => {
  const authorization = new Headers(init?.headers).get("authorization");
  appendFileSync(process.env.FAKE_BUNPRO_LOG, `${JSON.stringify({ url: String(url), authorization })}\n`);
  return new Response("{}", { status: 401 });
};
