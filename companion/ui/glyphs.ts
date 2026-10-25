// SPDX-License-Identifier: Apache-2.0
//
// Hand-drawn glyphs for LEDs, keys and GPIO flags (ARCHITECTURE D29).
// Strokes only, on currentColor and theme tokens, so both themes work; every
// glyph carries a <title>, and meaning is never colour alone.

import type { UiGpioFlags } from "../src/ui/pins.js";
import { h } from "./dom.js";
import { s } from "./svg.js";

/** `Active: low · Pull: up · Drive: open drain · NRF_GPIO_DRIVE_H0H1` */
export function flagsText(f: UiGpioFlags | undefined): string {
  if (!f) return "";
  return [
    `Active: ${f.activeLow ? "low" : "high"}`,
    f.pull ? `Pull: ${f.pull}` : "",
    f.drive ? `Drive: ${f.drive.replace("-", " ")}` : "",
    ...f.extra,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Short vendor drive/speed tag: NRF_GPIO_DRIVE_H0H1 -> H0H1, STM32_GPIO_HIGH_SPEED -> HS, ESP32_GPIO_DS_ALT -> DS. */
const extraTag = (x: string): string =>
  /^NRF_GPIO_DRIVE_(\w+)$/.exec(x)?.[1] ??
  { STM32_GPIO_LOW_SPEED: "LS", STM32_GPIO_MEDIUM_SPEED: "MS", STM32_GPIO_HIGH_SPEED: "HS", STM32_GPIO_VERY_HIGH_SPEED: "VHS", GPIO_INT_WAKEUP: "WKUP", STM32_GPIO_WKUP: "WKUP" }[x] ??
  (/^ESP32_GPIO_DS_/.test(x) ? "DS" : x.length <= 5 ? x : `${x.slice(0, 4)}…`);

/** Badges for HTML views (pin panel, details, grid): ○ active low, ↑/↓ pull, OD/OS, vendor tags. */
export function flagBadges(f: UiGpioFlags | undefined, compact = false): HTMLElement | null {
  if (!f) return null;
  const items: [string, string][] = [];
  if (f.activeLow) items.push(["○", "Active: low"]);
  if (f.pull) items.push([f.pull === "up" ? "↑" : "↓", `Pull: ${f.pull}`]);
  if (f.drive) items.push([f.drive === "open-drain" ? "OD" : "OS", `Drive: ${f.drive.replace("-", " ")}`]);
  if (!compact) for (const x of f.extra) items.push([extraTag(x), x]);
  if (!items.length) return null;
  return h("span", { class: "flags", title: flagsText(f) }, items.map(([t, title]) => h("span", { class: "flag", title }, t)));
}

/** Ground: three shrinking bars below (x, y). */
const ground = (x: number, y: number): SVGElement[] => [
  s("line", { x1: x, y1: y - 3, x2: x, y2: y }),
  s("line", { x1: x - 4, y1: y, x2: x + 4, y2: y }),
  s("line", { x1: x - 2.5, y1: y + 2, x2: x + 2.5, y2: y + 2 }),
  s("line", { x1: x - 1, y1: y + 4, x2: x + 1, y2: y + 4 }),
];
/** Supply: a bar above (x, y). */
const supply = (x: number, y: number): SVGElement[] => [s("line", { x1: x, y1: y + 3, x2: x, y2: y }), s("line", { x1: x - 4, y1: y, x2: x + 4, y2: y })];

/**
 * LED, 30x14 starting at (x, y) = left middle: the pin side on the left.
 * Active high drives the anode, the cathode goes to ground; active low sinks
 * the cathode, the anode goes to the supply (drawn on the right either way).
 */
export function ledGlyph(x: number, y: number, activeLow: boolean, pwm?: { inverted: boolean }): SVGElement {
  const d = x + 10; // diode start
  return s(
    "g",
    { class: "glyph" },
    s("title", {}, `LED, ${pwm ? `PWM, polarity ${pwm.inverted ? "inverted" : "normal"}` : `active ${activeLow ? "low: pin sinks current, anode to supply" : "high: pin drives the anode, cathode to ground"}`}`),
    pwm
      ? // meander instead of a plain wire
        s("path", { d: pwm.inverted ? `M${x} ${y - 3}h2v6h3v-6h3v6h2` : `M${x} ${y + 3}h2v-6h3v6h3v-6h2` })
      : s("line", { x1: x, y1: y, x2: d, y2: y }),
    // active high: anode on the pin side, the triangle points away; active low: cathode bar on the pin side
    activeLow && !pwm
      ? s("path", { d: `M${d} ${y - 4}v8M${d} ${y}L${d + 8} ${y - 4.5}v9Z` })
      : s("path", { d: `M${d} ${y - 4.5}v9L${d + 8} ${y}ZM${d + 8} ${y - 4}v8` }),
    s("path", { class: "light", d: `M${d + 3} ${y - 6}l3 -3m-1.5 0h1.5v1.5M${d + 6} ${y - 6}l3 -3m-1.5 0h1.5v1.5` }),
    s("line", { x1: d + 8, y1: y, x2: x + 24, y2: y }),
    ...(activeLow && !pwm ? supply(x + 24, y - 7) : ground(x + 24, y + 3)).map((e) => (e.setAttribute("class", "rail"), e)),
  );
}

/** Push button, 30x14 from (x, y): contacts with a plunger; the other side to ground (active low) or supply. */
export function keyGlyph(x: number, y: number, activeLow: boolean): SVGElement {
  return s(
    "g",
    { class: "glyph" },
    s("title", {}, `Key, active ${activeLow ? "low: pressed pulls the pin to ground" : "high: pressed pulls the pin to supply"}`),
    s("path", { d: `M${x} ${y}h8M${x + 8} ${y}v-1M${x + 18} ${y}v-1M${x + 18} ${y}h6M${x + 7} ${y - 4}h12M${x + 13} ${y - 4}v-3M${x + 10} ${y - 7}h6` }),
    s("circle", { cx: x + 8, cy: y, r: 1 }),
    s("circle", { cx: x + 18, cy: y, r: 1 }),
    ...(activeLow ? ground(x + 24, y + 3) : supply(x + 24, y - 7)).map((e) => (e.setAttribute("class", "rail"), e)),
  );
}

/** SVG flag tags after a name: ↑/↓, OD/OS; active low is the bubble on the lead. */
export function flagTags(f: UiGpioFlags | undefined): string {
  if (!f) return "";
  return [f.pull === "up" ? "↑" : f.pull === "down" ? "↓" : "", f.drive === "open-drain" ? "OD" : f.drive === "open-source" ? "OS" : "", ...f.extra.map(extraTag)].filter(Boolean).join(" ");
}
