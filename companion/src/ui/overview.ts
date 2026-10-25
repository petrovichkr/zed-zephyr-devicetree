// SPDX-License-Identifier: Apache-2.0
//
// Overview diagram (SPEC 6c, stage 6): the SoC with its peripherals grouped by
// class and the pins each peripheral uses. A peripheral ("block") is a node with
// a binding file and a compatible and no such ancestor, except CPUs and memory
// regions (shown in the SoC box). Pins of nested nodes (bus devices, flash
// partitions, GPIO ports under a pin controller) go to the enclosing block. The
// class is the directory of the binding: dts/bindings/<class>/...
// Pins of an external GPIO controller (expander on a bus) are not SoC pins:
// they carry `via` and are drawn apart from the SoC edge.

import { cellNumber, type UiBus } from "./buses.js";
import type { UiBinding, UiNode } from "./model.js";
import type { UiPinCatalog } from "./pinfunctions.js";
import { cells, type UiGpioFlags, type UiPinMap } from "./pins.js";

export interface UiOverviewPin {
  pin: string;
  function?: string;
  /** Node that uses the pin: the block itself or a node below it. */
  owner: string;
  /** pinctrl-0, reset-gpios, ... */
  property: string;
  conflict: boolean;
  /** External GPIO controller (its label) the pin belongs to. */
  via?: string;
}

/** One LED or key of a gpio-leds / gpio-keys / pwm-leds node. */
export interface UiIndicator {
  path: string;
  kind: "led" | "key" | "pwm-led";
  /** `label` property, else the node name. */
  name: string;
  disabled: boolean;
  /** aliases pointing at the node: led0, sw0. */
  aliases: string[];
  pin?: string;
  /** External GPIO controller the pin belongs to. */
  via?: string;
  flags?: UiGpioFlags;
  conflict: boolean;
  /** gpio-keys: `zephyr,code` as written (INPUT_KEY_0). */
  code?: string;
  /** pwm-leds: `<&ledc0 0 50000 PWM_POLARITY_NORMAL>`; pin from the controller's pinctrl channel. */
  pwm?: { controller: string; channel: string; period: string; inverted: boolean };
}

export interface UiPeripheral {
  path: string;
  class: string;
  disabled: boolean;
  pins: UiOverviewPin[];
  /** Devices on this bus controller. */
  devices: number;
  /** gpio-leds, gpio-keys and pwm-leds: one entry per child. */
  items?: UiIndicator[];
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

/** Pin of a PWM channel from the controller's default pinctrl: LEDC_CH0_GPIO23, tim3_ch1_pa6, PWM_OUT0. */
function pwmPin(nodes: Record<string, UiNode>, pins: UiPinMap, ctrl: UiNode | undefined, channel: string): string | undefined {
  if (!ctrl || !/^\d+$/.test(channel)) return undefined;
  // STM32 pwm nodes sit under the timer; its pinctrl may be on either
  const owners = new Set([ctrl.path, ...Object.values(nodes).filter((n) => n.children.includes(ctrl.path)).map((n) => n.path)]);
  const used = pins.usages.filter((u) => owners.has(u.owner) && (u.state ?? "default") === "default");
  const ch = used.filter((u) => Number(/(?:CH|OUT)_?(\d+)/i.exec(u.function ?? "")?.[1]) === Number(channel));
  return ch.length === 1 ? ch[0]!.pin : undefined;
}

export function buildOverview(nodes: Record<string, UiNode>, bindings: Record<string, UiBinding>, pins: UiPinMap, buses: UiBus[], catalog?: UiPinCatalog): UiOverview {
  const external = new Map<string, string>();
  for (const port of catalog?.ports ?? []) if (port.external) for (const p of port.pins) external.set(p, port.name);
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
    block.pins.push({ pin: u.pin, function: u.function, owner: u.owner, property: u.property, conflict: conflicts.has(u.pin), via: external.get(u.pin) });
  }

  // LEDs and keys
  const byLabel = new Map<string, UiNode>();
  for (const n of Object.values(nodes)) for (const l of n.labels) byLabel.set(l, n);
  const aliases = new Map<string, string[]>();
  for (const p of nodes["/aliases"]?.props ?? []) {
    const v = p.value.trim();
    const target = v.startsWith("&") ? byLabel.get(v.slice(1))?.path : v.replace(/^"|"$/g, "");
    if (target) aliases.set(target, [...(aliases.get(target) ?? []), p.name]);
  }
  const KIND: Record<string, UiIndicator["kind"]> = { "gpio-leds": "led", "gpio-keys": "key", "pwm-leds": "pwm-led" };
  for (const b of blocks.values()) {
    const n = nodes[b.path]!;
    const kind = n.compatible.map((c) => KIND[c]).find(Boolean);
    if (!kind) continue;
    b.items = n.children
      .map((c) => nodes[c])
      .filter((c): c is UiNode => !!c)
      .map((c) => {
        const prop = (name: string) => c.props.find((p) => p.name === name)?.value;
        const u = pins.usages.find((x) => x.owner === c.path && x.property === "gpios" && !x.index);
        const item: UiIndicator = {
          path: c.path,
          kind,
          name: prop("label")?.replace(/^"|"$/g, "") || c.name,
          disabled: c.disabled || n.disabled,
          aliases: aliases.get(c.path) ?? [],
          pin: u?.pin,
          via: u && external.get(u.pin),
          flags: u?.gpioFlags,
          conflict: !!u && conflicts.has(u.pin),
          code: prop("zephyr,code")?.replace(/^<|>$/g, "").trim(),
        };
        const pwm = cells(prop("pwms") ?? "");
        if (pwm[0]?.startsWith("&")) {
          const ctrl = pwm[0].slice(1);
          item.pwm = { controller: ctrl, channel: pwm[1] ?? "", period: pwm[2] ?? "", inverted: /INVERTED|^1$/.test(pwm[3] ?? "") };
          item.pin = pwmPin(nodes, pins, byLabel.get(ctrl), pwm[1] ?? "");
        }
        return item;
      });
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
