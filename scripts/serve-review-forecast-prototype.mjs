import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const prototypePath = fileURLToPath(
  new URL("../docs/prototypes/review-forecast.html", import.meta.url)
);
const port = Number.parseInt(process.env.PORT ?? "4173", 10);

const server = createServer((request, response) => {
  if (request.url === "/favicon.ico") {
    response.writeHead(204);
    response.end();
    return;
  }

  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store"
  });
  createReadStream(prototypePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Review Forecast prototype: http://127.0.0.1:${port}/?variant=A&state=normal`);
});
