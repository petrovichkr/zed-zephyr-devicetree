// SPDX-License-Identifier: Apache-2.0
//
// Buses and their devices (ARCHITECTURE D30, D31). A controller is any node whose
// binding has `bus:` (i2c, spi, uart, can, mipi-dbi, ...); its devices are the
// children with a `compatible`, plus nodes that point at it by phandle
// (`i2c = <&i2c1>` in an SMBus node, `zephyr,console = &uart0` in /chosen).
// Values are read from the source text as written; a few well-known macros
// (I2C_BITRATE_*, DT_FREQ_M/K) are understood, anything else stays text.

import type { UiBinding, UiNode } from "./model.js";
import { cells, gpioPin, type UiPinMap } from "./pins.js";

export interface UiBusIssue {
  severity: "error" | "warning";
  message: string;
  /** Node the issue is about: a device or the controller itself. */
  node: string;
}

export interface UiBusDevice {
  path: string;
  /** How the device reaches the bus: child node, phandle property, or /chosen entry. */
  link: "child" | "phandle" | "chosen";
  /** Property holding the phandle (`i2c`, `zephyr,console`); not set for children. */
  property?: string;
  /** First `reg` cell as written; I2C address or SPI chip-select index. */
  reg?: string;
  address?: number;
  /** `spi-max-frequency` and similar, in Hz. */
  frequency?: number;
  /** Chip-select pin taken from the controller's `cs-gpios[address]`. */
  cs?: string;
  disabled: boolean;
}

export interface UiBusSpeed {
  property: string;
  text: string;
  /** Hz, or baud for UART. */
  value?: number;
}

export interface UiBus {
  path: string;
  type: string;
  disabled: boolean;
  speed?: UiBusSpeed;
  /** Signal pins of the default pinctrl state. */
  pins: { pin: string; function?: string }[];
  /** `cs-gpios` entries in order; "" for an empty (`<0>`) entry. */
  csPins: string[];
  devices: UiBusDevice[];
  issues: UiBusIssue[];
}

const MACROS: Record<string, number> = {
  I2C_BITRATE_STANDARD: 100_000,
  I2C_BITRATE_FAST: 400_000,
  I2C_BITRATE_FAST_PLUS: 1_000_000,
  I2C_BITRATE_HIGH: 3_400_000,
  I2C_BITRATE_ULTRA: 5_000_000,
};

/** Numeric value of one cell: `0x19`, `400000`, `(8000000)`, `DT_FREQ_M(8)`, `DT_SIZE_K(64)`, `I2C_BITRATE_FAST`. */
export function cellNumber(cell: string): number | undefined {
  const c = cell.trim().replace(/^\((.*)\)$/s, "$1").trim();
  if (/^0x[0-9a-f]+$/i.test(c)) return parseInt(c, 16);
  if (/^\d+$/.test(c)) return Number(c);
  const m = /^DT_FREQ_([MK])\(\s*(\d+)\s*\)$/.exec(c);
  if (m) return Number(m[2]) * (m[1] === "M" ? 1_000_000 : 1_000);
  const sz = /^DT_SIZE_([MK])\(\s*(\d+)\s*\)$/.exec(c);
  if (sz) return Number(sz[2]) * (sz[1] === "M" ? 1024 * 1024 : 1024);
  return MACROS[c];
}

// properties that tell the bus speed, by preference
const SPEED_PROPS = ["clock-frequency", "current-speed", "bus-speed", "i3c-scl-hz", "max-frequency"];
// buses whose children must have `reg`
const ADDRESSED = new Set(["i2c", "spi"]);
// phandle properties that are not "this device sits on that bus"
const NOT_A_BUS_LINK = /^(pinctrl-\d+|.*-gpios|gpios|clocks|dmas|interrupt-parent|interrupts-extended|io-channels|power-domains|phandle)$/;

const prop = (n: UiNode, name: string) => n.props.find((p) => p.name === name);
const unitAddress = (n: UiNode): number | undefined => {
  const at = n.name.indexOf("@");
  return at < 0 || !/^[0-9a-f]+$/i.test(n.name.slice(at + 1)) ? undefined : parseInt(n.name.slice(at + 1), 16);
};
const hexAddr = (n: number) => `0x${n.toString(16)}`;

export function buildBuses(nodes: Record<string, UiNode>, bindings: Record<string, UiBinding>, pins: UiPinMap): UiBus[] {
  const byLabel = new Map<string, UiNode>();
  for (const n of Object.values(nodes)) for (const l of n.labels) byLabel.set(l, n);

  const buses = new Map<string, UiBus>();
  for (const n of Object.values(nodes)) {
    const type = n.binding ? bindings[n.binding]?.bus?.[0] : undefined;
    if (!type) continue;
    const speedProp = SPEED_PROPS.map((s) => prop(n, s)).find(Boolean);
    const speedCell = speedProp ? cells(speedProp.value)[0] : undefined;
    buses.set(n.path, {
      path: n.path,
      type,
      disabled: n.disabled,
      speed: speedProp ? { property: speedProp.name, text: speedProp.value, value: speedCell === undefined ? undefined : cellNumber(speedCell) } : undefined,
      pins: pins.usages
        .filter((u) => u.owner === n.path && u.property.startsWith("pinctrl-") && (u.state ?? "default") === "default")
        .map((u) => ({ pin: u.pin, function: u.function })),
      csPins: csPins(prop(n, "cs-gpios")?.value ?? "", byLabel),
      devices: [],
      issues: [],
    });
  }

  for (const bus of buses.values()) {
    for (const c of nodes[bus.path]!.children) {
      const child = nodes[c];
      if (!child?.compatible.length) continue;
      const regCell = cells(prop(child, "reg")?.value ?? "")[0];
      const address = regCell === undefined ? undefined : cellNumber(regCell);
      const freq = cells(prop(child, "spi-max-frequency")?.value ?? "")[0];
      bus.devices.push({
        path: child.path,
        link: "child",
        reg: regCell,
        address,
        frequency: freq === undefined ? undefined : cellNumber(freq),
        cs: bus.type === "spi" && address !== undefined ? bus.csPins[address] || undefined : undefined,
        disabled: child.disabled,
      });
    }
  }

  // devices that reach a bus through a phandle
  for (const n of Object.values(nodes)) {
    if (n.path === "/aliases") continue;
    for (const p of n.props) {
      if (NOT_A_BUS_LINK.test(p.name)) continue;
      for (const ref of p.value.matchAll(/&([A-Za-z_]\w*)/g)) {
        const target = byLabel.get(ref[1]!);
        const bus = target && buses.get(target.path);
        if (!bus || bus.path === n.path || nodes[bus.path]!.children.includes(n.path)) continue;
        bus.devices.push({ path: n.path, link: n.path === "/chosen" ? "chosen" : "phandle", property: p.name, disabled: n.disabled });
      }
    }
  }

  for (const bus of buses.values()) check(bus, nodes);
  const order = (b: UiBus) => `${b.disabled ? 1 : 0}${b.type}${b.path}`;
  return [...buses.values()].sort((a, b) => order(a).localeCompare(order(b)));
}

/** `cs-gpios` pins in order, assuming two specifier cells (`&gpio0 5 FLAGS`). */
function csPins(value: string, byLabel: Map<string, UiNode>): string[] {
  const c = cells(value);
  const out: string[] = [];
  for (let i = 0; i < c.length; ) {
    if (c[i]!.startsWith("&") && c[i + 1] !== undefined) {
      const label = c[i]!.slice(1);
      out.push(gpioPin(byLabel.get(label), label, c[i + 1]!));
      i += 3;
    } else {
      if (c[i] === "0") out.push("");
      i++;
    }
  }
  return out;
}

function check(bus: UiBus, nodes: Record<string, UiNode>): void {
  const add = (severity: UiBusIssue["severity"], node: string, message: string) => bus.issues.push({ severity, node, message });
  const name = (path: string) => nodes[path]?.name ?? path;
  const children = bus.devices.filter((d) => d.link === "child");
  const enabled = children.filter((d) => !d.disabled);

  for (const d of children) {
    if (ADDRESSED.has(bus.type) && d.reg === undefined) add("error", d.path, `${name(d.path)} has no reg (${bus.type === "spi" ? "chip select" : "address"})`);
    const unit = unitAddress(nodes[d.path]!);
    if (d.address !== undefined && unit !== undefined && unit !== d.address) {
      add("warning", d.path, `${name(d.path)}: unit address @${unit.toString(16)} does not match reg ${d.reg}`);
    }
    if (!d.disabled && bus.disabled) add("warning", d.path, `${name(d.path)} is enabled, but its bus is disabled`);
    if (bus.type === "spi" && d.address !== undefined && bus.csPins.length && d.address >= bus.csPins.length) {
      add("error", d.path, `${name(d.path)}: chip select ${d.address} is outside cs-gpios (${bus.csPins.length} entr${bus.csPins.length === 1 ? "y" : "ies"})`);
    }
    if (d.frequency !== undefined && bus.speed?.property === "clock-frequency" && bus.speed.value !== undefined && d.frequency > bus.speed.value) {
      add("warning", d.path, `${name(d.path)}: spi-max-frequency ${d.frequency} Hz is above the controller's clock-frequency ${bus.speed.value} Hz`);
    }
  }

  const byAddress = new Map<number, UiBusDevice[]>();
  for (const d of enabled) if (d.address !== undefined) byAddress.set(d.address, [...(byAddress.get(d.address) ?? []), d]);
  for (const [address, ds] of byAddress) {
    if (ds.length < 2) continue;
    const who = ds.map((d) => name(d.path)).join(", ");
    if (bus.type === "spi") add("error", ds[1]!.path, `chip select ${address} is used by ${who}`);
    // multi-function chips (RTC + SRAM) legitimately share an I2C address
    else if (bus.type === "i2c") add("warning", ds[1]!.path, `address ${hexAddr(address)} is used by ${who}`);
  }
}
