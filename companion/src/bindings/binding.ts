// SPDX-License-Identifier: Apache-2.0
//
// Zephyr binding files: an index of every binding in the workspace (includes are
// resolved by file name across all bindings dirs, as edtlib does) and the
// analysis of one file: positions, include resolution, diagnostics.

import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { isMap, isScalar, isSeq, LineCounter, parseDocument, type Node, type Pair, type YAMLMap } from "yaml";
import { INCLUDE_KEYS, type BindingRules } from "./rules.js";

export interface Pos {
  line: number;
  character: number;
}
export interface Range {
  start: Pos;
  end: Pos;
}
export interface Diagnostic {
  range: Range;
  severity: 1 | 2 | 3;
  message: string;
  source: "zephyr-bindings";
}

export class BindingIndex {
  /** file name -> path; the first bindings dir wins, like edtlib. */
  readonly byName = new Map<string, string>();
  /** compatible -> binding paths */
  readonly byCompatible = new Map<string, string[]>();

  constructor(readonly dirs: string[]) {
    for (const dir of dirs) this.scan(dir);
  }

  private scan(dir: string): void {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const path = join(dir, e.name);
      if (e.isDirectory()) this.scan(path);
      else if (/\.ya?ml$/.test(e.name)) {
        if (!this.byName.has(e.name)) this.byName.set(e.name, path);
        const compatible = /^compatible:\s*["']?([^"'\s#]+)/m.exec(safeRead(path))?.[1];
        if (compatible) this.byCompatible.set(compatible, [...(this.byCompatible.get(compatible) ?? []), path]);
      }
    }
  }

  isBindingFile(file: string): boolean {
    return this.dirs.some((d) => file.startsWith(d + "/") || file.startsWith(d + "\\")) || /[\\/]dts[\\/]bindings[\\/]/.test(file);
  }
}

function safeRead(file: string): string {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

export interface IncludeRef {
  name: string;
  range: Range;
  allow?: string[];
  block?: string[];
}

export interface PropDef {
  name: string;
  file: string;
  range: Range; // of the key
  options: Record<string, unknown>;
}

export interface Analysis {
  diagnostics: Diagnostic[];
  includes: IncludeRef[];
  /** Own properties (top level `properties:`), with key positions. */
  props: PropDef[];
  compatible?: { value: string; range: Range };
  /** Find what the cursor is on. */
  at(pos: Pos): Target | undefined;
}

export type Target =
  | { kind: "include"; name: string; range: Range }
  | { kind: "compatible"; value: string; range: Range }
  | { kind: "property"; name: string; range: Range }
  | { kind: "key"; path: string[]; range: Range }
  | { kind: "type"; range: Range };

const asList = (v: unknown): string[] | undefined => (Array.isArray(v) ? v.map(String) : undefined);

export function analyze(file: string, text: string, index: BindingIndex, rules: BindingRules): Analysis {
  const lc = new LineCounter();
  const doc = parseDocument(text, { lineCounter: lc, keepSourceTokens: false, uniqueKeys: true });
  const pos = (offset: number): Pos => {
    const p = lc.linePos(offset);
    return { line: p.line - 1, character: p.col - 1 };
  };
  const rangeOf = (n: Node | null | undefined): Range => {
    const r = n?.range ?? [0, 0, 0];
    return { start: pos(r[0]), end: pos(r[1]) };
  };
  const diagnostics: Diagnostic[] = [];
  const report = (n: Node | null | undefined, message: string, severity: 1 | 2 | 3 = 1) =>
    diagnostics.push({ range: rangeOf(n), severity, message, source: "zephyr-bindings" });
  const targets: Target[] = [];

  for (const e of doc.errors) {
    diagnostics.push({ range: { start: pos(e.pos[0]), end: pos(e.pos[1]) }, severity: 1, message: e.message, source: "zephyr-bindings" });
  }

  const includes: IncludeRef[] = [];
  const props: PropDef[] = [];
  let compatible: Analysis["compatible"];
  const root = doc.contents;
  if (!isMap(root)) {
    if (root) report(root, "a binding must be a mapping");
    return { diagnostics, includes, props, compatible, at: () => undefined };
  }

  const checkInclude = (n: unknown) => {
    const add = (name: Node, extra: Partial<IncludeRef> = {}) => {
      const value = String((name as any).value);
      const ref = { name: value, range: rangeOf(name), ...extra };
      includes.push(ref);
      targets.push({ kind: "include", name: value, range: ref.range });
      if (!index.byName.has(value)) report(name, `included binding '${value}' not found in any bindings directory`);
    };
    if (isScalar(n)) add(n);
    else if (isSeq(n)) {
      for (const item of n.items) {
        if (isScalar(item)) add(item);
        else if (isMap(item)) {
          const name = item.get("name", true);
          for (const pair of item.items as Pair<Node, Node>[]) {
            const key = String((pair.key as any)?.value);
            if (!INCLUDE_KEYS.has(key)) report(pair.key, `unknown include key '${key}', expected one of ${[...INCLUDE_KEYS].join(", ")}`);
          }
          const allow = asList(item.toJSON()["property-allowlist"]);
          const block = asList(item.toJSON()["property-blocklist"]);
          if (allow && block) report(item, "include should not specify both 'property-allowlist:' and 'property-blocklist:'");
          if (isScalar(name)) add(name, { allow, block });
          else report(item, "include entry needs 'name:'");
        } else report(item as Node, "include entries are file names or maps with 'name:'");
      }
    } else if (n) report(n as Node, "'include:' must be a string or a list");
  };

  const checkProperties = (map: unknown, own: boolean) => {
    if (!isMap(map)) return;
    for (const pair of (map as YAMLMap<Node, Node>).items) {
      const name = String((pair.key as any)?.value);
      if (own) props.push({ name, file, range: rangeOf(pair.key), options: (pair.value as any)?.toJSON?.() ?? {} });
      targets.push({ kind: "property", name, range: rangeOf(pair.key) });
      if (!isMap(pair.value)) {
        if (pair.value) report(pair.value, `'${name}': property options must be a mapping`);
        continue;
      }
      for (const opt of (pair.value as YAMLMap<Node, Node>).items) {
        const key = String((opt.key as any)?.value);
        targets.push({ kind: "key", path: ["properties", name, key], range: rangeOf(opt.key) });
        if (!rules.propKeys.has(key)) report(opt.key, `unknown key '${key}' in '${name}', expected one of ${[...rules.propKeys].join(", ")}`);
        if (key === "type") {
          targets.push({ kind: "type", range: rangeOf(opt.value) });
          const t = String((opt.value as any)?.value);
          if (!rules.types.has(t)) report(opt.value, `'${t}' is not a valid type, expected one of ${[...rules.types].join(", ")}`);
        }
      }
      const o = pair.value.toJSON() as Record<string, unknown>;
      if (o["specifier-space"] !== undefined && o.type !== undefined && o.type !== "phandle-array") {
        report(pair.key, `'specifier-space' in '${name}' is only allowed for type phandle-array`);
      }
      if (o.deprecated && o.required) report(pair.key, `'${name}' is both deprecated and required`, 2);
    }
  };

  const checkLevel = (map: YAMLMap<Node, Node>, top: boolean) => {
    for (const pair of map.items) {
      const key = String((pair.key as any)?.value);
      targets.push({ kind: "key", path: [key], range: rangeOf(pair.key) });
      if (key !== "include" && !rules.topKeys.has(key) && !key.endsWith("-cells")) {
        report(pair.key, `unknown key '${key}', expected one of ${[...rules.topKeys].join(", ")}, include or *-cells`);
      }
      if (key === "include") checkInclude(pair.value);
      if (key === "properties") checkProperties(pair.value, top);
      if (key === "child-binding" && isMap(pair.value)) checkLevel(pair.value as YAMLMap<Node, Node>, false);
      if (key === "compatible" && top && isScalar(pair.value)) {
        compatible = { value: String(pair.value.value), range: rangeOf(pair.value) };
        targets.push({ kind: "compatible", ...compatible });
      }
    }
  };
  checkLevel(root as YAMLMap<Node, Node>, true);

  // A property may omit `type:` when an include provides it (edtlib checks the
  // merged binding). Fragments without `compatible` get their types from what
  // includes them, and a missing include would only cause false alarms.
  if (compatible && includes.every((i) => index.byName.has(i.name))) {
    const merged = resolveProperties(includes, index);
    for (const p of props) {
      if (p.options.type === undefined && !merged.get(p.name)?.options.type) {
        diagnostics.push({ range: p.range, severity: 1, message: `missing 'type:' for '${p.name}'`, source: "zephyr-bindings" });
      }
    }
  }

  const inside = (r: Range, p: Pos) =>
    (p.line > r.start.line || (p.line === r.start.line && p.character >= r.start.character)) &&
    (p.line < r.end.line || (p.line === r.end.line && p.character <= r.end.character));
  return {
    diagnostics,
    includes,
    props,
    compatible,
    at: (p) => targets.filter((t) => inside(t.range, p)).at(-1),
  };
}

/** Properties a set of includes contributes, recursively, honouring allow/block lists. */
export function resolveProperties(includes: IncludeRef[], index: BindingIndex, depth = 0, seen = new Set<string>()): Map<string, PropDef> {
  const out = new Map<string, PropDef>();
  if (depth > 16) return out;
  for (const inc of includes) {
    const path = index.byName.get(inc.name);
    if (!path || seen.has(path)) continue;
    const doc = parseDocument(safeRead(path)).toJSON() ?? {};
    const nested: IncludeRef[] = [];
    const raw = doc.include;
    for (const item of raw === undefined ? [] : [raw].flat()) {
      if (typeof item === "string") nested.push({ name: item, range: zero });
      else if (item?.name) nested.push({ name: item.name, range: zero, allow: asList(item["property-allowlist"]), block: asList(item["property-blocklist"]) });
    }
    const all = new Map([...resolveProperties(nested, index, depth + 1, new Set([...seen, path]))]);
    for (const [name, options] of Object.entries(doc.properties ?? {})) {
      const prev = all.get(name);
      all.set(name, { name, file: path, range: zero, options: { ...(prev?.options ?? {}), ...(options as object) } });
    }
    for (const [name, def] of all) {
      if (inc.allow && !inc.allow.includes(name)) continue;
      if (inc.block?.includes(name)) continue;
      const prev = out.get(name);
      out.set(name, prev ? { ...def, options: { ...prev.options, ...def.options } } : def);
    }
  }
  return out;
}

const zero: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } };

export const bindingName = (file: string) => basename(file);
