// SPDX-License-Identifier: Apache-2.0

import type { Loc } from "../src/ui/model.js";

export const basename = (f: string): string => f.split(/[\\/]/).pop() ?? f;

/** Last `n` path segments, for compact overlay labels. */
export const tail = (f: string, n = 3): string => {
  const parts = f.split(/[\\/]/).filter(Boolean);
  return (parts.length > n ? "…/" : "") + parts.slice(-n).join("/");
};

export const locText = (l: Loc): string => `${basename(l.file)}:${l.line + 1}`;
export const locTitle = (l: Loc): string => `${l.file}:${l.line + 1}:${l.character + 1}`;

export const hex = (n: number): string => "0x" + n.toString(16).padStart(8, "0");

export function humanSize(n: number): string {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${i === 0 ? v : Number(v.toFixed(2))} ${units[i]}`;
}

/** Plain text -> DTS string literal; already quoted text is kept. */
export function quote(s: string): string {
  if (/^".*"$/s.test(s)) return s;
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** `42` -> `<42>`; text already in angle brackets is kept. */
export const cells = (s: string): string => (s.trim().startsWith("<") ? s.trim() : `<${s.trim()}>`);

export function enumValue(type: string, v: string | number): string {
  if (type === "STRING" || type === "STRINGLIST") return quote(String(v));
  if (type === "U32" || type === "U64") return `<${v}>`;
  return String(v);
}
