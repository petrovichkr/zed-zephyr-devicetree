// SPDX-License-Identifier: Apache-2.0
//
// Embedding editor (VS Code webview, ARCHITECTURE D33). The page then runs in an iframe
// (`?embed=vscode`) and talks to its parent with postMessage: the parent sends
// its theme, the page asks it to save files (downloads are blocked in webviews).
// In a plain browser tab nothing here applies.

export const embedded = new URLSearchParams(location.search).get("embed") === "vscode" && window.parent !== window;

/** Origin of the parent, learnt from its first message; files go only there. */
let parentOrigin: string | undefined;

interface HostTheme {
  type: "theme";
  kind: "light" | "dark";
  vars: Record<string, string>;
}

export function initHost(): void {
  if (!embedded) return;
  window.addEventListener("message", (e) => {
    if (e.source !== window.parent) return;
    parentOrigin = e.origin;
    if (e.data?.type === "theme") applyTheme(e.data as HostTheme);
  });
  // carries nothing, so any origin may see it
  window.parent.postMessage({ type: "ready" }, "*");
}

function applyTheme(t: HostTheme): void {
  const root = document.documentElement;
  root.dataset.theme = t.kind === "dark" ? "dark" : "light";
  for (const [k, v] of Object.entries(t.vars ?? {})) {
    if (/^--[a-z0-9-]+$/.test(k) && typeof v === "string" && v.trim()) root.style.setProperty(k, v);
  }
}

/** Hands a file to the embedding editor; false when there is none to take it. */
export function saveFile(name: string, content: string): boolean {
  if (!embedded || !parentOrigin) return false;
  window.parent.postMessage({ type: "saveFile", name, content }, parentOrigin);
  return true;
}
