// SPDX-License-Identifier: Apache-2.0
//
// Catalog of device bindings for "Add device" (ARCHITECTURE D30), from
// dts-lsp's `devicetree/zephyrTypeBindings`. That payload is large (tens of MB,
// includes already merged), so only what the form needs is kept. dts-lsp drops
// an inherited `on-bus:`; the buses are then taken from every included
// `<bus>-device` binding (i2c-device.yaml, mipi-dbi-device.yaml, ...).

export interface UiCatalogProp {
  name: string;
  /** Zephyr type: int, array, string, boolean, phandle-array, ... */
  type: string;
  enum?: (string | number)[];
  default?: unknown;
  description?: string;
}

export interface UiCatalogEntry {
  compatible: string;
  file: string;
  description?: string;
  /** Required properties the form asks for (compatible, reg and status are written anyway). */
  required: UiCatalogProp[];
}

/** Written by the form itself, never asked for. */
const IMPLICIT = new Set(["compatible", "reg", "status"]);

export function bindingBuses(b: { "on-bus"?: string; extends?: string[] }): string[] {
  if (b["on-bus"]) return [b["on-bus"]];
  return (b.extends ?? []).map((e) => /^(.+)-device$/.exec(e)?.[1]).filter((x): x is string => !!x);
}

/** Device bindings by bus type, sorted by compatible. */
export function buildCatalog(raw: any[]): Record<string, UiCatalogEntry[]> {
  const seen = new Set<string>();
  const out: Record<string, UiCatalogEntry[]> = {};
  for (const b of raw) {
    const buses = b?.compatible && !b.isChildBinding ? bindingBuses(b) : [];
    const key = `${b?.compatible}\0${b?.filePath}`;
    if (!buses.length || seen.has(key)) continue;
    seen.add(key);
    const entry: UiCatalogEntry = {
      compatible: b.compatible,
      file: b.filePath,
      description: typeof b.description === "string" ? b.description.trim() : undefined,
      required: Object.entries<any>(b.properties ?? {})
        .filter(([name, p]) => p?.required && !IMPLICIT.has(name) && !p.deprecated)
        .map(([name, p]) => ({
          name,
          type: p.type ?? "unknown",
          enum: Array.isArray(p.enum) ? p.enum : undefined,
          default: p.default,
          description: typeof p.description === "string" ? p.description.trim() : undefined,
        })),
    };
    for (const bus of new Set(buses)) (out[bus] ??= []).push(entry);
  }
  for (const list of Object.values(out)) list.sort((a, b) => a.compatible.localeCompare(b.compatible));
  return out;
}
