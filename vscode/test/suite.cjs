// SPDX-License-Identifier: Apache-2.0
// Runs inside the VS Code extension host (see run.mjs).

const assert = require("node:assert/strict");
const http = require("node:http");
const vscode = require("vscode");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function until(what, fn, timeout = 180_000) {
  const end = Date.now() + timeout;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await wait(500);
  }
}

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", reject);
  });
}

async function step(name, fn) {
  const t = Date.now();
  await fn();
  console.log(`ok - ${name} (${Date.now() - t} ms)`);
}

exports.run = async function run() {
  const file = vscode.Uri.file(process.env.ZEPHYR_FILE);
  let api, doc, total;

  await step("opens the file as dts and activates", async () => {
    doc = await vscode.workspace.openTextDocument(file);
    await vscode.window.showTextDocument(doc);
    assert.equal(doc.languageId, "dts");
    const ext = vscode.extensions.all.find((e) => e.packageJSON.name === "zephyr-devicetree");
    api = await ext.activate();
  });

  await step("registers build contexts and activates one with the file", async () => {
    const ctxs = await until("contexts", async () => {
      const list = await api.contexts();
      return list.some((c) => c.active && c.type !== "Ad Hoc") && list;
    });
    total = ctxs.length;
    console.log(`  ${ctxs.length} contexts, active: ${ctxs.find((c) => c.active).ctxNames.join(", ")}`);
  });

  await step("hover on a node", async () => {
    const line = doc.getText().split("\n").findIndex((l) => /^\s*&?[a-z_][\w]*\s*\{/.test(l));
    assert.ok(line >= 0);
    const col = doc.lineAt(line).firstNonWhitespaceCharacterIndex + 1;
    const hovers = await until("hover", async () => {
      const h = await vscode.commands.executeCommand("vscode.executeHoverProvider", file, new vscode.Position(line, col));
      return h?.length && h;
    });
    assert.ok(hovers.length > 0);
  });

  await step("opens the visual editor panel and serves its model", async () => {
    await vscode.commands.executeCommand("zephyrDevicetree.openVisualEditor");
    const url = await until("visual editor", async () => api.visualEditorUrl());
    const page = await get(url);
    assert.equal(page.status, 200);
    const model = await until("model", async () => {
      const res = await get(url.replace("/?t=", "/api/model?t="));
      return res.status === 200 && JSON.parse(res.body);
    });
    console.log(`  ${Object.keys(model.nodes).length} nodes`);
    assert.ok(Object.keys(model.nodes).length > 10);
  });

  await step("points the open panel at the new companion after a restart", async () => {
    const before = api.visualEditorUrl();
    await vscode.commands.executeCommand("zephyrDevicetree.restartServer");
    const after = await until("new visual editor URL", async () => {
      const u = api.visualEditorUrl();
      return u && u !== before && u;
    });
    assert.equal((await get(after)).status, 200);
  });

  await step("binding YAML gets the schema from redhat.vscode-yaml", async () => {
    if (!vscode.extensions.getExtension("redhat.vscode-yaml")) return console.log("  skipped: redhat.vscode-yaml not installed");
    const ctx = (await api.contexts()).find((c) => c.active);
    const base = process.env.ZEPHYR_BASE ?? require("node:path").join(process.env.ZEPHYR_WORKSPACE, "dist/zephyrproject/zephyr");
    const yamlDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(require("node:path").join(base, "dts/bindings/led/gpio-leds.yaml")));
    await vscode.window.showTextDocument(yamlDoc);
    const line = yamlDoc.getText().split("\n").findIndex((l) => l.startsWith("compatible:"));
    const text = await until("schema hover", async () => {
      const h = await vscode.commands.executeCommand("vscode.executeHoverProvider", yamlDoc.uri, new vscode.Position(line, 2));
      const all = (h ?? []).flatMap((x) => x.contents.map((c) => (typeof c === "string" ? c : c.value))).join("\n");
      return all.includes("Compatible string the binding matches") && all;
    }, 60_000);
    assert.ok(text && ctx);
  });

  await step("a second folder of the same west workspace adds no contexts", async () => {
    const before = total;
    const folder = vscode.Uri.file(require("node:path").join(process.env.ZEPHYR_WORKSPACE, "boards"));
    assert.ok(vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders.length, 0, { uri: folder }));
    // the companion re-registers every context; wait for the list to settle
    await wait(3000);
    const after = await until("contexts after the new folder", async () => {
      const list = await api.contexts();
      return list.length >= before && list;
    }, 120_000);
    assert.equal(after.length, before);
    assert.ok(after.every((c) => !c.ctxNames.some((n) => n.startsWith("boards/"))));
  });
};
