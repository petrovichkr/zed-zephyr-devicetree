// SPDX-License-Identifier: Apache-2.0

import type { UiModel, UiMemoryRegion } from "../src/ui/model.js";
import { h } from "./dom.js";
import { hex, humanSize } from "./format.js";
import { select, state } from "./state.js";

/** Address range covered by a region, or by its children when it has no size of its own. */
function extent(r: UiMemoryRegion): [number, number] | null {
  if (r.size > 0) return [r.start, r.start + r.size];
  let lo = Infinity;
  let hi = -Infinity;
  for (const c of r.children) {
    const e = extent(c);
    if (!e) continue;
    lo = Math.min(lo, e[0]);
    hi = Math.max(hi, e[1]);
  }
  return lo < hi ? [lo, hi] : null;
}

const range = (r: UiMemoryRegion): string => (r.size > 0 ? `${hex(r.start)} – ${hex(r.start + r.size - 1)}` : "");
const open = (r: UiMemoryRegion): void => select(r.path, { reveal: true, tab: "tree" });

function bar(r: UiMemoryRegion): HTMLElement | null {
  const e = extent(r);
  const kids = r.children.filter((c) => c.size > 0);
  if (!e || !kids.length) return null;
  const span = e[1] - e[0];
  return h(
    "div",
    { class: "bar", title: `${hex(e[0])} – ${hex(e[1] - 1)}` },
    kids.map((c, i) =>
      h("div", {
        class: `seg c${i % 6}${c.disabled ? " disabled" : ""}${c.path === state.selected ? " selected" : ""}`,
        style: `left:${((c.start - e[0]) / span) * 100}%;width:${(c.size / span) * 100}%`,
        title: `${c.name}\n${range(c)}\n${humanSize(c.size)}`,
        onclick: () => open(c),
      }),
    ),
  );
}

function rows(r: UiMemoryRegion, depth: number, out: HTMLElement[]): void {
  out.push(
    h(
      "tr",
      {
        class: `${depth === 0 ? "root" : ""}${r.disabled ? " disabled" : ""}${r.path === state.selected ? " selected" : ""}`,
        title: r.path,
        onclick: () => open(r),
      },
      h("td", { style: `padding-left:${depth * 16 + 6}px` }, r.name),
      h("td", { class: "mono" }, range(r)),
      h("td", { class: "num" }, r.size > 0 ? humanSize(r.size) : ""),
      h("td", { class: "mono" }, r.labels.join(", ")),
      h("td", null, r.disabled ? h("span", { class: "badge muted" }, "disabled") : null),
    ),
  );
  const b = r.children.length > 1 || depth === 0 ? bar(r) : null;
  if (b) out.push(h("tr", { class: "bar-row" }, h("td", { colspan: 5, style: `padding-left:${depth * 16 + 6}px` }, b)));
  for (const c of r.children) rows(c, depth + 1, out);
}

export function renderMemory(m: UiModel): HTMLElement {
  if (!m.memory.length) return h("div", { class: "empty" }, "No memory regions in this context");
  const out: HTMLElement[] = [];
  for (const r of m.memory) rows(r, 0, out);
  return h(
    "div",
    { class: "memory", "data-scroll": "memory" },
    h(
      "table",
      { class: "mem" },
      h("thead", null, h("tr", null, h("th", null, "Region"), h("th", null, "Range"), h("th", null, "Size"), h("th", null, "Labels"), h("th", null))),
      h("tbody", null, out),
    ),
  );
}
