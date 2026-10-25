// SPDX-License-Identifier: Apache-2.0

import type { UiMemory } from "../src/ui/memmap.js";
import type { UiModel, UiMemoryRegion } from "../src/ui/model.js";
import * as api from "./api.js";
import { h } from "./dom.js";
import { downloadSvg } from "./export.js";
import { basename, hex, humanSize } from "./format.js";
import { applyChange, canEdit, rerender, select, state } from "./state.js";
import { clip, s } from "./svg.js";

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

const COL_H = 460;
const MIN_H = 26;
const GUTTER = 92;
const LANE_W = 190;

type Item = { offset: number; size: number; seg?: UiMemory["segments"][0] };

/** RAM without sub-regions is a single block: a short column is enough. */
const heightOf = (m: UiMemory): number => (m.segments.length ? COL_H : 90);

/** Offset -> y: every item gets MIN_H, the rest of the height is shared by size. */
function scale(m: UiMemory): (offset: number) => number {
  const COL_H = heightOf(m);
  const items: Item[] = [...m.segments.filter((x) => x.lane === 0), ...m.gaps].sort((a, b) => a.offset - b.offset);
  const total = items.reduce((n, i) => n + i.size, 0) || 1;
  const free = Math.max(0, COL_H - items.length * MIN_H);
  const marks: [number, number][] = [[items[0]?.offset ?? 0, 0]];
  let y = 0;
  for (const i of items) {
    y += MIN_H + (free * i.size) / total;
    marks.push([i.offset + i.size, y]);
  }
  return (off) => {
    for (let k = 1; k < marks.length; k++) {
      const [o0, y0] = marks[k - 1]!;
      const [o1, y1] = marks[k]!;
      if (off <= o1) return o1 === o0 ? y1 : y0 + ((off - o0) / (o1 - o0)) * (y1 - y0);
    }
    return marks[marks.length - 1]![1];
  };
}

const addrText = (m: UiMemory, off: number): string => (m.base !== undefined ? hex(m.base + off) : `+0x${off.toString(16)}`);

async function addPartition(m: UiMemory, gap: { offset: number; size: number }): Promise<void> {
  if (!m.partitions || !canEdit()) return;
  const label = prompt(`New partition in ${m.name} at 0x${gap.offset.toString(16)}, ${humanSize(gap.size)} free.\nLabel:`, "storage_partition");
  if (!label) return;
  if (!/^[A-Za-z_]\w*$/.test(label)) return void alert("A label is letters, digits and _ and does not start with a digit.");
  const name = `partition@${gap.offset.toString(16)}`;
  await applyChange(
    () =>
      api.addNode({
        parentPath: m.partitions!,
        overlay: state.overlay,
        name,
        label,
        props: [
          { name: "label", value: `"${label.replace(/_partition$/, "")}"` },
          { name: "reg", value: `<0x${gap.offset.toString(16)} 0x${gap.size.toString(16)}>` },
        ],
      }),
    `Added ${label}`,
    `Adding ${label}`,
  );
}

function column(m: UiMemory): HTMLElement {
  const lanes = Math.max(1, ...m.segments.map((x) => x.lane + 1));
  // addresses grow upwards: offset 0 at the bottom, a block is drawn from its end
  const fromTop = scale(m);
  const y = (o: number): number => heightOf(m) - fromTop(o);
  const width = GUTTER + lanes * LANE_W + 8;
  const out: SVGElement[] = [];
  const top = 8;
  // address marks at every boundary, skipping ones that would collide
  const bounds = [...new Set([0, m.size, ...m.segments.flatMap((x) => [x.offset, x.offset + x.size]), ...m.gaps.flatMap((g) => [g.offset, g.offset + g.size])])]
    .filter((o) => o <= Math.max(m.size, 0) || m.size === 0)
    .sort((a, b) => a - b);
  let lastY = -100;
  bounds.reverse(); // top to bottom, so the collision check walks down the column
  for (const o of bounds) {
    const yy = top + y(o);
    out.push(s("line", { class: "tick", x1: GUTTER - 6, y1: yy, x2: GUTTER, y2: yy }));
    if (yy - lastY >= 12) {
      out.push(s("text", { class: "addr", x: GUTTER - 9, y: yy + 4, "text-anchor": "end" }, addrText(m, o)));
      lastY = yy;
    }
  }
  m.gaps.forEach((g) => {
    const y0 = top + y(g.offset + g.size);
    const h0 = y(g.offset) - y(g.offset + g.size);
    const add = !!m.partitions && canEdit();
    // in RAM a gap is just the part of the region no sub-region claims, not free space
    const what = m.kind === "flash" ? "free" : m.segments.length ? "rest of region" : m.name;
    out.push(
      s(
        "g",
        { class: `gap${add ? " can-add" : ""}${m.kind === "ram" ? " ram" : ""}`, onclick: () => (m.kind === "flash" ? void addPartition(m, g) : select(m.path)) },
        s("title", {}, `${what}: ${addrText(m, g.offset)} – ${addrText(m, g.offset + g.size - 1)}, ${humanSize(g.size)}${add ? "\nclick: add a partition here" : ""}`),
        s("rect", { x: GUTTER, y: y0, width: lanes * LANE_W, height: h0 }),
        h0 >= 14 ? s("text", { class: "t2", x: GUTTER + 10, y: y0 + Math.min(h0 / 2 + 4, 17) }, `${what} ${humanSize(g.size)}${add ? "  ＋" : ""}`) : null,
      ),
    );
  });
  m.segments.forEach((x, i) => {
    const y0 = top + y(x.offset + x.size);
    const h0 = Math.max(4, y(x.offset) - y(x.offset + x.size));
    const cls = `mseg c${i % 6}${x.disabled ? " off" : ""}${x.overlap ? " overlap" : ""}${state.selected === x.path ? " selected" : ""}`;
    const tags = [humanSize(x.size), x.readOnly ? "read-only" : "", ...x.chosen].filter(Boolean).join(" · ");
    out.push(
      s(
        "g",
        { class: cls, onclick: () => select(x.path), ondblclick: () => select(x.path, { reveal: true, tab: "tree" }) },
        s("title", {}, `${x.path}\n${addrText(m, x.offset)} – ${addrText(m, x.offset + x.size - 1)}\n${humanSize(x.size)}${x.overlap ? "\noverlaps another partition" : ""}\nclick: select, double click: open in Tree`),
        s("rect", { x: GUTTER + x.lane * LANE_W, y: y0, width: LANE_W - 2, height: h0 }),
        s(
          "svg",
          { x: GUTTER + x.lane * LANE_W + 8, y: y0, width: LANE_W - 14, height: h0, overflow: "hidden" },
          s("text", { class: "t1", x: 0, y: Math.min(15, h0 / 2 + 4) }, clip(x.name, h0 >= 32 ? 28 : 20)),
          h0 >= 32
            ? s("text", { class: "t2", x: 0, y: 29 }, clip(tags, 32))
            : s("text", { class: "t2", x: LANE_W - 16, y: Math.min(15, h0 / 2 + 4), "text-anchor": "end" }, humanSize(x.size)),
        ),
      ),
    );
  });
  const svg = s("svg", { class: "mem-svg", width, height: heightOf(m) + 2 * top, viewBox: `0 0 ${width} ${heightOf(m) + 2 * top}`, role: "img", "aria-label": `Memory map of ${m.name}` }, ...out);
  return h(
    "section",
    { class: `mem-col${m.disabled ? " off" : ""}` },
    h(
      "div",
      { class: "mem-head" },
      h("button", { class: "link mem-name", onclick: () => select(m.path) }, m.name),
      h("span", { class: "badge" }, m.kind),
      h("span", { class: "mono muted" }, humanSize(m.size)),
      m.chosen.map((c) => h("span", { class: "badge ok" }, c)),
      h("button", { class: "small", title: "Save this diagram as an SVG file", onclick: () => downloadSvg(svg, `memory-${m.name}`) }, "SVG"),
    ),
    m.base !== undefined ? h("div", { class: "mono muted" }, `${hex(m.base)} – ${hex(m.base + m.size - 1)}`) : h("div", { class: "muted" }, "not memory-mapped"),
    svg,
    m.issues.map((t) => h("div", { class: "error-text" }, "✖ ", t)),
  );
}

export function renderMemory(m: UiModel): HTMLElement {
  const mapped = m.memoryMap.filter((x) => x.segments.length || x.chosen.length);
  const rest = m.memoryMap.filter((x) => !mapped.includes(x));
  const out: HTMLElement[] = [];
  for (const r of m.memory) rows(r, 0, out);
  return h(
    "div",
    { class: "memory", "data-scroll": "memory" },
    mapped.length ? h("div", { class: "mem-cols" }, mapped.map(column)) : h("div", { class: "empty" }, "No flash partitions or memory regions in this context"),
    m.memoryMap.some((x) => x.partitions) && canEdit() ? h("div", { class: "muted mem-hint" }, `Click a free area to add a partition; it is written to ${basename(state.overlay)}.`) : null,
    rest.length
      ? h(
          "details",
          { class: "mem-more", open: state.memRestOpen, ontoggle: (e: Event) => void (state.memRestOpen = (e.target as HTMLDetailsElement).open) },
          h("summary", null, `Other memory regions (${rest.length})`),
          h(
            "table",
            { class: "mem" },
            h("tbody", null, rest.map((x) => h("tr", { onclick: () => select(x.path) }, h("td", null, x.name), h("td", { class: "mono" }, x.base !== undefined ? `${hex(x.base)} – ${hex(x.base + x.size - 1)}` : ""), h("td", { class: "num" }, humanSize(x.size)), h("td", null, x.chosen.join(", "))))),
          ),
        )
      : null,
    m.memory.length
      ? h(
          "details",
          { class: "mem-more", open: state.memTableOpen, ontoggle: (e: Event) => void (state.memTableOpen = (e.target as HTMLDetailsElement).open) },
          h("summary", null, "Full address map (table)"),
          h(
            "table",
            { class: "mem" },
            h("thead", null, h("tr", null, h("th", null, "Region"), h("th", null, "Range"), h("th", null, "Size"), h("th", null, "Labels"), h("th", null))),
            h("tbody", null, out),
          ),
        )
      : null,
  );
}
