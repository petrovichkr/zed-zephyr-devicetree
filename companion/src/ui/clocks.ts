// SPDX-License-Identifier: Apache-2.0
//
// STM32 clock tree (SPEC 6c, stage 8, D27): sources -> PLL -> SYSCLK -> AHB/APB
// -> peripherals, with frequencies computed from the devicetree and checked
// against the limits of the part. Families with a model: F4, L4, F1, F0 (the
// ones the user has); any other STM32 gets the same graph without calculation.
// ESP32 gets a read-only view: crystal -> CPU clock source -> cores -> APB
// (80 MHz on the SoCs where it is fixed) -> peripherals with a clock module.
// Pure code: the browser runs it too, to recompute while divisors are edited.
//
// Limits come from the reference manuals: RM0090 (F405/407/415/417/42x/43x),
// RM0368 (F401), RM0383 (F411), RM0390 (F446), RM0351/RM0394 (L4), RM0432 (L4+),
// RM0008 (F1), RM0091 (F0).

import { cellNumber } from "./buses.js";
import type { UiNode } from "./model.js";
import { cells } from "./pins.js";

export interface UiClockParam {
  /** Devicetree node the property lives on. */
  node: string;
  property: string;
  /** Current value as a number (booleans: 1/0), undefined when not set. */
  value?: number;
  kind: "int" | "bool" | "source";
  /** Allowed values (enum or range expanded), or candidate source labels for "source". */
  options?: (number | string)[];
  min?: number;
  max?: number;
}

export interface UiClockNode {
  id: string;
  column: 0 | 1 | 2 | 3 | 4 | 5 | 6; // sources, PLL, PLL outputs, SYSCLK, AHB, APB, peripherals
  label: string;
  path?: string;
  hz?: number;
  /** Extra text after the frequency: the bus of a peripheral, the clock module on ESP32. */
  sub?: string;
  disabled?: boolean;
  error?: string;
  params?: UiClockParam[];
}

export interface UiClockEdge {
  from: string;
  to: string;
  /** Divider or multiplier on the way: "/M 4", "×N 168". */
  label?: string;
}

export interface UiClockIssue {
  severity: "error" | "warning";
  message: string;
  node?: string;
}

export interface UiClocks {
  family?: "f4" | "l4" | "f1" | "f0" | "stm32" | "esp32";
  /** SoC compatible, `st,stm32f405`. */
  part?: string;
  calculated: boolean;
  nodes: UiClockNode[];
  edges: UiClockEdge[];
  issues: UiClockIssue[];
  /** HCLK computed and as declared in rcc clock-frequency. */
  hclk?: number;
  declared?: number;
}

interface Limits {
  sysclk: number;
  apb1: number;
  apb2?: number;
  vin?: [number, number];
  vco?: [number, number];
  pllOut?: [number, number];
  hse: [number, number];
}

const M = 1_000_000;

function limits(family: UiClocks["family"], part: string): Limits | undefined {
  const p = part.replace(/^st,stm32/, "");
  switch (family) {
    case "f4":
      if (/^f401/.test(p)) return { sysclk: 84 * M, apb1: 42 * M, apb2: 84 * M, vin: [1 * M, 2 * M], vco: [192 * M, 432 * M], hse: [4 * M, 26 * M] };
      if (/^f41[0-3]/.test(p)) return { sysclk: 100 * M, apb1: 50 * M, apb2: 100 * M, vin: [1 * M, 2 * M], vco: [100 * M, 432 * M], hse: [4 * M, 26 * M] };
      if (/^f4(2|3|46|69|79)/.test(p)) return { sysclk: 180 * M, apb1: 45 * M, apb2: 90 * M, vin: [1 * M, 2 * M], vco: [100 * M, 432 * M], hse: [4 * M, 26 * M] };
      return { sysclk: 168 * M, apb1: 42 * M, apb2: 84 * M, vin: [1 * M, 2 * M], vco: [100 * M, 432 * M], hse: [4 * M, 26 * M] };
    case "l4": {
      const plus = /^l4[pqrs]/.test(p);
      const max = plus ? 120 * M : 80 * M;
      return { sysclk: max, apb1: max, apb2: max, vin: [plus ? 2.66 * M : 4 * M, 16 * M], vco: [64 * M, 344 * M], hse: [4 * M, 48 * M] };
    }
    case "f1":
      return { sysclk: 72 * M, apb1: 36 * M, apb2: 72 * M, pllOut: [16 * M, 72 * M], hse: [4 * M, /^f10[57]/.test(p) ? 25 * M : 16 * M] };
    case "f0":
      return { sysclk: 48 * M, apb1: 48 * M, pllOut: [16 * M, 48 * M], hse: [4 * M, 32 * M] };
    default:
      return undefined;
  }
}

// MSI ranges 0..11 (RM0351 6.2.3)
const MSI = [100e3, 200e3, 400e3, 800e3, 1e6, 2e6, 4e6, 8e6, 16e6, 24e6, 32e6, 48e6];

const num = (n: UiNode | undefined, prop: string): number | undefined => {
  const p = n?.props.find((x) => x.name === prop);
  if (!p) return undefined;
  if (p.value === "") return 1; // boolean
  const c = cells(p.value)[0];
  return c === undefined ? undefined : cellNumber(c);
};
const ref = (n: UiNode | undefined, prop = "clocks"): string | undefined => /&([A-Za-z_]\w*)/.exec(n?.props.find((x) => x.name === prop)?.value ?? "")?.[1];

/** `<&rcc STM32_CLOCK(APB1, 17)>` or `<&rcc STM32_CLOCK_BUS_APB1 0x20000>` -> APB1 */
export function clockBus(value: string): string | undefined {
  return /STM32_CLOCK\(\s*(\w+)\s*,/.exec(value)?.[1] ?? /STM32_CLOCK_BUS_(\w+)/.exec(value)?.[1];
}

export function buildClocks(nodes: Record<string, UiNode>): UiClocks | undefined {
  const all = Object.values(nodes);
  if (all.some((n) => n.compatible.includes("espressif,esp32-clock"))) return esp32Clocks(all);
  const part = all.flatMap((n) => n.compatible).find((c) => /^st,stm32[a-z]\d/.test(c) && !/-/.test(c.slice(9)));
  const rcc = all.find((n) => n.compatible.some((c) => /^st,stm32\w*-rcc$/.test(c)));
  if (!part || !rcc) return undefined;
  const fam = /^st,stm32(f4|l4|f1|f0)/.exec(part)?.[1] as UiClocks["family"] | undefined;
  const family = fam ?? "stm32";
  const lim = limits(family, part);
  const byLabel = new Map(all.flatMap((n) => n.labels.map((l) => [l, n] as const)));
  const out: UiClocks = { family, part, calculated: !!lim, nodes: [], edges: [], issues: [] };
  const err = (message: string, node?: string) => out.issues.push({ severity: "error", message, node });
  const warn = (message: string, node?: string) => out.issues.push({ severity: "warning", message, node });
  const inRange = (v: number | undefined, r: [number, number] | undefined, what: string, node: string) => {
    if (v === undefined || !r) return;
    if (v < r[0] || v > r[1]) err(`${what} ${mhz(v)} is outside ${mhz(r[0])}–${mhz(r[1])}`, node);
  };

  // sources
  const sources = ["clk_hse", "clk_hsi", "clk_msi", "clk_lse", "clk_lsi", "clk_hsi48", "clk_hsi14"].filter((l) => byLabel.has(l));
  const hz = new Map<string, number | undefined>();
  for (const l of sources) {
    const n = byLabel.get(l)!;
    const f = l === "clk_msi" ? MSI[num(n, "msi-range") ?? -1] : num(n, "clock-frequency");
    hz.set(l, n.disabled ? undefined : f);
    const params: UiClockParam[] = [];
    if (l === "clk_msi") params.push({ node: n.path, property: "msi-range", value: num(n, "msi-range"), kind: "int", options: MSI.map((_, i) => i) });
    if (l === "clk_hse") params.push({ node: n.path, property: "clock-frequency", value: num(n, "clock-frequency"), kind: "int", min: lim?.hse[0], max: lim?.hse[1] });
    out.nodes.push({ id: l, column: 0, label: l.replace(/^clk_/, "").toUpperCase(), path: n.path, hz: f, disabled: n.disabled, params });
    if (l === "clk_hse" && !n.disabled) inRange(f, lim?.hse, "HSE", l);
  }

  // PLL
  const pll = byLabel.get("pll");
  let pllOut: number | undefined; // the output that can drive SYSCLK
  if (pll) {
    const src = ref(pll);
    const srcHz = src ? hz.get(src) : undefined;
    const p = (prop: string, extra: Partial<UiClockParam> = {}): UiClockParam => ({ node: pll.path, property: prop, value: num(pll, prop), kind: "int", ...extra });
    const params: UiClockParam[] = [{ node: pll.path, property: "clocks", kind: "source", options: sources.filter((s) => /hse|hsi$|msi/.test(s)) }];
    const node: UiClockNode = { id: "pll", column: 1, label: "PLL", path: pll.path, disabled: pll.disabled, params };
    out.nodes.push(node);
    if (src) out.edges.push({ from: src, to: "pll" });
    if (family === "f4" || family === "l4") {
      const m = num(pll, "div-m");
      const n = num(pll, "mul-n");
      const vin = srcHz && m ? srcHz / m : undefined;
      const vco = vin && n ? vin * n : undefined;
      params.push(p("div-m", { min: family === "f4" ? 2 : 1, max: family === "f4" ? 63 : 8 }), p("mul-n", { min: family === "f4" ? 50 : 8, max: family === "f4" ? 432 : 86 }));
      const outputs = family === "f4" ? ["div-p", "div-q", "div-r"] : ["div-r", "div-q", "div-p"];
      for (const d of outputs) {
        const v = num(pll, d);
        params.push(p(d, { options: d === "div-p" && family === "f4" ? [2, 4, 6, 8] : d === "div-p" ? undefined : family === "l4" ? [2, 4, 6, 8] : undefined, min: 2, max: d === "div-p" && family === "l4" ? 31 : 15 }));
        const f = vco && v ? vco / v : undefined;
        const id = `pll_${d.slice(-1)}`;
        if (v !== undefined) {
          out.nodes.push({ id, column: 2, label: `PLL${d.slice(-1).toUpperCase()}`, hz: f, disabled: pll.disabled });
          out.edges.push({ from: "pll", to: id, label: `/${d.slice(-1).toUpperCase()} ${v}` });
        }
      }
      node.hz = vco;
      node.label = `PLL VCO`;
      if (src) out.edges[out.edges.findIndex((e) => e.to === "pll")]!.label = m && n ? `/M ${m} ×N ${n}` : undefined;
      if (!pll.disabled) {
        inRange(vin, lim?.vin, "PLL input", "pll");
        inRange(vco, lim?.vco, "VCO", "pll");
      }
      pllOut = vco && num(pll, family === "f4" ? "div-p" : "div-r") ? vco / num(pll, family === "f4" ? "div-p" : "div-r")! : undefined;
      // USB needs exactly 48 MHz from PLLQ when the OTG FS controller is enabled
      const usb = all.some((x) => !x.disabled && x.compatible.some((c) => /stm32-otgfs|stm32-usb/.test(c)));
      const q = num(pll, "div-q");
      if (usb && vco && q && Math.abs(vco / q - 48 * M) > 0.0025 * 48 * M && !byLabel.get("clk_hsi48")) err(`USB needs 48 MHz on PLLQ, got ${mhz(vco / q)}`, "pll_q");
    } else if (family === "f1" || family === "f0") {
      const mul = num(pll, "mul");
      const prediv = num(pll, "prediv");
      const xtpre = num(pll, "xtpre");
      params.push(p("mul", { min: 2, max: 16 }));
      if (family === "f0" || prediv !== undefined) params.push(p("prediv", { min: 1, max: 16 }));
      if (family === "f1") params.push({ node: pll.path, property: "xtpre", value: xtpre ?? 0, kind: "bool" });
      const hsiPrediv = /^st,stm32f0(4|7|9)|^st,stm32f030xc/.test(part);
      const div = src === "clk_hsi" ? (family === "f0" && hsiPrediv ? (prediv ?? 1) : 2) : family === "f1" ? (xtpre ? 2 : 1) * (prediv ?? 1) : (prediv ?? 1);
      pllOut = srcHz && mul ? (srcHz / div) * mul : undefined;
      node.hz = pllOut;
      if (src) out.edges[out.edges.findIndex((e) => e.to === "pll")]!.label = `/${div} ×${mul ?? "?"}`;
      if (!pll.disabled) inRange(pllOut, lim?.pllOut, "PLL output", "pll");
    }
  }

  // SYSCLK and buses
  const sysSrc = ref(rcc);
  const sysFrom = sysSrc === "pll" ? (family === "f4" ? "pll_p" : family === "l4" ? "pll_r" : "pll") : sysSrc;
  const sysclk = sysSrc === "pll" ? pllOut : sysSrc ? hz.get(sysSrc) : undefined;
  const ahbDiv = num(rcc, "ahb-prescaler");
  const apb1Div = num(rcc, "apb1-prescaler");
  const apb2Div = num(rcc, "apb2-prescaler");
  const prescalers = (prop: string, opts: number[]): UiClockParam => ({ node: rcc.path, property: prop, value: num(rcc, prop), kind: "int", options: opts });
  out.nodes.push({
    id: "sysclk",
    column: 3,
    label: "SYSCLK",
    path: rcc.path,
    hz: sysclk,
    params: [{ node: rcc.path, property: "clocks", kind: "source", options: ["pll", ...sources.filter((s) => /hse|hsi$|msi/.test(s))] }],
  });
  if (sysFrom) out.edges.push({ from: sysFrom, to: "sysclk" });
  const ahb = sysclk && ahbDiv ? sysclk / ahbDiv : undefined;
  const apb1 = ahb && apb1Div ? ahb / apb1Div : undefined;
  const apb2 = ahb && apb2Div ? ahb / apb2Div : undefined;
  out.nodes.push({ id: "ahb", column: 4, label: "HCLK", path: rcc.path, hz: ahb, params: [prescalers("ahb-prescaler", [1, 2, 4, 8, 16, 64, 128, 256, 512])] });
  out.edges.push({ from: "sysclk", to: "ahb", label: `/${ahbDiv ?? "?"}` });
  // the AHB bus gets its own box next to the APBs, so every peripheral hangs off one column
  out.nodes.push({ id: "ahb_bus", column: 5, label: "AHB", path: rcc.path, hz: ahb });
  out.edges.push({ from: "ahb", to: "ahb_bus" });
  out.nodes.push({ id: "apb1", column: 5, label: "APB1", path: rcc.path, hz: apb1, params: [prescalers("apb1-prescaler", [1, 2, 4, 8, 16])] });
  out.edges.push({ from: "ahb", to: "apb1", label: `/${apb1Div ?? "?"}` });
  if (apb2Div !== undefined) {
    out.nodes.push({ id: "apb2", column: 5, label: "APB2", path: rcc.path, hz: apb2, params: [prescalers("apb2-prescaler", [1, 2, 4, 8, 16])] });
    out.edges.push({ from: "ahb", to: "apb2", label: `/${apb2Div}` });
  }
  if (lim) {
    if (sysclk !== undefined && sysclk > lim.sysclk) err(`SYSCLK ${mhz(sysclk)} is above the ${mhz(lim.sysclk)} maximum`, "sysclk");
    if (apb1 !== undefined && apb1 > lim.apb1) err(`APB1 ${mhz(apb1)} is above the ${mhz(lim.apb1)} maximum`, "apb1");
    if (apb2 !== undefined && lim.apb2 && apb2 > lim.apb2) err(`APB2 ${mhz(apb2)} is above the ${mhz(lim.apb2)} maximum`, "apb2");
  }
  if (sysSrc && byLabel.get(sysSrc)?.disabled) err(`SYSCLK source ${sysSrc} is disabled`, "sysclk");
  if (sysSrc === "pll" && pll?.disabled) err("SYSCLK comes from the PLL, but the PLL is disabled", "sysclk");
  out.hclk = ahb;
  out.declared = num(rcc, "clock-frequency");
  if (lim && ahb !== undefined && out.declared !== undefined && Math.round(ahb) !== out.declared) {
    err(`rcc clock-frequency ${mhz(out.declared)} does not match the computed HCLK ${mhz(ahb)}`, "ahb");
  }

  // peripherals on the buses
  for (const n of all) {
    if (n.disabled) continue;
    const v = n.props.find((p) => p.name === "clocks")?.value;
    if (!v || ref(n) !== rcc.labels[0]) continue;
    const bus = clockBus(v);
    if (!bus) continue;
    const parent = /^APB1/.test(bus) ? "apb1" : /^APB2/.test(bus) ? "apb2" : /^AHB/.test(bus) ? "ahb_bus" : undefined;
    if (!parent) continue;
    const timer = n.compatible.some((c) => /timers|stm32-timer/.test(c));
    const base = parent === "apb1" ? apb1 : parent === "apb2" ? apb2 : ahb;
    const div = parent === "apb1" ? apb1Div : parent === "apb2" ? apb2Div : 1;
    // timers on an APB with a prescaler run at twice PCLK
    const f = base !== undefined && timer && div !== undefined && div > 1 ? base * 2 : base;
    out.nodes.push({ id: n.path, column: 6, label: `${n.labels[0] ?? n.name}${timer && div && div > 1 ? " ×2" : ""}`, sub: bus, path: n.path, hz: f });
    out.edges.push({ from: parent, to: n.path });
  }

  // peripherals grouped by bus, in the order the buses are drawn
  const busOrder = ["ahb_bus", "apb1", "apb2"];
  const parentOf = new Map(out.edges.map((e) => [e.to, e.from]));
  const rank = (n: UiClockNode) => (n.column === 6 ? busOrder.indexOf(parentOf.get(n.id) ?? "") : -1);
  out.nodes.sort((a, b) => a.column - b.column || rank(a) - rank(b) || (a.column === 6 ? a.label.localeCompare(b.label) : 0));

  const flagged = new Set(out.issues.map((i) => i.node));
  for (const node of out.nodes) if (flagged.has(node.id)) node.error = out.issues.find((i) => i.node === node.id)!.message;
  if (!lim) warn(`no clock model for ${part}: frequencies are shown where they follow directly from the devicetree`);
  return out;
}

export const mhz = (v: number): string => (v >= M ? `${Number((v / M).toFixed(3))} MHz` : v >= 1000 ? `${Number((v / 1000).toFixed(3))} kHz` : `${v} Hz`);

// SoCs whose APB clock is fixed at 80 MHz while the CPU runs from the PLL
const APB80 = /^espressif,esp32(s2|s3|c3)?$/;

function esp32Clocks(all: UiNode[]): UiClocks {
  const out: UiClocks = { family: "esp32", part: all.flatMap((n) => n.compatible).find((c) => /^espressif,esp32\w*$/.test(c)), calculated: false, nodes: [], edges: [], issues: [] };
  const cpus = all.filter((n) => /^\/cpus\/cpu@/.test(n.path));
  const xtal = num(cpus[0], "xtal-freq");
  const src = cpus[0]?.props.find((p) => p.name === "clock-source")?.value.replace(/[<>]/g, "").replace(/^ESP32_CPU_CLK_SRC_/, "");
  out.nodes.push({ id: "xtal", column: 0, label: "XTAL", hz: xtal });
  const clk = all.find((n) => n.compatible.includes("espressif,esp32-clock"));
  for (const [prop, label] of [["fast-clk-src", "RTC fast"], ["slow-clk-src", "RTC slow"]] as const) {
    const v = clk?.props.find((p) => p.name === prop)?.value.replace(/[<>]/g, "").replace(/^ESP32_RTC_(FAST|SLOW)_CLK_SRC_/, "");
    if (v) out.nodes.push({ id: prop, column: 0, label: `${label}: ${v}`, path: clk!.path });
  }
  out.nodes.push({ id: "cpu_src", column: 1, label: `CPU source: ${src ?? "?"}` });
  out.edges.push({ from: "xtal", to: "cpu_src" });
  let cpuHz: number | undefined;
  for (const c of cpus) {
    cpuHz ??= num(c, "clock-frequency");
    out.nodes.push({ id: c.path, column: 3, label: c.name, path: c.path, hz: num(c, "clock-frequency") });
    out.edges.push({ from: "cpu_src", to: c.path });
  }
  const apb = out.part && APB80.test(out.part) && cpuHz ? Math.min(cpuHz, 80 * M) : undefined;
  out.nodes.push({ id: "apb", column: 4, label: "APB", hz: apb });
  if (cpus[0]) out.edges.push({ from: cpus[0].path, to: "apb" });
  for (const n of all) {
    if (n.disabled) continue;
    const mod = /&clock\s+ESP32_(\w+)_MODULE/.exec(n.props.find((p) => p.name === "clocks")?.value ?? "")?.[1];
    if (!mod) continue;
    out.nodes.push({ id: n.path, column: 6, label: n.labels[0] ?? n.name, sub: mod, path: n.path });
    out.edges.push({ from: "apb", to: n.path });
  }
  return out;
}
