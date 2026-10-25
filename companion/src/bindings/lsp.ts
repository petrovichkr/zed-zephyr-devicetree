// SPDX-License-Identifier: Apache-2.0
//
// Language server for Zephyr binding YAML (SPEC 4.2, D7, D22). Zed attaches it
// to its built-in YAML language; it answers only for files in a bindings
// directory and stays silent elsewhere, next to yaml-language-server.

import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseDocument } from "yaml";
import { Peer, type Message } from "../jsonrpc.js";
import { loadWorkspace, type WestWorkspace } from "../west.js";
import { discoverBuilds, restrictedDefaults, workspaceModules } from "../zephyr.js";
import { CompatibleIndex } from "./compatibles.js";
import { analyze, BindingIndex, resolveProperties, type Pos } from "./binding.js";
import { loadRules, type BindingRules } from "./rules.js";

const log = (...args: unknown[]) => console.error("[bindings]", ...args);

export class BindingsServer {
  private ws?: WestWorkspace;
  private index = new BindingIndex([]);
  private rules: BindingRules = loadRules();
  private docs = new Map<string, string>();
  private ready: Promise<void> = Promise.resolve();
  private compatibles?: CompatibleIndex;

  constructor(private readonly client: Peer) {}

  handle(msg: Message): void {
    if (this.client.settle(msg)) return;
    const reply = (result: unknown) => msg.id !== undefined && this.client.send({ id: msg.id, result });
    const p = msg.params;
    switch (msg.method) {
      case "initialize": {
        const uri = p?.workspaceFolders?.[0]?.uri ?? p?.rootUri;
        this.ready = this.load(uri ? fileURLToPath(uri) : process.cwd());
        return void reply({
          capabilities: {
            textDocumentSync: { openClose: true, change: 1, save: true },
            hoverProvider: true,
            definitionProvider: true,
            referencesProvider: true,
            completionProvider: { triggerCharacters: [":", " "] },
          },
          serverInfo: { name: "zephyr-bindings" },
        });
      }
      case "textDocument/didOpen":
        this.docs.set(p.textDocument.uri, p.textDocument.text);
        return void this.ready.then(() => this.publish(p.textDocument.uri));
      case "textDocument/didChange":
        this.docs.set(p.textDocument.uri, p.contentChanges.at(-1).text);
        return void this.ready.then(() => this.publish(p.textDocument.uri));
      case "textDocument/didSave":
        // a new or renamed binding changes include resolution for everyone
        return void (this.ready = this.ready.then(() => this.reindex()));
      case "textDocument/didClose":
        this.docs.delete(p.textDocument.uri);
        return void this.client.notify("textDocument/publishDiagnostics", { uri: p.textDocument.uri, diagnostics: [] });
      case "textDocument/hover":
        return void this.ready.then(() => reply(this.hover(p.textDocument.uri, p.position)));
      case "textDocument/definition":
        return void this.ready.then(() => reply(this.definition(p.textDocument.uri, p.position)));
      case "textDocument/references":
        return void this.ready.then(() => reply(this.references(p.textDocument.uri, p.position)));
      case "textDocument/completion":
        return void this.ready.then(() => reply(this.completion(p.textDocument.uri, p.position)));
      case "shutdown":
        return void reply(null);
      case "exit":
        return process.exit(0);
      default:
        if (msg.id !== undefined && msg.method) this.client.send({ id: msg.id, error: { code: -32601, message: `unsupported: ${msg.method}` } });
    }
  }

  private async load(root: string): Promise<void> {
    this.ws = await loadWorkspace(root);
    this.rules = loadRules(this.ws?.zephyrBase);
    this.reindex();
    log(`rules: ${this.rules.source}; ${this.index.byName.size} bindings in ${this.index.dirs.length} dirs`);
  }

  private reindex(): void {
    if (!this.ws) return;
    const dirs = new Set(restrictedDefaults(this.ws, workspaceModules(this.ws)).defaultZephyrBindings);
    for (const b of discoverBuilds(this.ws.topdir)) b.zephyrBindings.forEach((d) => dirs.add(d));
    this.index = new BindingIndex([...dirs]);
  }

  private analysis(uri: string) {
    if (!uri.startsWith("file:")) return undefined;
    const file = fileURLToPath(uri);
    if (!this.index.isBindingFile(file)) return undefined;
    const text = this.docs.get(uri) ?? readFileSync(file, "utf8");
    return { file, text, a: analyze(file, text, this.index, this.rules) };
  }

  private publish(uri: string): void {
    const r = this.analysis(uri);
    if (r) this.client.notify("textDocument/publishDiagnostics", { uri, diagnostics: r.a.diagnostics });
  }

  private merged(uri: string) {
    const r = this.analysis(uri);
    return r && { ...r, inherited: resolveProperties(r.a.includes, this.index) };
  }

  private hover(uri: string, pos: Pos) {
    const r = this.merged(uri);
    const t = r?.a.at(pos);
    if (!r || !t) return null;
    if (t.kind === "include") {
      const path = this.index.byName.get(t.name);
      if (!path) return null;
      const description = String(parseDocument(readFileSync(path, "utf8")).toJSON()?.description ?? "").trim();
      const props = [...resolveProperties([{ name: t.name, range: t.range }], this.index).values()];
      return md(
        `**${t.name}**  \n\`${path}\`\n\n${description ?? ""}\n\n` +
          (props.length ? `Properties: ${props.map((p) => `\`${p.name}\``).join(", ")}` : ""),
        t.range,
      );
    }
    if (t.kind === "property") {
      const own = r.a.props.find((p) => p.name === t.name);
      const base = r.inherited.get(t.name);
      const o = { ...(base?.options ?? {}), ...(own?.options ?? {}) } as Record<string, unknown>;
      const lines = [
        `**${t.name}**: \`${o.type ?? "?"}\`${o.required ? " — required" : ""}${o.deprecated ? " — deprecated" : ""}`,
        o.enum ? `enum: ${(o.enum as unknown[]).map((v) => `\`${v}\``).join(", ")}` : "",
        o.default !== undefined ? `default: \`${JSON.stringify(o.default)}\`` : "",
        typeof o.description === "string" ? o.description.trim() : "",
        base ? `_inherited from \`${base.file}\`_` : "",
      ];
      return md(lines.filter(Boolean).join("\n\n"), t.range);
    }
    return null;
  }

  private definition(uri: string, pos: Pos) {
    const r = this.merged(uri);
    const t = r?.a.at(pos);
    if (!r || !t) return null;
    if (t.kind === "include") {
      const path = this.index.byName.get(t.name);
      return path ? location(path, 0, 0) : null;
    }
    if (t.kind === "property") {
      const base = r.inherited.get(t.name);
      if (!base) return null;
      const line = readFileSync(base.file, "utf8").split(/\r?\n/).findIndex((l) => new RegExp(`^\\s+${escape(t.name)}:`).test(l));
      return location(base.file, Math.max(line, 0), 0);
    }
    return null;
  }

  /** `compatible:` -> every devicetree source that uses it. */
  private references(uri: string, pos: Pos) {
    const r = this.analysis(uri);
    const t = r?.a.at(pos);
    if (!r || t?.kind !== "compatible" || !this.ws) return null;
    if (!this.compatibles) {
      const ws = this.ws;
      const outside = ws.zephyrBase && !ws.zephyrBase.startsWith(ws.topdir) ? [ws.zephyrBase] : [];
      this.compatibles = new CompatibleIndex([ws.topdir, ...outside]);
    }
    const t0 = Date.now();
    const stats = this.compatibles.refresh();
    log(`references ${t.value}: ${stats.files} dts files, ${stats.reread} re-read, ${Date.now() - t0} ms`);
    return this.compatibles.find(t.value).map((u) => location(u.file, u.line, u.start, u.end));
  }

  private completion(uri: string, pos: Pos) {
    const r = this.analysis(uri);
    if (!r) return null;
    const line = r.text.split(/\r?\n/)[pos.line] ?? "";
    const before = line.slice(0, pos.character);
    const indent = /^\s*/.exec(line)![0].length;
    const items = (labels: Iterable<string>, kind: number, suffix = "") =>
      [...labels].map((label) => ({ label, kind, insertText: label + suffix }));
    if (/^\s*type:\s*\S*$/.test(before)) return items(this.rules.types, 12);
    if (/^\s*(-\s+|include:\s*|name:\s*)[\w.,-]*$/.test(before) && this.inInclude(r.text, pos.line)) {
      return items(this.index.byName.keys(), 17);
    }
    if (!/^\s*[\w#,.-]*$/.test(before)) return null;
    if (indent === 0) return items([...this.rules.topKeys, "include"], 10, ": ");
    if (indent >= 4 && this.inProperties(r.text, pos.line)) return items(this.rules.propKeys, 10, ": ");
    return null;
  }

  private inInclude(text: string, line: number): boolean {
    const lines = text.split(/\r?\n/);
    for (let i = line; i >= 0; i--) {
      const l = lines[i]!;
      if (/^include:/.test(l)) return true;
      if (/^\S/.test(l) && i !== line) return false;
    }
    return false;
  }

  private inProperties(text: string, line: number): boolean {
    const lines = text.split(/\r?\n/);
    for (let i = line - 1; i >= 0; i--) {
      if (/^\S/.test(lines[i]!)) return /^properties:/.test(lines[i]!);
    }
    return false;
  }
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const md = (value: string, range: unknown) => ({ contents: { kind: "markdown", value }, range });
const location = (file: string, line: number, start: number, end = start) => ({
  uri: pathToFileURL(file).href,
  range: { start: { line, character: start }, end: { line, character: end } },
});
