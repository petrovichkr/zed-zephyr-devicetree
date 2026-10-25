// SPDX-License-Identifier: Apache-2.0
//
// VS Code wrapper (SPEC D33). It starts the same companion as the Zed
// extension: one client for devicetree sources (companion --server <dts-lsp>)
// and one for binding YAML (companion --bindings). Everything editor-specific
// lives here: the visual editor panel, the context picker and the status bar.

import * as vscode from "vscode";
import {
  LanguageClient,
  State,
  TransportKind,
  type ClientCapabilities,
  type LanguageClientOptions,
  type ServerOptions,
  type StaticFeature,
} from "vscode-languageclient/node";
import { VIEW_TYPE, VisualEditorPanel } from "./webview";
import { registerBindingSchema } from "./yamlschema";

// Must match companion/src/proxy.ts.
const SET_ACTIVE_COMMAND = "zephyr-devicetree.setActiveContext";
const OPEN_UI_COMMAND = "zephyr-devicetree.openVisualEditor";
const SHOW_UI_REQUEST = "zephyrDevicetree/showVisualEditor";

const NRF_DEVICETREE = "nordic-semiconductor.nrf-devicetree";
const SECTION = "zephyrDevicetree";

interface ContextItem {
  id: string;
  ctxNames: string[];
  active: boolean;
  type?: string;
}

let dts: LanguageClient | undefined;
let bindings: LanguageClient | undefined;
const panel = new VisualEditorPanel();
/** Set while the panel is pointed at a new companion URL without taking focus. */
let quietOpen = false;
/** redhat.vscode-yaml took the binding schema (registered once per session). */
let yamlSchema: Promise<boolean> | undefined;
let status: vscode.StatusBarItem;
let log: vscode.OutputChannel;

/** Returned from activate; used by the integration test. */
export interface ZephyrDevicetreeApi {
  contexts(): Promise<ContextItem[]>;
  visualEditorUrl(): string | undefined;
}

export async function activate(context: vscode.ExtensionContext): Promise<ZephyrDevicetreeApi> {
  log = vscode.window.createOutputChannel("Zephyr Devicetree");
  status = vscode.window.createStatusBarItem("zephyrDevicetree.context", vscode.StatusBarAlignment.Left, 50);
  status.name = "Devicetree context";
  status.command = "zephyrDevicetree.switchContext";
  context.subscriptions.push(
    log,
    status,
    { dispose: () => panel.dispose() },
    // After a reload VS Code brings the panel back; it shows the UI once the server runs.
    vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, {
      async deserializeWebviewPanel(restored) {
        panel.adopt(restored);
        if (!config().get<boolean>("languageServer.enable", true)) panel.detach("The devicetree language server is turned off (zephyrDevicetree.languageServer.enable).");
        else void refreshPanel();
      },
    }),
    vscode.commands.registerCommand("zephyrDevicetree.openVisualEditor", () => run(OPEN_UI_COMMAND)),
    vscode.commands.registerCommand("zephyrDevicetree.switchContext", () => switchContext()),
    vscode.commands.registerCommand("zephyrDevicetree.restartServer", () => restart(context)),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(`${SECTION}.languageServer`) || e.affectsConfiguration(`${SECTION}.bindings`) || e.affectsConfiguration(`${SECTION}.server.path`) || e.affectsConfiguration(`${SECTION}.server.arguments`)) {
        void restart(context);
      } else if (e.affectsConfiguration(`${SECTION}.server.settings`)) {
        void dts?.sendNotification("workspace/didChangeConfiguration", { settings: { devicetree: userSettings() } });
      }
    }),
    vscode.window.onDidChangeActiveTextEditor(() => void refreshStatus()),
  );
  await warnAboutNrf(context);
  await start(context);
  return { contexts, visualEditorUrl: () => panel.url };
}

export async function deactivate(): Promise<void> {
  await stop();
}

function config() {
  return vscode.workspace.getConfiguration(SECTION);
}

function userSettings(): unknown {
  return config().get("server.settings") ?? {};
}

async function start(context: vscode.ExtensionContext): Promise<void> {
  const companion = context.asAbsolutePath("dist/companion.cjs");
  if (config().get<boolean>("languageServer.enable", true)) {
    dts = devicetreeClient(context, companion);
    await dts.start().catch((e) => log.appendLine(`devicetree server: ${e}`));
    void dts.sendNotification("workspace/didChangeConfiguration", { settings: { devicetree: userSettings() } });
    void refreshStatus();
  }
  yamlSchema ??= registerBindingSchema(context, () => config().get<boolean>("bindings.yamlSchema", true));
  if (config().get<boolean>("bindings.enable", true)) {
    const schema = (await yamlSchema) && config().get<boolean>("bindings.yamlSchema", true);
    bindings = new LanguageClient(
      "zephyrDevicetree.bindings",
      "Zephyr Bindings",
      { module: companion, args: ["--bindings"], transport: TransportKind.stdio },
      // The server answers only for files in binding directories (SPEC D22).
      { documentSelector: [{ scheme: "file", language: "yaml" }], outputChannel: log, initializationOptions: { yamlSchema: schema } },
    );
    await bindings.start().catch((e) => log.appendLine(`bindings server: ${e}`));
  }
}

async function stop(): Promise<void> {
  const clients = [dts, bindings];
  dts = bindings = undefined;
  if (panel.isOpen) panel.detach("The devicetree language server is not running.");
  status?.hide();
  await Promise.all(clients.map((c) => c?.stop().catch(() => undefined)));
}

async function restart(context: vscode.ExtensionContext): Promise<void> {
  await stop();
  await start(context);
}

function devicetreeClient(context: vscode.ExtensionContext, companion: string): LanguageClient {
  const custom = config().get<string>("server.path")?.trim();
  const server = custom ? [custom, ...(config().get<string[]>("server.arguments") ?? [])] : [context.asAbsolutePath("dist/dts-lsp/dist/server.js")];
  const serverOptions: ServerOptions = { module: companion, args: ["--server", ...server], transport: TransportKind.stdio };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "dts" }],
    outputChannel: log,
    middleware: {
      workspace: {
        // dts-lsp reads its `devicetree` section; ours lives under zephyrDevicetree.server.settings.
        configuration: async (params, token, next) => {
          const res = await next(params, token);
          if (!Array.isArray(res)) return res;
          return params.items.map((item, i) => (item.section === "devicetree" ? userSettings() : res[i]));
        },
      },
      window: {
        // Files opened from the visual editor go next to it, not over it.
        showDocument: async (params, next) => {
          const column = panel.viewColumn;
          const uri = vscode.Uri.parse(params.uri);
          if (params.external || column === undefined || uri.scheme !== "file") {
            const res = await next(params, new vscode.CancellationTokenSource().token);
            return "success" in res ? res : { success: false };
          }
          const doc = await vscode.workspace.openTextDocument(uri);
          const range = params.selection && new vscode.Range(params.selection.start.line, params.selection.start.character, params.selection.end.line, params.selection.end.character);
          const target = vscode.window.visibleTextEditors.find((e) => e.viewColumn !== undefined && e.viewColumn !== column)?.viewColumn;
          await vscode.window.showTextDocument(doc, {
            viewColumn: target ?? (column === vscode.ViewColumn.One ? vscode.ViewColumn.Two : vscode.ViewColumn.One),
            selection: range,
            preserveFocus: !params.takeFocus,
          });
          return { success: true };
        },
      },
    },
  };
  const client = new LanguageClient("zephyrDevicetree.devicetree", "Zephyr Devicetree", serverOptions, clientOptions);
  client.registerFeature(new CompanionFeature());
  client.onRequest(SHOW_UI_REQUEST, async ({ url }: { url: string }) => {
    // the companion then opens a browser; a panel restored from a reload stays a panel
    if (config().get("visualEditor.openIn") === "browser" && !quietOpen) return { success: false };
    await panel.show(url, !quietOpen);
    return { success: true };
  });
  // A new companion (start, restart, crash recovery) serves the UI on a new port.
  client.onDidChangeState((e) => {
    if (e.newState === State.Running) void refreshPanel();
    else if (e.newState === State.Stopped && panel.isOpen) panel.detach("The devicetree language server stopped.");
  });
  for (const n of ["devicetree/newActiveContext", "devicetree/contextDeleted", "devicetree/activeContextStableNotification"]) {
    client.onNotification(n, () => void refreshStatus());
  }
  return client;
}

/** Declares what this client does on top of LSP (companion/src/proxy.ts ClientFeatures). */
class CompanionFeature implements StaticFeature {
  fillClientCapabilities(caps: ClientCapabilities): void {
    caps.experimental = { ...(caps.experimental as object), zephyrDevicetree: { showVisualEditor: true, notifications: true } };
  }
  getState() {
    return { kind: "static" as const };
  }
  initialize(): void {}
  clear(): void {}
}

async function run(command: string, args: unknown[] = []): Promise<void> {
  if (!dts?.isRunning()) {
    void vscode.window.showWarningMessage("Zephyr Devicetree: the language server is not running.");
    return;
  }
  try {
    await dts.sendRequest("workspace/executeCommand", { command, arguments: args });
  } catch (e) {
    void vscode.window.showErrorMessage(`Zephyr Devicetree: ${e instanceof Error ? e.message : e}`);
  }
}

/** Points an open panel at the running companion's UI. */
async function refreshPanel(): Promise<void> {
  if (!panel.isOpen || !dts?.isRunning()) return;
  quietOpen = true;
  try {
    await run(OPEN_UI_COMMAND);
  } finally {
    quietOpen = false;
  }
}

async function contexts(): Promise<ContextItem[]> {
  if (!dts?.isRunning()) return [];
  return (await dts.sendRequest<ContextItem[] | null>("devicetree/getContexts").catch(() => null)) ?? [];
}

async function switchContext(): Promise<void> {
  const list = (await contexts()).filter((c) => c.type !== "Ad Hoc" || c.active);
  if (!list.length) {
    void vscode.window.showInformationMessage("Zephyr Devicetree: no devicetree contexts yet. Build the application or open a .dts file.");
    return;
  }
  const pick = await vscode.window.showQuickPick(
    list.map((c) => ({ label: c.ctxNames.join(", "), description: [c.active ? "active" : "", c.type ?? ""].filter(Boolean).join(" · "), id: c.id })),
    { placeHolder: "Devicetree context" },
  );
  if (pick) {
    await run(SET_ACTIVE_COMMAND, [pick.id]);
    await refreshStatus();
  }
}

async function refreshStatus(): Promise<void> {
  const active = (await contexts()).find((c) => c.active);
  if (!active) {
    status.hide();
    return;
  }
  status.text = `$(circuit-board) ${active.ctxNames[0] ?? active.id}`;
  status.tooltip = `Devicetree context: ${active.ctxNames.join(", ")}\nClick to switch`;
  status.show();
}

/**
 * nRF DeviceTree runs its own devicetree-language-server on the same files:
 * two servers mean duplicate diagnostics and completions (SPEC 6c, stage 10).
 */
async function warnAboutNrf(context: vscode.ExtensionContext): Promise<void> {
  const key = "nrfWarningDismissed";
  if (!vscode.extensions.getExtension(NRF_DEVICETREE) || !config().get("languageServer.enable", true) || context.globalState.get(key)) return;
  const disable = "Use nRF DeviceTree's server";
  const keep = "Keep both";
  const choice = await vscode.window.showWarningMessage(
    "nRF DeviceTree is also installed. Both extensions run a devicetree language server on .dts files, so diagnostics and completions appear twice.",
    disable,
    keep,
  );
  if (choice === disable) {
    const target = vscode.workspace.workspaceFolders ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
    await config().update("languageServer.enable", false, target);
  } else if (choice === keep) {
    await context.globalState.update(key, true);
  }
}
