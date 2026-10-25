// SPDX-License-Identifier: Apache-2.0
//
// Manual check of dist/ui.html: `node scripts/dev-ui.mjs <model.json> [port]`.
// Serves the page and the model with no-op /api endpoints; edits are logged
// and followed by a `changed` event. Token is `dev`. DEV_UI_INJECT=1 adds a
// fake pin conflict and an undecoded pinctrl entry.

import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [modelFile, port = "5174"] = process.argv.slice(2);
if (!modelFile) {
  console.error("usage: node scripts/dev-ui.mjs <model.json> [port]");
  process.exit(1);
}
const html = join(dirname(fileURLToPath(import.meta.url)), "..", "dist", "ui.html");
const model = JSON.parse(readFileSync(modelFile, "utf8"));
if (process.env.DEV_UI_INJECT && model.pins?.usages.length) {
  const u = model.pins.usages[0];
  const other = Object.keys(model.nodes).find((p) => p !== u.owner && p !== "/") ?? u.owner;
  model.pins.usages.splice(1, 0, { ...u, owner: other, property: "cs-gpios", state: undefined, function: "GPIO" });
  model.pins.conflicts.push(u.pin);
  model.pins.unknown.push({ owner: other, property: "pinctrl-0", value: "<VENDOR_PIN(3, 7)>" });
}
const contexts = [model.context, { id: "other", names: ["other/app"], active: false, overlays: [] }];
const clients = new Set();

const json = (res, body, status = 200) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((ok) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => ok(s ? JSON.parse(s) : undefined));
  });
const changed = (reason) => {
  for (const c of clients) c.write(`event: changed\ndata: ${JSON.stringify({ reason })}\n\n`);
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(readFileSync(html));
  }
  if (url.pathname === "/api/events") {
    if (url.searchParams.get("t") !== "dev") return json(res, { error: "token" }, 403);
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
    res.write(": hello\n\n");
    clients.add(res);
    return req.on("close", () => clients.delete(res));
  }
  if (req.headers["x-token"] !== "dev") return json(res, { error: "token" }, 403);
  if (req.method === "POST" && req.headers["content-type"] !== "application/json") return json(res, { error: "content-type" }, 415);
  const body = req.method === "POST" ? await readBody(req) : undefined;
  console.log(req.method, url.pathname, body ? JSON.stringify(body) : "");
  switch (url.pathname) {
    case "/api/model":
      return json(res, { ...model, context: contexts.find((c) => c.active) });
    case "/api/contexts":
      return json(res, contexts);
    case "/api/active":
      for (const c of contexts) c.active = c.id === body.id;
      setTimeout(() => changed("active"), 100);
      return json(res, {});
    case "/api/open":
      return json(res, {});
    case "/api/edit":
      setTimeout(() => changed("edit"), 200);
      return json(res, body.property === "fail" ? { applied: false, error: "dev stub: refused" } : { applied: true });
    default:
      return json(res, { error: "not found" }, 404);
  }
}).listen(Number(port), "127.0.0.1", () => console.log(`http://127.0.0.1:${port}/?t=dev`));
