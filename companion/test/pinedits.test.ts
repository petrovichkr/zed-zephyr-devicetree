// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import type { UiModel, UiNode } from "../src/ui/model.js";
import { buildPinCatalog, parseEsp32Header, parseWchHeader, pinctrlInclude } from "../src/ui/pinfunctions.js";
import { allowedPins, planPinAssign, planPinMove, suggestOwner } from "../src/ui/pinedits.js";
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
const HEADER = [
  "#define UART0_TX_GPIO43 ESP32_PINMUX(43, ESP_NOSIG, ESP_U0TXD_OUT)",
  "#define UART0_TX_GPIO5 ESP32_PINMUX(5, ESP_NOSIG, ESP_U0TXD_OUT)",
  "#define UART0_RX_GPIO44 ESP32_PINMUX(44, ESP_U0RXD_IN, ESP_NOSIG)",
  " * pinmux = <UART0_TX_GPIO21>;",
].join("\n");

function model(nodes: UiNode[], header?: string): UiModel {
  const all = Object.fromEntries(nodes.map((n) => [n.path, n]));
  const bindings = { dev: { props: [{ name: "pinctrl-0", type: "PROP_ENCODED_ARRAY", required: false }] } };
  return { nodes: all, bindings, pins: buildPinMap(all), pinCatalog: buildPinCatalog(all, header ? { file: "/h.h", text: header } : undefined) } as unknown as UiModel;
}
const req = { overlay: "/o.overlay" };

describe("pin catalog", () => {
  it("parses ESP32 pinmux macros and finds the included header", () => {
    expect([...parseEsp32Header(HEADER)]).toEqual([
      ["UART0_TX", [43, 5]],
      ["UART0_RX", [44]],
    ]);
    expect(pinctrlInclude(["/dts-v1/;", "#include <zephyr/dt-bindings/pinctrl/esp32s3-pinctrl.h>"])).toBe("zephyr/dt-bindings/pinctrl/esp32s3-pinctrl.h");
  });
});

describe("planPinMove", () => {
  const esp = [
    node("/soc/gpio/gpio@0", { labels: ["gpio0"], compatible: ["espressif,esp32-gpio"], p: { "gpio-controller": "", ngpios: "<32>" } }),
    node("/soc/gpio/gpio@1", { labels: ["gpio1"], compatible: ["espressif,esp32-gpio"], p: { "gpio-controller": "", ngpios: "<22>" } }),
    node("/pinctrl/uart0_default", { labels: ["uart0_default"], children: ["/pinctrl/uart0_default/group1"] }),
    node("/pinctrl/uart0_default/group1", { p: { pinmux: "<UART0_TX_GPIO43>, <UART0_RX_GPIO44>" } }),
    node("/soc/uart@0", { p: { "pinctrl-0": "<&uart0_default>", "pinctrl-names": '"default"' } }),
    node("/leds/led", { p: { gpios: "<&gpio0 5 GPIO_ACTIVE_HIGH>, <&gpio1 2 0>" } }),
  ];

  it("rewrites the ESP32 pinmux cell of the group", () => {
    const m = model(esp, HEADER);
    expect(allowedPins(m.pinCatalog, "UART0_TX")).toEqual(["GPIO5", "GPIO43"]);
    expect(planPinMove(m, { ...req, owner: "/soc/uart@0", function: "UART0_TX", from: "GPIO43", to: "GPIO5", force: true })).toEqual({
      changes: [{ node: "/pinctrl/uart0_default/group1", property: "pinmux", value: "<UART0_TX_GPIO5>, <UART0_RX_GPIO44>" }],
    });
  });

  it("refuses pins the function cannot reach and reports busy pins", () => {
    const m = model(esp, HEADER);
    expect(planPinMove(m, { ...req, owner: "/soc/uart@0", function: "UART0_TX", from: "GPIO43", to: "GPIO6" })).toEqual({ error: "UART0_TX cannot be routed to GPIO6" });
    expect(planPinMove(m, { ...req, owner: "/soc/uart@0", function: "UART0_TX", from: "GPIO43", to: "GPIO5" })).toEqual({ conflict: ["/leds/led"] });
  });

  it("moves one GPIO entry across controllers", () => {
    const m = model(esp, HEADER);
    expect(planPinMove(m, { ...req, owner: "/leds/led", function: "GPIO", from: "GPIO34", to: "GPIO7" })).toEqual({
      changes: [{ node: "/leds/led", property: "gpios", value: "<&gpio0 5 GPIO_ACTIVE_HIGH>, <&gpio0 7 0>" }],
    });
  });

  it("swaps the STM32 HAL node in every pinctrl state", () => {
    const m = model([
      node("/soc/pinctrl/gpio@a", { labels: ["gpioa"], compatible: ["st,stm32-gpio"], p: { "gpio-controller": "" } }),
      node("/soc/pinctrl/gpio@b", { labels: ["gpiob"], compatible: ["st,stm32-gpio"], p: { "gpio-controller": "" } }),
      node("/soc/pinctrl/usart1_tx_pa9", { labels: ["usart1_tx_pa9"], p: { pinmux: "<STM32_PINMUX('A', 9, AF7)>" } }),
      node("/soc/pinctrl/usart1_tx_pb6", { labels: ["usart1_tx_pb6"], p: { pinmux: "<STM32_PINMUX('B', 6, AF7)>" } }),
      node("/soc/pinctrl/usart1_rx_pa10", { labels: ["usart1_rx_pa10"], p: { pinmux: "<STM32_PINMUX('A', 10, AF7)>" } }),
      node("/soc/serial@1", { p: { "pinctrl-0": "<&usart1_tx_pa9 &usart1_rx_pa10>", "pinctrl-1": "<&usart1_tx_pa9>", "pinctrl-names": '"default", "sleep"' } }),
    ]);
    expect(m.pinCatalog.labels).toMatchObject({ "usart1_tx@PB6": "usart1_tx_pb6" });
    expect(planPinMove(m, { ...req, owner: "/soc/serial@1", function: "usart1_tx", from: "PA9", to: "PB6" })).toEqual({
      changes: [
        { node: "/soc/serial@1", property: "pinctrl-0", value: "<&usart1_tx_pb6 &usart1_rx_pa10>" },
        { node: "/soc/serial@1", property: "pinctrl-1", value: "<&usart1_tx_pb6>" },
      ],
    });
  });

  it("rewrites nRF psels with the new port and pin", () => {
    const m = model([
      node("/soc/gpio@0", { labels: ["gpio0"], compatible: ["nordic,nrf-gpio"], p: { "gpio-controller": "" } }),
      node("/soc/gpio@1", { labels: ["gpio1"], compatible: ["nordic,nrf-gpio"], p: { "gpio-controller": "", ngpios: "<16>" } }),
      node("/pinctrl/uart0_default", { labels: ["uart0_default"], children: ["/pinctrl/uart0_default/group1"] }),
      node("/pinctrl/uart0_default/group1", { p: { psels: "<NRF_PSEL(UART_TX, 0, 6)>, <NRF_PSEL(UART_RX, 0, 8)>" } }),
      node("/soc/uart@0", { p: { "pinctrl-0": "<&uart0_default>", "pinctrl-names": '"default"' } }),
    ]);
    expect(planPinMove(m, { ...req, owner: "/soc/uart@0", function: "UART_TX", from: "P0.06", to: "P1.02" })).toEqual({
      changes: [{ node: "/pinctrl/uart0_default/group1", property: "psels", value: "<NRF_PSEL(UART_TX, 1, 2)>, <NRF_PSEL(UART_RX, 0, 8)>" }],
    });
  });
});

describe("planPinAssign", () => {
  const esp = (uart1: Record<string, string>) => [
    node("/soc/gpio/gpio@0", { labels: ["gpio0"], compatible: ["espressif,esp32-gpio"], p: { "gpio-controller": "", ngpios: "<32>" } }),
    node("/pin-controller", { labels: ["pinctrl"], compatible: ["espressif,esp32-pinctrl"], children: ["/pin-controller/uart1_default"] }),
    node("/pin-controller/uart1_default", { labels: ["uart1_default"], children: ["/pin-controller/uart1_default/group1"] }),
    node("/pin-controller/uart1_default/group1", { p: { pinmux: "<UART1_TX_GPIO13>" } }),
    node("/soc/uart@1", { labels: ["uart1"], binding: "dev", p: uart1 }),
    node("/soc/spi@2", { labels: ["spi2"], binding: "dev" }),
  ];
  const H = "#define UART1_RX_GPIO14 ESP32_PINMUX(14, A, B)\n#define SPIM2_MOSI_GPIO7 ESP32_PINMUX(7, A, B)";

  it("suggests the owner from the function name", () => {
    const m = model(esp({}), H);
    expect(suggestOwner(m, "UART1_RX")).toBe("/soc/uart@1");
    expect(suggestOwner(m, "SPIM2_MOSI")).toBe("/soc/spi@2");
    expect(suggestOwner(m, "LEDC_CH0")).toBeUndefined();
  });

  it("adds an ESP32 group to the existing default state", () => {
    const m = model(esp({ "pinctrl-0": "<&uart1_default>", "pinctrl-names": '"default"' }), H);
    expect(planPinAssign(m, { ...req, function: "UART1_RX", pin: "GPIO14", owner: "/soc/uart@1" })).toEqual({
      changes: [],
      nodes: [{ parent: "/pin-controller/uart1_default", name: "group2", props: [{ name: "pinmux", value: "<UART1_RX_GPIO14>" }] }],
    });
  });

  it("creates a default state when the owner has no pinctrl yet", () => {
    const m = model(esp({}), H);
    expect(planPinAssign(m, { ...req, function: "SPIM2_MOSI", pin: "GPIO7", owner: "/soc/spi@2" })).toEqual({
      changes: [
        { node: "/soc/spi@2", property: "pinctrl-0", value: "<&spi2_default>" },
        { node: "/soc/spi@2", property: "pinctrl-names", value: '"default"' },
      ],
      nodes: [{ parent: "/pin-controller", name: "spi2_default", label: "spi2_default", props: [], children: [{ name: "group1", props: [{ name: "pinmux", value: "<SPIM2_MOSI_GPIO7>" }] }] }],
    });
  });

  it("appends the STM32 HAL node to pinctrl-0, or creates pinctrl-0", () => {
    const nodes = [
      node("/soc/pinctrl/gpio@a", { labels: ["gpioa"], compatible: ["st,stm32-gpio"], p: { "gpio-controller": "" } }),
      node("/soc/pinctrl/usart1_rx_pa10", { labels: ["usart1_rx_pa10"], p: { pinmux: "<STM32_PINMUX('A', 10, AF7)>" } }),
      node("/soc/pinctrl/tim1_ch1_pa8", { labels: ["tim1_ch1_pa8"], p: { pinmux: "<STM32_PINMUX('A', 8, AF1)>" } }),
      node("/soc/serial@1", { labels: ["usart1"], binding: "dev", p: { "pinctrl-0": "<&usart1_tx_pa9>", "pinctrl-names": '"default"' } }),
      node("/soc/timers@1", { labels: ["timers1"], children: ["/soc/timers@1/pwm"] }),
      node("/soc/timers@1/pwm", { labels: ["pwm1"], binding: "dev" }),
    ];
    const m = model(nodes);
    expect(suggestOwner(m, "tim1_ch1")).toBe("/soc/timers@1/pwm");
    expect(planPinAssign(m, { ...req, function: "usart1_rx", pin: "PA10", owner: "/soc/serial@1" })).toEqual({
      changes: [{ node: "/soc/serial@1", property: "pinctrl-0", value: "<&usart1_tx_pa9 &usart1_rx_pa10>" }],
    });
    expect(planPinAssign(m, { ...req, function: "tim1_ch1", pin: "PA8", owner: "/soc/timers@1/pwm" })).toEqual({
      changes: [
        { node: "/soc/timers@1/pwm", property: "pinctrl-0", value: "<&tim1_ch1_pa8>" },
        { node: "/soc/timers@1/pwm", property: "pinctrl-names", value: '"default"' },
      ],
    });
  });
});

describe("WCH CH32", () => {
  const H = [
    "#define USART3_TX_PB10_0  CH32V20X_V30X_PINMUX_DEFINE(PB, 10, USART3, 0)",
    "#define USART3_TX_PC10_1  CH32V20X_V30X_PINMUX_DEFINE(PC, 10, USART3, 1)",
    "#define USART3_RX_PB11_0  CH32V20X_V30X_PINMUX_DEFINE(PB, 11, USART3, 0)",
  ].join("\n");
  // the CH32V203 dtsi says ngpios = <8>, the ports have 16 pins
  const nodes = [
    node("/soc/pinctrl/gpio@b", { labels: ["gpiob"], compatible: ["wch,gpio"], p: { "gpio-controller": "", ngpios: "<8>" } }),
    node("/soc/pinctrl/gpio@c", { labels: ["gpioc"], compatible: ["wch,gpio"], p: { "gpio-controller": "", ngpios: "<8>" } }),
    node("/soc/pinctrl/usart3_default", { labels: ["usart3_default"], children: ["/soc/pinctrl/usart3_default/group1"] }),
    node("/soc/pinctrl/usart3_default/group1", { p: { pinmux: "<USART3_TX_PB10_0>, <USART3_RX_PB11_0>" } }),
    node("/soc/uart@40004800", { p: { "pinctrl-0": "<&usart3_default>", "pinctrl-names": '"default"' } }),
    node("/leds/led", { p: { gpios: "<&gpioc 13 0>" } }),
  ];

  it("decodes pinmux macros, names GPIO pins and grows ports past ngpios", () => {
    expect(pinctrlInclude(["#include <zephyr/dt-bindings/pinctrl/ch32v20x_30x-pinctrl.h>"])).toBe("zephyr/dt-bindings/pinctrl/ch32v20x_30x-pinctrl.h");
    expect([...parseWchHeader(H)].map(([fn, l]) => [fn, l.map((x) => x.pin)])).toEqual([["USART3_TX", ["PB10", "PC10"]], ["USART3_RX", ["PB11"]]]);
    const m = model(nodes, H);
    expect(m.pins.usages.map((u) => `${u.pin} ${u.function}`)).toEqual(["PB10 USART3_TX", "PB11 USART3_RX", "PC13 GPIO"]);
    expect(m.pins.unknown).toEqual([]);
    expect(m.pinCatalog.vendor).toBe("wch");
    expect(m.pinCatalog.ports.map((p) => [p.name, p.pins.length, p.pins.at(-1)])).toEqual([["gpiob", 16, "PB15"], ["gpioc", 16, "PC15"]]);
  });

  it("moves a function by swapping the pinmux macro, keeping one remap per peripheral", () => {
    const tx = [...nodes.slice(0, 3), node("/soc/pinctrl/usart3_default/group1", { p: { pinmux: "<USART3_TX_PB10_0>" } }), ...nodes.slice(4)];
    expect(planPinMove(model(tx, H), { ...req, owner: "/soc/uart@40004800", function: "USART3_TX", from: "PB10", to: "PC10" })).toEqual({
      changes: [{ node: "/soc/pinctrl/usart3_default/group1", property: "pinmux", value: "<USART3_TX_PC10_1>" }],
    });
    expect(planPinMove(model(nodes, H), { ...req, owner: "/soc/uart@40004800", function: "USART3_TX", from: "PB10", to: "PC10" })).toEqual({
      error: "USART3_TX_PC10_1 needs USART3 remap 1, but USART3_RX_PB11_0 on PB11 uses remap 0: a remap moves all USART3 signals, move them together",
    });
  });
});
