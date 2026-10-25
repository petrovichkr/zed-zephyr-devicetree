// SPDX-License-Identifier: Apache-2.0
//
// The visual editor inside VS Code (SPEC D33): a webview panel whose only
// content is an iframe on the companion's local server. `asExternalUri` makes
// the URL reachable when the extension host runs remotely (SSH, WSL, containers).

import * as vscode from "vscode";

export class VisualEditorPanel {
  private panel?: vscode.WebviewPanel;
  /** Companion URL the panel shows (before `asExternalUri`). */
  url?: string;

  /** Column of the panel, so files opened from it land next to it. */
  get viewColumn(): vscode.ViewColumn | undefined {
    return this.panel?.visible ? this.panel.viewColumn : undefined;
  }

  async show(url: string): Promise<void> {
    if (this.panel && this.url === url) {
      this.panel.reveal(undefined, false);
      return;
    }
    const external = await vscode.env.asExternalUri(vscode.Uri.parse(url, true));
    const src = external.toString(true);
    const origin = `${external.scheme}://${external.authority}`;
    this.url = url;
    this.panel ??= this.create();
    this.panel.webview.html = page(src, origin);
    this.panel.reveal(undefined, false);
  }

  dispose(): void {
    this.panel?.dispose();
  }

  private create(): vscode.WebviewPanel {
    const panel = vscode.window.createWebviewPanel(
      "zephyrDevicetree.visualEditor",
      "Devicetree",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      // the page lives in the iframe; keeping it alive keeps its scroll and selection
      { enableScripts: true, retainContextWhenHidden: true, localResourceRoots: [] },
    );
    panel.onDidDispose(() => {
      this.panel = undefined;
      this.url = undefined;
    });
    return panel;
  }
}

function page(src: string, origin: string): string {
  const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src ${attr(origin)}; style-src 'unsafe-inline';">
<style>html, body, iframe { margin: 0; padding: 0; border: 0; width: 100%; height: 100%; overflow: hidden; }</style>
</head>
<body><iframe src="${attr(src)}" allow="clipboard-read; clipboard-write"></iframe></body>
</html>`;
}
