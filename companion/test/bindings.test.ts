// SPDX-License-Identifier: Apache-2.0

import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { analyze, BindingIndex, resolveProperties } from "../src/bindings/binding.js";
import { loadRules } from "../src/bindings/rules.js";

let dir: string;
let index: BindingIndex;
const rules = loadRules(); // built-in sets

beforeAll(() => {
  dir = join(mkdtempSync(join(tmpdir(), "zbind-")), "dts", "bindings");
  mkdirSync(join(dir, "spi"), { recursive: true });
  writeFileSync(join(dir, "base.yaml"), "properties:\n  status:\n    type: string\n  reg:\n    type: array\n");
  writeFileSync(join(dir, "spi", "spi-device.yaml"), "include: [base.yaml]\non-bus: spi\nproperties:\n  reg:\n    required: true\n  spi-max-frequency:\n    type: int\n");
  index = new BindingIndex([dir]);
});

const check = (text: string) => analyze(join(dir, "x.yaml"), text, index, rules);
const messages = (text: string) => check(text).diagnostics.map((d) => d.message);

describe("binding analysis", () => {
  it("accepts a valid binding whose property types come from includes", () => {
    expect(messages('compatible: "v,x"\ninclude: spi-device.yaml\nproperties:\n  reg:\n    required: true\n  irq-gpios:\n    type: phandle-array\n')).toEqual([]);
  });

  it("reports unknown keys, bad types and missing includes", () => {
    const m = messages('compatible: "v,x"\ninclude: [nope.yaml]\nbogus: 1\nproperties:\n  a:\n    type: integer\n    maxItems: 2\n');
    expect(m).toHaveLength(4);
    expect(m.join("\n")).toMatch(/nope\.yaml' not found/);
    expect(m.join("\n")).toMatch(/unknown key 'bogus'/);
    expect(m.join("\n")).toMatch(/'integer' is not a valid type/);
    expect(m.join("\n")).toMatch(/unknown key 'maxItems' in 'a'/);
  });

  it("requires a type only when no include provides one, and only in complete bindings", () => {
    expect(messages('compatible: "v,x"\nproperties:\n  foo:\n    required: true\n')).toEqual(["missing 'type:' for 'foo'"]);
    expect(messages("properties:\n  foo:\n    required: true\n")).toEqual([]);
  });

  it("honours property allow/block lists when merging includes", () => {
    const a = check("include:\n  - name: spi-device.yaml\n    property-blocklist: [reg]\n");
    const merged = resolveProperties(a.includes, index);
    expect([...merged.keys()].sort()).toEqual(["spi-max-frequency", "status"]);
    const both = check("include:\n  - name: spi-device.yaml\n    property-allowlist: [reg]\n    property-blocklist: [status]\n");
    expect(both.diagnostics.map((d) => d.message)).toEqual([
      "include should not specify both 'property-allowlist:' and 'property-blocklist:'",
    ]);
  });

  it("locates includes, compatible and properties under the cursor", () => {
    const a = check('compatible: "v,x"\ninclude: spi-device.yaml\nproperties:\n  irq-gpios:\n    type: phandle-array\n');
    expect(a.at({ line: 1, character: 12 })).toMatchObject({ kind: "include", name: "spi-device.yaml" });
    expect(a.at({ line: 0, character: 14 })).toMatchObject({ kind: "compatible", value: "v,x" });
    expect(a.at({ line: 3, character: 4 })).toMatchObject({ kind: "property", name: "irq-gpios" });
  });
});
