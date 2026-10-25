// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { buildBuses } from "../src/ui/buses.js";
import type { UiBinding, UiNode } from "../src/ui/model.js";
import { bindingClass, buildOverview } from "../src/ui/overview.js";
import { buildPinMap } from "../src/ui/pins.js";

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
const b = (cls: string, bus?: string): UiBinding => ({ file: `/z/dts/bindings/${cls}/x.yaml`, props: [], bus: bus ? [bus] : undefined });
const bindings: Record<string, UiBinding> = {
  i2c: b("i2c", "i2c"),
  sensor: b("sensor"),
  mem: b("base"),
  flash: b("flash_controller"),
  mtd: b("mtd"),
  serial: b("serial"),
  cpu: b("cpu"),
  odd: b("vendor-thing"),
};

function overview(...nodes: UiNode[]) {
  const all = Object.fromEntries(nodes.map((n) => [n.path, n]));
  const pins = buildPinMap(all);
  return buildOverview(all, bindings, pins, buildBuses(all, bindings, pins));
}

describe("buildOverview", () => {
  const tree = [
    node("/", { compatible: ["vendor,board", "espressif,esp32s3"], children: ["/cpus", "/soc"], p: { model: '"My board"' } }),
    node("/cpus", { children: ["/cpus/cpu@0"] }),
    node("/cpus/cpu@0", { compatible: ["espressif,xtensa-lx7"], binding: "cpu", p: { "clock-frequency": "<DT_FREQ_M(240)>" } }),
    node("/soc", { children: ["/soc/memory@3fc88000", "/soc/i2c@1", "/soc/flash-controller@2", "/soc/uart@3", "/soc/thing@4", "/soc/gpio@0"] }),
    node("/soc/memory@3fc88000", { compatible: ["zephyr,memory-region"], binding: "mem", reg: [{ start: 0x3fc88000, size: 0x68000 }] }),
    node("/soc/gpio@0", { labels: ["gpio0"], compatible: ["espressif,esp32-gpio"] }),
    node("/soc/i2c@1", { labels: ["i2c1"], compatible: ["espressif,esp32-i2c"], binding: "i2c", children: ["/soc/i2c@1/accel@19"], p: { "pinctrl-0": "<&i2c1_default>", "pinctrl-names": "\"default\"" } }),
    node("/soc/i2c@1/accel@19", { compatible: ["st,lis2dh12"], binding: "sensor", p: { reg: "<0x19>", "irq-gpios": "<&gpio0 15 0>" } }),
    node("/soc/flash-controller@2", { compatible: ["espressif,esp32-flash-controller"], binding: "flash", children: ["/soc/flash-controller@2/flash@0"] }),
    node("/soc/flash-controller@2/flash@0", { compatible: ["soc-nv-flash"], binding: "mtd" }),
    node("/soc/uart@3", { compatible: ["espressif,esp32-uart"], binding: "serial", disabled: true, p: { "tx-gpios": "<&gpio0 15 0>" } }),
    node("/soc/thing@4", { compatible: ["v,thing"], binding: "odd" }),
    node("/pinctrl/i2c1_default", { labels: ["i2c1_default"], p: { pinmux: "<I2C1_SDA_GPIO21>" } }),
  ];

  it("describes the SoC: compatible, model, CPUs and memory regions", () => {
    expect(overview(...tree).soc).toEqual({
      model: "My board",
      compatible: ["vendor,board", "espressif,esp32s3"],
      cpus: ["xtensa-lx7 @ 240 MHz"],
      memory: [{ path: "/soc/memory@3fc88000", size: 0x68000 }],
    });
  });

  it("groups top-level peripherals by binding class and lifts nested pins", () => {
    const o = overview(...tree);
    expect(o.groups.map((g) => [g.name, g.blocks.map((x) => x.path)])).toEqual([
      ["Communication", ["/soc/i2c@1", "/soc/uart@3"]],
      ["Storage", ["/soc/flash-controller@2"]],
      ["Other", ["/soc/thing@4"]],
    ]);
    const i2c = o.groups[0]!.blocks[0]!;
    expect(i2c.devices).toBe(1);
    // the accelerometer's GPIO15 is shared with the disabled UART: no conflict
    expect(i2c.pins).toEqual([
      { pin: "GPIO15", function: "GPIO", owner: "/soc/i2c@1/accel@19", conflict: false },
      { pin: "GPIO21", function: "I2C1_SDA", owner: "/soc/i2c@1", conflict: false },
    ]);
    expect(o.groups[0]!.blocks[1]).toMatchObject({ disabled: true, pins: [{ pin: "GPIO15", owner: "/soc/uart@3" }] });
  });

  it("takes the class from the binding directory", () => {
    expect(bindingClass("/ws/zephyr/dts/bindings/serial/espressif,esp32-uart.yaml")).toBe("serial");
    expect(bindingClass("C:\\ws\\dts\\bindings\\i2c\\x.yaml")).toBe("i2c");
    expect(bindingClass(undefined)).toBe("");
  });
});
