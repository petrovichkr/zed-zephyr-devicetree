// SPDX-License-Identifier: Apache-2.0
//
// Overview diagram (SPEC 6c, stage 6): the SoC with its peripherals grouped by
// class and the pins each peripheral uses. A peripheral ("block") is a node with
// a binding file and a compatible and no such ancestor, except CPUs and memory
// regions (shown in the SoC box). Pins of nested nodes (bus devices, flash
// partitions, GPIO ports under a pin controller) go to the enclosing block. The
// class is the directory of the binding: dts/bindings/<class>/...

import { cellNumber, type UiBus } from "./buses.js";
import type { UiBinding, UiNode } from "./model.js";
import type { UiPinMap } from "./pins.js";

export interface UiOverviewPin {
  pin: string;
  function?: string;
  /** Node that uses the pin: the block itself or a node below it. */
  owner: string;
  conflict: boolean;
}

export interface UiPeripheral {
  path: string;
  class: string;
  disabled: boolean;
  pins: UiOverviewPin[];
  /** Devices on this bus controller. */
  devices: number;
}

export interface UiOverviewGroup {
  name: string;
  blocks: UiPeripheral[];
}

export interface UiOverview {
  soc: {
    model?: string;
    compatible: string[];
    /** `xtensa-lx7 @ 240 MHz` */
    cpus: string[];
    memory: { path: string; size: number }[];
  };
  groups: UiOverviewGroup[];
}

const GROUPS: [string, string[]][] = [
  ["Communication", ["serial", "i2c", "spi", "i2s", "i3c", "can", "usb", "ethernet", "wifi", "bluetooth", "ieee802154", "mipi-dbi", "mipi-dsi", "sdhc", "mmc", "modem", "smbus", "phy", "mdio", "ipm", "mbox", "espi", "w1"]],
  ["Timers", ["timer", "counter", "rtc", "watchdog", "pwm", "pulse-io"]],
  ["Analog & sensors", ["adc", "dac", "comparator", "sensor", "iio", "audio"]],
  ["Storage", ["flash_controller", "mtd", "otp", "nvmem", "bbram", "eeprom", "memory-controllers", "retained_mem", "retention", "fs"]],
  ["GPIO & input", ["gpio", "pinctrl", "input", "led", "led_strip", "kscan"]],
  ["System", ["clock", "reset", "power", "power-domain", "regulator", "interrupt-controller", "dma", "rng", "crypto", "misc", "arm", "riscv", "xtensa"]],
];
const GROUP_OF = new Map(GROUPS.flatMap(([g, classes]) => classes.map((c) => [c, g] as const)));
const OTHER = "Other";
/** Classes that are not peripherals; memory goes into the SoC box. */
const MEMORY = new Set(["base", "sram"]);

export const bindingClass = (file: string | undefined): string => /[\\/]dts[\\/]bindings[\\/]([^\\/]+)[\\/]/.exec(file ?? "")?.[1] ?? "";

const shortCompat = (c: string) => c.split(",").pop() ?? c;

export function buildOverview(nodes: Record<string, UiNode>, bindings: Record<string, UiBinding>, pins: UiPinMap, buses: UiBus[]): UiOverview {
  const parent = new Map<string, string>();
  for (const n of Object.values(nodes)) for (const c of n.children) parent.set(c, n.path);

  const candidate = (n: UiNode): string | undefined => {
    const file = n.binding ? bindings[n.binding]?.file : undefined;
    return file && n.compatible.length && n.path !== "/" && !n.path.startsWith("/cpus") ? bindingClass(file) : undefined;
  };
  const nested = (path: string): boolean => {
    for (let p = parent.get(path); p; p = parent.get(p)) {
      const cls = nodes[p] && candidate(nodes[p]!);
      if (cls !== undefined && !MEMORY.has(cls)) return true;
    }
    return false;
  };

  const blocks = new Map<string, UiPeripheral>();
  const memory: UiOverview["soc"]["memory"] = [];
  for (const n of Object.values(nodes)) {
    const cls = candidate(n);
    if (cls === undefined || nested(n.path)) continue;
    if (MEMORY.has(cls)) {
      if (n.reg[0]?.size) memory.push({ path: n.path, size: n.reg[0].size });
      continue;
    }
    blocks.set(n.path, { path: n.path, class: cls, disabled: n.disabled, pins: [], devices: buses.find((b) => b.path === n.path)?.devices.length ?? 0 });
  }

  // a pin belongs to the owner's nearest block (a bus device's pins go to its controller)
  const conflicts = new Set(pins.conflicts);
  for (const u of pins.usages) {
    if (u.state !== undefined && u.state !== "default") continue;
    let p: string | undefined = u.owner;
    while (p && !blocks.has(p)) p = parent.get(p);
    const block = p && blocks.get(p);
    if (!block || block.pins.some((x) => x.pin === u.pin && x.owner === u.owner)) continue;
    block.pins.push({ pin: u.pin, function: u.function, owner: u.owner, conflict: conflicts.has(u.pin) });
  }

  const groups = new Map<string, UiPeripheral[]>();
  for (const b of blocks.values()) {
    const g = GROUP_OF.get(b.class) ?? OTHER;
    groups.set(g, [...(groups.get(g) ?? []), b]);
  }
  const order = [...GROUPS.map(([g]) => g), OTHER];
  const byName = (a: UiPeripheral, b: UiPeripheral) => a.class.localeCompare(b.class) || a.path.localeCompare(b.path);

  const root = nodes["/"];
  const cpus = (nodes["/cpus"]?.children ?? [])
    .map((c) => nodes[c])
    .filter((c): c is UiNode => !!c?.compatible.length)
    .map((c) => {
      const f = c.props.find((p) => p.name === "clock-frequency")?.value;
      const hz = f ? cellNumber(f.replace(/^<|>$/g, "")) : undefined;
      return `${shortCompat(c.compatible[0]!)}${hz ? ` @ ${hz / 1_000_000} MHz` : ""}`;
    });

  return {
    soc: {
      model: root?.props.find((p) => p.name === "model")?.value.replace(/^"|"$/g, ""),
      compatible: root?.compatible ?? [],
      cpus,
      memory: memory.sort((a, b) => b.size - a.size),
    },
    groups: order.filter((g) => groups.has(g)).map((name) => ({ name, blocks: groups.get(name)!.sort(byName) })),
  };
}
