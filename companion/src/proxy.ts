// SPDX-License-Identifier: Apache-2.0
//
// Zed <-> companion <-> dts-lsp. Everything is forwarded unchanged except:
// - after `initialized`, workspace defaults and build contexts are pushed to
//   dts-lsp through its integration API (setDefaultSettings / requestContext);
// - code actions get "switch context" entries, executed here (SPEC D5);
// - info/hint diagnostics in SDK and third-party modules are dropped;
// - "open visual editor" starts the local web UI (SPEC D15, 4.3).
// A client that declares `experimental.zephyrDevicetree` (the VS Code wrapper,
// SPEC D33) shows the UI itself and gets dts-lsp's notifications.

import { mkdirSync, watch, writeFileSync, type FSWatcher } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Message } from "./jsonrpc.js";
import { Peer } from "./jsonrpc.js";
import { DocumentStore } from "./documents.js";
import { EditorBackend, openExternal } from "./ui/backend.js";
import { UiServer } from "./ui/server.js";
import { loadWorkspace, type WestWorkspace } from "./west.js";
import {
  defaultDiscovery,
  discoverBuilds,
  externalRoots,
  isUnder,
  newOverlayTarget,
  pristineCommand,
  restrictedDefaults,
  withPendingOverlay,
  workspaceModules,
  type BuildContext,
} from "./zephyr.js";

export const SET_ACTIVE_COMMAND = "zephyr-devicetree.setActiveContext";
export const OPEN_UI_COMMAND = "zephyr-devicetree.openVisualEditor";
/** Client request: show the visual editor at `url`; returns `{ success }`. */
export const SHOW_UI_REQUEST = "zephyrDevicetree/showVisualEditor";

interface ClientFeatures {
  /** The client handles SHOW_UI_REQUEST (an embedded panel instead of a browser). */
  showVisualEditor?: boolean;
  /** Forward dts-lsp's `devicetree/*` notifications instead of dropping them. */
  notifications?: boolean;
}

interface ContextListItem {
  id: string;
  ctxNames: string[];
  active: boolean;
  type?: "Ad Hoc" | "User" | "3rd Party";
  [k: string]: unknown;
}

const log = (...args: unknown[]) => console.error("[companion]", ...args);

function filesOf(tree: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(tree)) tree.forEach((t) => filesOf(t, out));
  else if (tree && typeof tree === "object") {
    for (const [k, v] of Object.entries(tree)) {
      if (k === "fsPath" && typeof v === "string") out.add(v);
      else if (k !== "settings") filesOf(v, out);
    }
  }
  return out;
}

export class Proxy {
  private root?: string;
  private ws?: WestWorkspace;
  private external: string[] = [];
  /** ctxName -> context id, as returned by requestContext. */
  private requested = new Map<string, string>();
  private fingerprint = "";
  private builds: BuildContext[] = [];
  private contexts: ContextListItem[] = [];
  /** Last file Zed opened or asked about; drives the post-sync context choice. */
  private currentFile?: string;
  private codeActions = new Map<number | string, string>(); // request id -> file path
  private initializeId?: number | string;
  private watchers: FSWatcher[] = [];
  private timer?: NodeJS.Timeout;
  private syncing = Promise.resolve();
  private readonly docs = new DocumentStore();
  private canShowDocument = false;
  private client: ClientFeatures = {};
  private readonly ui: UiServer;
  private readonly backend: EditorBackend;
  private uiTimer?: NodeJS.Timeout;

  constructor(
    private readonly zed: Peer,
    private readonly server: Peer,
  ) {
    this.backend = new EditorBackend({
      zed,
      server,
      docs: this.docs,
      external: () => this.external,
      canShowDocument: () => this.canShowDocument,
      build: (name) => {
        const b = this.builds.find((x) => x.ctxName === name);
        // the context name is the build directory relative to the topdir, plus the image
        const dir = b?.image ? b.ctxName.slice(0, -(b.image.length + 1)) : b?.ctxName;
        return b && { rebuild: pristineCommand(b.westCommand, dir!), pending: b.pending, create: newOverlayTarget(b, this.external) };
      },
      createOverlay: (name) => this.createOverlay(name),
    });
    this.ui = new UiServer(this.backend);
  }

  /**
   * Debounced "model may have changed" for open editor pages. Typing waits
   * longer: every rebuild costs a full serializedContext in dts-lsp.
   */
  private uiChanged(reason: string, delay = reason === "didChange" ? 1500 : 500): void {
    this.backend.invalidate();
    clearTimeout(this.uiTimer);
    this.uiTimer = setTimeout(() => this.ui.changed(reason), delay);
  }

  fromZed(msg: Message): void {
    if (this.zed.settle(msg)) return;
    const uri: unknown = msg.params?.textDocument?.uri;
    if (typeof uri === "string" && uri.startsWith("file:") && msg.method !== "textDocument/didClose") {
      this.currentFile = fileURLToPath(uri);
    }
    if (this.docs.observe(msg.method, msg.params) && msg.method !== "textDocument/didOpen") {
      this.uiChanged(msg.method!.slice("textDocument/".length));
    }
    switch (msg.method) {
      case "initialize":
        this.initializeId = msg.id;
        this.root = rootOf(msg.params);
        this.canShowDocument = !!msg.params?.capabilities?.window?.showDocument?.support;
        this.client = msg.params?.capabilities?.experimental?.zephyrDevicetree ?? {};
        break;
      case "initialized":
        this.server.send(msg);
        this.scheduleSync(0);
        return;
      case "textDocument/codeAction":
        if (msg.id !== undefined && msg.params?.textDocument?.uri?.startsWith("file:")) {
          this.codeActions.set(msg.id, fileURLToPath(msg.params.textDocument.uri));
        }
        break;
      case "workspace/executeCommand":
        if (msg.params?.command === SET_ACTIVE_COMMAND) {
          const [id] = msg.params.arguments ?? [];
          this.server
            .request("devicetree/setActive", { id })
            .then(() => this.refreshContexts())
            .then(() => this.zed.send({ id: msg.id, result: null }))
            .catch((e) => this.zed.send({ id: msg.id, error: { code: -32603, message: String(e) } }));
          return;
        }
        if (msg.params?.command === OPEN_UI_COMMAND) {
          this.openUi()
            .then(() => this.zed.send({ id: msg.id, result: null }))
            .catch((e) => this.zed.send({ id: msg.id, error: { code: -32603, message: String(e) } }));
          return;
        }
        break;
      case "shutdown":
        this.watchers.forEach((w) => w.close());
        clearTimeout(this.timer);
        break;
    }
    this.server.send(msg);
  }

  fromServer(msg: Message): void {
    if (this.server.settle(msg)) return;
    if (msg.method === "textDocument/publishDiagnostics") {
      this.zed.send(this.filterDiagnostics(msg));
      return;
    }
    if (msg.method === "devicetree/newActiveContext" || msg.method === "devicetree/contextDeleted") {
      void this.refreshContexts();
    }
    if (msg.method === "devicetree/newActiveContext" || msg.method === "devicetree/activeContextStableNotification") {
      this.uiChanged(msg.method.slice("devicetree/".length));
    }
    // Zed does not know dts-lsp's own notifications and logs each one with its
    // full payload, so they stop here unless the client asked for them.
    if (msg.method?.startsWith("devicetree/") && msg.id === undefined && !this.client.notifications) return;
    if (!msg.method && msg.id !== undefined) {
      if (msg.id === this.initializeId) {
        const caps = msg.result?.capabilities;
        if (caps) {
          const cmds: string[] = caps.executeCommandProvider?.commands ?? [];
          caps.executeCommandProvider = { ...caps.executeCommandProvider, commands: [...cmds, SET_ACTIVE_COMMAND, OPEN_UI_COMMAND] };
        }
      } else if (this.codeActions.has(msg.id)) {
        const file = this.codeActions.get(msg.id)!;
        this.codeActions.delete(msg.id);
        this.zed.send(this.withContextActions(msg, file));
        return;
      }
    }
    this.zed.send(msg);
  }

  private filterDiagnostics(msg: Message): Message {
    const uri: string = msg.params?.uri ?? "";
    if (!uri.startsWith("file:") || !this.external.length) return msg;
    if (!isUnder(fileURLToPath(uri), this.external)) return msg;
    // 1 = Error, 2 = Warning; drop Information and Hint
    const diagnostics = (msg.params.diagnostics ?? []).filter((d: any) => (d.severity ?? 1) <= 2);
    return { ...msg, params: { ...msg.params, diagnostics } };
  }

  /** Offer every other context that contains `file` (SPEC D5). */
  private withContextActions(msg: Message, file: string): Message {
    const owners = this.contexts.filter((c) => filesOf(c).has(file));
    const actions = owners
      .filter((c) => !c.active && c.type !== "Ad Hoc")
      .map((c) => ({
        title: `Devicetree: switch context to ${c.ctxNames.join(", ")}`,
        kind: "source",
        command: { title: "Switch devicetree context", command: SET_ACTIVE_COMMAND, arguments: [c.id] },
      }));
    actions.unshift({
      title: "Devicetree: open visual editor",
      kind: "source",
      command: { title: "Open devicetree visual editor", command: OPEN_UI_COMMAND, arguments: [] },
    });
    if (msg.error) return msg;
    return { ...msg, result: [...(msg.result ?? []), ...actions] };
  }

  private async openUi(): Promise<void> {
    const url = await this.ui.start();
    log(`visual editor: ${url}`);
    if (this.client.showVisualEditor) {
      const res = await this.zed.request(SHOW_UI_REQUEST, { url }).catch(() => undefined);
      if (res?.success) return;
    }
    if (this.canShowDocument) {
      const res = await this.zed.request("window/showDocument", { uri: url, external: true }).catch(() => undefined);
      if (res?.success) return;
    }
    openExternal(url);
  }

  private async refreshContexts(): Promise<void> {
    try {
      this.contexts = (await this.server.request<ContextListItem[]>("devicetree/getContexts")) ?? [];
    } catch (e) {
      log("getContexts failed", e);
    }
  }

  /**
   * A file opened before discovery finished gets an ad-hoc context (an overlay
   * then becomes its own root and reports bogus errors). dts-lsp keeps an active
   * context that owns the file, so move to the newest build that owns it.
   */
  private async preferBuildContext(): Promise<void> {
    const file = this.currentFile;
    if (!file) return;
    const ours = new Set(this.requested.values());
    const active = this.contexts.find((c) => c.active);
    if (active && ours.has(active.id)) return;
    const owner = [...this.requested.values()].find((id) => {
      const ctx = this.contexts.find((c) => c.id === id);
      return ctx && filesOf(ctx).has(file);
    });
    if (!owner) return;
    await this.server.request("devicetree/setActive", { id: owner });
    await this.refreshContexts();
  }

  private scheduleSync(delay = 1000): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.syncing = this.syncing.then(() => this.sync()).catch((e) => log("sync failed", e));
    }, delay);
  }

  /** Push workspace defaults and build contexts to dts-lsp when anything changed. */
  private async sync(): Promise<void> {
    if (!this.root) return;
    this.ws ??= await loadWorkspace(this.root);
    const topdir = this.ws?.topdir ?? this.root;
    if (this.fingerprint === "" && this.ws) this.external = externalRoots(this.ws);
    const builds = discoverBuilds(topdir, defaultDiscovery).map((b) => withPendingOverlay(b, this.external));
    this.builds = builds;
    const fingerprint = JSON.stringify(builds.map((b) => [b.ctxName, b.mtimeMs, b.pending]));
    if (this.fingerprint === "" && this.ws) {
      await this.server.request("devicetree/setDefaultSettings", restrictedDefaults(this.ws, workspaceModules(this.ws)));
      log(`workspace ${topdir}: zephyr ${this.ws.zephyrBase ?? "not found"}, ${this.ws.projects.length} projects`);
    }
    if (fingerprint !== this.fingerprint) {
      this.fingerprint = fingerprint;
      // Re-adding in newest-first order makes dts-lsp prefer the newest build
      // when a file belongs to several (SPEC D5).
      for (const [name, id] of [...this.requested].reverse()) {
        await this.server.request("devicetree/removeContext", { id, name }).catch(() => undefined);
      }
      this.requested.clear();
      for (const b of builds) {
        const { buildDir: _dir, image: _image, mtimeMs: _mtime, appDir: _app, board: _board, westCommand: _west, pending: _pending, ...ctx } = b;
        try {
          const item = await this.server.request<ContextListItem>("devicetree/requestContext", ctx);
          this.requested.set(b.ctxName, item.id);
        } catch (e) {
          log(`context ${b.ctxName}:`, e);
        }
      }
      log(`contexts: ${builds.map((b) => b.ctxName).join(", ") || "none"}`);
      await this.refreshContexts();
      await this.preferBuildContext();
      this.uiChanged("contexts", 0);
    }
    this.watchBuilds(topdir, builds);
  }

  /**
   * Creates the board overlay of a build that has none and re-registers the
   * contexts with it, keeping the same build active. The build itself uses the
   * file only after cmake runs again.
   */
  private async createOverlay(name: string): Promise<string> {
    const b = this.builds.find((x) => x.ctxName === name);
    const file = b && newOverlayTarget(b, this.external);
    if (!file) throw new Error(`no overlay can be created for ${name}`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `/* Devicetree overlay for ${b!.board}, created by the visual editor. */\n`, { flag: "wx" });
    log(`created ${file}`);
    const run = this.syncing.then(() => this.sync());
    this.syncing = run.catch((e) => log("sync failed", e));
    await run;
    const id = this.requested.get(name);
    if (id) {
      await this.server.request("devicetree/setActive", { id });
      await this.refreshContexts();
      this.uiChanged("overlay", 0);
    }
    return file;
  }

  private watchBuilds(topdir: string, builds: BuildContext[]): void {
    this.watchers.forEach((w) => w.close());
    const dirs = new Set([...defaultDiscovery.buildParents.map((p) => join(topdir, p)), ...builds.map((b) => b.buildDir)]);
    this.watchers = [...dirs].flatMap((d) => {
      try {
        return [watch(d, () => this.scheduleSync())];
      } catch {
        return [];
      }
    });
  }
}

function rootOf(params: any): string | undefined {
  const uri = params?.workspaceFolders?.[0]?.uri ?? params?.rootUri;
  if (uri) return fileURLToPath(uri);
  return params?.rootPath ?? undefined;
}

