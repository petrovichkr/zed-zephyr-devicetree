// SPDX-License-Identifier: Apache-2.0
//
// Overview tab (SPEC 6c, stage 6), like the nRF Peripherals view: the SoC in
// the middle, peripheral blocks grouped by class in two columns around it, and
// on the outer edges the pins each block uses. Drawn by hand in SVG (D29).

import type { UiModel } from "../src/ui/model.js";
import type { UiOverviewGroup, UiPeripheral } from "../src/ui/overview.js";
import { h } from "./dom.js";
import { basename, humanSize } from "./format.js";
import { applyEdit, canEdit, rerender, select, showPin, state } from "./state.js";
import { clip, s } from "./svg.js";

const PIN_W = 64; // pin labels
const LEAD = 22; // pin lead to the block
const BLOCK_W = 190;
const BUS = 34; // block -> trunk -> SoC
const SOC_W = 240;
const PIN_ROW = 15;
const PAD = 12;
const GROUP_HEAD = 22;
const GAP = 6;
const GROUP_GAP = 12;
const LEFT_BLOCK = PIN_W + LEAD;
const SOC_X = LEFT_BLOCK + BLOCK_W + BUS;
const RIGHT_BLOCK = SOC_X + SOC_W + BUS;
const WIDTH = RIGHT_BLOCK + BLOCK_W + LEAD + PIN_W;

const blockH = (b: UiPeripheral) => Math.max(34, b.pins.length * PIN_ROW + 12);
const groupH = (g: UiOverviewGroup) => GROUP_HEAD + g.blocks.reduce((n, b) => n + blockH(b) + GAP, 0);

/** Splits groups into two columns of similar height, keeping their order. */
function columns(groups: UiOverviewGroup[]): [UiOverviewGroup[], UiOverviewGroup[]] {
  const total = groups.reduce((n, g) => n + groupH(g) + GROUP_GAP, 0);
  const left: UiOverviewGroup[] = [];
  let acc = 0;
  for (const g of groups) {
    if (left.length && acc + groupH(g) / 2 > total / 2) break;
    left.push(g);
    acc += groupH(g) + GROUP_GAP;
  }
  return [left, groups.slice(left.length)];
}

function toggle(m: UiModel, b: UiPeripheral): void {
  const n = m.nodes[b.path];
  const value = b.disabled ? '"okay"' : '"disabled"';
  if (confirm(`${b.disabled ? "Enable" : "Disable"} ${n?.name ?? b.path}?\nWrites status = ${value} to ${basename(state.overlay)}.`)) void applyEdit(b.path, "status", value);
}

function column(m: UiModel, groups: UiOverviewGroup[], side: "left" | "right", out: SVGElement[]): { first: number; last: number; height: number } {
  const bx = side === "left" ? LEFT_BLOCK : RIGHT_BLOCK;
  const inner = side === "left" ? bx + BLOCK_W : bx; // edge facing the SoC
  const outer = side === "left" ? bx : bx + BLOCK_W;
  const trunk = side === "left" ? inner + BUS / 2 : inner - BUS / 2;
  let y = PAD;
  let first = Infinity;
  let last = -Infinity;
  for (const g of groups) {
    out.push(s("text", { x: bx, y: y + 14, class: "group" }, g.name));
    y += GROUP_HEAD;
    for (const b of g.blocks) {
      const n = m.nodes[b.path];
      const hgt = blockH(b);
      const mid = y + 17;
      first = Math.min(first, mid);
      last = Math.max(last, mid);
      const cls = `blk${b.disabled ? " off" : ""}${state.selected === b.path ? " selected" : ""}${b.pins.some((p) => p.conflict) ? " error" : ""}`;
      out.push(s("line", { class: `wire${b.disabled ? " off" : ""}`, x1: inner, y1: mid, x2: trunk, y2: mid }));
      const name = `${n?.labels[0] ? `${n.labels[0]}: ` : ""}${n?.name ?? b.path}`;
      out.push(
        s(
          "g",
          {
            class: cls,
            onclick: () => select(b.path),
            ondblclick: () => select(b.path, { reveal: true, tab: "tree" }),
          },
          s("title", {}, `${b.path}\n${b.class}${b.devices ? `, ${b.devices} device${b.devices === 1 ? "" : "s"}` : ""}\nclick: select, double click: open in Tree`),
          s("rect", { x: bx, y, width: BLOCK_W, height: hgt, rx: 5 }),
          // nested svg clips the text before the switch whatever the glyph widths
          s(
            "svg",
            { x: bx + 9, y, width: BLOCK_W - 30, height: hgt, overflow: "hidden" },
            s("text", { x: 0, y: 15, class: "t1" }, clip(name, 24)),
            s("text", { x: 0, y: 28, class: "t2" }, clip(`${b.class}${b.devices ? ` · ${b.devices} dev` : ""}`, 26)),
          ),
        ),
      );
      // enable/disable switch in the top right corner; pin leads start below it
      const sx = bx + BLOCK_W - 12;
      out.push(
        s(
          "g",
          {
            class: `switch${b.disabled ? " off" : ""}${canEdit() ? "" : " locked"}`,
            onclick: (e: Event) => {
              e.stopPropagation();
              if (canEdit()) toggle(m, b);
            },
          },
          s("title", {}, canEdit() ? (b.disabled ? "Enable (okay)" : "Disable") : "Editing is disabled"),
          s("circle", { cx: sx, cy: y + 11, r: 5 }),
        ),
      );
      b.pins.forEach((p, i) => {
        const py = y + 12 + i * PIN_ROW + PIN_ROW / 2 - 2;
        const lead = side === "left" ? [outer - LEAD, outer] : [outer, outer + LEAD];
        const fn = p.owner === b.path ? p.function : `${m.nodes[p.owner]?.name ?? p.owner}: ${p.function ?? ""}`;
        const ext = p.via ? " ext" : "";
        const via = p.via ? `\nvia the external GPIO controller ${p.via}: not a SoC pin` : "";
        out.push(
          s("line", { class: `lead${ext}${b.disabled ? " off" : ""}${p.conflict ? " error" : ""}`, x1: lead[0], y1: py, x2: lead[1], y2: py }),
          s(
            "text",
            {
              x: side === "left" ? outer - LEAD - 4 : outer + LEAD + 4,
              y: py + 4,
              "text-anchor": side === "left" ? "end" : "start",
              class: `pin${ext}${b.disabled ? " off" : ""}${p.conflict ? " error" : ""}`,
              onclick: () => showPin(p.pin),
            },
            s("title", {}, `${p.pin} ${fn ?? ""}${via}${p.conflict ? "\nconflict: used by more than one enabled owner" : ""}\nclick: show in Pins tab`),
            p.via ? `${clip(p.via, 6)}.${p.pin.slice(p.via.length + 1)}` : p.pin,
          ),
        );
      });
      y += hgt + GAP;
    }
    y += GROUP_GAP;
  }
  if (first <= last) out.push(s("line", { class: "wire", x1: trunk, y1: first, x2: trunk, y2: last }));
  return { first, last, height: y };
}

function soc(m: UiModel, y: number, height: number, out: SVGElement[]): void {
  const o = m.overview.soc;
  const lines: [string, string][] = [
    ["t1", o.compatible[o.compatible.length - 1] ?? "SoC"],
    ["t2", o.model ?? ""],
    ...o.cpus.map((c): [string, string] => ["t3", c]),
    ...(o.memory.length ? [["t2", `memory (${o.memory.length})`] as [string, string]] : []),
    ...o.memory.slice(0, 8).map((r): [string, string] => ["t3", `${r.path.split("/").pop()}  ${humanSize(r.size)}`]),
    ...(o.memory.length > 8 ? [["t3", `… ${o.memory.length - 8} more`] as [string, string]] : []),
  ];
  out.push(
    s(
      "g",
      { class: `soc${state.selected === "/" ? " selected" : ""}`, onclick: () => select("/") },
      s("title", {}, "click: select the root node"),
      s("rect", { x: SOC_X, y, width: SOC_W, height, rx: 8 }),
      ...lines.map(([cls, text], i) => s("text", { x: SOC_X + 14, y: y + 24 + i * 17 + (i > 1 ? 6 : 0), class: cls }, clip(text, 34))),
    ),
  );
}

export function renderOverview(m: UiModel): HTMLElement {
  const groups = m.overview.groups
    .map((g) => ({ ...g, blocks: state.overviewDisabled ? g.blocks : g.blocks.filter((b) => !b.disabled) }))
    .filter((g) => g.blocks.length);
  const all = m.overview.groups.flatMap((g) => g.blocks);
  const off = all.filter((b) => b.disabled).length;
  const conflicts = m.pins.conflicts.length;

  const [left, right] = columns(groups);
  const out: SVGElement[] = [];
  const l = column(m, left, "left", out);
  const r = column(m, right, "right", out);
  const socLines = 3 + m.overview.soc.cpus.length + Math.min(m.overview.soc.memory.length, 9) + 1;
  const socH = Math.max(140, socLines * 17 + 20);
  const height = Math.max(l.height, r.height, socH + 2 * PAD) + PAD;
  const socY = Math.max(PAD, (height - socH) / 2);
  soc(m, socY, socH, out);
  // trunks meet the SoC at its middle
  const mid = socY + socH / 2;
  if (l.first <= l.last) out.push(s("line", { class: "wire", x1: LEFT_BLOCK + BLOCK_W + BUS / 2, y1: Math.min(l.first, mid), x2: LEFT_BLOCK + BLOCK_W + BUS / 2, y2: Math.max(l.last, mid) }), s("line", { class: "wire", x1: LEFT_BLOCK + BLOCK_W + BUS / 2, y1: mid, x2: SOC_X, y2: mid }));
  if (r.first <= r.last) out.push(s("line", { class: "wire", x1: RIGHT_BLOCK - BUS / 2, y1: Math.min(r.first, mid), x2: RIGHT_BLOCK - BUS / 2, y2: Math.max(r.last, mid) }), s("line", { class: "wire", x1: SOC_X + SOC_W, y1: mid, x2: RIGHT_BLOCK - BUS / 2, y2: mid }));

  return h(
    "div",
    { class: "overview", "data-scroll": "overview" },
    h(
      "div",
      { class: "pin-bar" },
      h(
        "label",
        { class: "check" },
        h("input", {
          type: "checkbox",
          "data-key": "overview-disabled",
          checked: state.overviewDisabled,
          onchange: (e: Event) => {
            state.overviewDisabled = (e.target as HTMLInputElement).checked;
            rerender();
          },
        }),
        `show disabled (${off})`,
      ),
      h(
        "span",
        { class: conflicts ? "summary error-text" : "summary muted" },
        `${all.length - off} enabled peripherals, ${m.pins.usages.length ? new Set(all.flatMap((b) => b.pins.filter((p) => !p.via).map((p) => p.pin))).size : 0} pins`,
        conflicts ? `, ${conflicts} pin conflict${conflicts === 1 ? "" : "s"}` : "",
      ),
      h("span", { class: "muted" }, "click: select · double click: open in Tree · ● enable/disable"),
    ),
    h("div", { class: "overview-diagram" }, s("svg", { class: "ov-svg", width: WIDTH, height, viewBox: `0 0 ${WIDTH} ${height}`, role: "img", "aria-label": "SoC overview" }, ...out)),
  );
}
