// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { buildClocks, clockBus } from "../src/ui/clocks.js";
import type { UiNode } from "../src/ui/model.js";

const loc = { file: "/b.dts", line: 0, character: 0 };
const node = (path: string, over: Partial<UiNode> & { p?: Record<string, string> } = {}): UiNode => ({
  path,
  name: path.split("/").pop()!,
  labels: [path.split("/").pop()!.replace(/-/g, "_").replace(/@.*/, "")],
  disabled: false,
  compatible: [],
  children: [],
  definitions: [],
  reg: [],
  issues: 0,
  ...over,
  props: Object.entries(over.p ?? {}).map(([name, value]) => ({ name, value, origin: loc, overridden: [] })),
});

function soc(part: string, clocks: UiNode[], rcc: Record<string, string>, extra: UiNode[] = []) {
  const nodes = [
    node("/soc", { compatible: [part, part.replace(/\d.*$/, ""), "simple-bus"], labels: [] }),
    node("/soc/rcc@40023800", { labels: ["rcc"], compatible: ["st,stm32-rcc"], p: rcc }),
    ...clocks,
    ...extra,
  ];
  return buildClocks(Object.fromEntries(nodes.map((n) => [n.path, n])))!;
}
const hz = (c: ReturnType<typeof soc>, id: string) => c.nodes.find((n) => n.id === id)?.hz;
const MHZ = 1_000_000;

describe("STM32 clock tree", () => {
  const f4 = (rcc: Record<string, string>, extra: UiNode[] = []) =>
    soc(
      "st,stm32f405",
      [
        node("/clocks/clk-hse", { p: { "clock-frequency": "<DT_FREQ_M(8)>" } }),
        node("/clocks/clk-hsi", { disabled: true, p: { "clock-frequency": "<DT_FREQ_M(16)>" } }),
        node("/clocks/pll", { p: { "div-m": "<4>", "mul-n": "<168>", "div-p": "<2>", "div-q": "<7>", clocks: "<&clk_hse>" } }),
      ],
      rcc,
      extra,
    );

  it("computes the F405 tree of the reference board", () => {
    const c = f4(
      { clocks: "<&pll>", "clock-frequency": "<DT_FREQ_M(168)>", "ahb-prescaler": "<1>", "apb1-prescaler": "<4>", "apb2-prescaler": "<2>" },
      [
        node("/soc/serial@40004400", { labels: ["usart2"], p: { clocks: "<&rcc STM32_CLOCK(APB1, 17)>" } }),
        node("/soc/timers@40000000", { labels: ["timers2"], compatible: ["st,stm32-timers"], p: { clocks: "<&rcc STM32_CLOCK_BUS_APB1 0x00000001>" } }),
      ],
    );
    expect(c.family).toBe("f4");
    expect([hz(c, "pll"), hz(c, "pll_p"), hz(c, "pll_q"), hz(c, "sysclk"), hz(c, "ahb"), hz(c, "apb1"), hz(c, "apb2")]).toEqual([
      336 * MHZ, 168 * MHZ, 48 * MHZ, 168 * MHZ, 168 * MHZ, 42 * MHZ, 84 * MHZ,
    ]);
    // timers on a divided APB run at twice PCLK
    expect([hz(c, "/soc/serial@40004400"), hz(c, "/soc/timers@40000000")]).toEqual([42 * MHZ, 84 * MHZ]);
    expect(c.issues).toEqual([]);
  });

  it("flags limits and a stale rcc clock-frequency", () => {
    const c = f4({ clocks: "<&pll>", "clock-frequency": "<DT_FREQ_M(84)>", "ahb-prescaler": "<1>", "apb1-prescaler": "<2>", "apb2-prescaler": "<2>" });
    expect(c.issues.map((i) => i.message)).toEqual([
      "APB1 84 MHz is above the 42 MHz maximum",
      "rcc clock-frequency 84 MHz does not match the computed HCLK 168 MHz",
    ]);
    expect(c.nodes.find((n) => n.id === "apb1")?.error).toBe("APB1 84 MHz is above the 42 MHz maximum");
  });

  it("uses PLLR for SYSCLK on L4, with MSI ranges", () => {
    const c = soc(
      "st,stm32l476",
      [
        node("/clocks/clk-msi", { p: { "msi-range": "<11>" } }),
        node("/clocks/pll", { p: { "div-m": "<6>", "mul-n": "<20>", "div-q": "<2>", "div-r": "<2>", clocks: "<&clk_msi>" } }),
      ],
      { clocks: "<&pll>", "clock-frequency": "<DT_FREQ_M(80)>", "ahb-prescaler": "<1>", "apb1-prescaler": "<1>", "apb2-prescaler": "<1>" },
    );
    expect([hz(c, "clk_msi"), hz(c, "pll"), hz(c, "pll_r"), hz(c, "sysclk")]).toEqual([48 * MHZ, 160 * MHZ, 80 * MHZ, 80 * MHZ]);
    expect(c.issues).toEqual([]);
  });

  it("computes F1 (xtpre) and F0 (prediv, single APB)", () => {
    const f1 = soc(
      "st,stm32f103",
      [node("/clocks/clk-hse", { p: { "clock-frequency": "<DT_FREQ_M(8)>" } }), node("/clocks/pll", { p: { mul: "<9>", clocks: "<&clk_hse>" } })],
      { clocks: "<&pll>", "clock-frequency": "<DT_FREQ_M(72)>", "ahb-prescaler": "<1>", "apb1-prescaler": "<2>", "apb2-prescaler": "<1>" },
    );
    expect([hz(f1, "pll"), hz(f1, "apb1"), hz(f1, "apb2")]).toEqual([72 * MHZ, 36 * MHZ, 72 * MHZ]);
    expect(f1.issues).toEqual([]);
    const f0 = soc(
      "st,stm32f030",
      [node("/clocks/clk-hsi", { p: { "clock-frequency": "<DT_FREQ_M(8)>" } }), node("/clocks/pll", { p: { mul: "<12>", prediv: "<1>", clocks: "<&clk_hsi>" } })],
      { clocks: "<&pll>", "clock-frequency": "<DT_FREQ_M(48)>", "ahb-prescaler": "<1>", "apb1-prescaler": "<1>" },
    );
    // HSI goes into the F030x4/6/8 PLL halved
    expect([hz(f0, "pll"), hz(f0, "apb1"), f0.nodes.some((n) => n.id === "apb2")]).toEqual([48 * MHZ, 48 * MHZ, false]);
  });

  it("reads both clock specifier styles", () => {
    expect(clockBus("<&rcc STM32_CLOCK(AHB1, 0)>")).toBe("AHB1");
    expect(clockBus("<&rcc STM32_CLOCK_BUS_APB2 0x00004000>")).toBe("APB2");
  });
});

describe("ESP32 clock view", () => {
  it("shows crystal, CPU and the fixed 80 MHz APB", () => {
    const nodes = [
      node("/soc", { compatible: ["espressif,esp32s3", "simple-bus"], labels: [] }),
      node("/clock", { labels: ["clock"], compatible: ["espressif,esp32-clock"], p: { "slow-clk-src": "<ESP32_RTC_SLOW_CLK_SRC_RC_SLOW>" } }),
      node("/cpus/cpu@0", { p: { "clock-source": "<ESP32_CPU_CLK_SRC_PLL>", "xtal-freq": "<DT_FREQ_M(40)>", "clock-frequency": "<DT_FREQ_M(240)>" } }),
      node("/cpus/light_sleep", { compatible: ["zephyr,power-state"] }),
      node("/soc/uart@0", { labels: ["uart0"], p: { clocks: "<&clock ESP32_UART0_MODULE>" } }),
    ];
    const c = buildClocks(Object.fromEntries(nodes.map((n) => [n.path, n])))!;
    expect(c.nodes.map((n) => [n.label, n.hz, n.sub])).toEqual([
      ["XTAL", 40 * MHZ, undefined],
      ["RTC slow: RC_SLOW", undefined, undefined],
      ["CPU source: PLL", undefined, undefined],
      ["cpu@0", 240 * MHZ, undefined],
      ["APB", 80 * MHZ, undefined],
      ["uart0", undefined, "UART0"],
    ]);
  });
});

describe("WCH CH32 clock tree", () => {
  const tree = (mul: string, cpu: string) => {
    const nodes = [
      node("/soc", { compatible: ["wch,ch32v203c8t6", "wch,ch32v203", "simple-bus"], labels: [] }),
      node("/cpus/cpu@0", { labels: ["cpu0"], p: { "clock-frequency": cpu } }),
      node("/clocks/clk-hse", { compatible: ["wch,ch32v00x-hse-clock"], p: { "clock-frequency": "<DT_FREQ_M(8)>" } }),
      node("/clocks/pll", { compatible: ["wch,ch32v20x_30x-pll-clock"], p: { mul, clocks: "<&clk_hse>" } }),
      node("/soc/rcc@40021000", { labels: ["rcc"], compatible: ["wch,rcc"], p: { clocks: "<&pll>" } }),
      node("/soc/uart@40004800", { labels: ["usart3"], p: { clocks: "<&rcc CH32V20X_V30X_CLOCK_USART3>" } }),
      node("/soc/gpio@40010800", { labels: ["gpioa"], p: { clocks: "<&rcc CH32V20X_V30X_CLOCK_IOPA>" } }),
    ];
    return buildClocks(Object.fromEntries(nodes.map((n) => [n.path, n])))!;
  };

  it("computes SYSCLK from the PLL multiplier and checks the CPU frequency", () => {
    const c = tree("<18>", "<DT_FREQ_M(144)>");
    expect([c.family, c.part, hz(c, "pll"), hz(c, "sysclk"), c.declaredNode, c.issues]).toEqual(["wch", "wch,ch32v203c8t6", 144 * MHZ, 144 * MHZ, "/cpus/cpu@0", []]);
    const parent = (id: string) => c.edges.find((e) => e.to === id)?.from;
    expect([parent("/soc/uart@40004800"), parent("/soc/gpio@40010800")]).toEqual(["apb1", "apb2"]);
  });

  it("flags an overclocked SYSCLK and a stale CPU clock-frequency", () => {
    expect(tree("<20>", "<DT_FREQ_M(144)>").issues.map((i) => i.message)).toEqual([
      "SYSCLK 160 MHz is above the 144 MHz maximum",
      "cpu clock-frequency 144 MHz does not match the computed SYSCLK 160 MHz",
    ]);
  });
});
