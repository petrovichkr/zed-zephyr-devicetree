// SPDX-License-Identifier: Apache-2.0

import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { planAddress, planChild, planEdit, type NodeSource, type TextEdit } from "../src/ui/edits.js";
import { SourceCache, valueText } from "../src/ui/model.js";

const OVERLAY = "/ws/apps/app/sysbuild/mcuboot/boards/b.overlay";
const DTS = "/ws/boards/b.dts";
const url = (f: string) => pathToFileURL(f).href;
const text = ["/* comment */", "&py25q128 {", '\tstatus = "disabled";', "};", ""].join("\n");
const src = () => new SourceCache((f) => (f === OVERLAY ? text : ""));

/** Apply single-edit WorkspaceEdits to `text`, for readable assertions. */
function apply(source: string, e: TextEdit): string {
  const lines = source.split("\n");
  const offset = (p: { line: number; character: number }) =>
    lines.slice(0, p.line).reduce((n, l) => n + l.length + 1, 0) + p.character;
  return source.slice(0, offset(e.range.start)) + e.newText + source.slice(offset(e.range.end));
}

const flash: NodeSource = {
  labels: ["py25q128"],
  properties: [
    { name: { value: "status" }, url: url(DTS), range: { start: { line: 397, character: 2 }, end: { line: 397, character: 20 } } },
    { name: { value: "status" }, url: url(OVERLAY), range: { start: { line: 2, character: 1 }, end: { line: 2, character: 21 } } },
  ],
  nodes: [
    { url: url(DTS), range: { start: { line: 391, character: 1 }, end: { line: 419, character: 3 } }, scopeClose: { line: 419, character: 1 } },
    { url: url(OVERLAY), range: { start: { line: 1, character: 0 }, end: { line: 3, character: 2 } }, scopeClose: { line: 3, character: 0 } },
  ],
};

const only = (e: ReturnType<typeof planEdit>) => {
  const list = Object.values(e.changes)[0]!;
  expect(Object.keys(e.changes)).toEqual([url(OVERLAY)]);
  expect(list).toHaveLength(1);
  return list[0]!;
};

describe("valueText", () => {
  it("strips name and semicolon", () => {
    expect(valueText('status = "okay";')).toBe('"okay"');
    expect(valueText("gpios = <&gpio0 5 GPIO_ACTIVE_LOW>;")).toBe("<&gpio0 5 GPIO_ACTIVE_LOW>");
    expect(valueText("wakeup-source;")).toBe("");
  });
});

describe("planEdit", () => {
  const req = { nodePath: "/soc/spi@60025000/flash@0", overlay: OVERLAY };

  it("replaces an assignment the overlay already has", () => {
    const e = only(planEdit(flash, { ...req, property: "status", value: '"okay"' }, src()));
    expect(apply(text, e)).toBe(text.replace('"disabled"', '"okay"'));
  });

  it("removes the overlay's own line when the value is cleared", () => {
    const e = only(planEdit(flash, { ...req, property: "status", value: null }, src()));
    expect(apply(text, e)).toBe(["/* comment */", "&py25q128 {", "};", ""].join("\n"));
  });

  it("inserts into the existing block before the closing brace", () => {
    const e = only(planEdit(flash, { ...req, property: "spi-max-frequency", value: "<40000000>" }, src()));
    expect(apply(text, e)).toBe(
      ["/* comment */", "&py25q128 {", '\tstatus = "disabled";', "\tspi-max-frequency = <40000000>;", "};", ""].join("\n"),
    );
  });

  it("appends a label reference block when the overlay does not touch the node", () => {
    const node: NodeSource = { ...flash, properties: [flash.properties[0]!], nodes: [flash.nodes[0]!], labels: ["uart0"] };
    const e = only(planEdit(node, { ...req, property: "current-speed", value: "<115200>" }, src()));
    expect(apply(text, e)).toBe(text + "\n&uart0 {\n\tcurrent-speed = <115200>;\n};\n");
  });

  it("falls back to a path reference and /delete-property/ for nodes without labels", () => {
    const node: NodeSource = { labels: [], properties: [], nodes: [] };
    const e = only(planEdit(node, { nodePath: "/soc/x@1", overlay: OVERLAY, property: "wakeup-source", value: null }, src()));
    expect(e.newText).toBe("\n&{/soc/x@1} {\n\t/delete-property/ wakeup-source;\n};\n");
  });

  it("writes boolean properties without a value", () => {
    const e = only(planEdit(flash, { ...req, property: "wakeup-source", value: true }, src()));
    expect(e.newText).toBe("\twakeup-source;\n");
  });
});

describe("planChild", () => {
  const props = [
    { name: "compatible", value: '"st,lis2dh12"' },
    { name: "reg", value: "<0x19>" },
    { name: "wakeup-source", value: true as const },
  ];
  const req = { parentPath: "/soc/i2c@60027000", overlay: OVERLAY, name: "accel@19", props };

  it("appends a reference block to the parent", () => {
    const i2c: NodeSource = { labels: ["i2c1"], properties: [], nodes: [] };
    const e = only(planChild(i2c, req, src()));
    expect(apply(text, e)).toBe(
      text + '\n&i2c1 {\n\taccel@19 {\n\t\tcompatible = "st,lis2dh12";\n\t\treg = <0x19>;\n\t\twakeup-source;\n\t};\n};\n',
    );
  });

  it("nests into the parent's existing overlay block", () => {
    const e = only(planChild(flash, req, src()));
    expect(apply(text, e)).toBe(
      ["/* comment */", "&py25q128 {", '\tstatus = "disabled";', "\taccel@19 {", '\t\tcompatible = "st,lis2dh12";', "\t\treg = <0x19>;", "\t\twakeup-source;", "\t};", "};", ""].join("\n"),
    );
  });
});

describe("planAddress", () => {
  const overlayText = ["&i2c1 {", "\taccel@19 {", "\t\treg = <0x19>;", "\t};", "};", ""].join("\n");
  const osrc = () => new SourceCache((f) => (f === OVERLAY ? overlayText : ""));
  const req = { nodePath: "/soc/i2c@1/accel@19", overlay: OVERLAY, reg: "<0x18>", unit: "18" };
  const range = (line: number, a: number, b: number) => ({ start: { line, character: a }, end: { line, character: b } });
  const reg = { name: { value: "reg" }, url: url(OVERLAY), range: range(2, 2, 15) };

  /** Several edits on one document, applied from the end. */
  const applyAll = (source: string, edits: TextEdit[]) =>
    [...edits].sort((a, b) => b.range.start.line - a.range.start.line || b.range.start.character - a.range.start.character).reduce(apply, source);

  it("renames a node that is defined only in the overlay", () => {
    const node: NodeSource = {
      labels: [],
      properties: [reg],
      nodes: [{ type: "CHILD", url: url(OVERLAY), range: range(1, 1, 4), scopeClose: { line: 3, character: 1 }, name: { address: [{ url: url(OVERLAY), range: range(1, 7, 9) }] } }],
    };
    const e = planAddress(node, req, osrc());
    expect(applyAll(overlayText, e.changes[url(OVERLAY)]!)).toBe(overlayText.replace("@19", "@18").replace("<0x19>", "<0x18>"));
  });

  it("only writes reg when the board defines the node", () => {
    const node: NodeSource = {
      labels: ["lis2dh12"],
      properties: [{ ...reg, url: url(DTS) }],
      nodes: [{ type: "CHILD", url: url(DTS), range: range(330, 1, 4), name: { address: [{ url: url(DTS), range: range(330, 17, 19) }] } }],
    };
    const e = planAddress(node, req, osrc());
    expect(e.changes[url(OVERLAY)]!.map((x) => x.newText)).toEqual(["\n&lis2dh12 {\n\treg = <0x18>;\n};\n"]);
  });
});
