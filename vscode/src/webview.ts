// SPDX-License-Identifier: Apache-2.0
//
// The visual editor inside VS Code (SPEC D33): a webview panel whose content is
// an iframe on the companion's local server. `asExternalUri` makes the URL
// reachable when the extension host runs remotely (SSH, WSL, containers).
// A small script in the panel relays between the page and VS Code: the theme
// goes in, files to save come out (companion/ui/host.ts is the other side).

import { randomBytes } from "node:crypto";
import * as vscode from "vscode";

export const VIEW_TYPE = "zephyrDevicetree.visualEditor";
const MAX_FILE = 16 << 20;

export class VisualEditorPanel {
  private panel?: vscode.WebviewPanel;
  /** Companion URL the panel shows (before `asExternalUri`). */
  url?: string;

  get isOpen(): boolean {
    return !!this.panel;
  }

  /** Column of the panel, so files opened from it land next to it. */
  get viewColumn(): vscode.ViewColumn | undefined {
    return this.panel?.visible ? this.panel.viewColumn : undefined;
  }

  /** Takes over a panel VS Code restored after a reload; it waits for `show`. */
  adopt(panel: vscode.WebviewPanel): void {
    this.panel?.dispose();
    this.panel = this.wire(panel);
    this.url = undefined;
    this.placeholder("Starting the devicetree language server…");
  }

  /** The companion went away: its URL is dead until the server is back. */
  detach(message: string): void {
    this.url = undefined;
    this.placeholder(message);
  }

  async show(url: string, reveal = true): Promise<void> {
    if (this.panel && this.url === url) {
      if (reveal) this.panel.reveal(undefined, false);
      return;
    }
    const sep = url.includes("?") ? "&" : "?";
    const external = await vscode.env.asExternalUri(vscode.Uri.parse(`${url}${sep}embed=vscode`, true));
    this.url = url;
    this.panel ??= this.create();
    this.panel.webview.html = page(external.toString(true), `${external.scheme}://${external.authority}`);
    if (reveal) this.panel.reveal(undefined, false);
  }

  dispose(): void {
    this.panel?.dispose();
  }

  private placeholder(message: string): void {
    if (this.panel) this.panel.webview.html = page(undefined, undefined, message);
  }

  private create(): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      "Devicetree",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      // the page lives in the iframe; keeping it alive keeps its scroll and selection
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] },
    );
    return this.wire(panel);
  }

  private wire(panel: vscode.WebviewPanel): vscode.WebviewPanel {
    panel.webview.options = { enableScripts: true, localResourceRoots: [] };
    panel.webview.onDidReceiveMessage((m) => {
      if (m?.type === "saveFile" && typeof m.name === "string" && typeof m.content === "string") void saveFile(m.name, m.content);
    });
    panel.onDidDispose(() => {
      if (this.panel !== panel) return;
      this.panel = undefined;
      this.url = undefined;
    });
    return panel;
  }
}

async function saveFile(name: string, content: string): Promise<void> {
  if (content.length > MAX_FILE) return void vscode.window.showErrorMessage("Zephyr Devicetree: the file is too large to save.");
  const base = name.replace(/[^\w.-]+/g, "_").replace(/^\.+/, "") || "diagram.svg";
  const dir = vscode.workspace.workspaceFolders?.[0]?.uri;
  const target = await vscode.window.showSaveDialog({
    defaultUri: dir ? vscode.Uri.joinPath(dir, base) : undefined,
    filters: base.endsWith(".svg") ? { "SVG image": ["svg"] } : undefined,
    saveLabel: "Save diagram",
  });
  if (!target) return;
  await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(content));
  void vscode.window.showInformationMessage(`Saved ${vscode.workspace.asRelativePath(target)}`);
}

/**
 * VS Code theme colours mapped onto the page's tokens (companion/ui/styles.css).
 * Missing ones keep the page's own light or dark value.
 */
const THEME_VARS: Record<string, string[]> = {
  "--bg": ["--vscode-editor-background"],
  "--bg2": ["--vscode-sideBar-background", "--vscode-editorWidget-background"],
  "--fg": ["--vscode-editor-foreground", "--vscode-foreground"],
  "--muted": ["--vscode-descriptionForeground"],
  "--border": ["--vscode-panel-border", "--vscode-widget-border", "--vscode-editorGroup-border"],
  "--hover": ["--vscode-list-hoverBackground"],
  "--sel": ["--vscode-list-activeSelectionBackground"],
  "--sel-fg": ["--vscode-list-activeSelectionForeground"],
  "--accent": ["--vscode-textLink-foreground"],
  "--code": ["--vscode-textCodeBlock-background"],
  "--danger": ["--vscode-errorForeground"],
  "--font": ["--vscode-font-family"],
  "--mono": ["--vscode-editor-font-family"],
};

function page(src: string | undefined, origin: string | undefined, message = ""): string {
  const nonce = randomBytes(16).toString("base64");
  const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const csp = `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';${origin ? ` frame-src ${attr(origin)};` : ""}`;
  const body = src
    ? `<iframe id="ui" src="${attr(src)}" allow="clipboard-read; clipboard-write"></iframe>`
    : `<p class="msg">${attr(message)}</p>`;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<style>
html, body, iframe { margin: 0; padding: 0; border: 0; width: 100%; height: 100%; overflow: hidden; }
.msg { padding: 16px; color: var(--vscode-descriptionForeground); font-family: var(--vscode-font-family); }
</style>
</head>
<body>${body}
<script nonce="${nonce}">
(() => {
  const vscode = acquireVsCodeApi();
  const frame = document.getElementById("ui");
  const origin = ${JSON.stringify(origin ?? "")};
  if (!frame) return;
  const map = ${JSON.stringify(THEME_VARS)};
  function theme() {
    const cls = document.body.classList;
    const kind = cls.contains("vscode-dark") || (cls.contains("vscode-high-contrast") && !cls.contains("vscode-high-contrast-light")) ? "dark" : "light";
    const css = getComputedStyle(document.documentElement);
    const vars = {};
    for (const [k, names] of Object.entries(map)) {
      for (const n of names) {
        const v = css.getPropertyValue(n).trim();
        if (v) { vars[k] = v; break; }
      }
    }
    frame.contentWindow.postMessage({ type: "theme", kind, vars }, origin);
  }
  window.addEventListener("message", (e) => {
    if (e.source !== frame.contentWindow || e.origin !== origin) return;
    if (e.data && e.data.type === "ready") theme();
    else if (e.data && e.data.type === "saveFile") vscode.postMessage({ type: "saveFile", name: String(e.data.name), content: String(e.data.content) });
  });
  new MutationObserver(theme).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  new MutationObserver(theme).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
})();
</script>
</body>
</html>`;
}
