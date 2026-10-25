// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { UiNode } from "../src/ui/model.js";
import { buildPinMap, cells, decodePinmux } from "../src/ui/pins.js";

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
const map = (...nodes: UiNode[]) => buildPinMap(Object.fromEntries(nodes.map((n) => [n.path, n])));

describe("pinctrl decoding", () => {
  it("splits cell lists at top level only", () => {
    expect(cells("<STM32_PINMUX('A', 9, AF7)>, <&gpio0 5 (GPIO_ACTIVE_LOW | 1)>")).toEqual([
      "STM32_PINMUX('A', 9, AF7)",
      "&gpio0",
      "5",
      "(GPIO_ACTIVE_LOW | 1)",
    ]);
  });

  it("decodes ESP32, STM32 and nRF encodings", () => {
    expect(decodePinmux("UART0_TX_GPIO43")).toEqual({ pin: "GPIO43", function: "UART0_TX" });
    expect(decodePinmux("STM32_PINMUX('B', 10, AF4)")).toEqual({ pin: "PB10" });
    expect(decodePinmux("STM32F1_PINMUX('A', 9, ALTERNATE, NO_REMAP)")).toEqual({ pin: "PA9" });
    expect(decodePinmux("NRF_PSEL(UART_TX, 0, 6)")).toEqual({ pin: "P0.06", function: "UART_TX" });
    expect(decodePinmux("FOO(1)")).toBeUndefined();
  });
});

describe("buildPinMap", () => {
  const pinctrl = [
    node("/pinctrl/uart0_default", { labels: ["uart0_default"], children: ["/pinctrl/uart0_default/group1"] }),
    node("/pinctrl/uart0_default/group1", { p: { pinmux: "<UART0_TX_GPIO43 UART0_RX_GPIO44>" } }),
    node("/pinctrl/uart0_sleep", { labels: ["uart0_sleep"], p: { pinmux: "<UART0_TX_GPIO43>" } }),
    node("/soc/gpio@1", { labels: ["gpio1"], compatible: ["espressif,esp32-gpio"] }),
  ];

  it("maps pinctrl states and gpios, ESP32 bank 1 starting at pin 32", () => {
    const m = map(
      ...pinctrl,
      node("/soc/uart0", { p: { "pinctrl-0": "<&uart0_default>", "pinctrl-1": "<&uart0_sleep>", "pinctrl-names": '"default", "sleep"' } }),
      node("/leds/a", { p: { gpios: "<&gpio1 11 GPIO_ACTIVE_HIGH>" } }),
    );
    expect(m.usages.map((u) => `${u.pin} ${u.function} ${u.owner} ${u.state ?? "-"}`)).toEqual([
      "GPIO43 GPIO /leds/a -",
      "GPIO43 UART0_TX /soc/uart0 default",
      "GPIO43 UART0_TX /soc/uart0 sleep",
      "GPIO44 UART0_RX /soc/uart0 default",
    ]);
    // the uart's default state and the LED both claim GPIO43
    expect(m.conflicts).toEqual(["GPIO43"]);
  });

  it("ignores disabled owners and non-default states for conflicts", () => {
    const m = map(
      ...pinctrl,
      node("/soc/uart0", { disabled: true, p: { "pinctrl-0": "<&uart0_default>", "pinctrl-names": '"default"' } }),
      node("/leds/a", { p: { gpios: "<&gpio1 11 0>" } }),
    );
    expect(m.conflicts).toEqual([]);
  });

  it("falls back to the label for STM32-style pin nodes and reports what it cannot decode", () => {
    const m = map(
      node("/pinctrl/usart1_tx_pa9", { labels: ["usart1_tx_pa9"], p: { pinmux: "<STM32_PINMUX('A', 9, AF7)>" } }),
      node("/pinctrl/odd", { labels: ["odd"], p: { pinmux: "<VENDOR_MUX(3)>" } }),
      node("/soc/usart1", { p: { "pinctrl-0": "<&usart1_tx_pa9 &odd>", "pinctrl-names": '"default"' } }),
    );
    expect(m.usages.map((u) => `${u.pin} ${u.function}`)).toEqual(["PA9 usart1_tx"]);
    expect(m.unknown).toEqual([{ owner: "/soc/usart1", property: "pinctrl-0", value: "VENDOR_MUX(3)" }]);
  });
});

describe("GPIO hogs", () => {
  it("are owners of their pins and conflict with other users", () => {
    const m = map(
      node("/soc/gpio@1", { labels: ["gpio1"], compatible: ["espressif,esp32-gpio"], children: ["/soc/gpio@1/en"], p: { "#gpio-cells": "<2>" } }),
      node("/soc/gpio@1/en", { p: { "gpio-hog": "", gpios: "<4 GPIO_ACTIVE_HIGH>", "output-high": "" } }),
      node("/leds/a", { p: { gpios: "<&gpio1 4 0>" } }),
    );
    expect(m.usages.find((u) => u.owner === "/soc/gpio@1/en")).toMatchObject({ pin: "GPIO36", hog: true, controller: "/soc/gpio@1", flags: "GPIO_ACTIVE_HIGH" });
    expect(m.conflicts).toEqual(["GPIO36"]);
  });
});

describe("gpio-map connectors", () => {
  it("resolve a connector line to the SoC pin", () => {
    const m = map(
      node("/soc/gpio@1", { labels: ["gpioa"], compatible: ["st,stm32-gpio"], p: { "#gpio-cells": "<2>" } }),
      node("/soc/gpio@2", { labels: ["gpiob"], compatible: ["st,stm32-gpio"], p: { "#gpio-cells": "<2>" } }),
      node("/connector", { labels: ["arduino_header"], p: { "#gpio-cells": "<2>", "gpio-map-mask": "<0xffffffff 0xffffffc0>", "gpio-map": "<0 0 &gpioa 0 0>, <1 0 &gpioa 1 0>, <5 0 &gpiob 9 0>" } }),
      node("/soc/spi/dev", { p: { "irq-gpios": "<&arduino_header 5 GPIO_ACTIVE_LOW>" } }),
    );
    expect(m.usages).toMatchObject([{ pin: "PB9", nexus: "/connector", controller: "/soc/gpio@2", gpioFlags: { activeLow: true } }]);
  });
});
