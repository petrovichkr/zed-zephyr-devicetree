// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { buildBuses, cellNumber } from "../src/ui/buses.js";
import { bindingBuses, buildCatalog } from "../src/ui/catalog.js";
import type { UiBinding, UiNode } from "../src/ui/model.js";
import { buildPinMap } from "../src/ui/pins.js";

const loc = { file: "/b.dts", line: 0, character: 0 };
const node = (path: string, over: Partial<UiNode> & { p?: Record<string, string> } = {}): UiNode => ({
  path,
  name: path.split("/").pop()!,
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
const bindings: Record<string, UiBinding> = {
  i2c: { props: [], bus: ["i2c"] },
  spi: { props: [], bus: ["spi"] },
  uart: { props: [], bus: ["uart"] },
};
const buses = (...nodes: UiNode[]) => {
  const all = Object.fromEntries(nodes.map((n) => [n.path, n]));
  return buildBuses(all, bindings, buildPinMap(all));
};
const dev = (path: string, compatible: string, p: Record<string, string>, over: Partial<UiNode> = {}) => node(path, { compatible: [compatible], p, ...over });

describe("cellNumber", () => {
  it("reads literals and well-known macros", () => {
    expect(cellNumber("0x6f")).toBe(0x6f);
    expect(cellNumber("(20000000)")).toBe(20_000_000);
    expect(cellNumber("DT_FREQ_M(8)")).toBe(8_000_000);
    expect(cellNumber("I2C_BITRATE_FAST")).toBe(400_000);
    expect(cellNumber("FOO")).toBeUndefined();
  });
});

describe("buildBuses", () => {
  it("collects I2C devices with addresses, speed and pins", () => {
    const [bus] = buses(
      node("/pinctrl/i2c1_default", { labels: ["i2c1_default"], p: { pinmux: "<I2C1_SDA_GPIO21 I2C1_SCL_GPIO38>" } }),
      node("/soc/i2c@1", {
        labels: ["i2c1"],
        binding: "i2c",
        children: ["/soc/i2c@1/accel@19"],
        p: { "clock-frequency": "<I2C_BITRATE_FAST>", "pinctrl-0": "<&i2c1_default>", "pinctrl-names": '"default"' },
      }),
      dev("/soc/i2c@1/accel@19", "st,lis2dh12", { reg: "<0x19>" }),
    );
    expect(bus).toMatchObject({ type: "i2c", speed: { property: "clock-frequency", value: 400_000 }, issues: [] });
    expect(bus!.pins.map((p) => p.pin)).toEqual(["GPIO21", "GPIO38"]);
    expect(bus!.devices).toEqual([{ path: "/soc/i2c@1/accel@19", link: "child", reg: "0x19", address: 0x19, frequency: undefined, cs: undefined, disabled: false }]);
  });

  it("maps SPI chip selects and reports CS and frequency problems", () => {
    const [bus] = buses(
      node("/soc/gpio@0", { labels: ["gpio0"], compatible: ["espressif,esp32-gpio"] }),
      node("/soc/spi@2", {
        labels: ["spi2"],
        binding: "spi",
        children: ["/soc/spi@2/flash@0", "/soc/spi@2/lora@1", "/soc/spi@2/eth@2", "/soc/spi@2/x@0"],
        p: { "cs-gpios": "<&gpio0 34 GPIO_ACTIVE_LOW>, <0>", "clock-frequency": "<10000000>" },
      }),
      dev("/soc/spi@2/flash@0", "jedec,spi-nor", { reg: "<0>", "spi-max-frequency": "<20000000>" }),
      dev("/soc/spi@2/lora@1", "semtech,sx1276", { reg: "<1>" }),
      dev("/soc/spi@2/eth@2", "wiznet,w5500", { reg: "<2>" }),
      dev("/soc/spi@2/x@0", "foo,bar", {}),
    );
    expect(bus!.csPins).toEqual(["GPIO34", ""]);
    expect(bus!.devices.map((d) => d.cs)).toEqual(["GPIO34", undefined, undefined, undefined]);
    expect(bus!.issues.map((i) => `${i.severity}: ${i.message}`)).toEqual([
      "warning: flash@0: spi-max-frequency 20000000 Hz is above the controller's clock-frequency 10000000 Hz",
      "error: eth@2: chip select 2 is outside cs-gpios (2 entries)",
      "error: x@0 has no reg (chip select)",
    ]);
  });

  it("flags shared addresses, unit address mismatches and devices on a disabled bus", () => {
    const [bus] = buses(
      node("/soc/i2c@0", { binding: "i2c", disabled: true, children: ["/soc/i2c@0/rtc@6f", "/soc/i2c@0/sram@6f", "/soc/i2c@0/off@6f"] }),
      dev("/soc/i2c@0/rtc@6f", "microchip,mcp7940n", { reg: "<0x6f>" }),
      dev("/soc/i2c@0/sram@6f", "microchip,mcp7940n-sram", { reg: "<0x6e>" }),
      dev("/soc/i2c@0/off@6f", "x,y", { reg: "<0x6e>" }, { disabled: true }),
    );
    expect(bus!.issues.map((i) => `${i.severity}: ${i.message}`)).toEqual([
      "warning: rtc@6f is enabled, but its bus is disabled",
      "warning: sram@6f: unit address @6f does not match reg 0x6e",
      "warning: sram@6f is enabled, but its bus is disabled",
      "warning: off@6f: unit address @6f does not match reg 0x6e",
    ]);
  });

  it("links devices by phandle and from /chosen, but not from /aliases", () => {
    const [bus] = buses(
      node("/soc/uart@0", { labels: ["uart0"], binding: "uart", children: ["/soc/uart@0/rs485"] }),
      dev("/soc/uart@0/rs485", "zephyr,modbus-serial", { "de-gpios": "<&gpio0 1 0>" }),
      node("/chosen", { p: { "zephyr,console": "&uart0" } }),
      node("/aliases", { p: { "uart-0": "&uart0" } }),
      node("/smbus", { compatible: ["st,stm32-smbus"], p: { i2c: "<&uart0>", "pinctrl-0": "<&uart0>" } }),
    );
    expect(bus!.devices.map((d) => [d.link, d.path, d.property])).toEqual([
      ["child", "/soc/uart@0/rs485", undefined],
      ["chosen", "/chosen", "zephyr,console"],
      ["phandle", "/smbus", "i2c"],
    ]);
  });
});

describe("buildCatalog", () => {
  const raw = [
    { compatible: "st,lis2dh12", filePath: "/z/st,lis2dh12-i2c.yaml", extends: ["i2c-device", "sensor-device"], properties: { reg: { required: true }, "irq-gpios": { type: "phandle-array" } } },
    { compatible: "st,lis2dh12", filePath: "/z/st,lis2dh12-spi.yaml", extends: ["spi-device"], properties: { "spi-max-frequency": { type: "int", required: true } } },
    { compatible: "x,panel", filePath: "/z/panel.yaml", "on-bus": "mipi-dbi", extends: ["spi-device"] },
    { compatible: "x,child", filePath: "/z/c.yaml", extends: ["i2c-device"], isChildBinding: true },
  ];

  it("takes the bus from on-bus or the included <bus>-device bindings", () => {
    expect(bindingBuses(raw[0]!)).toEqual(["i2c", "sensor"]);
    expect(bindingBuses(raw[2]!)).toEqual(["mipi-dbi"]);
  });

  it("indexes device bindings by bus with the required properties", () => {
    const c = buildCatalog(raw);
    expect(Object.keys(c).sort()).toEqual(["i2c", "mipi-dbi", "sensor", "spi"]);
    expect(c.i2c).toEqual([{ compatible: "st,lis2dh12", file: "/z/st,lis2dh12-i2c.yaml", description: undefined, required: [] }]);
    expect(c.spi![0]!.required).toEqual([{ name: "spi-max-frequency", type: "int", enum: undefined, default: undefined, description: undefined }]);
  });
});
