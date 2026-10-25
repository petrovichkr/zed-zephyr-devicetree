// SPDX-License-Identifier: Apache-2.0
//
// Clocks tab (ARCHITECTURE D27): the clock tree left to right (sources ->
// PLL -> SYSCLK -> buses -> peripherals) with frequencies on the boxes and
// limit violations in red. Divisors and sources are edited in the side panel;
// the tree is recomputed in the page from the draft (same code as the
// companion), and "Apply" writes every change plus rcc clock-frequency at once.

import { buildClocks, mhz, type UiClockNode, type UiClockParam, type UiClocks } from "../src/ui/clocks.js";
import type { UiModel, UiNode } from "../src/ui/model.js";
import * as api from "./api.js";
import { h } from "./dom.js";
import { exportButton } from "./export.js";
import { basename } from "./format.js";
import { applyChange, canEdit, rerender, select, state } from "./state.js";
import { clip, s } from "./svg.js";

const BOX_W = 140;
// 76 px between columns leaves room for divider labels like "/M 4 ×N 168"
const COL_X = [0, 1, 2, 3, 4, 5, 6].map((i) => 8 + i * (BOX_W + 76));
const BOX_H = 38;
const GAP = 8;
const PAD = 14;

const key = (node: string, prop: string) => `${node}\0${prop}`;

/** The model's nodes with the draft values applied, for recomputing the tree. */
function drafted(m: UiModel): Record<string, UiNode> {
  if (!state.clockDraft.size) return m.nodes;
  const nodes = { ...m.nodes };
  for (const [k, value] of state.clockDraft) {
    const [path, prop] = k.split("\0") as [string, string];
    const n = nodes[path];
    if (!n) continue;
    const props = n.props.filter((p) => p.name !== prop);
    if (value !== null) props.push({ name: prop, value, origin: n.definitions[0] ?? { file: "", line: 0, character: 0 }, overridden: [] });
    nodes[path] = { ...n, props };
  }
  return nodes;
}

function freqText(n: UiClockNode): string {
  return [n.hz === undefined ? "" : mhz(n.hz), n.sub ?? ""].filter(Boolean).join(" · ");
}

function graph(c: UiClocks): SVGSVGElement {
  const cols: UiClockNode[][] = COL_X.map(() => []);
  for (const n of c.nodes) cols[n.column]!.push(n);
  const colH = cols.map((col) => col.length * (BOX_H + GAP) - GAP);
  const height = Math.max(...colH, BOX_H) + 2 * PAD;
  const pos = new Map<string, { x: number; y: number }>();
  cols.forEach((col, i) => {
    let y = (height - colH[i]!) / 2;
    for (const n of col) {
      pos.set(n.id, { x: COL_X[i]!, y });
      y += BOX_H + GAP;
    }
  });

  const out: SVGElement[] = [];
  for (const e of c.edges) {
    const a = pos.get(e.from);
    const b = pos.get(e.to);
    if (!a || !b) continue;
    const x1 = a.x + BOX_W;
    const y1 = a.y + BOX_H / 2;
    const x2 = b.x;
    const y2 = b.y + BOX_H / 2;
    const mx = (x1 + x2) / 2;
    const bad = c.nodes.find((n) => n.id === e.to)?.error;
    out.push(s("path", { class: `edge${bad ? " error" : ""}`, d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}` }));
    if (e.label) out.push(s("text", { class: "elabel", x: x2 - 4, y: y2 - 4, "text-anchor": "end" }, clip(e.label, 14)));
  }
  for (const n of c.nodes) {
    const p = pos.get(n.id)!;
    const cls = `cbox${n.disabled ? " off" : ""}${n.error ? " error" : ""}${state.clockFocus === n.id ? " selected" : ""}`;
    out.push(
      s(
        "g",
        {
          class: cls,
          onclick: () => {
            state.clockFocus = n.id;
            rerender();
          },
          ondblclick: () => n.path && select(n.path, { reveal: true, tab: "tree" }),
        },
        s("title", {}, `${n.path ?? n.label}${n.error ? `\n${n.error}` : ""}${n.disabled ? "\ndisabled" : ""}\nclick: details, double click: open in Tree`),
        s("rect", { x: p.x, y: p.y, width: BOX_W, height: BOX_H, rx: 5 }),
        s("svg", { x: p.x + 8, y: p.y, width: BOX_W - 14, height: BOX_H, overflow: "hidden" }, s("text", { x: 0, y: 15, class: "t1" }, clip(n.label, 26)), s("text", { x: 0, y: 30, class: "t2" }, freqText(n))),
      ),
    );
  }
  const width = COL_X[COL_X.length - 1]! + BOX_W + 8;
  return s("svg", { class: "clk-svg", width, height, viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "Clock tree" }, ...out);
}

/** Value text for the draft from a form value. */
function dtsValue(p: UiClockParam, v: string): string | null {
  if (p.kind === "bool") return v === "true" ? "" : null;
  if (p.kind === "source") return `<&${v}>`;
  const n = Number(v);
  if (p.property === "clock-frequency" && n % 1_000_000 === 0) return `<DT_FREQ_M(${n / 1_000_000})>`;
  return `<${v}>`;
}

function currentText(p: UiClockParam, m: UiModel): string {
  const d = state.clockDraft.get(key(p.node, p.property));
  const text = d !== undefined ? d : (m.nodes[p.node]?.props.find((x) => x.name === p.property)?.value ?? null);
  if (p.kind === "bool") return text === null ? "false" : "true";
  if (p.kind === "source") return /&(\w+)/.exec(text ?? "")?.[1] ?? "";
  return String(p.value ?? "");
}

function paramRow(m: UiModel, p: UiClockParam, live: UiClocks): HTMLElement {
  const k = key(p.node, p.property);
  const set = (v: string) => {
    state.clockDraft.set(k, dtsValue(p, v));
    rerender();
  };
  // show the value from the drafted tree (p.value there is recomputed)
  const lp = live.nodes.flatMap((n) => n.params ?? []).find((x) => x.node === p.node && x.property === p.property) ?? p;
  const value = currentText(lp, m);
  const changed = state.clockDraft.has(k);
  const input =
    p.kind === "bool"
      ? h("input", { type: "checkbox", "data-key": `clk:${k}`, checked: value === "true", disabled: !canEdit(), onchange: (e: Event) => set(String((e.target as HTMLInputElement).checked)) })
      : p.options
        ? h(
            "select",
            { class: "mono", "data-key": `clk:${k}`, value, disabled: !canEdit(), onchange: (e: Event) => set((e.target as HTMLSelectElement).value) },
            value === "" ? h("option", { value: "" }, "—") : null,
            p.options.map((o) => h("option", { value: String(o) }, String(o))),
          )
        : h("input", {
            type: "number",
            class: "mono",
            "data-key": `clk:${k}`,
            value,
            min: p.min,
            max: p.max,
            disabled: !canEdit(),
            onchange: (e: Event) => set((e.target as HTMLInputElement).value),
          });
  const range = p.min !== undefined && p.max !== undefined ? `${p.min}–${p.max}` : "";
  return h("tr", { class: changed ? "changed" : "" }, h("td", { class: "mono" }, p.property), h("td", null, input), h("td", { class: "muted" }, range));
}

async function applyDraft(m: UiModel, live: UiClocks): Promise<void> {
  const edits: { nodePath: string; property: string; value: string | true | null }[] = [...state.clockDraft].map(([k, value]) => {
    const [nodePath, property] = k.split("\0") as [string, string];
    return { nodePath, property, value: value === "" ? true : value };
  });
  // keep STM32_HCLK_FREQUENCY (rcc) or the WCH CPU clock-frequency in step with the new tree
  const target = live.declaredNode;
  if (live.calculated && target && live.hclk !== undefined && Math.round(live.hclk) !== live.declared) {
    const f = Math.round(live.hclk);
    edits.push({ nodePath: target, property: "clock-frequency", value: f % 1_000_000 === 0 ? `<DT_FREQ_M(${f / 1_000_000})>` : `<${f}>` });
  }
  const errors = live.issues.filter((i) => i.severity === "error");
  if (errors.length && !confirm(`The new clock tree has ${errors.length} error(s):\n${errors.map((e) => `• ${e.message}`).join("\n")}\n\nWrite it anyway?`)) return;
  const ok = await applyChange(() => api.editMany(state.overlay, edits), `Wrote ${edits.length} clock setting${edits.length === 1 ? "" : "s"}`, "Clock change");
  if (ok) state.clockDraft.clear();
}

function panel(m: UiModel, live: UiClocks): HTMLElement {
  const focus = live.nodes.find((n) => n.id === state.clockFocus);
  const params = focus?.params ?? [];
  const pending = state.clockDraft.size;
  return h(
    "div",
    { class: "clk-panel", "data-scroll": "clk-panel" },
    h("h2", null, live.part ?? "Clocks", h("span", { class: "badge" }, live.family === "esp32" ? "view only" : live.calculated ? live.family?.toUpperCase() : "no model")),
    live.hclk !== undefined
      ? h(
          "div",
          { class: live.declared !== undefined && Math.round(live.hclk) !== live.declared ? "error-text" : "muted" },
          `HCLK ${mhz(live.hclk)}${live.declared !== undefined ? `, ${live.family === "wch" ? "cpu" : "rcc"} clock-frequency ${mhz(live.declared)}` : ""}`,
        )
      : null,
    live.issues.length
      ? h("ul", { class: "clk-issues" }, live.issues.map((i) => h("li", { class: i.severity === "error" ? "error-text" : "warn-text" }, i.severity === "error" ? "✖ " : "⚠ ", i.message)))
      : h("div", { class: "ok-text" }, "✓ within the limits of the part"),
    focus
      ? [
          h("h3", null, focus.label, focus.hz !== undefined ? h("span", { class: "muted" }, ` ${mhz(focus.hz)}`) : null),
          focus.path ? h("button", { class: "link mono", onclick: () => select(focus.path!, { reveal: true, tab: "tree" }) }, focus.path) : null,
          params.length
            ? h("table", { class: "clk-params" }, h("tbody", null, params.map((p) => paramRow(m, p, live))))
            : h("div", { class: "muted" }, live.family === "esp32" ? "ESP32 clocks are shown for reference only." : "Nothing to set here."),
        ]
      : h("div", { class: "muted" }, "Click a box to see and change its settings."),
    pending
      ? h(
          "div",
          { class: "clk-actions" },
          h("span", null, `${pending} pending change${pending === 1 ? "" : "s"}`),
          h("button", { class: "primary", disabled: !canEdit(), title: `Write to ${basename(state.overlay)}`, onclick: () => void applyDraft(m, live) }, "Apply"),
          h("button", { onclick: () => (state.clockDraft.clear(), rerender()) }, "Discard"),
        )
      : null,
  );
}

export function renderClocks(m: UiModel): HTMLElement {
  const live = (state.clockDraft.size ? buildClocks(drafted(m)) : m.clocks) ?? m.clocks;
  if (!live) return h("div", { class: "empty" }, "No clock tree for this SoC");
  return h(
    "div",
    { class: "clk-wrap" },
    h("div", { class: "clk-graph", "data-scroll": "clk-graph" }, h("div", { class: "clk-export" }, exportButton(".clk-svg", () => "clock-tree")), graph(live)),
    panel(m, live),
  );
}
