// SPDX-License-Identifier: Apache-2.0
//
// UiBackend on top of dts-lsp (data) and Zed (showDocument, applyEdit).

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { DocumentStore } from "../documents.js";
import type { Peer } from "../jsonrpc.js";
import { isUnder } from "../zephyr.js";
import { buildCatalog, type UiCatalogEntry } from "./catalog.js";
import { planAddress, planChild, planEdit, type AddressRequest, type ChildRequest, type EditRequest, type WorkspaceEdit } from "./edits.js";
import { buildModel, SourceCache, type Loc, type UiContext, type UiModel } from "./model.js";
import { planPinMove, type PinMoveRequest } from "./pinedits.js";
import type { UiBackend } from "./server.js";

export interface EditorHooks {
  zed: Peer;
  server: Peer;
  docs: DocumentStore;
  /** SDK and third-party projects; never offered as edit targets. */
  external(): string[];
  /** Zed advertised window/showDocument support in initialize. */
  canShowDocument(): boolean;
}

interface ContextListItem {
  id: string;
  ctxNames: string[];
  active: boolean;
  settings?: { cwd?: string; overlays?: string[]; includePaths?: string[] };
}

const log = (...args: unknown[]) => console.error("[companion]", ...args);

export class EditorBackend implements UiBackend {
  /** Serialized nodes of the last model, for edit planning. */
  private serialized: { id: string; nodes: Record<string, any> } | undefined;
  /**
   * serializedContext costs seconds on large SoCs (STM32 HAL pinctrl), so the
   * model is cached until invalidate() and concurrent requests share one fetch.
   */
  private generation = 0;
  private cached?: { generation: number; id: string; model: UiModel };
  private inflight?: { generation: number; promise: Promise<UiModel | undefined> };
  /** zephyrTypeBindings takes ~15 s and tens of MB on a full Zephyr tree: once per context. */
  /** Include paths by context id, for headers the model reads (ESP32 pinctrl). */
  private includePaths = new Map<string, string[]>();
  private catalogs = new Map<string, Promise<Record<string, UiCatalogEntry[]>>>();

  constructor(private readonly h: EditorHooks) {}

  async contexts(): Promise<UiContext[]> {
    const list = (await this.h.server.request<ContextListItem[]>("devicetree/getContexts")) ?? [];
    const external = this.h.external();
    for (const c of list) this.includePaths.set(c.id, (c.settings?.includePaths ?? []).map((p) => resolve(c.settings?.cwd ?? "", p)));
    return list.map((c) => ({
      id: c.id,
      names: c.ctxNames,
      active: c.active,
      overlays: (c.settings?.overlays ?? [])
        .map((o) => resolve(c.settings?.cwd ?? "", o))
        .filter((o) => !isUnder(o, external)),
    }));
  }

  /** Something the model depends on changed (buffer, save, active context). */
  invalidate(): void {
    this.generation++;
  }

  async model(): Promise<UiModel | undefined> {
    const generation = this.generation;
    if (this.cached?.generation === generation) {
      const active = (await this.contexts()).find((c) => c.active);
      if (active?.id === this.cached.id) return { ...this.cached.model, context: active };
    }
    if (this.inflight?.generation !== generation) {
      const promise = this.fetchModel(generation);
      this.inflight = { generation, promise };
      promise.finally(() => {
        if (this.inflight?.promise === promise) this.inflight = undefined;
      });
    }
    return this.inflight!.promise;
  }

  private async fetchModel(generation: number): Promise<UiModel | undefined> {
    const t = Date.now();
    const active = (await this.contexts()).find((c) => c.active);
    if (!active) return undefined;
    const [nodes, memory] = await Promise.all([
      this.h.server.request<Record<string, any>>("devicetree/serializedContext", active.id),
      this.h.server.request("devicetree/memoryViews", { ctxId: active.id }).catch(() => undefined),
    ]);
    if (!nodes) return undefined;
    this.serialized = { id: active.id, nodes };
    const model = buildModel(active, nodes, memory, new SourceCache(this.h.docs.read), this.includePaths.get(active.id));
    this.cached = { generation, id: active.id, model };
    log(`model ${active.names[0] ?? active.id}: ${Object.keys(model.nodes).length} nodes in ${Date.now() - t} ms`);
    return model;
  }

  async setActive(id: string): Promise<void> {
    await this.h.server.request("devicetree/setActive", { id });
  }

  async open(loc: Loc): Promise<void> {
    if (this.h.canShowDocument()) {
      const pos = { line: loc.line, character: loc.character };
      const res = await this.h.zed
        .request("window/showDocument", { uri: pathToFileURL(loc.file).href, takeFocus: true, selection: { start: pos, end: pos } })
        .catch(() => undefined);
      if (res?.success) return;
    }
    const cli = zedCli();
    if (!cli) throw new Error("cannot open files in Zed: no showDocument support and no zed CLI on PATH");
    spawn(cli, [`${loc.file}:${loc.line + 1}:${loc.character + 1}`], { detached: true, stdio: "ignore" }).unref();
  }

  async catalog(bus: string): Promise<UiCatalogEntry[]> {
    const active = (await this.contexts()).find((c) => c.active);
    if (!active) return [];
    let all = this.catalogs.get(active.id);
    if (!all) {
      const t = Date.now();
      all = this.h.server.request<any[]>("devicetree/zephyrTypeBindings", active.id).then((raw) => {
        const catalog = buildCatalog(raw ?? []);
        log(`bindings catalog ${active.names[0] ?? active.id}: ${raw?.length ?? 0} bindings in ${Date.now() - t} ms`);
        return catalog;
      });
      all.catch(() => this.catalogs.delete(active.id));
      this.catalogs.set(active.id, all);
    }
    return (await all)[bus] ?? [];
  }

  edit(req: EditRequest): Promise<{ applied: boolean; error?: string }> {
    return this.apply(req.overlay, req.nodePath, (node, src) => planEdit(node, req, src));
  }

  addNode(req: ChildRequest): Promise<{ applied: boolean; error?: string }> {
    if (!/^[A-Za-z0-9,._+-]+(@[0-9A-Za-z,._+-]+)?$/.test(req.name)) return Promise.resolve({ applied: false, error: `invalid node name "${req.name}"` });
    return this.apply(req.overlay, req.parentPath, (node, src) => {
      const path = `${req.parentPath === "/" ? "" : req.parentPath}/${req.name}`;
      return this.serialized?.nodes[path] ? `node ${path} already exists` : planChild(node, req, src);
    });
  }

  setAddress(req: AddressRequest): Promise<{ applied: boolean; error?: string }> {
    return this.apply(req.overlay, req.nodePath, (node, src) => planAddress(node, req, src));
  }

  async movePin(req: PinMoveRequest): Promise<{ applied: boolean; error?: string; conflict?: string[] }> {
    let conflict: string[] | undefined;
    const res = await this.applyWith(req.overlay, (nodes, src) => {
      const plan = planPinMove(this.cached!.model, req);
      if ("error" in plan) return plan.error;
      if ("conflict" in plan) {
        conflict = plan.conflict;
        return `${req.to} is used by ${plan.conflict.join(", ")}`;
      }
      const uri = pathToFileURL(req.overlay).href;
      const edits = [];
      for (const c of plan.changes) {
        const node = nodes[c.node];
        if (!node) return `node ${c.node} not found`;
        edits.push(...(planEdit(node, { nodePath: c.node, overlay: req.overlay, property: c.property, value: c.value }, src).changes[uri] ?? []));
      }
      return { changes: { [uri]: edits } };
    });
    return conflict ? { ...res, conflict } : res;
  }

  private apply(
    overlay: string,
    nodePath: string,
    plan: (node: any, src: SourceCache) => WorkspaceEdit | string,
  ): Promise<{ applied: boolean; error?: string }> {
    return this.applyWith(overlay, (nodes, src) => (nodes[nodePath] ? plan(nodes[nodePath], src) : `node ${nodePath} not found`));
  }

  private async applyWith(
    overlay: string,
    plan: (nodes: Record<string, any>, src: SourceCache) => WorkspaceEdit | string,
  ): Promise<{ applied: boolean; error?: string }> {
    const active = (await this.contexts()).find((c) => c.active);
    // only overlays of the active build that belong to the user may be written
    if (!active || !active.overlays.includes(resolve(overlay))) {
      return { applied: false, error: "target is not a user overlay of the active context" };
    }
    // plan against the current buffer, never a stale serialization
    if (this.cached?.generation !== this.generation || this.serialized?.id !== active.id) await this.model();
    if (!this.serialized || !this.cached) return { applied: false, error: "no devicetree model" };

    const edit = plan(this.serialized.nodes, new SourceCache(this.h.docs.read));
    if (typeof edit === "string") return { applied: false, error: edit };
    const res = await this.h.zed.request("workspace/applyEdit", { label: "Devicetree visual editor", edit });
    if (!res?.applied) log("applyEdit rejected", res?.failureReason ?? "");
    return { applied: !!res?.applied, error: res?.applied ? undefined : (res?.failureReason ?? "Zed rejected the edit") };
  }
}

/** Opens a URL in the default browser. */
export function openExternal(url: string): void {
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  spawn(cmd, args as string[], { detached: true, stdio: "ignore" }).unref();
}

function zedCli(): string | undefined {
  const names = process.platform === "win32" ? ["zed.exe", "zed.cmd"] : ["zed", "zeditor", "zedit"];
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    for (const n of names) if (dir && existsSync(join(dir, n))) return join(dir, n);
  }
  const mac = "/Applications/Zed.app/Contents/MacOS/cli";
  return process.platform === "darwin" && existsSync(mac) ? mac : undefined;
}
