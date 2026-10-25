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
import { planEdit, type EditRequest } from "./edits.js";
import { buildModel, SourceCache, type Loc, type UiContext, type UiModel } from "./model.js";
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
  settings?: { cwd?: string; overlays?: string[] };
}

const log = (...args: unknown[]) => console.error("[companion]", ...args);

export class EditorBackend implements UiBackend {
  /** Serialized nodes of the last model, for edit planning. */
  private serialized: { id: string; nodes: Record<string, any> } | undefined;

  constructor(private readonly h: EditorHooks) {}

  async contexts(): Promise<UiContext[]> {
    const list = (await this.h.server.request<ContextListItem[]>("devicetree/getContexts")) ?? [];
    const external = this.h.external();
    return list.map((c) => ({
      id: c.id,
      names: c.ctxNames,
      active: c.active,
      overlays: (c.settings?.overlays ?? [])
        .map((o) => resolve(c.settings?.cwd ?? "", o))
        .filter((o) => !isUnder(o, external)),
    }));
  }

  async model(): Promise<UiModel | undefined> {
    const active = (await this.contexts()).find((c) => c.active);
    if (!active) return undefined;
    const [nodes, memory] = await Promise.all([
      this.h.server.request<Record<string, any>>("devicetree/serializedContext", active.id),
      this.h.server.request("devicetree/memoryViews", { ctxId: active.id }).catch(() => undefined),
    ]);
    if (!nodes) return undefined;
    this.serialized = { id: active.id, nodes };
    return buildModel(active, nodes, memory, new SourceCache(this.h.docs.read));
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

  async edit(req: EditRequest): Promise<{ applied: boolean; error?: string }> {
    const active = (await this.contexts()).find((c) => c.active);
    // only overlays of the active build that belong to the user may be written
    if (!active || !active.overlays.includes(resolve(req.overlay))) {
      return { applied: false, error: "target is not a user overlay of the active context" };
    }
    if (this.serialized?.id !== active.id || !this.serialized.nodes[req.nodePath]) await this.model();
    const node = this.serialized?.nodes[req.nodePath];
    if (!node) return { applied: false, error: `node ${req.nodePath} not found` };

    const edit = planEdit(node, req, new SourceCache(this.h.docs.read));
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
