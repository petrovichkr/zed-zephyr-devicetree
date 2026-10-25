// SPDX-License-Identifier: Apache-2.0
//
// External GPIO controller (nxp,pca9555 on i2c) with an LED and a key on its
// pins, on an ESP32 where SoC ports have 32 pins (docs/research/nrf-visual-gap.md §3).

import { describe, expect, it } from "vitest";
import { buildBuses } from "../src/ui/buses.js";
import type { UiBinding, UiNode } from "../src/ui/model.js";
import { buildOverview } from "../src/ui/overview.js";
import type { UiModel } from "../src/ui/model.js";
import { allowedPins, planPinMove } from "../src/ui/pinedits.js";
import { buildPinCatalog } from "../src/ui/pinfunctions.js";
import { buildPinMap, decodeGpioFlags } from "../src/ui/pins.js";

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
const b = (cls: string, extra: Partial<UiBinding> = {}): UiBinding => ({ file: `/z/dts/bindings/${cls}/x.yaml`, props: [], ...extra });
const bindings: Record<string, UiBinding> = {
  i2c: b("i2c", { bus: ["i2c"] }),
  gpio: b("gpio"),
  pca9555: b("gpio", { props: [{ name: "ngpios", type: "U32", required: false, const: 16 }] }),
  leds: b("led"),
  keys: b("input"),
  pwm: b("pwm"),
};

const tree = [
  node("/", { children: ["/aliases", "/soc", "/leds", "/keys", "/backlight"] }),
  node("/aliases", { p: { sw0: "&user_btn", led0: '"/leds/led_0"' } }),
  node("/soc", { children: ["/soc/gpio@0", "/soc/i2c@1", "/soc/ledc@2"] }),
  node("/soc/ledc@2", { labels: ["ledc0"], compatible: ["espressif,esp32-ledc"], binding: "pwm", p: { "pinctrl-0": "<&ledc0_default>", "pinctrl-names": '"default"' } }),
  node("/pinctrl/ledc0_default", { labels: ["ledc0_default"], p: { pinmux: "<LEDC_CH0_GPIO23 LEDC_CH1_GPIO24>" } }),
  node("/backlight", { compatible: ["pwm-leds"], binding: "leds", children: ["/backlight/bl"] }),
  node("/backlight/bl", { p: { pwms: "<&ledc0 1 50000 PWM_POLARITY_INVERTED>" } }),
  node("/soc/gpio@0", { labels: ["gpio0"], compatible: ["espressif,esp32-gpio"], binding: "gpio", p: { "gpio-controller": "" } }),
  node("/soc/i2c@1", { labels: ["i2c0"], compatible: ["espressif,esp32-i2c"], binding: "i2c", children: ["/soc/i2c@1/gpio@20"] }),
  node("/soc/i2c@1/gpio@20", {
    labels: ["gpio_exp0", "exp0"],
    compatible: ["nxp,pca9555"],
    binding: "pca9555",
    p: { "gpio-controller": "", reg: "<0x20>", "gpio-line-names": '"", "", "", "LED_STATUS"', "gpio-reserved-ranges": "<14 2>", "int-gpios": "<&gpio0 13 (GPIO_ACTIVE_LOW | GPIO_PULL_UP)>" },
  }),
  node("/leds", { compatible: ["gpio-leds"], binding: "leds", children: ["/leds/led_0"] }),
  node("/leds/led_0", { p: { gpios: "<&gpio_exp0 3 GPIO_ACTIVE_LOW>", label: '"Status"' } }),
  node("/keys", { compatible: ["gpio-keys"], binding: "keys", children: ["/keys/btn_0"] }),
  // referenced by the second label: still the gpio_exp0 port
  node("/keys/btn_0", { labels: ["user_btn"], p: { gpios: "<&exp0 8 (GPIO_ACTIVE_LOW | GPIO_PULL_UP)>", "zephyr,code": "<INPUT_KEY_0>" } }),
];
const nodes = Object.fromEntries(tree.map((n) => [n.path, n]));

describe("GPIO flags", () => {
  it("decodes symbols, numbers and vendor flags", () => {
    expect(decodeGpioFlags("(GPIO_ACTIVE_LOW | GPIO_PULL_UP)")).toEqual({ activeLow: true, pull: "up", drive: undefined, extra: [] });
    expect(decodeGpioFlags("GPIO_OPEN_DRAIN")).toMatchObject({ activeLow: false, drive: "open-drain" });
    expect(decodeGpioFlags("GPIO_OPEN_SOURCE")).toMatchObject({ drive: "open-source" });
    expect(decodeGpioFlags("0x21")).toEqual({ activeLow: true, pull: "down", drive: undefined, extra: [] });
    expect(decodeGpioFlags("(GPIO_ACTIVE_HIGH |\n  NRF_GPIO_DRIVE_H0H1)")).toEqual({ activeLow: false, pull: undefined, drive: undefined, extra: ["NRF_GPIO_DRIVE_H0H1"] });
    expect(decodeGpioFlags("0")).toEqual({ activeLow: false, pull: undefined, drive: undefined, extra: [] });
  });

  it("keeps the flags cell of every *-gpios entry", () => {
    const m = buildPinMap(nodes);
    const btn = m.usages.find((u) => u.owner === "/keys/btn_0")!;
    expect(btn).toMatchObject({ pin: "gpio_exp0.8", flags: "(GPIO_ACTIVE_LOW | GPIO_PULL_UP)", gpioFlags: { activeLow: true, pull: "up" } });
    expect(m.usages.find((u) => u.owner === "/soc/i2c@1/gpio@20")).toMatchObject({ pin: "GPIO13", property: "int-gpios" });
  });
});

describe("external GPIO controller", () => {
  const pins = buildPinMap(nodes);
  const catalog = buildPinCatalog(nodes, undefined, pins.usages.map((u) => u.pin), bindings);

  it("is a separate port after the SoC ports, with ngpios from the binding", () => {
    expect(catalog.ports.map((p) => [p.name, p.pins.length, p.external])).toEqual([
      ["gpio0", 32, undefined],
      ["gpio_exp0", 16, { path: "/soc/i2c@1/gpio@20", compatible: "nxp,pca9555", bus: "/soc/i2c@1", address: "20" }],
    ]);
    expect(catalog.ports[1]!.pins[15]).toBe("gpio_exp0.15");
    expect(catalog.ports[1]).toMatchObject({ lineNames: { "gpio_exp0.3": "LED_STATUS" }, reserved: ["gpio_exp0.14", "gpio_exp0.15"] });
    expect(allowedPins(catalog, "GPIO")).not.toContain("gpio_exp0.14");
  });

  it("takes GPIO owners but no pinctrl function, even where any pin is allowed", () => {
    expect(allowedPins(catalog, "GPIO")).toContain("gpio_exp0.3");
    expect(allowedPins({ ...catalog, anyPin: true }, "UART_TX")).not.toContain("gpio_exp0.3");
    expect(allowedPins({ ...catalog, anyPin: true }, "UART_TX")).toContain("GPIO5");
  });

  it("does not put expander pins on the SoC edge in the overview", () => {
    const o = buildOverview(nodes, bindings, pins, buildBuses(nodes, bindings, pins), catalog);
    const blocks = o.groups.flatMap((g) => g.blocks);
    expect(blocks.find((x) => x.path === "/leds")!.pins).toEqual([
      { pin: "gpio_exp0.3", function: "GPIO", owner: "/leds/led_0", property: "gpios", conflict: false, via: "gpio_exp0" },
    ]);
    // the expander's interrupt line is a SoC pin of the device on the bus
    expect(blocks.find((x) => x.path === "/soc/i2c@1")!.pins).toEqual([
      { pin: "GPIO13", function: "GPIO", owner: "/soc/i2c@1/gpio@20", property: "int-gpios", conflict: false, via: undefined },
    ]);
  });

  it("lists LEDs and keys with their pin, flags, code, aliases and PWM channel", () => {
    const o = buildOverview(nodes, bindings, pins, buildBuses(nodes, bindings, pins), catalog);
    const items = (path: string) => o.groups.flatMap((g) => g.blocks).find((x) => x.path === path)!.items;
    expect(items("/leds")).toEqual([
      { path: "/leds/led_0", kind: "led", name: "Status", disabled: false, aliases: ["led0"], pin: "gpio_exp0.3", via: "gpio_exp0", flags: { activeLow: true, extra: [] }, conflict: false },
    ]);
    expect(items("/keys")).toMatchObject([{ kind: "key", name: "btn_0", aliases: ["sw0"], code: "INPUT_KEY_0", flags: { activeLow: true, pull: "up" } }]);
    expect(items("/backlight")).toMatchObject([{ kind: "pwm-led", pin: "GPIO24", pwm: { controller: "ledc0", channel: "1", period: "50000", inverted: true } }]);
  });
});

describe("controller without a label", () => {
  const all = Object.fromEntries(
    [
      node("/", { children: ["/soc", "/leds"] }),
      node("/soc", { children: ["/soc/i2c@1"] }),
      node("/soc/i2c@1", { compatible: ["espressif,esp32-i2c"], binding: "i2c", children: ["/soc/i2c@1/gpio@21"] }),
      node("/soc/i2c@1/gpio@21", { compatible: ["nxp,pca9555"], binding: "pca9555", p: { "gpio-controller": "" } }),
      node("/leds", { compatible: ["gpio-leds"], binding: "leds", children: ["/leds/a"] }),
      node("/leds/a", { p: { gpios: "<&{/soc/i2c@1/gpio@21} 2 GPIO_ACTIVE_LOW>" } }),
    ].map((n) => [n.path, n]),
  );
  const pins = buildPinMap(all);
  const catalog = buildPinCatalog(all, undefined, [], bindings);

  it("resolves &{/path} and names the port after the node", () => {
    expect(pins.usages[0]).toMatchObject({ pin: "gpio@21.2", controller: "/soc/i2c@1/gpio@21" });
    expect(catalog.ports[0]).toMatchObject({ name: "gpio@21", ref: "&{/soc/i2c@1/gpio@21}" });
  });

  it("writes the path reference when a GPIO moves there", () => {
    const m = { nodes: all, bindings, pins, pinCatalog: catalog } as unknown as UiModel;
    expect(planPinMove(m, { owner: "/leds/a", function: "GPIO", from: "gpio@21.2", to: "gpio@21.5", overlay: "/o.overlay" })).toEqual({
      changes: [{ node: "/leds/a", property: "gpios", value: "<&{/soc/i2c@1/gpio@21} 5 GPIO_ACTIVE_LOW>" }],
    });
  });
});
