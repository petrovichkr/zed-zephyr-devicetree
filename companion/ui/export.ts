// SPDX-License-Identifier: Apache-2.0
//
// Saving a diagram as a standalone SVG file (ARCHITECTURE, visual editor). The diagrams
// are styled by classes and theme tokens, so the computed style of every
// element is inlined into a copy; the file then looks the same outside the
// editor, in the theme it was exported from.

import { h } from "./dom.js";
import { saveFile } from "./host.js";

const PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-opacity",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-anchor",
  "letter-spacing",
  "text-transform",
];

/** A self-contained copy of `svg` with inline styles and a background. */
export function standaloneSvg(svg: SVGSVGElement): string {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const src = [svg, ...svg.querySelectorAll("*")];
  const dst = [copy, ...copy.querySelectorAll("*")];
  src.forEach((el, i) => {
    const cs = getComputedStyle(el);
    const out = dst[i] as SVGElement;
    out.setAttribute("style", PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(";"));
    out.removeAttribute("class");
  });
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", getComputedStyle(document.body).backgroundColor);
  copy.insertBefore(bg, copy.firstChild);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(copy)}\n`;
}

export function downloadSvg(svg: SVGSVGElement | null, name: string): void {
  if (!svg) return;
  const file = `${name.replace(/[^\w.-]+/g, "_")}.svg`;
  if (saveFile(file, standaloneSvg(svg))) return;
  const url = URL.createObjectURL(new Blob([standaloneSvg(svg)], { type: "image/svg+xml" }));
  const a = h("a", { href: url, download: file });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "Export SVG" button for the diagram matched by `selector` at click time. */
export const exportButton = (selector: string, name: () => string): HTMLElement =>
  h("button", { class: "small", title: "Save this diagram as an SVG file", onclick: () => downloadSvg(document.querySelector<SVGSVGElement>(selector), name()) }, "Export SVG");
