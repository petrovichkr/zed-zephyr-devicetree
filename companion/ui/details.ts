// SPDX-License-Identifier: Apache-2.0

import type { Loc, UiBinding, UiBindingProp, UiModel, UiNode, UiProp } from "../src/ui/model.js";
import { h } from "./dom.js";
import { basename, cells, enumValue, locText, locTitle, quote } from "./format.js";
import { editableFlags } from "./flagedit.js";
import { busSection } from "./buses.js";
import { usageText } from "./pins.js";
import { applyEdit, canEdit, CUSTOM, emptyAdd, openLoc, rerender, select, showPin, state } from "./state.js";

const locLink = (l: Loc, text = locText(l)): HTMLElement =>
  h("button", { class: "link mono", title: `Open ${locTitle(l)}`, onclick: () => void openLoc(l) }, text);

const firstLine = (s: string | undefined): string => (s ?? "").trim().split(/\n/)[0] ?? "";

function propTitle(bp: UiBindingProp | undefined): string | undefined {
  if (!bp) return undefined;
  const parts = [`${bp.type}${bp.required ? ", required" : ""}`];
  if (bp.enum) parts.push(`one of: ${bp.enum.join(", ")}`);
  if (bp.description) parts.push(bp.description.trim());
  return parts.join("\n");
}

function typeTag(bp: UiBindingProp | undefined): HTMLElement | null {
  if (!bp) return null;
  return h("span", { class: `type${bp.required ? " required" : ""}`, title: propTitle(bp) }, bp.type.toLowerCase(), bp.required ? "*" : "");
}

function statusButton(node: UiNode): HTMLElement {
  const enable = node.disabled;
  return h(
    "button",
    {
      class: enable ? "primary" : "",
      disabled: !canEdit(),
      title: canEdit() ? `Write status = ${enable ? '"okay"' : '"disabled"'} to the target overlay` : "Editing is disabled",
      onclick: () => void applyEdit(node.path, "status", enable ? '"okay"' : '"disabled"'),
    },
    enable ? "Enable (okay)" : "Disable",
  );
}

function valueEditor(node: UiNode, p: UiProp): HTMLElement {
  const ed = state.editing!;
  const multiline = ed.text.includes("\n");
  const apply = async (): Promise<void> => {
    if (await applyEdit(node.path, p.name, ed.text.trim() === "" ? true : ed.text.trim())) {
      state.editing = null;
      rerender();
    }
  };
  const cancel = (): void => {
    state.editing = null;
    rerender();
  };
  const attrs = {
    class: "mono",
    "data-key": `edit:${p.name}`,
    value: ed.text,
    spellcheck: "false",
    oninput: (e: Event) => void (ed.text = (e.target as HTMLInputElement).value),
    onkeydown: (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
      else if (e.key === "Enter" && (!multiline || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void apply();
      }
    },
  };
  return h(
    "div",
    { class: "editor" },
    multiline ? h("textarea", { ...attrs, rows: Math.min(8, ed.text.split("\n").length) }) : h("input", { ...attrs, type: "text" }),
    h("button", { class: "primary", disabled: !canEdit(), onclick: () => void apply() }, "Apply"),
    h("button", { onclick: cancel }, "Cancel"),
  );
}

/** Flag badges of every entry of a `*-gpios` property, with the pin each entry uses. */
function gpioFlagBadges(node: UiNode, p: UiProp): HTMLElement | null {
  if (!/(^|-)gpios$/.test(p.name) || !state.model) return null;
  const us = state.model.pins.usages.filter((u) => u.owner === node.path && u.property === p.name && u.gpioFlags);
  if (!us.length) return null;
  return h(
    "div",
    { class: "gpio-flags" },
    us.map((u) => h("span", null, h("button", { class: "link mono", onclick: () => showPin(u.pin) }, u.pin), editableFlags(u))),
  );
}

function propRow(node: UiNode, p: UiProp, bp: UiBindingProp | undefined): HTMLElement[] {
  const editing = state.editing?.prop === p.name;
  const n = p.overridden.length;
  const overrides = n
    ? h(
        "details",
        {
          class: "overrides",
          open: state.openOverrides.has(p.name),
          ontoggle: (e: Event) => {
            if ((e.target as HTMLDetailsElement).open) state.openOverrides.add(p.name);
            else state.openOverrides.delete(p.name);
          },
        },
        h("summary", null, `overrides ${n}`),
        h("ol", null, p.overridden.map((l) => h("li", null, locLink(l)))),
      )
    : null;
  return [
    h(
      "tr",
      null,
      h("td", { class: "pname", title: propTitle(bp) }, h("span", { class: "mono" }, p.name), typeTag(bp)),
      h(
        "td",
        { class: "pvalue" },
        editing ? valueEditor(node, p) : p.value === "" ? h("span", { class: "muted" }, "(true)") : h("code", null, p.value),
        editing ? null : gpioFlagBadges(node, p),
      ),
      h("td", { class: "porigin" }, locLink(p.origin), overrides),
      h(
        "td",
        { class: "pactions" },
        editing || p.value === ""
          ? null
          : h(
              "button",
              {
                class: "icon",
                title: "Edit value",
                disabled: !canEdit(),
                onclick: () => {
                  state.editing = { prop: p.name, text: p.value };
                  rerender();
                  requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-key="edit:${CSS.escape(p.name)}"]`)?.focus());
                },
              },
              "✎",
            ),
        h(
          "button",
          {
            class: "icon danger",
            title: "Remove property",
            disabled: !canEdit(),
            onclick: () => {
              if (confirm(`Remove ${p.name} from ${node.path}?\nThe change is written to ${basename(state.overlay)}.`)) void applyEdit(node.path, p.name, null);
            },
          },
          "✕",
        ),
      ),
    ),
  ];
}

function missingRow(bp: UiBindingProp): HTMLElement {
  return h(
    "tr",
    { class: "missing" },
    h("td", { class: "pname", title: propTitle(bp) }, h("span", { class: "mono" }, bp.name), typeTag(bp)),
    h("td", { class: "pvalue" }, h("span", { class: "warn-text" }, "required, not set")),
    h("td", null),
    h(
      "td",
      { class: "pactions" },
      h(
        "button",
        {
          disabled: !canEdit(),
          onclick: () => {
            state.add = { ...emptyAdd(), name: bp.name };
            rerender();
            requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-key="add-value"]')?.focus());
          },
        },
        "Set",
      ),
    ),
  );
}

/** DTS text for the add form, or undefined when the input is incomplete. */
function addValue(bp: UiBindingProp | undefined): string | true | null | undefined {
  const d = state.add;
  const t = d.text.trim();
  if (!bp) return t === "" ? true : t;
  if (bp.type === "EMPTY") return d.checked ? true : null;
  if (bp.enum) return t || undefined;
  if (bp.type === "STRING") return quote(d.text);
  if (bp.type === "U32" || bp.type === "U64") return t ? cells(t) : undefined;
  return t || undefined;
}

function valueInput(bp: UiBindingProp | undefined, submit: () => void): HTMLElement {
  const d = state.add;
  const onText = (e: Event): void => {
    d.text = (e.target as HTMLInputElement).value;
    rerender();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };
  const common = { "data-key": "add-value", value: d.text, oninput: onText, onkeydown: onKey, spellcheck: "false" };
  if (bp?.type === "EMPTY")
    return h(
      "label",
      { class: "check" },
      h("input", {
        type: "checkbox",
        "data-key": "add-value",
        checked: d.checked,
        onchange: (e: Event) => {
          d.checked = (e.target as HTMLInputElement).checked;
          rerender();
        },
      }),
      d.checked ? "set (name;)" : "unset (remove)",
    );
  if (bp?.enum)
    return h(
      "select",
      { "data-key": "add-value", value: d.text, onchange: onText },
      h("option", { value: "" }, "— value —"),
      bp.enum.map((v) => {
        const text = enumValue(bp.type, v);
        return h("option", { value: text }, text);
      }),
    );
  if (bp?.type === "STRING") return h("input", { ...common, type: "text", class: "mono", placeholder: "text (quoted automatically)" });
  if (bp?.type === "U32" || bp?.type === "U64")
    return h("input", { ...common, type: "text", inputmode: "numeric", class: "mono", placeholder: "number, e.g. 42 or 0x2a" });
  return h("input", {
    ...common,
    type: "text",
    class: "mono",
    placeholder: bp ? `raw DTS value (${bp.type.toLowerCase()})` : "raw DTS value, empty = boolean",
  });
}

function addForm(node: UiNode, binding: UiBinding | undefined, setNames: Set<string>): HTMLElement {
  const d = state.add;
  const candidates = (binding?.props ?? [])
    .filter((p) => !setNames.has(p.name))
    .sort((a, b) => Number(b.required) - Number(a.required) || a.name.localeCompare(b.name));
  const bp = d.name && d.name !== CUSTOM ? candidates.find((p) => p.name === d.name) : undefined;
  const name = d.name === CUSTOM ? d.custom.trim() : bp?.name ?? "";
  const value = d.name ? addValue(bp) : undefined;
  const ready = canEdit() && !!name && value !== undefined;
  const submit = async (): Promise<void> => {
    if (!ready) return;
    if (await applyEdit(node.path, name, value)) {
      state.add = emptyAdd();
      rerender();
    }
  };
  return h(
    "div",
    { class: "add" },
    h(
      "select",
      {
        "data-key": "add-name",
        value: d.name,
        disabled: !canEdit(),
        onchange: (e: Event) => {
          state.add = { ...emptyAdd(), name: (e.target as HTMLSelectElement).value, custom: d.custom };
          rerender();
        },
      },
      h("option", { value: "" }, "Add property…"),
      candidates.map((p) => h("option", { value: p.name, class: p.required ? "required" : "", title: firstLine(p.description) }, `${p.required ? "* " : ""}${p.name} (${p.type.toLowerCase()})`)),
      h("option", { value: CUSTOM }, "Other (free-form name)…"),
    ),
    d.name === CUSTOM
      ? h("input", {
          type: "text",
          class: "mono",
          placeholder: "property name",
          "data-key": "add-custom",
          value: d.custom,
          spellcheck: "false",
          oninput: (e: Event) => {
            d.custom = (e.target as HTMLInputElement).value;
            rerender();
          },
        })
      : null,
    d.name ? valueInput(bp, () => void submit()) : null,
    d.name ? h("button", { class: "primary", disabled: !ready, onclick: () => void submit() }, "Add") : null,
    d.name && value !== undefined && name ? h("code", { class: "preview muted", title: "Written to the overlay" }, value === true ? `${name};` : value === null ? `/delete-property/ ${name};` : `${name} = ${value};`) : null,
    bp?.description ? h("div", { class: "hint muted" }, firstLine(bp.description)) : null,
  );
}

function section(title: string, ...body: (HTMLElement | null | (HTMLElement | null)[])[]): HTMLElement {
  return h("section", null, h("h3", null, title), ...body);
}

function pinSection(m: UiModel, node: UiNode): HTMLElement | null {
  const used = m.pins.usages.filter((u) => u.owner === node.path);
  if (!used.length) return null;
  const conflict = new Set(m.pins.conflicts);
  return section(
    `Pins (${used.length})`,
    h(
      "ul",
      { class: "node-pins" },
      used.map((u) =>
        h(
          "li",
          { class: u.state && u.state !== "default" ? "nondefault" : "" },
          h("button", { class: `link mono${conflict.has(u.pin) ? " error-text" : ""}`, title: "Show in Pins tab", onclick: () => showPin(u.pin) }, u.pin),
          u.function ? h("span", { class: "mono" }, ` ${u.function}`) : null,
          h("span", { class: "muted" }, ` ${usageText(u)}`),
          conflict.has(u.pin) ? h("span", { class: "badge error" }, "conflict") : null,
        ),
      ),
    ),
  );
}

export function renderDetails(m: UiModel): HTMLElement {
  const node = m.nodes[state.selected];
  if (!node) return h("div", { class: "empty" }, "Select a node");
  const binding = node.binding ? m.bindings[node.binding] : undefined;
  const bprops = new Map((binding?.props ?? []).map((p) => [p.name, p]));
  const setNames = new Set(node.props.map((p) => p.name));
  const missing = (binding?.props ?? []).filter((p) => p.required && !setNames.has(p.name));
  const parent = state.parents.get(node.path);

  return h(
    "div",
    { class: "details", "data-scroll": "details" },
    h(
      "div",
      { class: "d-head" },
      h(
        "h2",
        null,
        node.labels.map((l) => h("span", { class: "label" }, `${l}: `)),
        node.name,
        node.disabled ? h("span", { class: "badge muted" }, "disabled") : h("span", { class: "badge ok" }, "okay"),
        node.issues > 0 ? h("span", { class: "badge warn" }, `${node.issues} issue${node.issues === 1 ? "" : "s"}`) : null,
      ),
      node.path === m.root ? null : statusButton(node),
    ),
    h(
      "div",
      { class: "d-path mono" },
      parent ? h("button", { class: "link", title: "Select parent", onclick: () => select(parent, { reveal: true }) }, "↑") : null,
      node.path,
    ),
    h(
      "dl",
      { class: "kv" },
      node.labels.length ? [h("dt", null, "Labels"), h("dd", { class: "mono" }, node.labels.join(", "))] : null,
      node.compatible.length ? [h("dt", null, "Compatible"), h("dd", { class: "mono" }, node.compatible.join(", "))] : null,
      binding?.file || binding?.description
        ? [
            h("dt", null, "Binding"),
            h(
              "dd",
              null,
              binding.file ? locLink({ file: binding.file, line: 0, character: 0 }, basename(binding.file)) : null,
              binding.description ? h("div", { class: "desc" }, binding.description.trim()) : null,
            ),
          ]
        : null,
    ),
    busSection(m, node),
    pinSection(m, node),
    node.definitions.length ? section(`Definitions (${node.definitions.length})`, h("ul", { class: "defs" }, node.definitions.map((l) => h("li", null, locLink(l, l.file + `:${l.line + 1}`))))) : null,
    section(
      `Properties (${node.props.length})`,
      h(
        "table",
        { class: "props" },
        h("thead", null, h("tr", null, h("th", null, "Name"), h("th", null, "Value"), h("th", null, "Origin"), h("th", null))),
        h("tbody", null, missing.map(missingRow), node.props.map((p) => propRow(node, p, bprops.get(p.name)))),
      ),
      addForm(node, binding, setNames),
    ),
  );
}
