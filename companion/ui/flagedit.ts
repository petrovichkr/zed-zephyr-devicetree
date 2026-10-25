// SPDX-License-Identifier: Apache-2.0
//
// Editing the flags of one `*-gpios` entry (stage 9): click the badges, change
// active level / pull / drive, and the flags cell is rewritten in the overlay.
// Vendor flags (extra) are kept as written.

import { setGpioFlags } from "../src/ui/pinedits.js";
import type { UiGpioFlags, UiPinUsage } from "../src/ui/pins.js";
import { h } from "./dom.js";
import { flagBadges } from "./glyphs.js";
import { applyEdit, canEdit, rerender, state } from "./state.js";

export const flagKey = (u: UiPinUsage) => `${u.owner}\0${u.property}\0${u.index}`;

/** Badges that open the editor on click, or the editor itself when it is open. */
export function editableFlags(u: UiPinUsage): HTMLElement | null {
  if (!u.gpioFlags || u.index === undefined || u.hog) return flagBadges(u.gpioFlags);
  const key = flagKey(u);
  if (state.flagEdit?.key !== key) {
    const badges = flagBadges(u.gpioFlags) ?? h("span", { class: "flags" }, h("span", { class: "flag muted" }, "active high"));
    return h(
      "button",
      {
        class: "flag-btn",
        title: canEdit() ? `${badges.title || "Active: high"}\nclick: edit flags` : "Editing is disabled",
        disabled: !canEdit(),
        onclick: () => {
          state.flagEdit = { key, draft: { ...u.gpioFlags!, extra: [...u.gpioFlags!.extra] } };
          rerender();
        },
      },
      badges,
    );
  }
  const d = state.flagEdit.draft;
  const set = (patch: Partial<UiGpioFlags>) => {
    Object.assign(d, patch);
    rerender();
  };
  const apply = async () => {
    const prop = state.model?.nodes[u.owner]?.props.find((p) => p.name === u.property);
    const value = prop && setGpioFlags(prop.value, u.index!, d);
    if (!value) return;
    if (await applyEdit(u.owner, u.property, value)) state.flagEdit = null;
  };
  return h(
    "span",
    { class: "flag-editor" },
    h("label", { class: "check" }, h("input", { type: "checkbox", checked: d.activeLow, onchange: (e: Event) => set({ activeLow: (e.target as HTMLInputElement).checked }) }), "active low"),
    h(
      "select",
      { value: d.pull ?? "", onchange: (e: Event) => set({ pull: ((e.target as HTMLSelectElement).value || undefined) as UiGpioFlags["pull"] }) },
      h("option", { value: "" }, "no pull"),
      h("option", { value: "up" }, "pull up"),
      h("option", { value: "down" }, "pull down"),
    ),
    h(
      "select",
      { value: d.drive ?? "", onchange: (e: Event) => set({ drive: ((e.target as HTMLSelectElement).value || undefined) as UiGpioFlags["drive"] }) },
      h("option", { value: "" }, "push-pull"),
      h("option", { value: "open-drain" }, "open drain"),
      h("option", { value: "open-source" }, "open source"),
    ),
    d.extra.length ? h("span", { class: "muted mono" }, ` + ${d.extra.join(" | ")}`) : null,
    h("button", { class: "primary", disabled: !canEdit(), title: "Rewrites the flags cell of this entry in the overlay", onclick: () => void apply() }, "Apply"),
    h("button", { onclick: () => ((state.flagEdit = null), rerender()) }, "Cancel"),
  );
}
