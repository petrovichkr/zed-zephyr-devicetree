// SPDX-License-Identifier: Apache-2.0

export type Child = Node | string | number | null | undefined | false | Child[];
export type Attrs = Record<string, unknown>;

// Set as DOM properties after children exist (a <select> value needs its options).
const PROPS = new Set(["value", "checked", "disabled", "selected", "open", "indeterminate"]);

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  const props: [string, unknown][] = [];
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === undefined || v === null) continue;
    if (PROPS.has(k)) props.push([k, v]);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v as EventListener);
    else if (v === false) continue;
    else if (k === "class") el.className = String(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  append(el, children);
  for (const [k, v] of props) (el as any)[k] = v;
  return el;
}

function append(el: Node, c: Child): void {
  if (c === null || c === undefined || c === false) return;
  if (Array.isArray(c)) for (const x of c) append(el, x);
  else el.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
}

/** Re-renders `root` while keeping focus, caret and scroll of elements tagged with `data-key`. */
export function patch(root: HTMLElement, content: Child): void {
  const active = document.activeElement as HTMLInputElement | null;
  const key = active && root.contains(active) ? active.dataset.key : undefined;
  const sel = key && "selectionStart" in active! ? [active!.selectionStart, active!.selectionEnd] : null;
  const scrolls = [...root.querySelectorAll<HTMLElement>("[data-scroll]")].map((e) => [e.dataset.scroll!, e.scrollTop] as const);
  root.replaceChildren();
  append(root, content);
  for (const [k, top] of scrolls) {
    const e = root.querySelector<HTMLElement>(`[data-scroll="${k}"]`);
    if (e) e.scrollTop = top;
  }
  if (key) {
    const e = root.querySelector<HTMLInputElement>(`[data-key="${CSS.escape(key)}"]`);
    if (e) {
      e.focus({ preventScroll: true });
      if (sel && sel[0] != null && sel[1] != null && typeof e.setSelectionRange === "function") {
        try {
          e.setSelectionRange(sel[0], sel[1]);
        } catch {
          // not a text input
        }
      }
    }
  }
}
