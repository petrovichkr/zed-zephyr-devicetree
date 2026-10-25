// SPDX-License-Identifier: Apache-2.0
//
// Logical pin grid (SPEC 6c, stage 7, D26): ports by rows, pins by columns,
// colour by function class, conflicts in red. A function is moved to another
// pin by dragging its cell, or from the pin panel ("Move to" / "Move here").
// The pins a function can reach are highlighted while dragging.

import type { UiModel } from "../src/ui/model.js";
import { allowedPins } from "../src/ui/pinedits.js";
import type { UiPinUsage } from "../src/ui/pins.js";
import * as api from "./api.js";
import { h } from "./dom.js";
import { basename, locText, locTitle } from "./format.js";
import { usageText } from "./pins.js";
import { applyChange, canEdit, openLoc, rerender, select, state } from "./state.js";

const isDefault = (u: UiPinUsage) => (u.state ?? "default") === "default";
const active = (u: UiPinUsage) => !u.disabled && isDefault(u);

/** Pin -> functions that can be routed to it; computed once per model. */
let inverse: { model: UiModel; map: Map<string, string[]> } | null = null;
function functionsOn(m: UiModel, pin: string): string[] {
  if (inverse?.model !== m) {
    const map = new Map<string, string[]>();
    for (const [fn, pins] of Object.entries(m.pinCatalog.functions)) for (const p of pins) map.set(p, [...(map.get(p) ?? []), fn]);
    inverse = { model: m, map };
  }
  return inverse.map.get(pin) ?? [];
}

function fnClass(fn: string | undefined): string {
  const f = (fn ?? "").toLowerCase();
  if (f === "gpio") return "c-gpio";
  if (/u(s)?art|serial|^u\d|lpuart/.test(f)) return "c-uart";
  if (/i2c|twi/.test(f)) return "c-i2c";
  if (/spi|qspi|octospi/.test(f)) return "c-spi";
  if (/can|twai/.test(f)) return "c-can";
  if (/adc|dac|analog|comp|opamp/.test(f)) return "c-analog";
  if (/tim|pwm|ledc|rmt|mcpwm|pcnt/.test(f)) return "c-timer";
  if (/usb|eth|sdmmc|sdio|i2s|sai/.test(f)) return "c-fast";
  return "c-other";
}

const shortPin = (pin: string): string => /(\d+)$/.exec(pin)?.[1] ?? pin;

async function move(m: UiModel, u: UiPinUsage, to: string): Promise<void> {
  if (!canEdit() || !u.function) return;
  const busy = [...new Set(m.pins.usages.filter((x) => x.pin === to && x.owner !== u.owner && active(x)).map((x) => m.nodes[x.owner]?.name ?? x.owner))];
  const owner = m.nodes[u.owner]?.name ?? u.owner;
  const text = `Move ${u.function} of ${owner} from ${u.pin} to ${to}?\nThe change is written to ${basename(state.overlay)}.${busy.length ? `\n\n${to} is already used by ${busy.join(", ")}: this creates a conflict.` : ""}`;
  if (!confirm(text)) return;
  const ok = await applyChange(
    () => api.movePin({ owner: u.owner, function: u.function!, from: u.pin, to, overlay: state.overlay, force: busy.length > 0 }),
    `${u.function} moved to ${to}`,
    `Moving ${u.function}`,
  );
  if (ok) state.pinFocus = to;
}

/** Usages that can be moved: decoded pinctrl entries and GPIO entries. */
const movable = (u: UiPinUsage) => !!u.function && (u.index !== undefined || !!u.ref || !!u.cell);

// Drag state lives outside `state`: re-rendering during a drag would cancel it.
let dragging: UiPinUsage | null = null;

function cell(m: UiModel, pin: string, conflicts: Set<string>, byPin: Map<string, UiPinUsage[]>): HTMLElement {
  const us = byPin.get(pin) ?? [];
  const main = us.find(active) ?? us.find(isDefault) ?? us[0];
  const reachable = m.pinCatalog.anyPin || m.pinCatalog.vendor === "other" || us.length > 0 || functionsOn(m, pin).length > 0;
  const drag = us.find((u) => active(u) && movable(u)) ?? us.find(movable);
  const cls = [
    "pcell",
    main ? fnClass(main.function) : "",
    main && !us.some(active) ? "idle" : "",
    conflicts.has(pin) ? "conflict" : "",
    reachable ? "" : "na",
    state.pinFocus === pin ? "focus" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const title = [pin, ...us.map((u) => `${u.function ?? "?"} — ${m.nodes[u.owner]?.name ?? u.owner} (${usageText(u)})${u.disabled ? ", disabled" : ""}`), reachable ? "" : "no function can use this pin"]
    .filter(Boolean)
    .join("\n");
  return h(
    "button",
    {
      class: cls,
      title,
      "data-pin": pin,
      draggable: drag && canEdit() ? "true" : undefined,
      onclick: () => {
        state.pinFocus = pin;
        state.fnFilter = "";
        rerender();
      },
      ondragstart: (e: DragEvent) => {
        if (!drag) return;
        dragging = drag;
        e.dataTransfer?.setData("text/plain", pin);
        const ok = new Set(allowedPins(m.pinCatalog, drag.function!));
        for (const el of document.querySelectorAll<HTMLElement>(".pcell")) {
          const p = el.dataset.pin!;
          el.classList.add(p === pin ? "dragging" : ok.has(p) ? (byPin.get(p)?.some(active) ? "drop-busy" : "drop-ok") : "drop-no");
        }
      },
      ondragend: () => {
        dragging = null;
        for (const el of document.querySelectorAll<HTMLElement>(".pcell")) el.classList.remove("dragging", "drop-ok", "drop-busy", "drop-no");
      },
      ondragover: (e: DragEvent) => {
        if (dragging && dragging.pin !== pin && allowedPins(m.pinCatalog, dragging.function!).includes(pin)) e.preventDefault();
      },
      ondrop: (e: DragEvent) => {
        e.preventDefault();
        const u = dragging;
        dragging = null;
        if (u) void move(m, u, pin);
      },
    },
    h("span", { class: "pnum" }, shortPin(pin)),
    h("span", { class: "pfn" }, main?.function ? main.function.slice(0, 9) : ""),
  );
}

function panel(m: UiModel): HTMLElement {
  const pin = state.pinFocus;
  if (!pin) return h("div", { class: "empty" }, "Click a pin to see who uses it and which functions it can take. Drag a used pin onto another one to move its function.");
  const us = m.pins.usages.filter((u) => u.pin === pin);
  const fns = functionsOn(m, pin);
  const q = state.fnFilter.trim().toLowerCase();
  const usedBy = (fn: string) => m.pins.usages.filter((u) => u.function === fn && active(u) && movable(u));
  // functions in use come first: they are the ones that can be moved here
  const shown = fns
    .filter((f) => !q || f.toLowerCase().includes(q))
    .map((f) => [f, usedBy(f).length > 0] as const)
    .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0]))
    .map(([f]) => f);

  const usage = (u: UiPinUsage): HTMLElement => {
    const targets = u.function ? allowedPins(m.pinCatalog, u.function).filter((p) => p !== u.pin) : [];
    return h(
      "li",
      { class: u.disabled ? "muted" : "" },
      h("span", { class: `swatch ${fnClass(u.function)}` }),
      h("span", { class: "mono" }, u.function ?? "?"),
      " ",
      h("button", { class: "link", onclick: () => select(u.owner) }, m.nodes[u.owner]?.name ?? u.owner),
      h("span", { class: "muted" }, ` ${usageText(u)}${u.disabled ? ", disabled" : ""} `),
      h("button", { class: "link mono", title: `Open ${locTitle(u.origin)}`, onclick: () => void openLoc(u.origin) }, locText(u.origin)),
      movable(u) && targets.length
        ? h(
            "select",
            {
              class: "mono",
              disabled: !canEdit(),
              title: canEdit() ? "Move this function to another pin" : "Editing is disabled",
              onchange: (e: Event) => {
                const to = (e.target as HTMLSelectElement).value;
                (e.target as HTMLSelectElement).value = "";
                if (to) void move(m, u, to);
              },
            },
            h("option", { value: "" }, "Move to…"),
            targets.map((p) => {
              const busy = m.pins.usages.some((x) => x.pin === p && x.owner !== u.owner && active(x));
              return h("option", { value: p }, `${p}${busy ? " (used)" : ""}`);
            }),
          )
        : null,
    );
  };

  return h(
    "div",
    { class: "pin-panel", "data-scroll": "pin-panel" },
    h("h2", null, pin, m.pins.conflicts.includes(pin) ? h("span", { class: "badge error" }, "conflict") : null),
    h("h3", null, `Used by (${us.length})`),
    us.length ? h("ul", { class: "usages" }, us.map(usage)) : h("div", { class: "muted" }, "Free"),
    h("h3", null, m.pinCatalog.anyPin ? "Functions" : `Functions this pin can take (${fns.length})`),
    m.pinCatalog.anyPin
      ? h("div", { class: "muted" }, "Any peripheral function can be routed to any pin on this SoC: drag a used pin here or use “Move to”.")
      : fns.length
        ? [
            h("input", {
              type: "search",
              placeholder: "Filter functions",
              "data-key": "fn-filter",
              value: state.fnFilter,
              oninput: (e: Event) => {
                state.fnFilter = (e.target as HTMLInputElement).value;
                rerender();
              },
            }),
            h(
              "ul",
              { class: "fns" },
              shown.slice(0, 200).map((fn) => {
                const owners = usedBy(fn);
                return h(
                  "li",
                  null,
                  h("span", { class: `swatch ${fnClass(fn)}` }),
                  h("span", { class: "mono" }, fn),
                  owners.length
                    ? owners.map((u) =>
                        h(
                          "span",
                          { class: "fn-owner" },
                          h("span", { class: "muted" }, ` on ${u.pin} (${m.nodes[u.owner]?.name ?? u.owner}) `),
                          u.pin === pin
                            ? null
                            : h("button", { disabled: !canEdit(), title: canEdit() ? `Move ${fn} from ${u.pin} to ${pin}` : "Editing is disabled", onclick: () => void move(m, u, pin) }, "Move here"),
                        ),
                      )
                    : h("span", { class: "muted" }, " unused"),
                );
              }),
              shown.length > 200 ? h("li", { class: "muted" }, `… ${shown.length - 200} more, use the filter`) : null,
            ),
          ]
        : h("div", { class: "muted" }, m.pinCatalog.vendor === "esp32" && !m.pinCatalog.source ? "The SoC pinctrl header was not found, functions are unknown." : "No pinctrl function can use this pin."),
    m.pinCatalog.source ? h("div", { class: "muted source" }, "Functions from ", h("button", { class: "link mono", onclick: () => void openLoc({ file: m.pinCatalog.source!, line: 0, character: 0 }) }, basename(m.pinCatalog.source))) : null,
  );
}

export function renderPinGrid(m: UiModel): HTMLElement {
  const conflicts = new Set(m.pins.conflicts);
  const byPin = new Map<string, UiPinUsage[]>();
  for (const u of m.pins.usages) byPin.set(u.pin, [...(byPin.get(u.pin) ?? []), u]);
  const known = new Set(m.pinCatalog.ports.flatMap((p) => p.pins));
  const outside = [...byPin.keys()].filter((p) => !known.has(p));

  const rows: HTMLElement[] = [];
  for (const port of m.pinCatalog.ports) {
    for (let i = 0; i < port.pins.length; i += 16) {
      const chunk = port.pins.slice(i, i + 16);
      const label = m.pinCatalog.vendor === "stm32" ? chunk[0]!.replace(/\d+$/, "") : `${chunk[0]}`;
      rows.push(h("div", { class: "prow" }, h("span", { class: "plabel mono", title: port.name }, label), chunk.map((p) => cell(m, p, conflicts, byPin))));
    }
  }

  return h(
    "div",
    { class: "pin-grid-wrap" },
    h(
      "div",
      { class: "pin-grid", "data-scroll": "pin-grid" },
      rows.length ? rows : h("div", { class: "empty" }, "No GPIO controllers in this context"),
      outside.length ? h("div", { class: "muted outside" }, `Used pins outside the GPIO controllers: ${outside.join(", ")}`) : null,
      h(
        "div",
        { class: "legend" },
        [
          ["c-gpio", "GPIO"],
          ["c-uart", "UART"],
          ["c-i2c", "I2C"],
          ["c-spi", "SPI"],
          ["c-can", "CAN"],
          ["c-analog", "analog"],
          ["c-timer", "timer/PWM"],
          ["c-fast", "USB/SD/I2S"],
          ["c-other", "other"],
        ].map(([c, t]) => h("span", null, h("span", { class: `swatch ${c}` }), t)),
        h("span", null, h("span", { class: "swatch conflict-sw" }), "conflict"),
        h("span", { class: "muted" }, canEdit() ? "drag a used pin to move its function" : "editing is disabled"),
      ),
    ),
    panel(m),
  );
}
