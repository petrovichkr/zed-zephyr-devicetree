// SPDX-License-Identifier: Apache-2.0
//
// Compact view model for the visual editor (SPEC 4.3), built from dts-lsp's
// `devicetree/serializedContext` (several MB) and `devicetree/memoryViews`.
// Property values are taken verbatim from the source text, so macros stay as
// written. This module is the contract with the browser app (see UiModel).

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBuses, type UiBus } from "./buses.js";
import { buildClocks, type UiClocks } from "./clocks.js";
import { buildInterrupts, type UiIrqController } from "./irqs.js";
import { buildMemoryMap, type UiMemory } from "./memmap.js";
import { buildOverview, type UiOverview } from "./overview.js";
import { buildPinCatalog, pinctrlInclude, type UiPinCatalog } from "./pinfunctions.js";
import { buildPinMap, type UiPinMap } from "./pins.js";

/** 0-based position, like LSP. `file` is an absolute path. */
export interface Loc {
  file: string;
  line: number;
  character: number;
}

export interface UiBindingProp {
  name: string;
  type: string; // EMPTY | U32 | U64 | STRING | PROP_ENCODED_ARRAY | STRINGLIST | BYTESTRING | ANY | UNKNOWN
  required: boolean;
  enum?: (string | number)[];
  /** `const:` or `default:` of the binding YAML (ngpios: 16 for nxp,pca9555). */
  const?: unknown;
  default?: unknown;
  description?: string;
}

export interface UiProp {
  name: string;
  /** Value text as written, without `name =` and `;`. Empty for boolean properties. */
  value: string;
  origin: Loc;
  /** Earlier assignments this one replaces, oldest first. */
  overridden: Loc[];
}

/** Shared by every node with the same binding; look properties up by name. */
export interface UiBinding {
  file?: string;
  description?: string;
  /** Bus types this node provides to its children (`bus:` in the binding). */
  bus?: string[];
  /** Names of the interrupt specifier cells of a controller (`interrupt-cells:`). */
  interruptCells?: string[];
  props: UiBindingProp[];
}

export interface UiNode {
  path: string;
  name: string; // full name with unit address
  labels: string[];
  disabled: boolean;
  compatible: string[];
  /** Key into UiModel.bindings. */
  binding?: string;
  props: UiProp[];
  children: string[]; // paths
  /** Every place the node is defined or extended (`&label {}` included). */
  definitions: Loc[];
  reg: { start: number; size: number }[];
  issues: number;
}

export interface UiMemoryRegion {
  name: string;
  path: string;
  start: number;
  size: number;
  disabled: boolean;
  labels: string[];
  children: UiMemoryRegion[];
}

export interface UiContext {
  id: string;
  names: string[];
  active: boolean;
  /** Overlay files the editor may write to (user files only), last = default. */
  overlays: string[];
  /** Command that rebuilds a discovered build from scratch (picks up new overlays). */
  rebuild?: string;
  /** Overlays the build has not picked up yet: cmake must run again. */
  pending?: string[];
  /** Board overlay the editor can create when the build has no user overlay. */
  newOverlay?: string;
}

export interface UiModel {
  context: UiContext;
  root: string; // "/"
  nodes: Record<string, UiNode>;
  bindings: Record<string, UiBinding>;
  pins: UiPinMap;
  pinCatalog: UiPinCatalog;
  buses: UiBus[];
  overview: UiOverview;
  /** STM32 only. */
  clocks?: UiClocks;
  /** Interrupt controllers and the lines nodes use. */
  interrupts: UiIrqController[];
  memory: UiMemoryRegion[];
  /** Flash partitions and RAM regions, for the memory map. */
  memoryMap: UiMemory[];
}

// dts-lsp marks synthetic locations as `<file>%3Floc=...%23virtual` (percent-encoded)
const isFileUrl = (url: unknown): url is string =>
  typeof url === "string" && url.startsWith("file:") && !/(#|%23)virtual|%3Floc=/i.test(url);

export function toLoc(url: string, pos: { line: number; character: number }): Loc {
  return { file: fileURLToPath(url), line: pos.line, character: pos.character };
}

/** Reads source files once per model build. */
export class SourceCache {
  private files = new Map<string, string[]>();
  constructor(private readonly read: (file: string) => string = (f) => readFileSync(f, "utf8")) {}

  lines(file: string): string[] {
    let lines = this.files.get(file);
    if (!lines) {
      try {
        lines = this.read(file).split(/\r?\n/);
      } catch {
        lines = [];
      }
      this.files.set(file, lines);
    }
    return lines;
  }

  slice(file: string, range: { start: { line: number; character: number }; end: { line: number; character: number } }): string {
    const lines = this.lines(file);
    const { start, end } = range;
    if (start.line === end.line) return (lines[start.line] ?? "").slice(start.character, end.character);
    return [
      (lines[start.line] ?? "").slice(start.character),
      ...lines.slice(start.line + 1, end.line),
      (lines[end.line] ?? "").slice(0, end.character),
    ].join("\n");
  }
}

/** `name = <1 2>;` -> `<1 2>`; `name;` -> `` */
export function valueText(propertySource: string): string {
  const eq = propertySource.indexOf("=");
  if (eq < 0) return "";
  return propertySource
    .slice(eq + 1)
    .replace(/;\s*$/, "")
    .trim();
}

const words = (w: unknown): number => (Array.isArray(w) ? w.reduce((acc: number, x: number) => acc * 2 ** 32 + x, 0) : 0);

function bindingProp(p: any, yaml: Record<string, any> | undefined): UiBindingProp {
  const y = yaml?.[p.name];
  return {
    name: p.name,
    type: p.type?.[0]?.types?.[0] ?? "UNKNOWN",
    required: !!p.required,
    enum: p.allowedValues?.length ? p.allowedValues : undefined,
    const: y?.const,
    default: y?.default,
    description: p.description,
  };
}

function memoryTree(t: any): UiMemoryRegion {
  return {
    name: t.name,
    path: t.path,
    start: words(t.start),
    size: words(t.size),
    disabled: !!t.disabled,
    labels: t.labels ?? [],
    children: (t.children ?? []).map(memoryTree),
  };
}

/** The SoC pinctrl header included by the board (ESP32, WCH), resolved against the context's include paths. */
function pinctrlHeader(nodes: Record<string, UiNode>, src: SourceCache, includePaths: string[]): { file: string; text: string } | undefined {
  const all = Object.values(nodes);
  if (!all.some((n) => n.compatible.some((c) => /^espressif,esp32.*gpio|^wch,gpio/.test(c)))) return undefined;
  // files that define pinctrl states first, then everything else
  const pinctrl = all.filter((n) => n.path.startsWith("/pin-controller") || n.compatible.some((c) => c.endsWith("-pinctrl")));
  const files = [...new Set([...pinctrl, ...all].flatMap((n) => n.definitions.map((d) => d.file)))];
  for (const f of files) {
    const name = pinctrlInclude(src.lines(f));
    if (!name) continue;
    for (const dir of includePaths) {
      const file = join(dir, name);
      if (existsSync(file)) return { file, text: src.lines(file).join("\n") };
    }
  }
  return undefined;
}

/**
 * ESP32 ADC channel -> GPIO from the Espressif HAL of the workspace:
 * `#define ADC1_CHANNEL_0_GPIO_NUM 16` in components/soc/<soc>/include/soc/adc_channel.h.
 * The SoC is the one the board's pinctrl header names (esp32p4-pinctrl.h). Keys: `<unit>:<channel>`.
 */
export function esp32AdcPins(header: string | undefined, includePaths: string[], read: (f: string) => string = (f) => readFileSync(f, "utf8")): Record<string, string> | undefined {
  const soc = /(esp32\w*?)-pinctrl\.h$/.exec(header ?? "")?.[1];
  if (!soc) return undefined;
  const rel = join("components", "soc", soc, "include", "soc", "adc_channel.h");
  const seen = new Set<string>();
  for (const start of includePaths) {
    for (let dir = start, i = 0; i < 6 && !seen.has(dir); i++, dir = dirname(dir)) {
      seen.add(dir);
      for (const file of [join(dir, "modules", "hal", "espressif", rel), join(dir, "hal", "espressif", rel), join(dir, rel)]) {
        if (!existsSync(file)) continue;
        const out: Record<string, string> = {};
        for (const m of read(file).matchAll(/^\s*#define\s+ADC(\d)_CHANNEL_(\d+)_GPIO_NUM\s+(\d+)/gm)) out[`${m[1]}:${m[2]}`] = `GPIO${m[3]}`;
        return out;
      }
    }
  }
  return undefined;
}

export function buildModel(
  context: UiContext,
  serialized: Record<string, any>,
  memory: { trees?: Record<string, any> } | undefined,
  src = new SourceCache(),
  includePaths: string[] = [],
): UiModel {
  const nodes: Record<string, UiNode> = {};
  const bindings: Record<string, UiBinding> = {};
  for (const [path, n] of Object.entries(serialized)) {
    const t = n.nodeType;
    const key: string | undefined = t ? (t.bindingsPath ?? t.compatible ?? `generic:${(t.extends ?? []).join(",")}`) : undefined;
    if (t && key && !bindings[key]) {
      bindings[key] = {
        file: t.bindingsPath,
        description: t.description,
        bus: t.bus?.length ? t.bus : undefined,
        interruptCells: Array.isArray(t.zephyrBinding?.["interrupt-cells"]) ? t.zephyrBinding["interrupt-cells"] : undefined,
        props: (t.properties ?? []).filter((p: any) => !p.nameIsRegex).map((p: any) => bindingProp(p, t.zephyrBinding?.properties)),
      };
    }

    const props: UiProp[] = (n.properties ?? [])
      .filter((p: any) => isFileUrl(p.url))
      .map((p: any) => {
        const file = fileURLToPath(p.url);
        return {
          name: p.name.value,
          value: valueText(src.slice(file, p.range)),
          origin: toLoc(p.url, p.range.start),
          overridden: (p.replaces ?? [])
            .filter((r: any) => isFileUrl(r.url))
            .map((r: any) => toLoc(r.url, r.range.start)),
        };
      });
    const compatible = props.find((p) => p.name === "compatible")?.value ?? "";

    nodes[path] = {
      path,
      name: n.fullName ?? n.name,
      labels: n.labels ?? [],
      disabled: !!n.disabled,
      compatible: [...compatible.matchAll(/"([^"]*)"/g)].map((m) => m[1]!),
      binding: key,
      props,
      children: n.childNodes ?? [],
      definitions: (n.nodes ?? []).filter((d: any) => isFileUrl(d.url)).map((d: any) => toLoc(d.url, d.range.start)),
      reg: (n.reg ?? []).map((r: any) => ({ start: words(r.mappedStartAddress ?? r.startAddress), size: words(r.size) })),
      issues: (n.issues ?? []).length,
    };
  }
  // childNodes are names in some versions; normalise to paths
  for (const node of Object.values(nodes)) {
    node.children = node.children
      .map((c) => (c.startsWith("/") ? c : `${node.path === "/" ? "" : node.path}/${c}`))
      .filter((c) => nodes[c]);
  }
  const pins = buildPinMap(nodes);
  const buses = buildBuses(nodes, bindings, pins);
  const header = pinctrlHeader(nodes, src, includePaths);
  const pinCatalog = buildPinCatalog(nodes, header, pins.usages.map((u) => u.pin), bindings);
  const adcPins = esp32AdcPins(header?.file, includePaths);
  return {
    context,
    root: "/",
    nodes,
    bindings,
    pins,
    pinCatalog,
    buses,
    overview: buildOverview(nodes, bindings, pins, buses, pinCatalog, adcPins),
    clocks: buildClocks(nodes),
    interrupts: buildInterrupts(nodes, bindings),
    memoryMap: buildMemoryMap(nodes),
    memory: Object.values(memory?.trees ?? {}).map(memoryTree),
  };
}
