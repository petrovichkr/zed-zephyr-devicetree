// SPDX-License-Identifier: Apache-2.0

import type { UiModel, UiNode } from "../src/ui/model.js";
import { h } from "./dom.js";
import { aliasesOf, classIcon, nodeClass } from "./icons.js";
import { ancestors, rerender, select, state } from "./state.js";

interface Row {
  node: UiNode;
  depth: number;
  open: boolean;
}

export function matches(n: UiNode, q: string): boolean {
  return (
    n.path.toLowerCase().includes(q) ||
    n.name.toLowerCase().includes(q) ||
    n.labels.some((l) => l.toLowerCase().includes(q)) ||
    n.compatible.some((c) => c.toLowerCase().includes(q))
  );
}

interface Filter {
  visible: Set<string>;
  forced: Set<string>;
  hits: number;
}

function filter(m: UiModel): Filter | null {
  const q = state.search.trim().toLowerCase();
  if (!q) return null;
  const visible = new Set<string>();
  const forced = new Set<string>();
  let hits = 0;
  for (const n of Object.values(m.nodes)) {
    if (!matches(n, q)) continue;
    hits++;
    visible.add(n.path);
    for (const a of ancestors(n.path)) {
      visible.add(a);
      forced.add(a);
    }
  }
  return { visible, forced, hits };
}

function rows(m: UiModel, f: Filter | null): Row[] {
  const out: Row[] = [];
  const walk = (path: string, depth: number): void => {
    const node = m.nodes[path];
    if (!node || (f && !f.visible.has(path))) return;
    const open = f ? f.forced.has(path) || state.expanded.has(path) : state.expanded.has(path);
    out.push({ node, depth, open });
    if (open) for (const c of node.children) walk(c, depth + 1);
  };
  walk(m.root, 0);
  return out;
}

function toggle(path: string): void {
  if (state.expanded.has(path)) state.expanded.delete(path);
  else state.expanded.add(path);
  rerender();
}

function onKey(e: KeyboardEvent, list: Row[], m: UiModel): void {
  const i = list.findIndex((r) => r.node.path === state.selected);
  const row = list[i];
  const go = (r: Row | undefined): void => {
    if (!r) return;
    state.scrollToSelected = true;
    select(r.node.path);
  };
  switch (e.key) {
    case "ArrowDown":
      go(list[i + 1] ?? list[0]);
      break;
    case "ArrowUp":
      go(list[Math.max(0, i - 1)]);
      break;
    case "ArrowRight":
      if (!row || !row.node.children.length) return;
      if (!row.open) toggle(row.node.path);
      else go(list[i + 1]);
      break;
    case "ArrowLeft":
      if (!row) return;
      if (row.open && row.node.path !== m.root && state.expanded.has(row.node.path)) toggle(row.node.path);
      else {
        const p = state.parents.get(row.node.path);
        if (p) go(list.find((r) => r.node.path === p));
      }
      break;
    case "Home":
      go(list[0]);
      break;
    case "End":
      go(list[list.length - 1]);
      break;
    default:
      return;
  }
  e.preventDefault();
}

export function renderTree(m: UiModel): HTMLElement {
  const f = filter(m);
  const list = rows(m, f);
  const q = state.search.trim().toLowerCase();
  const items = list.map(({ node, depth, open }) =>
    h(
      "div",
      {
        class: `row${node.path === state.selected ? " selected" : ""}${node.disabled ? " disabled" : ""}${f && !matches(node, q) ? " context" : ""}`,
        "data-path": node.path,
        style: `padding-left:${depth * 14 + 4}px`,
        title: node.path,
        onclick: () => select(node.path),
      },
      h(
        "span",
        {
          class: "twisty",
          onclick: (e: Event) => {
            e.stopPropagation();
            if (node.children.length) toggle(node.path);
          },
        },
        node.children.length ? (open ? "▾" : "▸") : "",
      ),
      node.compatible.length && state.model && nodeClass(state.model, node) ? classIcon(nodeClass(state.model, node)) : null,
      node.labels.map((l) => h("span", { class: "label" }, `${l}:`)),
      h("span", { class: "name" }, node.name),
      node.compatible.length ? h("span", { class: "compat" }, node.compatible.join(", ")) : null,
      state.model ? aliasesOf(state.model, node.path).map((a) => h("span", { class: "badge alias", title: a.startsWith("chosen") ? "/chosen" : "/aliases" }, a)) : null,
      node.disabled ? h("span", { class: "badge muted" }, "disabled") : null,
      node.issues > 0 ? h("span", { class: "badge warn", title: `${node.issues} issue(s)` }, String(node.issues)) : null,
    ),
  );

  const tree = h(
    "div",
    {
      class: "tree",
      tabindex: 0,
      role: "tree",
      "data-key": "tree",
      "data-scroll": "tree",
      onkeydown: (e: KeyboardEvent) => onKey(e, list, m),
    },
    items.length ? items : h("div", { class: "empty" }, "No matching nodes"),
  );

  if (state.scrollToSelected) {
    state.scrollToSelected = false;
    requestAnimationFrame(() => tree.querySelector(".row.selected")?.scrollIntoView({ block: "nearest" }));
  }

  return h(
    "div",
    { class: "tree-pane" },
    h(
      "div",
      { class: "search" },
      h("input", {
        type: "search",
        placeholder: "Search path, name, label, compatible",
        "data-key": "search",
        value: state.search,
        oninput: (e: Event) => {
          state.search = (e.target as HTMLInputElement).value;
          rerender();
        },
        onkeydown: (e: KeyboardEvent) => {
          if (e.key === "Escape") {
            state.search = "";
            rerender();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            tree.focus();
          }
        },
      }),
      h("span", { class: "muted count" }, f ? `${f.hits} match${f.hits === 1 ? "" : "es"}` : `${Object.keys(m.nodes).length} nodes`),
    ),
    tree,
  );
}
