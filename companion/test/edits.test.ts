// SPDX-License-Identifier: Apache-2.0

import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { planEdit, type NodeSource, type TextEdit } from "../src/ui/edits.js";
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
