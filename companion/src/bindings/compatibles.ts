// SPDX-License-Identifier: Apache-2.0
//
// compatible string -> places in devicetree sources. Built once by walking the
// workspace, then kept fresh by re-reading only files whose mtime changed, so
// repeated "find references" on a binding stays cheap (16k files on the
// reference workspace).

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SKIP_DIRS = /^(\.|node_modules$|build|twister|__pycache__$)/;
const DTS_FILE = /\.(dts|dtsi|overlay|dtso)$/;

export interface CompatibleUse {
  file: string;
  line: number;
  start: number;
  end: number;
}

interface Entry {
  mtimeMs: number;
  uses: Map<string, CompatibleUse[]>;
}

export function* walkDts(dir: string, depth = 0): Generator<string> {
  if (depth > 12) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.test(e.name)) yield* walkDts(join(dir, e.name), depth + 1);
    } else if (DTS_FILE.test(e.name)) yield join(dir, e.name);
  }
}

/** Every quoted string on `compatible = ...` lines of one file. */
export function scanCompatibles(file: string, text: string): Map<string, CompatibleUse[]> {
  const uses = new Map<string, CompatibleUse[]>();
  text.split(/\r?\n/).forEach((line, i) => {
    if (!/\bcompatible\s*=/.test(line)) return;
    for (const m of line.matchAll(/"([^"]+)"/g)) {
      const start = m.index!;
      const list = uses.get(m[1]!) ?? [];
      list.push({ file, line: i, start, end: start + m[0].length });
      uses.set(m[1]!, list);
    }
  });
  return uses;
}

export class CompatibleIndex {
  private files = new Map<string, Entry>();

  constructor(private readonly roots: string[]) {}

  /** Walks the roots (cheap), re-reads changed files only. */
  refresh(): { files: number; reread: number } {
    const seen = new Set<string>();
    let reread = 0;
    for (const root of this.roots) {
      for (const file of walkDts(root)) {
        if (seen.has(file)) continue;
        seen.add(file);
        let mtimeMs: number;
        try {
          mtimeMs = statSync(file).mtimeMs;
        } catch {
          continue;
        }
        if (this.files.get(file)?.mtimeMs === mtimeMs) continue;
        reread++;
        let text = "";
        try {
          text = readFileSync(file, "utf8");
        } catch {
          // unreadable files simply contribute nothing
        }
        this.files.set(file, { mtimeMs, uses: scanCompatibles(file, text) });
      }
    }
    for (const file of this.files.keys()) if (!seen.has(file)) this.files.delete(file);
    return { files: seen.size, reread };
  }

  find(compatible: string): CompatibleUse[] {
    return [...this.files.values()].flatMap((e) => e.uses.get(compatible) ?? []);
  }
}
