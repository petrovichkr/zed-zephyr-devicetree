// SPDX-License-Identifier: Apache-2.0
//
// Interrupts (SPEC 4.3, stage 9): which node uses which line of which
// interrupt controller. `interrupts` goes to `interrupt-parent`, inherited from
// the nearest ancestor that has one; `interrupts-extended` names the controller
// per entry. Entries are split by the controller's `#interrupt-cells`, and the
// cells are named after its binding (`interrupt-cells: [irq, priority]`).
// Values stay as written; the first cell is decoded as the line number when it
// is a plain number. Two enabled nodes on one line of a controller are shared.

import type { Loc, UiBinding, UiNode } from "./model.js";
import { cells, cellSpans } from "./pins.js";

export interface UiIrq {
  node: string;
  /** Entry of the property (0-based). */
  index: number;
  property: "interrupts" | "interrupts-extended";
  /** `interrupt-names` entry. */
  name?: string;
  /** Cells as written, without the controller phandle. */
  cells: string[];
  line?: number;
  disabled: boolean;
  origin: Loc;
  /** Another enabled node uses the same line. */
  shared: boolean;
}

export interface UiIrqController {
  path: string;
  /** Names of the specifier cells: irq, priority, flags. */
  cells: string[];
  disabled: boolean;
  irqs: UiIrq[];
}

const num = (c: string): number | undefined => (/^(0x[0-9a-f]+|\d+)$/i.test(c) ? Number(c) : undefined);

export function buildInterrupts(nodes: Record<string, UiNode>, bindings: Record<string, UiBinding>): UiIrqController[] {
  const parent = new Map<string, string>();
  for (const n of Object.values(nodes)) for (const c of n.children) parent.set(c, n.path);
  const byLabel = new Map<string, UiNode>();
  for (const n of Object.values(nodes)) for (const l of n.labels) byLabel.set(l, n);
  const resolve = (ref: string): UiNode | undefined => {
    const r = ref.replace(/^&/, "");
    return /^\{(.+)\}$/.test(r) ? nodes[r.slice(1, -1)] : byLabel.get(r);
  };
  const prop = (n: UiNode, name: string) => n.props.find((p) => p.name === name);

  const controllers = new Map<string, UiIrqController>();
  const controller = (n: UiNode): UiIrqController => {
    let c = controllers.get(n.path);
    if (!c) {
      const count = num(cells(prop(n, "#interrupt-cells")?.value ?? "")[0] ?? "") ?? 1;
      const names = (n.binding ? bindings[n.binding]?.interruptCells : undefined) ?? [];
      c = { path: n.path, cells: Array.from({ length: count }, (_, i) => names[i] ?? (i === 0 ? "irq" : `cell${i}`)), disabled: n.disabled, irqs: [] };
      controllers.set(n.path, c);
    }
    return c;
  };
  const cellCount = (n: UiNode) => num(cells(prop(n, "#interrupt-cells")?.value ?? "")[0] ?? "") ?? 1;
  const parentOf = (n: UiNode): UiNode | undefined => {
    for (let p: string | undefined = n.path; p; p = parent.get(p)) {
      const ip = nodes[p] && prop(nodes[p]!, "interrupt-parent");
      if (ip) return resolve(cells(ip.value)[0] ?? "");
    }
    // no interrupt-parent anywhere: the tree parent if it is a controller
    const up = parent.get(n.path);
    return up && nodes[up] && prop(nodes[up]!, "interrupt-controller") ? nodes[up] : undefined;
  };

  for (const n of Object.values(nodes)) {
    if (prop(n, "interrupt-controller")) controller(n);
    const names = [...(prop(n, "interrupt-names")?.value ?? "").matchAll(/"([^"]*)"/g)].map((m) => m[1]!);
    const ext = prop(n, "interrupts-extended");
    const plain = prop(n, "interrupts");
    if (ext) {
      const c = cells(ext.value);
      let index = 0;
      for (let i = 0; i < c.length; ) {
        const ctrl = c[i]!.startsWith("&") ? resolve(c[i]!) : undefined;
        if (!ctrl) {
          i++;
          continue;
        }
        const k = cellCount(ctrl);
        const spec = c.slice(i + 1, i + 1 + k);
        controller(ctrl).irqs.push({ node: n.path, index, property: "interrupts-extended", name: names[index], cells: spec, line: num(spec[0] ?? ""), disabled: n.disabled, origin: ext.origin, shared: false });
        index++;
        i += 1 + k;
      }
    } else if (plain) {
      const ctrl = parentOf(n);
      if (!ctrl) continue;
      const k = cellCount(ctrl);
      const c = cells(plain.value);
      for (let i = 0, index = 0; i < c.length; i += k, index++) {
        const spec = c.slice(i, i + k);
        controller(ctrl).irqs.push({ node: n.path, index, property: "interrupts", name: names[index], cells: spec, line: num(spec[0] ?? ""), disabled: n.disabled, origin: plain.origin, shared: false });
      }
    }
  }

  for (const c of controllers.values()) {
    const users = new Map<string, Set<string>>();
    for (const q of c.irqs) if (!q.disabled) users.set(q.cells[0] ?? "", (users.get(q.cells[0] ?? "") ?? new Set()).add(q.node));
    for (const q of c.irqs) q.shared = !q.disabled && (users.get(q.cells[0] ?? "")?.size ?? 0) > 1;
    c.irqs.sort((a, b) => (a.line ?? Infinity) - (b.line ?? Infinity) || (a.cells[0] ?? "").localeCompare(b.cells[0] ?? "") || a.node.localeCompare(b.node));
  }
  return [...controllers.values()].filter((c) => c.irqs.length).sort((a, b) => b.irqs.length - a.irqs.length || a.path.localeCompare(b.path));
}

/**
 * New value of `interrupts` / `interrupts-extended` with one cell of entry
 * `q.index` replaced (`cell` 0 = line). Undefined when the cell is not there.
 */
export function setIrqCell(value: string, q: Pick<UiIrq, "index" | "property">, cellCount: number, cell: number, text: string): string | undefined {
  const spans = cellSpans(value);
  let pos: number;
  if (q.property === "interrupts") pos = q.index * cellCount + cell;
  else {
    // phandle + cellCount cells per entry; controllers may differ, so walk the phandles
    let n = -1;
    pos = -1;
    for (let i = 0; i < spans.length; i++) if (spans[i]!.text.startsWith("&") && ++n === q.index) pos = i + 1 + cell;
  }
  const span = spans[pos];
  if (!span || span.text.startsWith("&")) return undefined;
  return value.slice(0, span.start) + text + value.slice(span.end);
}
