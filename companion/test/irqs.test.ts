// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { buildInterrupts, setIrqCell } from "../src/ui/irqs.js";
import type { UiBinding, UiNode } from "../src/ui/model.js";

const loc = { file: "/b.dts", line: 0, character: 0 };
const node = (path: string, over: Partial<UiNode> & { p?: Record<string, string> } = {}): UiNode => ({
  path,
  name: path.split("/").pop() || "/",
  labels: [],
  disabled: false,
  compatible: [],
  children: [],
  definitions: [],
  reg: [],
  issues: 0,
  ...over,
  props: Object.entries(over.p ?? {}).map(([name, value]) => ({ name, value, origin: loc, overridden: [] })),
});
const bindings: Record<string, UiBinding> = { nvic: { props: [], interruptCells: ["irq", "priority"] } };

describe("buildInterrupts", () => {
  const all = Object.fromEntries(
    [
      node("/", { children: ["/soc"] }),
      node("/soc", { children: ["/soc/nvic", "/soc/exti", "/soc/uart@1", "/soc/uart@2", "/soc/timer@3", "/soc/gpio@4"], p: { "interrupt-parent": "<&nvic>" } }),
      node("/soc/nvic", { labels: ["nvic"], binding: "nvic", p: { "interrupt-controller": "", "#interrupt-cells": "<2>" } }),
      node("/soc/exti", { labels: ["exti"], p: { "interrupt-controller": "", "#interrupt-cells": "<1>" } }),
      node("/soc/uart@1", { p: { interrupts: "<37 0>" } }),
      node("/soc/uart@2", { p: { interrupts: "<37 1>" } }),
      node("/soc/timer@3", { disabled: true, p: { interrupts: "<25 0>, <26 0>", "interrupt-names": '"brk", "up"' } }),
      node("/soc/gpio@4", { p: { "interrupts-extended": "<&nvic 6 2 &exti 0>" } }),
    ].map((n) => [n.path, n]),
  );

  it("splits specifiers by #interrupt-cells, inherits interrupt-parent and flags shared lines", () => {
    const [nvic, exti] = buildInterrupts(all, bindings);
    expect(nvic!.cells).toEqual(["irq", "priority"]);
    expect(nvic!.irqs.map((q) => [q.line, q.node, q.cells.join(" "), q.name ?? "", q.shared])).toEqual([
      [6, "/soc/gpio@4", "6 2", "", false],
      [25, "/soc/timer@3", "25 0", "brk", false],
      [26, "/soc/timer@3", "26 0", "up", false],
      [37, "/soc/uart@1", "37 0", "", true],
      [37, "/soc/uart@2", "37 1", "", true],
    ]);
    expect(exti).toMatchObject({ path: "/soc/exti", cells: ["irq"], irqs: [{ node: "/soc/gpio@4", line: 0, property: "interrupts-extended", index: 1 }] });
  });
});

describe("setIrqCell", () => {
  it("replaces one cell of one entry", () => {
    expect(setIrqCell("<25 0>, <26 0>", { index: 1, property: "interrupts" }, 2, 1, "3")).toBe("<25 0>, <26 3>");
    expect(setIrqCell("<&nvic 6 2 &exti 0>", { index: 0, property: "interrupts-extended" }, 2, 1, "1")).toBe("<&nvic 6 1 &exti 0>");
    expect(setIrqCell("<25 0>", { index: 1, property: "interrupts" }, 2, 1, "3")).toBeUndefined();
  });
});
