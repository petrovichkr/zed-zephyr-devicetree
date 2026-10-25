// SPDX-License-Identifier: Apache-2.0
//
// Pin map (SPEC 4.3, stage 4): which node uses which SoC pin, through pinctrl
// states and *-gpios phandle arrays. Pinctrl encodings are vendor specific and
// decoded from the source text as written (macros are not expanded):
//   ESP32  pinmux = <UART0_TX_GPIO43>               -> GPIO43, UART0_TX
//   STM32  pinmux = <STM32_PINMUX('A', 9, AF7)>     -> PA9, label usart1_tx
//   nRF    psels  = <NRF_PSEL(UART_TX, 0, 6)>       -> P0.06, UART_TX
//   WCH    pinmux = <USART3_TX_PB10_0>              -> PB10, USART3_TX (_0 is the remap)
//   other  label ending in _pa9 / _p1_06            -> PA9 / P1.06
// A pin used by two enabled nodes in their default state (or as GPIO) is a conflict.

import type { Loc, UiNode, UiProp } from "./model.js";

export interface UiPinUsage {
  pin: string;
  function?: string;
  owner: string; // node path
  property: string; // pinctrl-0, de-gpios, ...
  state?: string; // pinctrl-names entry
  disabled: boolean;
  origin: Loc;
  /** pinctrl node referenced from `pinctrl-N` (`&usart1_tx_pa9` -> usart1_tx_pa9). */
  ref?: string;
  /** Node whose pinmux/psels/pins property holds the cell (pinctrl state or group). */
  source?: string;
  /** The cell as written: `UART0_TX_GPIO43`, `NRF_PSEL(UART_TX, 0, 6)`, `&gpio0` for GPIOs. */
  cell?: string;
  /** For `*-gpios`: which entry of the property (0-based). */
  index?: number;
  /** Connector node (gpio-map) the reference went through: arduino_header. */
  nexus?: string;
  /** A gpio-hog child of the controller: not movable, the pin is held by the controller. */
  hog?: boolean;
  /** For `*-gpios`: the GPIO controller node, when the reference resolves. */
  controller?: string;
  /** For `*-gpios`: the flags cell as written (`(GPIO_ACTIVE_LOW | GPIO_PULL_UP)`) and decoded. */
  flags?: string;
  gpioFlags?: UiGpioFlags;
}

/** Zephyr GPIO devicetree flags (dt-bindings/gpio/gpio.h). */
export interface UiGpioFlags {
  activeLow: boolean;
  pull?: "up" | "down";
  /** Single-ended output; push-pull when absent. */
  drive?: "open-drain" | "open-source";
  /** Everything else as written: GPIO_INT_WAKEUP, NRF_GPIO_DRIVE_H0H1, STM32_GPIO_HIGH_SPEED, ESP32_GPIO_DS_ALT. */
  extra: string[];
}

export interface UiPinMap {
  usages: UiPinUsage[];
  /** Pins used by more than one enabled owner in the default state or as GPIO. */
  conflicts: string[];
  /** pinctrl entries that could not be decoded, as written. */
  unknown: { owner: string; property: string; value: string }[];
}

/** Top-level items of a cell list: `<A B(1, 2) &c>` -> [A, B(1, 2), &c]. */
export function cells(value: string): string[] {
  const out: string[] = [];
  for (const group of value.matchAll(/<([^>]*)>/g)) {
    let depth = 0;
    let cur = "";
    for (const ch of group[1]!) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (/\s/.test(ch) && depth === 0) {
        if (cur) out.push(cur);
        cur = "";
      } else cur += ch;
    }
    if (cur) out.push(cur);
  }
  return out;
}

/** Top-level cells with their offsets in `value`, inside `<...>` only. */
export function cellSpans(value: string): { text: string; start: number; end: number }[] {
  const spans: { text: string; start: number; end: number }[] = [];
  let inside = false;
  let depth = 0;
  let start = -1;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!;
    if (!inside) {
      if (ch === "<") inside = true;
      continue;
    }
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (depth === 0 && (ch === ">" || /\s/.test(ch))) {
      if (start >= 0) spans.push({ text: value.slice(start, i), start, end: i });
      start = -1;
      if (ch === ">") inside = false;
    } else if (start < 0) start = i;
  }
  return spans;
}

const strings = (value: string) => [...value.matchAll(/"([^"]*)"/g)].map((m) => m[1]!);
const pad2 = (n: string) => n.padStart(2, "0");

export function decodePinmux(cell: string): { pin: string; function?: string } | undefined {
  let m = /^(\w+?)_GPIO(\d+)$/.exec(cell);
  if (m) return { pin: `GPIO${m[2]}`, function: m[1] };
  m = /^STM32\w*_PINMUX\(\s*'([A-Z])'\s*,\s*(\d+)/.exec(cell);
  if (m) return { pin: `P${m[1]}${m[2]}` };
  m = /^NRF_PSEL(?:_DISCONNECTED)?\(\s*(\w+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(cell);
  if (m) return { pin: `P${m[2]}.${pad2(m[3]!)}`, function: m[1] };
  // WCH CH32: <FUNC>_P<port><pin>_<remap> or _AF<n> (ch32h41x)
  m = /^([A-Z][A-Z0-9_]*?)_P([A-K])(\d+)_(?:AF)?\d+$/.exec(cell);
  if (m) return { pin: `P${m[2]}${m[3]}`, function: m[1] };
  return undefined;
}

/** STM32 HAL node label without its pin suffix: `usart1_tx_pa9` -> `usart1_tx`. */
export const labelFunction = (label: string): string => label.replace(/_p[a-z]\d+$/i, "").replace(/_p\d_\d+$/i, "");

function pinFromLabel(label: string): string | undefined {
  let m = /_p([a-z])(\d+)$/i.exec(label);
  if (m) return `P${m[1]!.toUpperCase()}${m[2]}`;
  m = /_p(\d)_(\d+)$/i.exec(label);
  if (m) return `P${m[1]}.${pad2(m[2]!)}`;
  return undefined;
}

/** Pin name for `<&ctrl N ...>` from the GPIO controller's label and compatible. */
export function gpioPin(ctrl: UiNode | undefined, label: string, arg: string): string {
  const n = /^\d+$/.test(arg) ? Number(arg) : undefined;
  if (n === undefined) return `${label}.${arg}`;
  if (ctrl?.compatible.some((c) => /stm32.*gpio|^wch,gpio/.test(c))) {
    const port = /gpio([a-k])$/i.exec(label)?.[1];
    if (port) return `P${port.toUpperCase()}${n}`;
  }
  if (ctrl?.compatible.some((c) => /^espressif,esp32.*gpio/.test(c))) {
    // ESP32 GPIO controllers cover 32 pins each: gpio0 = 0..31, gpio1 = 32..
    const bank = Number(/gpio(\d+)$/.exec(label)?.[1] ?? 0);
    return `GPIO${bank * 32 + n}`;
  }
  if (ctrl?.compatible.some((c) => /^nordic,nrf-gpio/.test(c))) {
    const port = /gpio(\d+)$/.exec(label)?.[1] ?? "0";
    return `P${port}.${String(n).padStart(2, "0")}`;
  }
  return `${label}.${n}`;
}

const FLAG_BITS: Record<string, number> = {
  GPIO_ACTIVE_LOW: 1,
  GPIO_ACTIVE_HIGH: 0,
  GPIO_PUSH_PULL: 0,
  GPIO_SINGLE_ENDED: 2,
  GPIO_LINE_OPEN_DRAIN: 4,
  GPIO_LINE_OPEN_SOURCE: 0,
  GPIO_OPEN_DRAIN: 6,
  GPIO_OPEN_SOURCE: 2,
  GPIO_PULL_UP: 16,
  GPIO_PULL_DOWN: 32,
};

/** `(GPIO_ACTIVE_LOW | GPIO_PULL_UP)`, `0x11`, `GPIO_OPEN_DRAIN | NRF_GPIO_DRIVE_H0H1`. */
export function decodeGpioFlags(text: string): UiGpioFlags {
  let bits = 0;
  const extra: string[] = [];
  for (const raw of text.replace(/[()\s]/g, "").split("|")) {
    if (!raw) continue;
    if (raw in FLAG_BITS) bits |= FLAG_BITS[raw]!;
    else if (/^(0x[0-9a-f]+|\d+)$/i.test(raw)) {
      const n = Number(raw);
      bits |= n & 0x37;
      if (n & 0x40) extra.push("GPIO_INT_WAKEUP");
      if (n & ~0x7f) extra.push(`0x${(n & ~0x7f).toString(16)}`);
    } else extra.push(raw);
  }
  const single = (bits & 2) !== 0;
  return {
    activeLow: (bits & 1) !== 0,
    pull: bits & 16 ? "up" : bits & 32 ? "down" : undefined,
    drive: single ? (bits & 4 ? "open-drain" : "open-source") : undefined,
    extra,
  };
}

/**
 * `gpio-map` row for `line` of a connector: `<child-spec &ctrl parent-spec>` rows,
 * child specs of the nexus's #gpio-cells, parent specs of the target's. Only the
 * pin cell is matched (flags pass through, as gpio-map-pass-thru usually says).
 */
export function resolveNexus(nodes: Record<string, UiNode>, byLabel: Map<string, UiNode>, nexus: UiNode, line: string): { ctrl: UiNode; line: string } | undefined {
  const map = nexus.props.find((p) => p.name === "gpio-map");
  if (!map) return undefined;
  const count = (n: UiNode | undefined) => Number(cells(n?.props.find((p) => p.name === "#gpio-cells")?.value ?? "")[0]) || 2;
  const k = count(nexus);
  const c = cells(map.value);
  for (let i = 0; i + k < c.length; ) {
    const ref = c[i + k]!.replace(/^&/, "");
    const ctrl = /^\{(.+)\}$/.test(ref) ? nodes[ref.slice(1, -1)] : byLabel.get(ref);
    const pk = count(ctrl);
    if (ctrl && Number(c[i]) === Number(line) && /^(0x[0-9a-f]+|\d+)$/i.test(c[i]!)) return { ctrl, line: c[i + k + 1]! };
    i += k + 1 + pk;
  }
  return undefined;
}

export function buildPinMap(nodes: Record<string, UiNode>): UiPinMap {
  const byLabel = new Map<string, UiNode>();
  for (const n of Object.values(nodes)) for (const l of n.labels) byLabel.set(l, n);
  const usages: UiPinUsage[] = [];
  const unknown: UiPinMap["unknown"] = [];

  /** pinmux/psels cells of a pinctrl state node and its group children. */
  const pinctrlCells = (state: UiNode): { cell: string; prop: UiProp; node: string }[] =>
    [state, ...state.children.map((c) => nodes[c]).filter((c): c is UiNode => !!c)].flatMap((n) =>
      n.props
        .filter((p) => p.name === "pinmux" || p.name === "psels" || p.name === "pins")
        .flatMap((p) => cells(p.value).map((cell) => ({ cell, prop: p, node: n.path }))),
    );

  for (const owner of Object.values(nodes)) {
    const names = strings(owner.props.find((p) => p.name === "pinctrl-names")?.value ?? "");
    for (const prop of owner.props) {
      const state = /^pinctrl-(\d+)$/.exec(prop.name);
      if (state) {
        const stateName = names[Number(state[1])] ?? state[1];
        for (const ref of cells(prop.value)) {
          const label = ref.replace(/^&/, "");
          const target = byLabel.get(label);
          const decoded = target ? pinctrlCells(target) : [];
          let found = false;
          for (const { cell, prop: src, node } of decoded) {
            const d = decodePinmux(cell) ?? (pinFromLabel(label) ? { pin: pinFromLabel(label)! } : undefined);
            if (!d) {
              unknown.push({ owner: owner.path, property: prop.name, value: cell });
              continue;
            }
            found = true;
            usages.push({
              pin: d.pin,
              function: d.function ?? labelFunction(label),
              owner: owner.path,
              property: prop.name,
              state: stateName,
              disabled: owner.disabled,
              origin: src.origin,
              ref: label,
              source: node,
              cell,
            });
          }
          if (!found && !decoded.length) {
            const pin = pinFromLabel(label);
            if (pin) usages.push({ pin, function: labelFunction(label), owner: owner.path, property: prop.name, state: stateName, disabled: owner.disabled, origin: prop.origin, ref: label });
            else unknown.push({ owner: owner.path, property: prop.name, value: ref });
          }
        }
      } else if (prop.name === "gpios" && owner.props.some((p) => p.name === "gpio-hog")) {
        // GPIO hog: `gpios = <pin flags>` on the controller's own pins, no phandle
        const ctrl = Object.values(nodes).find((n) => n.children.includes(owner.path));
        const k = Number(cells(ctrl?.props.find((p) => p.name === "#gpio-cells")?.value ?? "")[0]) || 2;
        const c = cells(prop.value);
        for (let i = 0, index = 0; i < c.length; i += k, index++) {
          const flags = k > 1 ? c[i + 1] : undefined;
          usages.push({
            index,
            pin: gpioPin(ctrl, ctrl?.labels[0] ?? ctrl?.name ?? "?", c[i]!),
            function: "GPIO",
            owner: owner.path,
            property: prop.name,
            disabled: owner.disabled || !!ctrl?.disabled,
            origin: prop.origin,
            controller: ctrl?.path,
            hog: true,
            flags,
            gpioFlags: flags !== undefined ? decodeGpioFlags(flags) : undefined,
          });
        }
      } else if (/(^|-)gpios$/.test(prop.name)) {
        const c = cells(prop.value);
        let index = 0;
        for (let i = 0; i < c.length; i++) {
          if (!c[i]!.startsWith("&") || c[i + 1] === undefined) continue;
          const label = c[i]!.slice(1);
          // `&gpio0` or `&{/soc/gpio@20}`
          let ctrl = /^\{(.+)\}$/.test(label) ? nodes[label.slice(1, -1)] : byLabel.get(label);
          let line = c[i + 1]!;
          // connector (gpio-map): follow the row for this line to the real controller
          let nexus: string | undefined;
          const mapped = ctrl && resolveNexus(nodes, byLabel, ctrl, line);
          if (mapped) {
            nexus = ctrl!.path;
            ctrl = mapped.ctrl;
            line = mapped.line;
          }
          const flags = c[i + 2] !== undefined && !c[i + 2]!.startsWith("&") ? c[i + 2] : undefined;
          usages.push({
            cell: c[i],
            index: index++,
            // ports are named by the controller's first label, whichever label the reference uses
            pin: gpioPin(ctrl, ctrl?.labels[0] ?? ctrl?.name ?? label, line),
            controller: ctrl?.path,
            nexus,
            flags,
            gpioFlags: flags !== undefined ? decodeGpioFlags(flags) : undefined,
            function: "GPIO",
            owner: owner.path,
            property: prop.name,
            disabled: owner.disabled,
            origin: prop.origin,
          });
        }
      }
    }
  }

  const owners = new Map<string, Set<string>>();
  for (const u of usages) {
    if (u.disabled || (u.state !== undefined && u.state !== "default")) continue;
    owners.set(u.pin, (owners.get(u.pin) ?? new Set()).add(u.owner));
  }
  const conflicts = [...owners].filter(([, o]) => o.size > 1).map(([pin]) => pin);
  const order = (p: string) => p.replace(/\d+/g, (d) => d.padStart(4, "0"));
  usages.sort((a, b) => order(a.pin).localeCompare(order(b.pin)) || a.owner.localeCompare(b.owner));
  return { usages, conflicts: conflicts.sort((a, b) => order(a).localeCompare(order(b))), unknown };
}
