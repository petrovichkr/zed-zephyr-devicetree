// SPDX-License-Identifier: Apache-2.0
//
// Peripheral class icons (stage 9, docs/research/nrf-visual-gap.md §5.9):
// 14x14 stroke glyphs on currentColor, one per family of binding classes
// (the directory under dts/bindings). Used in Overview, Tree and Buses.

import type { UiModel, UiNode } from "../src/ui/model.js";
import { bindingClass } from "../src/ui/overview.js";
import { s } from "./svg.js";

type Icon = { title: string; d: string };

const ICONS: Record<string, Icon> = {
  bus: { title: "bus", d: "M1 7h12M3 4v6M7 4v6M11 4v6" },
  serial: { title: "serial", d: "M1 5h7l2-2M1 9h7l2 2M10 3h3M10 11h3" },
  radio: { title: "radio", d: "M7 13V7M4.5 4.5a3.5 3.5 0 0 1 5 0M2.5 2.5a6.4 6.4 0 0 1 9 0M7 7h0" },
  usb: { title: "USB", d: "M7 13V2M7 2l-2 2.5M7 2l2 2.5M7 9L3.5 6.5V5M7 7.5l3.5-2V4" },
  timer: { title: "timer", d: "M7 13A5 5 0 1 0 7 3a5 5 0 0 0 0 10ZM7 5v3l2 1.5M5.5 1h3" },
  pwm: { title: "PWM", d: "M1 10h2V4h3v6h2V4h3v6h2" },
  analog: { title: "analog", d: "M1 7c1.5-5 3-5 4.5 0s3 5 4.5 0 2-3 3-2" },
  sensor: { title: "sensor", d: "M5 2h4v7.5a3 3 0 1 1-4 0ZM7 6v5" },
  storage: { title: "memory", d: "M3 1h6l2 2v10H3ZM5 4h4M5 7h4M5 10h4" },
  gpio: { title: "GPIO", d: "M3 3h8v8H3ZM1 5h2M1 9h2M11 5h2M11 9h2M5 1v2M9 1v2M5 11v2M9 11v2" },
  led: { title: "LED", d: "M3 4v6l6-3ZM9 4v6M10 2.5l2-2M11.5 4l2-2" },
  input: { title: "input", d: "M2 9h10v3H2ZM5 9V6h4v3M7 6V2" },
  display: { title: "display", d: "M1 2h12v8H1ZM5 13h4M7 10v3" },
  clock: { title: "clock", d: "M1 7h2l1.5-4 2 8 2-8 2 8 1.5-4h1" },
  irq: { title: "interrupts", d: "M8 1L3 8h4l-1 5 5-7H7Z" },
  power: { title: "power", d: "M7 1v6M4 3.5a5 5 0 1 0 6 0" },
  crypto: { title: "crypto", d: "M3 6h8v7H3ZM5 6V4a2 2 0 0 1 4 0v2M7 9v2" },
  dma: { title: "DMA", d: "M1 5h9l-2-2M13 9H4l2 2" },
  cpu: { title: "CPU", d: "M3 3h8v8H3ZM5.5 5.5h3v3h-3Z" },
  other: { title: "peripheral", d: "M2 2h10v10H2Z" },
};

const FAMILY: [string, string[]][] = [
  ["bus", ["i2c", "spi", "i3c", "can", "mipi-dbi", "mipi-dsi", "smbus", "w1", "espi", "mdio", "qspi", "mspi", "sdhc", "mmc", "pcie", "i2s", "ps2", "peci"]],
  ["serial", ["serial", "modem"]],
  ["radio", ["wifi", "bluetooth", "ieee802154", "lora", "ethernet", "phy"]],
  ["usb", ["usb", "usb-c", "tcpc"]],
  ["timer", ["timer", "counter", "rtc", "watchdog"]],
  ["pwm", ["pwm", "pulse-io"]],
  ["analog", ["adc", "dac", "comparator", "audio", "iio"]],
  ["sensor", ["sensor"]],
  ["storage", ["flash_controller", "mtd", "otp", "nvmem", "bbram", "eeprom", "memory-controllers", "retained_mem", "retention", "fs", "base", "sram"]],
  ["gpio", ["gpio", "pinctrl"]],
  ["led", ["led", "led_strip"]],
  ["input", ["input", "kscan"]],
  ["display", ["display", "video"]],
  ["clock", ["clock"]],
  ["irq", ["interrupt-controller"]],
  ["power", ["power", "power-domain", "regulator", "reset", "charger", "mfd"]],
  ["crypto", ["crypto", "rng"]],
  ["dma", ["dma", "ipm", "mbox"]],
  ["cpu", ["cpu", "arm", "riscv", "xtensa"]],
];
const FAMILY_OF = new Map(FAMILY.flatMap(([f, classes]) => classes.map((c) => [c, f] as const)));

export const iconOf = (cls: string): Icon => ICONS[FAMILY_OF.get(cls) ?? "other"]!;

/** Binding class of a node, "" without a binding file. */
export const nodeClass = (m: UiModel, n: UiNode): string => bindingClass(n.binding ? m.bindings[n.binding]?.file : undefined);

/** Icon inside an SVG diagram at (x, y) = top left. */
export function classGlyph(cls: string, x: number, y: number): SVGElement {
  const i = iconOf(cls);
  return s("path", { class: "cls-icon", d: i.d, transform: `translate(${x} ${y})` }, s("title", {}, `${i.title} (${cls || "no binding"})`));
}

/** Standalone inline icon for HTML views. */
export function classIcon(cls: string): SVGElement {
  const i = iconOf(cls);
  return s("svg", { class: "cls-icon", width: 14, height: 14, viewBox: "0 0 14 14", "aria-hidden": "true" }, s("title", {}, `${i.title} (${cls})`), s("path", { d: i.d }));
}

/** aliases and chosen entries pointing at each node (`led0`, `chosen: zephyr,console`); computed once per model. */
let names: { model: UiModel; map: Map<string, string[]> } | null = null;
export function aliasesOf(m: UiModel, path: string): string[] {
  if (names?.model !== m) {
    const byLabel = new Map<string, string>();
    for (const n of Object.values(m.nodes)) for (const l of n.labels) byLabel.set(l, n.path);
    const map = new Map<string, string[]>();
    for (const [holder, prefix] of [["/aliases", ""], ["/chosen", "chosen: "]] as const) {
      for (const p of m.nodes[holder]?.props ?? []) {
        const v = p.value.trim().replace(/^<|>$/g, "").trim();
        const target = v.startsWith("&") ? byLabel.get(v.slice(1).replace(/^\{(.+)\}$/, "$1")) ?? v.slice(2, -1) : v.replace(/^"|"$/g, "");
        if (m.nodes[target]) map.set(target, [...(map.get(target) ?? []), `${prefix}${p.name}`]);
      }
    }
    names = { model: m, map };
  }
  return names.map.get(path) ?? [];
}
