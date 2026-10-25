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
// env UI_CHECK=...: see below; exercises the visual editor end to end.
// env UI_CREATE=1: with UI_CHECK, first create the board overlay if the build has
//   none (writes a file: use a scratch workspace, never the reference project).
// env PROBE_OUT=<dir>: also dump serializedContext / memoryViews of the active context.

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
const shown = [];
const edits = [];

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
    if (msg.method === "window/showDocument") {
      // pretend to be Zed: never launch a browser or editor from the smoke test
      shown.push(msg.params.uri);
      result = { success: true };
    } else if (msg.method === "workspace/applyEdit") {
      // print instead of applying, so the workspace is never modified
      edits.push(msg.params.edit);
      result = { applied: true };
    } else if (msg.method === "workspace/configuration") {
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
  capabilities: { window: { showDocument: { support: true } }, workspace: { configuration: true, didChangeConfiguration: { dynamicRegistration: true } } },
});
send({ method: "initialized", params: {} });
send({ method: "workspace/didChangeConfiguration", params: { settings: { devicetree: settings } } });
send({ method: "textDocument/didOpen", params: { textDocument: { uri, languageId: "devicetree", version: 1, text: readFileSync(file, "utf8") } } });

await new Promise((r) => setTimeout(r, 15000));
const contexts = await request("devicetree/getContexts", null);
console.log(`after ${Date.now() - t0} ms, contexts:`, contexts.map((c) => `${c.active ? "*" : " "} ${c.ctxNames.join(",")}`).join("\n  "));
const actions = await request("textDocument/codeAction", { textDocument: { uri }, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, context: { diagnostics: [] } });
console.log("codeActions:", (actions ?? []).map((a) => a.title));
if (process.env.PROBE_OUT) {
  // dump the custom-API payloads the visual editor consumes
  const { writeFileSync } = await import("node:fs");
  const active = contexts.find((c) => c.active);
  for (const [name, method, params] of [
    ["serialized", "devicetree/serializedContext", active.id],
    ["memory", "devicetree/memoryViews", { ctxId: active.id }],
    ["bindings", "devicetree/zephyrTypeBindings", active.id],
  ]) {
    const t = Date.now();
    const res = await request(method, params);
    const text = JSON.stringify(res);
    writeFileSync(`${process.env.PROBE_OUT}/${name}.json`, text);
    console.log(`${method}: ${text.length} bytes in ${Date.now() - t} ms`);
  }
}
if (process.env.UI_CHECK) {
  // env UI_CHECK="<nodePath>|<property>|<value>": open the visual editor, fetch
  // its model over HTTP and request one edit (printed, not applied)
  const [nodePath, property, value] = process.env.UI_CHECK.split("|");
  await request("workspace/executeCommand", { command: "zephyr-devicetree.openVisualEditor", arguments: [] });
  const url = new URL(shown.find((u) => u.startsWith("http")));
  const api = (path, body) =>
    fetch(new URL(path, url), {
      method: body ? "POST" : "GET",
      headers: { "x-token": url.searchParams.get("t"), ...(body ? { "content-type": "application/json" } : {}) },
      body: body && JSON.stringify(body),
    });
  const page = await fetch(url);
  console.log(`ui page: ${page.status}, ${(await page.text()).length} bytes`);
  const t = Date.now();
  let model = await (await api("/api/model")).json();
  console.log(`ui model: ${Object.keys(model.nodes).length} nodes, overlays ${JSON.stringify(model.context.overlays.map((o) => o.split("/").pop()))} in ${Date.now() - t} ms`);
  if (process.env.UI_CREATE && model.context.newOverlay) {
    // env UI_CREATE=1: create the board overlay of a build without one (writes the file!)
    const res = await (await api("/api/create-overlay", {})).json();
    model = await (await api("/api/model")).json();
    console.log("ui create-overlay:", JSON.stringify(res), `active ${model.context.names}, overlays ${JSON.stringify(model.context.overlays)}, pending ${JSON.stringify(model.context.pending)}, rebuild ${model.context.rebuild}`);
  }
  const overlay = model.context.overlays.at(-1);
  const res = await (await api("/api/edit", { nodePath, overlay, property, value })).json();
  console.log("ui edit:", JSON.stringify(res), JSON.stringify(edits));
  // stage 7: pin catalog and moving a pinctrl function to a free pin
  const cat = model.pinCatalog;
  console.log(`ui pin catalog: ${cat.vendor}, ${cat.ports.length} ports, ${Object.keys(cat.functions).length} functions${cat.source ? ` from ${cat.source.split("/").pop()}` : ""}`);
  const used = new Set(model.pins.usages.map((u) => u.pin));
  const mv = model.pins.usages.find((u) => !u.disabled && u.function !== "GPIO" && (u.cell || u.ref) && (cat.functions[u.function] ?? []).some((p) => !used.has(p)));
  if (mv) {
    const to = cat.functions[mv.function].find((p) => !used.has(p));
    edits.length = 0;
    const res = await (await api("/api/move-pin", { owner: mv.owner, function: mv.function, from: mv.pin, to, overlay })).json();
    console.log(`ui move-pin ${mv.function} ${mv.pin} -> ${to}:`, JSON.stringify(res), JSON.stringify(edits));
  }
  // stage 7.2: route an unused function of an enabled peripheral to a free pin
  const usedFns = new Set(model.pins.usages.map((u) => u.function));
  const byLabel = new Map(Object.values(model.nodes).flatMap((n) => n.labels.map((l) => [l, n])));
  for (const [fn, pinsOf] of Object.entries(cat.functions)) {
    const owner = byLabel.get(fn.toLowerCase().split("_")[0]);
    const pin = pinsOf.find((p) => !used.has(p));
    if (usedFns.has(fn) || !owner || owner.disabled || !pin || !owner.props.some((p) => p.name === "pinctrl-0")) continue;
    edits.length = 0;
    const res = await (await api("/api/assign-pin", { function: fn, pin, owner: owner.path, overlay })).json();
    console.log(`ui assign-pin ${fn} -> ${pin} (${owner.labels[0]}):`, JSON.stringify(res), JSON.stringify(edits));
    break;
  }
  // stage 8: clock tree, and a prescaler change written together with rcc clock-frequency
  const clk = model.clocks;
  if (clk) {
    const f = (id) => clk.nodes.find((n) => n.id === id)?.hz;
    console.log(`ui clocks: ${clk.part} ${clk.family}, SYSCLK ${f("sysclk") ?? f("cpu_src")}, HCLK ${clk.hclk}, declared ${clk.declared}, issues ${JSON.stringify(clk.issues.map((i) => i.message))}`);
    const rcc = clk.nodes.find((n) => n.id === "ahb")?.path;
    if (rcc) {
      edits.length = 0;
      const res = await (await api("/api/edits", { overlay, edits: [{ nodePath: rcc, property: "apb2-prescaler", value: "<4>" }, { nodePath: rcc, property: "ahb-prescaler", value: "<2>" }] })).json();
      console.log("ui edits:", JSON.stringify(res), JSON.stringify(edits));
    }
  }
  // memory map: a partition in the first free flash gap
  const gapIn = (model.memoryMap ?? []).find((x) => x.partitions && x.gaps.length);
  console.log(`ui memory map: ${(model.memoryMap ?? []).map((x) => `${x.name} ${x.segments.length}/${x.gaps.length}`).join(", ")}`);
  if (gapIn) {
    const g = gapIn.gaps[0];
    edits.length = 0;
    const res = await (await api("/api/add-node", { parentPath: gapIn.partitions, overlay, name: `partition@${g.offset.toString(16)}`, label: "smoke_partition", props: [{ name: "label", value: '"smoke"' }, { name: "reg", value: `<0x${g.offset.toString(16)} 0x${g.size.toString(16)}>` }] })).json();
    console.log("ui add partition:", JSON.stringify(res), JSON.stringify(edits));
  }
  // stage 5: buses, device catalog and a new child node on the first enabled I2C bus
  const i2c = model.buses.find((b) => b.type === "i2c" && !b.disabled);
  console.log(`ui buses: ${model.buses.length}, issues ${model.buses.reduce((n, b) => n + b.issues.length, 0)}`);
  // stage 6: overview
  const blocks = model.overview.groups.flatMap((g) => g.blocks);
  console.log(`ui overview: ${model.overview.soc.compatible.at(-1)}, ${blocks.filter((b) => !b.disabled).length}/${blocks.length} peripherals enabled, groups ${model.overview.groups.map((g) => g.name).join(", ")}`);
  if (i2c) {
    const tc = Date.now();
    const catalog = await (await api("/api/catalog?bus=i2c")).json();
    console.log(`ui catalog i2c: ${catalog.length} bindings in ${Date.now() - tc} ms`);
    edits.length = 0;
    const add = await (await api("/api/add-node", { parentPath: i2c.path, overlay, name: "smoke@7f", props: [{ name: "compatible", value: '"st,lis2dh12"' }, { name: "reg", value: "<0x7f>" }] })).json();
    console.log("ui add-node:", JSON.stringify(add), JSON.stringify(edits));
  }
}
const symbols = await request("textDocument/documentSymbol", { textDocument: { uri } });
console.log(`documentSymbol: ${Array.isArray(symbols) ? symbols.length : JSON.stringify(symbols)}`);
child.kill();
process.exit(0);
