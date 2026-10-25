// SPDX-License-Identifier: Apache-2.0
//
// Which functions each SoC pin can take (SPEC 6c, stage 7). Everything comes
// from the workspace (D26):
//   STM32  HAL pinctrl nodes already in the devicetree (usart1_tx_pa9 with
//          STM32_PINMUX('A', 9, AF7)); the node label is what pinctrl-N refers to
//   ESP32  `<FUNC>_GPIO<n>` macros of dt-bindings/pinctrl/<soc>-pinctrl.h, the
//          header the board's pinctrl file includes
//   nRF    any function on any pin (NRF_PSEL takes the port and pin as numbers)
// Pins come from the GPIO controllers (ngpios, 16 for STM32 ports, 32 otherwise),
// named like the pin map names them.

import type { UiNode } from "./model.js";
import { cells, decodePinmux, gpioPin, labelFunction } from "./pins.js";

export interface UiPort {
  /** GPIO controller label: gpioa, gpio0. */
  name: string;
  pins: string[];
}

export interface UiPinCatalog {
  vendor: "stm32" | "esp32" | "nrf" | "other";
  ports: UiPort[];
  /** Function -> pins it can be routed to. Empty for nRF, where `anyPin` holds. */
  functions: Record<string, string[]>;
  anyPin: boolean;
  /** STM32: `<function>@<pin>` -> HAL pinctrl node label. */
  labels: Record<string, string>;
  /** Header the ESP32 functions were read from. */
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

/** The ESP32 pinctrl header named in `#include <.../dt-bindings/pinctrl/<soc>-pinctrl.h>`. */
export function pinctrlInclude(lines: string[]): string | undefined {
  for (const l of lines) {
    const m = /^\s*#include\s+[<"]([^>"]*dt-bindings\/pinctrl\/esp32\w*-pinctrl\.h)[>"]/.exec(l);
    if (m) return m[1];
  }
  return undefined;
}

const has = (n: UiNode, re: RegExp) => n.compatible.some((c) => re.test(c));

export function buildPinCatalog(nodes: Record<string, UiNode>, esp32Header?: { file: string; text: string }): UiPinCatalog {
  const all = Object.values(nodes);
  const vendor: UiPinCatalog["vendor"] = all.some((n) => has(n, /^st,stm32.*gpio/))
    ? "stm32"
    : all.some((n) => has(n, /^espressif,esp32.*gpio/))
      ? "esp32"
      : all.some((n) => has(n, /^nordic,nrf-gpio/))
        ? "nrf"
        : "other";

  const ports: UiPort[] = [];
  for (const n of all) {
    if (n.disabled || !n.props.some((p) => p.name === "gpio-controller") || !n.labels[0]) continue;
    const count = Number(cells(n.props.find((p) => p.name === "ngpios")?.value ?? "")[0]) || (vendor === "stm32" ? 16 : 32);
    ports.push({ name: n.labels[0], pins: Array.from({ length: count }, (_, i) => gpioPin(n, n.labels[0]!, String(i))) });
  }
  const order = (p: string) => p.replace(/\d+/g, (d) => d.padStart(4, "0"));
  ports.sort((a, b) => order(a.pins[0] ?? a.name).localeCompare(order(b.pins[0] ?? b.name)));
  const known = new Set(ports.flatMap((p) => p.pins));

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
  } else if (vendor === "esp32" && esp32Header) {
    for (const [fn, pins] of parseEsp32Header(esp32Header.text)) for (const n of pins) add(fn, `GPIO${n}`);
  }
  for (const list of Object.values(functions)) list.sort((a, b) => order(a).localeCompare(order(b)));

  return { vendor, ports, functions, anyPin: vendor === "nrf", labels, source: vendor === "esp32" ? esp32Header?.file : undefined };
}
