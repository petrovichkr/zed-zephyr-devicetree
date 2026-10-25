// SPDX-License-Identifier: Apache-2.0
//
// IRQ tab (ARCHITECTURE, visual editor): per interrupt controller, the lines in use with
// their node, interrupt-names entry and the other specifier cells (priority,
// flags). Shared lines are marked; a cell other than the line is edited in
// place and written to the overlay.

import type { UiIrq, UiIrqController } from "../src/ui/irqs.js";
import { setIrqCell } from "../src/ui/irqs.js";
import type { UiModel } from "../src/ui/model.js";
import { h } from "./dom.js";
import { locText, locTitle } from "./format.js";
import { classIcon, nodeClass } from "./icons.js";
import { applyEdit, canEdit, openLoc, rerender, select, state } from "./state.js";

const key = (q: UiIrq, cell: number) => `${q.node}\0${q.property}\0${q.index}\0${cell}`;

function cellView(m: UiModel, c: UiIrqController, q: UiIrq, i: number): HTMLElement {
  const k = key(q, i);
  if (state.irqEdit?.key === k) {
    const apply = async () => {
      const prop = m.nodes[q.node]?.props.find((p) => p.name === q.property);
      const value = prop && setIrqCell(prop.value, q, c.cells.length, i, state.irqEdit!.text.trim());
      if (value && (await applyEdit(q.node, q.property, value))) state.irqEdit = null;
    };
    return h("input", {
      type: "text",
      class: "mono irq-input",
      "data-key": "irq-edit",
      value: state.irqEdit.text,
      oninput: (e: Event) => (state.irqEdit!.text = (e.target as HTMLInputElement).value),
      onkeydown: (e: KeyboardEvent) => {
        if (e.key === "Enter") void apply();
        if (e.key === "Escape") ((state.irqEdit = null), rerender());
      },
    });
  }
  const text = q.cells[i] ?? "";
  // the line number identifies the interrupt; only the other cells are edited here
  if (i === 0 || !canEdit()) return h("span", { class: "mono" }, text);
  return h(
    "button",
    {
      class: "link mono",
      title: `Edit ${c.cells[i]} (Enter writes it to the overlay)`,
      onclick: () => {
        state.irqEdit = { key: k, text };
        rerender();
        requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[data-key="irq-edit"]')?.focus());
      },
    },
    text,
  );
}

function controllerView(m: UiModel, c: UiIrqController): HTMLElement {
  const n = m.nodes[c.path];
  const rows = c.irqs.filter((q) => state.irqDisabled || !q.disabled);
  const shared = new Set(c.irqs.filter((q) => q.shared).map((q) => q.cells[0])).size;
  return h(
    "section",
    { class: "irq-ctrl" },
    h(
      "h2",
      null,
      h("button", { class: "link", onclick: () => select(c.path) }, `${n?.labels[0] ? `${n.labels[0]}: ` : ""}${n?.name ?? c.path}`),
      h("span", { class: "muted" }, ` ${n?.compatible[0] ?? ""} · ${c.irqs.filter((q) => !q.disabled).length} in use`),
      shared ? h("span", { class: "badge warn" }, `${shared} shared`) : null,
    ),
    rows.length
      ? h(
          "table",
          { class: "irq-table" },
          h("thead", null, h("tr", null, ...c.cells.map((name) => h("th", null, name)), h("th", null, "node"), h("th", null, "name"), h("th", null, "origin"))),
          h(
            "tbody",
            null,
            rows.map((q) => {
              const owner = m.nodes[q.node];
              return h(
                "tr",
                { class: `${q.disabled ? "disabled" : ""}${q.shared ? " shared" : ""}${state.selected === q.node ? " focus" : ""}` },
                ...c.cells.map((_, i) => h("td", null, cellView(m, c, q, i), i === 0 && q.shared ? h("span", { class: "badge warn", title: "Another enabled node uses this line: fine when the driver shares it (ESP32 GPIO banks), a mistake otherwise" }, "shared") : null)),
                h(
                  "td",
                  null,
                  owner ? classIcon(nodeClass(m, owner)) : null,
                  h("button", { class: "link", onclick: () => select(q.node) }, `${owner?.labels[0] ? `${owner.labels[0]}: ` : ""}${owner?.name ?? q.node}`),
                  q.disabled ? h("span", { class: "badge muted" }, "disabled") : null,
                ),
                h("td", { class: "mono" }, q.name ?? ""),
                h("td", null, h("button", { class: "link mono", title: `Open ${locTitle(q.origin)}`, onclick: () => void openLoc(q.origin) }, locText(q.origin))),
              );
            }),
          ),
        )
      : h("div", { class: "muted" }, "Only disabled nodes use this controller."),
  );
}

export function renderInterrupts(m: UiModel): HTMLElement {
  const all = m.interrupts.flatMap((c) => c.irqs);
  const off = all.filter((q) => q.disabled).length;
  return h(
    "div",
    { class: "irqs", "data-scroll": "irqs" },
    h(
      "div",
      { class: "pin-bar" },
      h(
        "label",
        { class: "check" },
        h("input", {
          type: "checkbox",
          "data-key": "irq-disabled",
          checked: state.irqDisabled,
          onchange: (e: Event) => ((state.irqDisabled = (e.target as HTMLInputElement).checked), rerender()),
        }),
        `show disabled (${off})`,
      ),
      h("span", { class: "summary muted" }, `${m.interrupts.length} controller${m.interrupts.length === 1 ? "" : "s"}, ${all.length - off} lines in use`),
      h("span", { class: "muted" }, canEdit() ? "click a priority or flags cell to edit it" : "editing is disabled"),
    ),
    m.interrupts.length ? m.interrupts.map((c) => controllerView(m, c)) : h("div", { class: "empty" }, "No interrupts in this context"),
  );
}
