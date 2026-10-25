// SPDX-License-Identifier: Apache-2.0
//
// Minimal SVG element builder for the hand-drawn diagrams (D29).

const SVG = "http://www.w3.org/2000/svg";
export function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...children: (SVGElement | string | null)[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v as EventListener);
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null) el.append(typeof c === "string" ? document.createTextNode(c) : c);
  return el;
}

export const clip = (t: string, n: number): string => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
