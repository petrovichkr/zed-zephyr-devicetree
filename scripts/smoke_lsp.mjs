#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
//
// Headless smoke test: start devicetree-language-server, feed it the same
// `devicetree` settings the extension produces, open a file and print what
// comes back (diagnostics, contexts, a hover).
//
// usage: smoke_lsp.mjs <server.js> <workspace-root> <file> [zephyr-base-rel] [ctx.json]
//   ctx.json: optional array of dts-lsp contexts (to try build-derived contexts)
// env COMPANION=<companion.js>: run the server behind the companion and send
//   empty user settings, as a fresh Zed install would.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [server, rootArg, fileArg, baseRel = "dist/zephyrproject/zephyr", ctxFile] =
  process.argv.slice(2);
const root = resolve(rootArg);
const file = resolve(fileArg);
const base = join(root, baseRel);
const dts = join(base, "dts");
const arches = ["arc", "arm", "arm64", "nios2", "posix", "riscv", "rx", "sparc", "tricore", "x86", "xtensa"];

const settings = process.env.COMPANION ? {} : {
  cwd: root,
  defaultBindingType: "Zephyr",
  autoChangeContext: true,
  allowAdhocContexts: true,
  defaultIncludePaths: [dts, join(dts, "common"), join(dts, "vendor"), ...arches.map((a) => join(dts, a)),
    join(base, "include"), join(base, "include", "zephyr")],
  defaultZephyrBindings: [join(dts, "bindings")],
  ...(ctxFile ? { contexts: JSON.parse(readFileSync(ctxFile, "utf8")) } : {}),
};

const cmd = process.env.COMPANION ? [process.env.COMPANION, "--server", server] : [server];
const child = spawn("node", [...cmd, "--stdio"], { stdio: ["pipe", "pipe", "inherit"] });
let buf = Buffer.alloc(0);
let nextId = 1;
const pending = new Map();

function send(msg) {
  const body = Buffer.from(JSON.stringify({ jsonrpc: "2.0", ...msg }));
  child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
  child.stdin.write(body);
}
function request(method, params) {
  const id = nextId++;
  send({ id, method, params });
  return new Promise((res) => pending.set(id, res));
}

child.stdout.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  for (;;) {
    const sep = buf.indexOf("\r\n\r\n");
    if (sep < 0) return;
    const len = Number(/Content-Length: (\d+)/i.exec(buf.subarray(0, sep).toString())[1]);
    if (buf.length < sep + 4 + len) return;
    const msg = JSON.parse(buf.subarray(sep + 4, sep + 4 + len).toString());
    buf = buf.subarray(sep + 4 + len);
    onMessage(msg);
  }
});

function onMessage(msg) {
  if (msg.id !== undefined && msg.method) {
    // server -> client request
    let result = null;
    if (msg.method === "workspace/configuration") {
      result = msg.params.items.map((it) => (it.section === "devicetree" ? settings : { devicetree: settings }));
    }
    send({ id: msg.id, result });
  } else if (msg.id !== undefined) {
    pending.get(msg.id)?.(msg.result ?? { error: msg.error });
    pending.delete(msg.id);
  } else if (msg.method === "textDocument/publishDiagnostics") {
    const d = msg.params.diagnostics;
    if (d.length) {
      console.log(`diagnostics ${msg.params.uri.replace(pathToFileURL(root).href, ".")}: ${d.length}`);
      for (const x of d.slice(0, 5)) console.log(`  L${x.range.start.line + 1}: ${x.message}`);
    }
  } else if (msg.method?.startsWith("devicetree/")) {
    console.log(`notify ${msg.method}`);
  }
}

const uri = pathToFileURL(file).href;
const t0 = Date.now();
await request("initialize", {
  processId: process.pid,
  rootUri: pathToFileURL(root).href,
  workspaceFolders: [{ uri: pathToFileURL(root).href, name: "ws" }],
  capabilities: { workspace: { configuration: true, didChangeConfiguration: { dynamicRegistration: true } } },
});
send({ method: "initialized", params: {} });
send({ method: "workspace/didChangeConfiguration", params: { settings: { devicetree: settings } } });
send({ method: "textDocument/didOpen", params: { textDocument: { uri, languageId: "devicetree", version: 1, text: readFileSync(file, "utf8") } } });

await new Promise((r) => setTimeout(r, 15000));
const contexts = await request("devicetree/getContexts", null);
console.log(`after ${Date.now() - t0} ms, contexts:`, contexts.map((c) => `${c.active ? "*" : " "} ${c.ctxNames.join(",")}`).join("\n  "));
const actions = await request("textDocument/codeAction", { textDocument: { uri }, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, context: { diagnostics: [] } });
console.log("codeActions:", (actions ?? []).map((a) => a.title));
const symbols = await request("textDocument/documentSymbol", { textDocument: { uri } });
console.log(`documentSymbol: ${Array.isArray(symbols) ? symbols.length : JSON.stringify(symbols)}`);
child.kill();
process.exit(0);
