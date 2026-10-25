// SPDX-License-Identifier: Apache-2.0
//
// Moving a pin function to another pin (SPEC 6c, stage 7, D28). The change is
// computed on the UI model as new property values; the backend writes each one
// with planEdit, so it lands in the target overlay like any other edit.
//   STM32  pinctrl-N of the owner: `&usart1_tx_pa9` -> `&usart1_tx_pb6` (HAL node)
//   ESP32  pinmux of the pinctrl group: `UART0_TX_GPIO43` -> `UART0_TX_GPIO5`
//   nRF    psels of the pinctrl group: `NRF_PSEL(UART_TX, 0, 6)` -> `NRF_PSEL(UART_TX, 1, 2)`
//   GPIO   `*-gpios` of the owner: `&gpio0 15 FLAGS` -> `&gpio1 2 FLAGS`
// Every pinctrl state of the owner that routes the function to the old pin
// (default, sleep, ...) moves along.

import type { UiModel } from "./model.js";
import type { UiPinCatalog } from "./pinfunctions.js";
import type { UiPinUsage } from "./pins.js";

export interface PinMoveRequest {
  owner: string;
  function: string;
  from: string;
  to: string;
  overlay: string;
  /** Write even though enabled nodes already use the target pin. */
  force?: boolean;
}

export interface PropertyChange {
  node: string;
  property: string;
  value: string;
}

export type PinMovePlan = { changes: PropertyChange[] } | { error: string } | { conflict: string[] };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Replaces one cell, not text inside a longer token. */
function replaceCell(value: string, cell: string, next: string): string | undefined {
  const re = new RegExp(`(?<![\\w&])${escape(cell)}(?![\\w])`);
  return re.test(value) ? value.replace(re, next) : undefined;
}

/** GPIO controller label and pin number for a pin name. */
function gpioOf(catalog: UiPinCatalog, pin: string): { label: string; n: number } | undefined {
  for (const p of catalog.ports) {
    const n = p.pins.indexOf(pin);
    if (n >= 0) return { label: p.name, n };
  }
  return undefined;
}

export function allowedPins(catalog: UiPinCatalog, fn: string): string[] {
  if (fn === "GPIO" || catalog.anyPin) return catalog.ports.flatMap((p) => p.pins);
  return catalog.functions[fn] ?? [];
}

export function planPinMove(model: UiModel, req: PinMoveRequest): PinMovePlan {
  const { catalog, usages } = { catalog: model.pinCatalog, usages: model.pins.usages };
  const moving = usages.filter((u) => u.owner === req.owner && u.function === req.function && u.pin === req.from);
  if (!moving.length) return { error: `${req.owner} does not use ${req.function} on ${req.from}` };
  if (req.from === req.to) return { error: "the function is already on this pin" };
  if (!allowedPins(catalog, req.function).includes(req.to)) return { error: `${req.function} cannot be routed to ${req.to}` };

  const busy = usages.filter((u) => u.pin === req.to && u.owner !== req.owner && !u.disabled && (u.state ?? "default") === "default");
  if (busy.length && !req.force) return { conflict: [...new Set(busy.map((u) => u.owner))] };

  const values = new Map<string, PropertyChange>();
  const current = (node: string, property: string): PropertyChange | undefined => {
    const key = `${node}\0${property}`;
    let c = values.get(key);
    if (!c) {
      const value = model.nodes[node]?.props.find((p) => p.name === property)?.value;
      if (value === undefined) return undefined;
      c = { node, property, value };
      values.set(key, c);
    }
    return c;
  };

  for (const u of moving) {
    const err = applyOne(u);
    if (err) return { error: err };
  }
  // values copied from the board may span lines; the overlay gets them on one line
  return { changes: [...values.values()].map((c) => ({ ...c, value: c.value.replace(/\s*\n\s*/g, " ") })) };

  function applyOne(u: UiPinUsage): string | undefined {
    if (u.index !== undefined) {
      const target = gpioOf(catalog, req.to);
      const c = current(u.owner, u.property);
      if (!target || !c) return `cannot locate ${req.to} on a GPIO controller`;
      let k = -1;
      c.value = c.value.replace(/&([\w]+)(\s+)([^\s>]+)/g, (all, _label: string, space: string) => (++k === u.index ? `&${target.label}${space}${target.n}` : all));
      return k >= u.index ? undefined : `entry ${u.index} of ${u.property} not found`;
    }
    if (catalog.vendor === "stm32" && u.ref) {
      const next = catalog.labels[`${req.function}@${req.to}`];
      const c = current(u.owner, u.property);
      const value = next && c && replaceCell(c.value, `&${u.ref}`, `&${next}`);
      if (!value) return `no pinctrl node for ${req.function} on ${req.to}`;
      c!.value = value;
      return undefined;
    }
    if (u.source && u.cell) {
      const esp = /^(\w+?)_GPIO(\d+)$/.exec(u.cell);
      const nrf = /^NRF_PSEL(?:_DISCONNECTED)?\(\s*(\w+)\s*,/.exec(u.cell);
      let next: string | undefined;
      if (esp) next = `${esp[1]}_GPIO${/^GPIO(\d+)$/.exec(req.to)?.[1]}`;
      else if (nrf) {
        const m = /^P(\d+)\.(\d+)$/.exec(req.to);
        if (m) next = `NRF_PSEL(${nrf[1]}, ${Number(m[1])}, ${Number(m[2])})`;
      }
      const property = esp ? "pinmux" : "psels";
      const c = current(u.source, property);
      const value = next && c && replaceCell(c.value, u.cell, next);
      if (!value) return `cannot rewrite ${u.cell} for ${req.to}`;
      c!.value = value;
      return undefined;
    }
    return `${u.property} of ${u.owner} cannot be edited here`;
  }
}
