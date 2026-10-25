// SPDX-License-Identifier: Apache-2.0
//
// Which functions each SoC pin can take (SPEC 6c, stage 7). Everything comes
// from the workspace (D26):
//   STM32  HAL pinctrl nodes already in the devicetree (usart1_tx_pa9 with
//          STM32_PINMUX('A', 9, AF7)); the node label is what pinctrl-N refers to
//   ESP32  `<FUNC>_GPIO<n>` macros of dt-bindings/pinctrl/<soc>-pinctrl.h, the
//          header the board's pinctrl file includes
//   nRF    any function on any pin (NRF_PSEL takes the port and pin as numbers)
//   WCH    `<FUNC>_P<port><pin>_<remap>` macros of dt-bindings/pinctrl/ch32*-pinctrl.h;
//          the macro name is what pinmux holds, so it is kept per function and pin
// Pins come from the GPIO controllers (ngpios, 16 for STM32 ports, 32 otherwise),
// named like the pin map names them. A GPIO controller below a bus controller
// (nxp,pca9555 on i2c, mcp23s17 on spi) is external: its pins are GPIO only and
// it is listed after the SoC ports; its ngpios falls back to the binding's const
// or default (16 for pca9555).

import type { UiBinding, UiNode } from "./model.js";
import { cells, decodePinmux, gpioPin, labelFunction } from "./pins.js";

export interface UiPort {
  /** GPIO controller label (gpioa, gpio0), or the node name when it has none. */
  name: string;
  /** Controller node and how to reference it in a cell: `&gpio0` or `&{/soc/i2c@1/gpio@20}`. */
  path: string;
  ref: string;
  pins: string[];
  /** GPIO controller on a bus (expander): no pinctrl function can reach its pins. */
  external?: {
    path: string;
    compatible?: string;
    /** Bus controller node. */
    bus: string;
    /** Unit address on the bus: `20` for gpio@20. */
    address?: string;
  };
}

export interface UiPinCatalog {
  vendor: "stm32" | "esp32" | "nrf" | "wch" | "other";
  ports: UiPort[];
  /** Function -> pins it can be routed to. Empty for nRF, where `anyPin` holds. */
  functions: Record<string, string[]>;
  anyPin: boolean;
  /** STM32: `<function>@<pin>` -> HAL pinctrl node label; WCH: -> pinmux macro. */
  labels: Record<string, string>;
  /** Header the ESP32/WCH functions were read from. */
  source?: string;
}

/** `#define UART0_TX_GPIO43 ESP32_PINMUX(...)` -> UART0_TX: [43, ...] */
export function parseEsp32Header(text: string): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const m of text.matchAll(/^\s*#define\s+(\w+?)_GPIO(\d+)\s+ESP32_PINMUX\b/gm)) {
    const list = out.get(m[1]!) ?? [];
    list.push(Number(m[2]));
    out.set(m[1]!, list);
  }
  return out;
}

/** `#define USART3_TX_PB10_0 CH32V20X_V30X_PINMUX_DEFINE(PB, 10, USART3, 0)` -> USART3_TX: [{PB10, macro}] */
export function parseWchHeader(text: string): Map<string, { pin: string; macro: string }[]> {
  const out = new Map<string, { pin: string; macro: string }[]>();
  for (const m of text.matchAll(/^\s*#define\s+(([A-Z][A-Z0-9_]*?)_P([A-K])(\d+)_(?:AF)?\d+)\s+CH32\w*PINMUX/gm)) {
    const list = out.get(m[2]!) ?? [];
    list.push({ pin: `P${m[3]}${m[4]}`, macro: m[1]! });
    out.set(m[2]!, list);
  }
  return out;
}

/** The SoC pinctrl header named in `#include <.../dt-bindings/pinctrl/<soc>-pinctrl.h>` (ESP32, WCH CH32). */
export function pinctrlInclude(lines: string[]): string | undefined {
  for (const l of lines) {
    const m = /^\s*#include\s+[<"]([^>"]*dt-bindings\/pinctrl\/(?:esp32|ch32)\w*-pinctrl\.h)[>"]/.exec(l);
    if (m) return m[1];
  }
  return undefined;
}

const has = (n: UiNode, re: RegExp) => n.compatible.some((c) => re.test(c));

/** The nearest ancestor whose binding provides a bus (i2c, spi, an MFD), if any. */
export function busAncestor(nodes: Record<string, UiNode>, bindings: Record<string, UiBinding>, path: string): UiNode | undefined {
  const parent = new Map<string, string>();
  for (const n of Object.values(nodes)) for (const c of n.children) parent.set(c, n.path);
  for (let p = parent.get(path); p; p = parent.get(p)) {
    const n = nodes[p];
    if (n?.binding && bindings[n.binding]?.bus?.length) return n;
  }
  return undefined;
}

/** `ngpios` as written, else (for expanders) the binding's const/default. */
function ngpios(n: UiNode, bindings?: Record<string, UiBinding>): number | undefined {
  const written = Number(cells(n.props.find((p) => p.name === "ngpios")?.value ?? "")[0]);
  if (written || !bindings) return written || undefined;
  const bp = n.binding ? bindings[n.binding]?.props.find((p) => p.name === "ngpios") : undefined;
  const v = Number(bp?.const ?? bp?.default);
  return v || undefined;
}

export function buildPinCatalog(
  nodes: Record<string, UiNode>,
  header?: { file: string; text: string },
  used: string[] = [],
  bindings: Record<string, UiBinding> = {},
): UiPinCatalog {
  const all = Object.values(nodes);
  const vendor: UiPinCatalog["vendor"] = all.some((n) => has(n, /^st,stm32.*gpio/))
    ? "stm32"
    : all.some((n) => has(n, /^espressif,esp32.*gpio/))
      ? "esp32"
      : all.some((n) => has(n, /^nordic,nrf-gpio/))
        ? "nrf"
        : all.some((n) => has(n, /^wch,gpio/))
          ? "wch"
          : "other";
  const wch = vendor === "wch" && header ? parseWchHeader(header.text) : undefined;

  const ports: UiPort[] = [];
  for (const n of all) {
    if (n.disabled || !n.props.some((p) => p.name === "gpio-controller")) continue;
    const name = n.labels[0] ?? n.name;
    const ref = n.labels[0] ? `&${n.labels[0]}` : `&{${n.path}}`;
    const bus = busAncestor(nodes, bindings, n.path);
    if (bus) {
      const count = ngpios(n, bindings) ?? 32;
      ports.push({
        name,
        path: n.path,
        ref,
        pins: Array.from({ length: count }, (_, i) => gpioPin(n, name, String(i))),
        external: { path: n.path, compatible: n.compatible[0], bus: bus.path, address: /@(.+)$/.exec(n.name)?.[1] },
      });
      continue;
    }
    // SoC ports: the inherited gpio-controller.yaml default (32) is wrong for STM32
    let count = ngpios(n) ?? (vendor === "stm32" || vendor === "wch" ? 16 : 32);
    // ngpios can undercount (CH32V203 dtsi says 8, the ports have 16): grow the port to
    // the highest pin that pinctrl macros or the devicetree actually use
    const name0 = gpioPin(n, name, "0");
    if (name0.endsWith("0") && /^P[A-K]0$/.test(name0)) {
      const port = name0.slice(0, 2);
      const pinsOf = [...used, ...[...(wch?.values() ?? [])].flatMap((l) => l.map((x) => x.pin))];
      const need = Math.max(0, ...pinsOf.filter((p) => p.startsWith(port) && /^\d+$/.test(p.slice(2))).map((p) => Number(p.slice(2)) + 1));
      // ngpios is plainly wrong then: lettered ports have 16 pins
      if (need > count) count = Math.max(need, 16);
    }
    ports.push({ name, path: n.path, ref, pins: Array.from({ length: count }, (_, i) => gpioPin(n, name, String(i))) });
  }
  const order = (p: string) => p.replace(/\d+/g, (d) => d.padStart(4, "0"));
  // SoC ports first, then the expanders
  ports.sort((a, b) => Number(!!a.external) - Number(!!b.external) || order(a.pins[0] ?? a.name).localeCompare(order(b.pins[0] ?? b.name)));
  const known = new Set(ports.filter((p) => !p.external).flatMap((p) => p.pins));

  const functions: Record<string, string[]> = {};
  const labels: Record<string, string> = {};
  const add = (fn: string, pin: string) => {
    if (!known.has(pin)) return;
    const list = (functions[fn] ??= []);
    if (!list.includes(pin)) list.push(pin);
  };

  if (vendor === "stm32") {
    for (const n of all) {
      const label = n.labels[0];
      const cell = cells(n.props.find((p) => p.name === "pinmux")?.value ?? "")[0];
      const pin = cell && decodePinmux(cell)?.pin;
      if (!label || !pin) continue;
      const fn = labelFunction(label);
      add(fn, pin);
      labels[`${fn}@${pin}`] = label;
    }
  } else if (vendor === "esp32" && header) {
    for (const [fn, pins] of parseEsp32Header(header.text)) for (const n of pins) add(fn, `GPIO${n}`);
  } else if (wch) {
    for (const [fn, list] of wch) {
      for (const { pin, macro } of list) {
        add(fn, pin);
        // a pin can appear under several remaps; the first (lowest) one is offered
        labels[`${fn}@${pin}`] ??= macro;
      }
    }
  }
  for (const list of Object.values(functions)) list.sort((a, b) => order(a).localeCompare(order(b)));

  return { vendor, ports, functions, anyPin: vendor === "nrf", labels, source: vendor === "esp32" || vendor === "wch" ? header?.file : undefined };
}
