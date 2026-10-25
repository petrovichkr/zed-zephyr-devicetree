// SPDX-License-Identifier: Apache-2.0
//
// Moving a pin function to another pin (SPEC 6c, stage 7, D28). The change is
// computed on the UI model as new property values; the backend writes each one
// with planEdit, so it lands in the target overlay like any other edit.
//   STM32  pinctrl-N of the owner: `&usart1_tx_pa9` -> `&usart1_tx_pb6` (HAL node)
//   ESP32  pinmux of the pinctrl group: `UART0_TX_GPIO43` -> `UART0_TX_GPIO5`
//   nRF    psels of the pinctrl group: `NRF_PSEL(UART_TX, 0, 6)` -> `NRF_PSEL(UART_TX, 1, 2)`
//   WCH    pinmux of the pinctrl group: `USART3_TX_PB10_0` -> the header macro for the new pin
//   GPIO   `*-gpios` of the owner: `&gpio0 15 FLAGS` -> `&gpio1 2 FLAGS`
// Every pinctrl state of the owner that routes the function to the old pin
// (default, sleep, ...) moves along.
//
// Assigning a function no node uses yet (planPinAssign) adds it to the default
// state of the chosen owner: STM32 appends the HAL node to pinctrl-0, ESP32 and
// nRF add a group to the default state node. An owner without pinctrl gets a new
// `<label>_default` state under the pin controller plus pinctrl-0/pinctrl-names (D28).

import type { UiModel, UiNode } from "./model.js";
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

export interface NewNode {
  parent: string;
  name: string;
  label?: string;
  props: { name: string; value: string }[];
  children?: { name: string; props: { name: string; value: string }[] }[];
}

export type PinMovePlan = { changes: PropertyChange[]; nodes?: NewNode[] } | { error: string } | { conflict: string[] };

export interface PinAssignRequest {
  function: string;
  pin: string;
  owner: string;
  overlay: string;
  force?: boolean;
}

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

/** WCH remaps a whole peripheral at once: `USART3_TX_PC10_1` -> ["USART3", "1"]. */
const wchRemap = (macro: string): [string, string] | undefined => {
  const m = /^([A-Z0-9]+)_\w*?_P[A-K]\d+_((?:AF)?\d+)$/.exec(macro);
  return m ? [m[1]!, m[2]!] : undefined;
};

/** Error when `macro` uses another remap than the owner's other signals of the same peripheral. */
function wchRemapClash(model: UiModel, owner: string, macro: string, except?: string): string | undefined {
  const mine = wchRemap(macro);
  if (!mine || mine[1].startsWith("AF")) return undefined; // AF-style SoCs route pins one by one
  for (const u of model.pins.usages) {
    if (u.owner !== owner || !u.cell || u.cell === except) continue;
    const other = wchRemap(u.cell);
    if (other && other[0] === mine[0] && other[1] !== mine[1]) {
      return `${macro} needs ${mine[0]} remap ${mine[1]}, but ${u.cell} on ${u.pin} uses remap ${other[1]}: a remap moves all ${mine[0]} signals, move them together`;
    }
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
      const wch = catalog.vendor === "wch" && /_P[A-K]\d+_(?:AF)?\d+$/.test(u.cell);
      const esp = !wch && /^(\w+?)_GPIO(\d+)$/.exec(u.cell);
      const nrf = /^NRF_PSEL(?:_DISCONNECTED)?\(\s*(\w+)\s*,/.exec(u.cell);
      let next: string | undefined;
      if (wch) {
        next = catalog.labels[`${req.function}@${req.to}`];
        const clash = next && wchRemapClash(model, req.owner, next, u.cell);
        if (clash) return clash;
      }
      else if (esp) next = `${esp[1]}_GPIO${/^GPIO(\d+)$/.exec(req.to)?.[1]}`;
      else if (nrf) {
        const m = /^P(\d+)\.(\d+)$/.exec(req.to);
        if (m) next = `NRF_PSEL(${nrf[1]}, ${Number(m[1])}, ${Number(m[2])})`;
      }
      const property = esp || wch ? "pinmux" : "psels";
      const c = current(u.source, property);
      const value = next && c && replaceCell(c.value, u.cell, next);
      if (!value) return `cannot rewrite ${u.cell} for ${req.to}`;
      c!.value = value;
      return undefined;
    }
    return `${u.property} of ${u.owner} cannot be edited here`;
  }
}

/** Nodes that take pinctrl states: their binding (pinctrl-device) or their own properties have pinctrl-0. */
export function pinctrlOwners(model: UiModel): string[] {
  return Object.values(model.nodes)
    .filter((n) => n.props.some((p) => p.name === "pinctrl-0") || (n.binding && model.bindings[n.binding]?.props.some((p) => p.name === "pinctrl-0")))
    .map((n) => n.path)
    .sort();
}

// function prefixes whose peripheral label differs (STM32 HAL names vs Zephyr labels)
const PREFIX_ALIASES: [RegExp, string][] = [
  [/^spim(\d)/, "spi$1"],
  [/^tim(\d+)/, "timers$1"],
  [/^usb_otg_(fs|hs)/, "usbotg_$1"],
  [/^sdio/, "sdmmc1"],
];

/** The peripheral a function most likely belongs to: `usart1_tx` -> usart1, `SPIM2_MOSI` -> spi2. */
export function suggestOwner(model: UiModel, fn: string): string | undefined {
  const owners = new Set(pinctrlOwners(model));
  let f = fn.toLowerCase();
  for (const [re, to] of PREFIX_ALIASES) f = f.replace(re, to);
  let best: UiNode | undefined;
  let bestLen = 0;
  for (const n of Object.values(model.nodes)) {
    for (const l of n.labels) {
      if (l.length > bestLen && (f === l || f.startsWith(`${l}_`))) {
        best = n;
        bestLen = l.length;
      }
    }
  }
  if (!best) return undefined;
  if (owners.has(best.path)) return best.path;
  // timers: the PWM child takes the pins
  return best.children.find((c) => owners.has(c));
}

const strings = (v: string) => [...v.matchAll(/"([^"]*)"/g)].map((m) => m[1]!);

export function planPinAssign(model: UiModel, req: PinAssignRequest): PinMovePlan {
  const { pinCatalog: catalog, pins, nodes } = model;
  const owner = nodes[req.owner];
  if (!owner) return { error: `node ${req.owner} not found` };
  if (!allowedPins(catalog, req.function).includes(req.pin)) return { error: `${req.function} cannot be routed to ${req.pin}` };
  const busy = pins.usages.filter((u) => u.pin === req.pin && u.owner !== req.owner && !u.disabled && (u.state ?? "default") === "default");
  if (busy.length && !req.force) return { conflict: [...new Set(busy.map((u) => u.owner))] };

  const prop = (n: UiNode, name: string) => n.props.find((p) => p.name === name)?.value;
  const names = strings(prop(owner, "pinctrl-names") ?? "");
  const index = names.indexOf("default");
  const stateProp = `pinctrl-${index < 0 ? 0 : index}`;
  const current = prop(owner, stateProp);

  if (catalog.vendor === "stm32") {
    const label = catalog.labels[`${req.function}@${req.pin}`];
    if (!label) return { error: `no pinctrl node for ${req.function} on ${req.pin}` };
    if (current) {
      if (new RegExp(`&${label}(?![\\w])`).test(current)) return { error: `${label} is already in ${stateProp}` };
      return { changes: [{ node: owner.path, property: stateProp, value: current.replace(/\s*>(?![\s\S]*>)/, ` &${label}>`) }] };
    }
    return { changes: newStateProps(owner, `<&${label}>`) };
  }

  let cell: string;
  if (catalog.vendor === "esp32") cell = `${req.function}_GPIO${/^GPIO(\d+)$/.exec(req.pin)?.[1]}`;
  else if (catalog.vendor === "wch") {
    const macro = catalog.labels[`${req.function}@${req.pin}`];
    if (!macro) return { error: `no pinmux macro for ${req.function} on ${req.pin}` };
    const clash = wchRemapClash(model, req.owner, macro);
    if (clash) return { error: clash };
    cell = macro;
  }
  else if (catalog.vendor === "nrf") {
    const m = /^P(\d+)\.(\d+)$/.exec(req.pin);
    if (!m) return { error: `${req.pin} is not an nRF pin` };
    cell = `NRF_PSEL(${req.function}, ${Number(m[1])}, ${Number(m[2])})`;
  } else return { error: "pin assignment is supported for STM32, ESP32, WCH and nRF" };
  const property = catalog.vendor === "nrf" ? "psels" : "pinmux";

  // existing default state: add a group to it
  const ref = current && /&([A-Za-z_]\w*)/.exec(current)?.[1];
  if (current) {
    const state = ref && Object.values(nodes).find((n) => n.labels.includes(ref));
    if (!state) return { error: `cannot find the pinctrl state ${ref ?? current} of ${owner.name}` };
    const taken = new Set(state.children.map((c) => nodes[c]?.name));
    let i = 1;
    while (taken.has(`group${i}`)) i++;
    return { changes: [], nodes: [{ parent: state.path, name: `group${i}`, props: [{ name: property, value: `<${cell}>` }] }] };
  }

  // no pinctrl yet: a new default state under the pin controller
  const controller = Object.values(nodes).find((n) => n.compatible.some((c) => /-pinctrl$/.test(c)));
  if (!controller) return { error: "no pin controller node found" };
  const base = `${owner.labels[0] ?? owner.name.replace(/@.*/, "").replace(/[^\w]/g, "_")}_default`;
  let label = base;
  for (let i = 2; Object.values(nodes).some((n) => n.labels.includes(label) || n.path === `${controller.path}/${label}`); i++) label = `${base}_${i}`;
  return {
    changes: newStateProps(owner, `<&${label}>`),
    nodes: [{ parent: controller.path, name: label, label, props: [], children: [{ name: "group1", props: [{ name: property, value: `<${cell}>` }] }] }],
  };
}

function newStateProps(owner: UiNode, value: string): PropertyChange[] {
  return [
    { node: owner.path, property: "pinctrl-0", value },
    { node: owner.path, property: "pinctrl-names", value: '"default"' },
  ];
}
