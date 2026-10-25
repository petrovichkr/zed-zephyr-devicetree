// SPDX-License-Identifier: Apache-2.0

import type { UiModel } from "../src/ui/model.js";
import type { UiPinUsage } from "../src/ui/pins.js";
import { h } from "./dom.js";
import { locText, locTitle } from "./format.js";
import { openLoc, rerender, select, state } from "./state.js";

export const usageText = (u: UiPinUsage): string => (u.state ? `${u.property} · ${u.state}` : u.property);
const nonDefault = (u: UiPinUsage): boolean => !!u.state && u.state !== "default";

function groups(usages: UiPinUsage[]): [string, UiPinUsage[]][] {
  const out: [string, UiPinUsage[]][] = [];
  for (const u of usages) {
    const last = out[out.length - 1];
    if (last && last[0] === u.pin) last[1].push(u);
    else out.push([u.pin, [u]]);
  }
  return out;
}

function ownerCell(m: UiModel, path: string): HTMLElement {
  const node = m.nodes[path];
  return h(
    "button",
    { class: "link owner", title: `Select ${path}`, onclick: () => select(path, { reveal: true, tab: "tree" }) },
    node?.labels.map((l) => h("span", { class: "label" }, `${l}: `)),
    node?.name ?? path,
  );
}

export function renderPins(m: UiModel): HTMLElement {
  const { usages, conflicts, unknown } = m.pins;
  const conflict = new Set(conflicts);
  const q = state.pinFilter.trim().toLowerCase();
  const all = groups(usages);
  const shown = all.filter(
    ([pin, us]) =>
      (!state.pinOnlyConflicts || conflict.has(pin)) &&
      (!q ||
        pin.toLowerCase().includes(q) ||
        us.some((u) => {
          const n = m.nodes[u.owner];
          return (
            (u.function ?? "").toLowerCase().includes(q) ||
            u.owner.toLowerCase().includes(q) ||
            !!n?.labels.some((l) => l.toLowerCase().includes(q))
          );
        })),
  );

  const rows: HTMLElement[] = [];
  for (const [pin, us] of shown) {
    const cls = `${conflict.has(pin) ? " conflict" : ""}${pin === state.pinFocus ? " focus" : ""}`;
    us.forEach((u, i) =>
      rows.push(
        h(
          "tr",
          { class: `${i === 0 ? "first" : "cont"}${cls}${u.disabled ? " disabled" : ""}${nonDefault(u) ? " nondefault" : ""}`, "data-pin": pin },
          i === 0
            ? h("td", { class: "pin mono", rowspan: us.length }, pin, conflict.has(pin) ? h("span", { class: "badge error", title: "Used by more than one enabled owner" }, "conflict") : null)
            : null,
          h("td", { class: "mono" }, u.function ?? ""),
          h("td", null, ownerCell(m, u.owner), u.disabled ? h("span", { class: "badge muted" }, "disabled") : null),
          h("td", { class: "mono usage" }, usageText(u)),
          h("td", null, h("button", { class: "link mono", title: `Open ${locTitle(u.origin)}`, onclick: () => void openLoc(u.origin) }, locText(u.origin))),
        ),
      ),
    );
  }

  const view = h(
    "div",
    { class: "pins", "data-scroll": "pins" },
    h(
      "div",
      { class: "pin-bar" },
      h("input", {
        type: "search",
        placeholder: "Filter pin, function, owner",
        "data-key": "pin-filter",
        value: state.pinFilter,
        oninput: (e: Event) => {
          state.pinFilter = (e.target as HTMLInputElement).value;
          rerender();
        },
        onkeydown: (e: KeyboardEvent) => {
          if (e.key === "Escape") {
            state.pinFilter = "";
            rerender();
          }
        },
      }),
      h(
        "label",
        { class: "check" },
        h("input", {
          type: "checkbox",
          "data-key": "pin-only-conflicts",
          checked: state.pinOnlyConflicts,
          disabled: !conflicts.length && !state.pinOnlyConflicts,
          onchange: (e: Event) => {
            state.pinOnlyConflicts = (e.target as HTMLInputElement).checked;
            rerender();
          },
        }),
        "only conflicts",
      ),
      h(
        "span",
        { class: conflicts.length ? "summary error-text" : "summary muted" },
        `${all.length} pins, ${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"}`,
        shown.length !== all.length ? ` (${shown.length} shown)` : "",
      ),
    ),
    usages.length
      ? h(
          "table",
          { class: "pin-table" },
          h("thead", null, h("tr", null, h("th", null, "Pin"), h("th", null, "Function"), h("th", null, "Owner"), h("th", null, "Property"), h("th", null, "Source"))),
          h("tbody", null, rows.length ? rows : h("tr", null, h("td", { colspan: 5, class: "muted" }, "No matching pins"))),
        )
      : h("div", { class: "empty" }, "No pin assignments found in this context"),
    unknown.length
      ? h(
          "details",
          {
            class: "unknown",
            open: state.unknownOpen,
            ontoggle: (e: Event) => void (state.unknownOpen = (e.target as HTMLDetailsElement).open),
          },
          h("summary", null, `Not decoded (${unknown.length})`),
          h(
            "table",
            null,
            h("thead", null, h("tr", null, h("th", null, "Owner"), h("th", null, "Property"), h("th", null, "Value"))),
            h(
              "tbody",
              null,
              unknown.map((u) => h("tr", null, h("td", null, ownerCell(m, u.owner)), h("td", { class: "mono" }, u.property), h("td", null, h("code", null, u.value)))),
            ),
          ),
        )
      : null,
  );

  if (state.pinScroll) {
    state.pinScroll = false;
    requestAnimationFrame(() => view.querySelector(`tr[data-pin="${CSS.escape(state.pinFocus)}"]`)?.scrollIntoView({ block: "center" }));
  }
  return view;
}
