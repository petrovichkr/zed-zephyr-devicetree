// SPDX-License-Identifier: Apache-2.0
//
// Buses tab (SPEC 6c, stage 5): one diagram per bus controller, drawn by hand
// in SVG (D29). Controller on the left, devices on the right, links labelled
// with address / chip select / frequency. The node's Bus section in the
// details panel (address and chip select editing) lives here too.

import type { UiBus, UiBusDevice, UiBusIssue } from "../src/ui/buses.js";
import type { UiCatalogEntry, UiCatalogProp } from "../src/ui/catalog.js";
import type { UiModel, UiNode } from "../src/ui/model.js";
import * as api from "./api.js";
import { h } from "./dom.js";
import { basename, cells, quote } from "./format.js";
import { applyChange, applyEdit, canEdit, catalog, rerender, select, showPin, state } from "./state.js";

const SVG = "http://www.w3.org/2000/svg";
function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...children: (SVGElement | string | null)[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v as EventListener);
    else el.setAttribute(k, String(v));
  }
  for (const c of children) if (c !== null) el.append(typeof c === "string" ? document.createTextNode(c) : c);
  return el;
}

const clip = (t: string, n: number): string => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

export function hz(v: number | undefined): string {
  if (v === undefined) return "";
  if (v >= 1_000_000) return `${Number((v / 1_000_000).toFixed(3))} MHz`;
  if (v >= 1_000) return `${Number((v / 1_000).toFixed(3))} kHz`;
  return `${v} Hz`;
}

const speedText = (b: UiBus): string =>
  !b.speed ? "" : b.speed.value === undefined ? b.speed.text : b.speed.property === "current-speed" ? `${b.speed.value} baud` : hz(b.speed.value);

const title = (n: UiNode | undefined, path: string): string => (n ? `${n.labels[0] ? `${n.labels[0]}: ` : ""}${n.name}` : path);

/** Text on the link to a device: address or chip select, then pin / frequency. */
function linkText(bus: UiBus, d: UiBusDevice): [string, string] {
  if (d.link !== "child") return [d.property ?? "", d.link === "chosen" ? "chosen" : "phandle"];
  const top = d.reg === undefined ? (bus.type === "spi" || bus.type === "i2c" ? "no reg" : "") : bus.type === "spi" ? `CS ${d.reg}` : bus.type === "i2c" ? (d.address !== undefined ? `0x${d.address.toString(16)}` : d.reg) : d.reg;
  return [top, [d.cs, hz(d.frequency)].filter(Boolean).join(" · ")];
}

function severityOf(issues: UiBusIssue[], path: string): "error" | "warning" | "" {
  const mine = issues.filter((i) => i.node === path);
  return mine.some((i) => i.severity === "error") ? "error" : mine.length ? "warning" : "";
}

const ROW = 46;
const BOX = 36;
const CTRL_W = 190;
const TRUNK = 220;
const DEV_X = 370;
const DEV_W = 300;

function diagram(m: UiModel, bus: UiBus): SVGSVGElement {
  const rows = Math.max(1, bus.devices.length);
  const height = rows * ROW + 8;
  const ctrl = m.nodes[bus.path];
  const ctrlH = Math.max(BOX + 22, rows * ROW - 10);
  const ctrlY = (height - ctrlH) / 2;
  const mid = (i: number) => 4 + i * ROW + ROW / 2;
  const sel = (p: string) => (state.selected === p ? " selected" : "");

  const svg = s("svg", { class: "bus-svg", width: DEV_X + DEV_W + 8, height, viewBox: `0 0 ${DEV_X + DEV_W + 8} ${height}`, role: "img", "aria-label": `${bus.type} bus ${ctrl?.name ?? bus.path}` });
  svg.append(
    s(
      "g",
      { class: `ctrl${bus.disabled ? " off" : ""}${severityOf(bus.issues, bus.path) ? ` ${severityOf(bus.issues, bus.path)}` : ""}${sel(bus.path)}`, onclick: () => select(bus.path) },
      s("title", {}, `${bus.path}\nclick to select`),
      s("rect", { x: 4, y: ctrlY, width: CTRL_W, height: ctrlH, rx: 6 }),
      s("text", { x: 16, y: ctrlY + 20, class: "t1" }, clip(title(ctrl, bus.path), 24)),
      s("text", { x: 16, y: ctrlY + 38, class: "t2" }, clip([bus.type.toUpperCase(), speedText(bus)].filter(Boolean).join(" · "), 28)),
    ),
  );
  if (!bus.devices.length) {
    svg.append(s("text", { x: TRUNK, y: height / 2 + 4, class: "t2" }, "no devices"));
    return svg;
  }
  svg.append(
    s("line", { class: `wire${bus.disabled ? " off" : ""}`, x1: 4 + CTRL_W, y1: height / 2, x2: TRUNK, y2: height / 2 }),
    s("line", { class: `wire${bus.disabled ? " off" : ""}`, x1: TRUNK, y1: Math.min(mid(0), height / 2), x2: TRUNK, y2: Math.max(mid(rows - 1), height / 2) }),
  );
  bus.devices.forEach((d, i) => {
    const n = m.nodes[d.path];
    const y = mid(i);
    const off = d.disabled || bus.disabled;
    const sev = severityOf(bus.issues, d.path);
    const [top, bottom] = linkText(bus, d);
    const sub = d.link === "child" ? (n?.compatible[0] ?? "") : `${d.property} = ${n?.props.find((p) => p.name === d.property)?.value ?? ""}`;
    svg.append(
      s("line", { class: `wire${off ? " off" : ""}${d.link !== "child" ? " ref" : ""}${sev ? ` ${sev}` : ""}`, x1: TRUNK, y1: y, x2: DEV_X, y2: y }),
      s("circle", { class: `joint${off ? " off" : ""}`, cx: TRUNK, cy: y, r: 3 }),
      s("text", { x: TRUNK + 12, y: y - 6, class: `edge${sev ? ` ${sev}` : ""}` }, clip(top, 22)),
      s("text", { x: TRUNK + 12, y: y + 14, class: "edge sub" }, clip(bottom, 24)),
      s(
        "g",
        { class: `dev${off ? " off" : ""}${sev ? ` ${sev}` : ""}${sel(d.path)}`, onclick: () => select(d.path) },
        s("title", {}, `${d.path}${d.disabled ? "\ndisabled" : bus.disabled ? "\nbus disabled" : ""}\nclick to select`),
        s("rect", { x: DEV_X, y: y - BOX / 2, width: DEV_W, height: BOX, rx: 5 }),
        s("text", { x: DEV_X + 10, y: y - 3, class: "t1" }, clip(title(n, d.path), 40)),
        s("text", { x: DEV_X + 10, y: y + 12, class: "t2" }, clip(sub, 44)),
      ),
    );
  });
  return svg;
}

function issueList(m: UiModel, bus: UiBus): HTMLElement | null {
  if (!bus.issues.length) return null;
  return h(
    "ul",
    { class: "bus-issues" },
    bus.issues.map((i) =>
      h(
        "li",
        { class: i.severity === "error" ? "error-text" : "warn-text" },
        h("button", { class: "link", title: `Select ${i.node}`, onclick: () => select(i.node) }, i.severity === "error" ? "✖ " : "⚠ ", i.message),
      ),
    ),
  );
}

/** `vendor,lis2dh12` -> `lis2dh12`, `jedec,spi-nor` -> `spi-nor`. */
const baseName = (compatible: string): string => (compatible.split(",").pop() ?? compatible).replace(/[^A-Za-z0-9,._+-]/g, "-").toLowerCase();

function freeChipSelect(bus: UiBus): number {
  const used = new Set(bus.devices.filter((d) => d.link === "child" && !d.disabled).map((d) => d.address));
  let cs = 0;
  while (used.has(cs)) cs++;
  return cs;
}

export function parseAddress(text: string): number | undefined {
  const t = text.trim();
  if (/^0x[0-9a-f]+$/i.test(t)) return parseInt(t, 16);
  if (/^\d+$/.test(t)) return Number(t);
  return undefined;
}

/** The `reg` cell text for an address on this bus: I2C in hex, chip selects in decimal. */
const regCell = (type: string, n: number): string => (type === "spi" ? String(n) : `0x${n.toString(16)}`);

/** User text -> DTS value for a binding type; text already in DTS form is kept. */
export function dtsValue(p: UiCatalogProp, text: string): string {
  const t = text.trim();
  switch (p.type) {
    case "string":
      return quote(t);
    case "string-array":
      return t.includes('"') ? t : quote(t);
    case "uint8-array":
      return t.startsWith("[") ? t : `[${t}]`;
    case "int":
    case "array":
    case "phandle":
    case "phandles":
    case "phandle-array":
      return cells(t);
    default:
      return t;
  }
}

function addForm(m: UiModel, bus: UiBus): HTMLElement {
  const d = state.device!;
  const list = catalog(bus.type);
  const addressed = bus.type === "i2c" || bus.type === "spi";
  const close = (): void => {
    state.device = null;
    rerender();
  };
  if (list === "loading") {
    return h("div", { class: "add-device" }, h("span", { class: "muted" }, `Loading ${bus.type} bindings from the language server… (the first time takes a while)`), h("button", { onclick: close }, "Cancel"));
  }

  const q = d.query.trim().toLowerCase();
  const matches = list.filter((e) => !q || e.compatible.toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q));
  const choose = (e: UiCatalogEntry | null): void => {
    d.entry = e;
    d.values = {};
    if (e) {
      for (const p of e.required) if (p.default !== undefined) d.values[p.name] = Array.isArray(p.default) ? p.default.join(" ") : String(p.default);
      if (bus.type === "spi" && !d.address) d.address = String(freeChipSelect(bus));
      d.name = baseName(e.compatible);
    }
    rerender();
  };

  const address = parseAddress(d.address);
  const name = d.name.trim();
  const unit = address !== undefined ? `@${address.toString(16)}` : "";
  const fullName = `${name}${unit}`;
  const missing = (d.entry?.required ?? []).filter((p) => p.type !== "boolean" && !(d.values[p.name] ?? "").trim());
  const nameOk = /^[A-Za-z0-9,._+-]+$/.test(name);
  const exists = !!m.nodes[`${bus.path}/${fullName}`];
  const ready = !!d.entry && nameOk && !exists && (!addressed || address !== undefined) && !missing.length;
  const why = !d.entry
    ? "Choose a binding"
    : !nameOk
      ? "Node name may contain letters, digits and , . _ + -"
      : exists
        ? `${fullName} already exists`
        : addressed && address === undefined
          ? `Enter the ${bus.type === "spi" ? "chip select" : "address"}`
          : missing.length
            ? `Fill in ${missing.map((p) => p.name).join(", ")}`
            : "";

  const submit = async (): Promise<void> => {
    if (!ready || !d.entry) return;
    const props: { name: string; value: string | true }[] = [{ name: "compatible", value: quote(d.entry.compatible) }];
    if (address !== undefined) props.push({ name: "reg", value: `<${regCell(bus.type, address)}>` });
    for (const p of d.entry.required) {
      const v = d.values[p.name] ?? "";
      if (p.type === "boolean") {
        if (v === "true") props.push({ name: p.name, value: true });
      } else props.push({ name: p.name, value: dtsValue(p, v) });
    }
    const path = `${bus.path}/${fullName}`;
    const ok = await applyChange(() => api.addNode({ parentPath: bus.path, overlay: state.overlay, name: fullName, props }), `Added ${fullName}`, `Adding ${fullName}`);
    if (ok) {
      state.device = null;
      state.selected = path;
    }
  };

  const field = (p: UiCatalogProp): HTMLElement => {
    const key = `dev:${p.name}`;
    const set = (v: string) => void (d.values[p.name] = v);
    const input = p.enum
      ? h(
          "select",
          { "data-key": key, value: d.values[p.name] ?? "", onchange: (e: Event) => (set((e.target as HTMLSelectElement).value), rerender()) },
          h("option", { value: "" }, "—"),
          p.enum.map((v) => h("option", { value: String(v) }, String(v))),
        )
      : p.type === "boolean"
        ? h("input", { type: "checkbox", "data-key": key, checked: d.values[p.name] === "true", onchange: (e: Event) => (set(String((e.target as HTMLInputElement).checked)), rerender()) })
        : h("input", {
            type: "text",
            class: "mono",
            "data-key": key,
            spellcheck: "false",
            placeholder: p.type,
            value: d.values[p.name] ?? "",
            oninput: (e: Event) => (set((e.target as HTMLInputElement).value), rerender()),
          });
    return h("label", { class: "field", title: p.description }, h("span", { class: "mono" }, p.name, h("span", { class: "type required" }, p.type)), input);
  };

  return h(
    "div",
    { class: "add-device" },
    h(
      "div",
      { class: "row" },
      h("input", {
        type: "search",
        placeholder: `Search ${list.length} ${bus.type} bindings`,
        "data-key": "dev:query",
        value: d.query,
        oninput: (e: Event) => {
          d.query = (e.target as HTMLInputElement).value;
          rerender();
        },
      }),
      h("span", { class: "muted" }, `${matches.length} found`),
      h("span", { class: "spacer" }),
      h("button", { onclick: close }, "Cancel"),
    ),
    h(
      "select",
      {
        class: "catalog mono",
        size: 7,
        "data-key": "dev:entry",
        value: d.entry ? `${d.entry.compatible}\0${d.entry.file}` : "",
        onchange: (e: Event) => {
          const v = (e.target as HTMLSelectElement).value;
          choose(list.find((x) => `${x.compatible}\0${x.file}` === v) ?? null);
        },
      },
      matches.slice(0, 300).map((e) => h("option", { value: `${e.compatible}\0${e.file}`, title: `${e.file}\n${e.description ?? ""}` }, `${e.compatible}  —  ${(e.description ?? "").split("\n")[0]}`)),
    ),
    d.entry
      ? h(
          "div",
          { class: "dev-fields" },
          h("div", { class: "muted desc" }, basename(d.entry.file), d.entry.description ? ` — ${d.entry.description.split("\n")[0]}` : ""),
          h(
            "label",
            { class: "field" },
            h("span", null, "Node name"),
            h("input", { type: "text", class: "mono", "data-key": "dev:name", value: d.name, oninput: (e: Event) => ((d.name = (e.target as HTMLInputElement).value), rerender()) }),
          ),
          addressed
            ? h(
                "label",
                { class: "field" },
                h("span", null, bus.type === "spi" ? "Chip select (reg)" : "Address (reg)"),
                h("input", {
                  type: "text",
                  class: "mono",
                  "data-key": "dev:address",
                  placeholder: bus.type === "spi" ? "0" : "0x19",
                  value: d.address,
                  oninput: (e: Event) => ((d.address = (e.target as HTMLInputElement).value), rerender()),
                }),
              )
            : null,
          d.entry.required.map(field),
          h(
            "div",
            { class: "row" },
            h(
              "button",
              { class: "primary", disabled: !ready || !canEdit(), title: why || `Write ${fullName} to ${basename(state.overlay)}`, onclick: () => void submit() },
              `Add ${fullName || "device"}`,
            ),
            why ? h("span", { class: "warn-text" }, why) : h("span", { class: "muted" }, `into ${basename(state.overlay)}`),
          ),
        )
      : null,
  );
}

function busCard(m: UiModel, bus: UiBus): HTMLElement {
  const ctrl = m.nodes[bus.path];
  const adding = state.device?.bus === bus.path;
  const errors = bus.issues.filter((i) => i.severity === "error").length;
  return h(
    "section",
    { class: `bus-card${bus.disabled ? " off" : ""}`, "data-bus": bus.path },
    h(
      "div",
      { class: "bus-head" },
      h("button", { class: "link bus-title", title: `Select ${bus.path}`, onclick: () => select(bus.path) }, title(ctrl, bus.path)),
      h("span", { class: "badge" }, bus.type),
      speedText(bus) ? h("span", { class: "mono muted" }, speedText(bus)) : null,
      bus.disabled ? h("span", { class: "badge muted" }, "disabled") : null,
      errors ? h("span", { class: "badge error" }, `${errors} error${errors === 1 ? "" : "s"}`) : null,
      h("span", { class: "pins-inline" }, bus.pins.map((p) => h("button", { class: "chip mono", title: `${p.function ?? ""} — show in Pins tab`, onclick: () => showPin(p.pin) }, p.pin))),
      h("span", { class: "spacer" }),
      h(
        "button",
        {
          disabled: !canEdit(),
          title: canEdit() ? `Write status to ${basename(state.overlay)}` : "Editing is disabled",
          onclick: () => void applyEdit(bus.path, "status", bus.disabled ? '"okay"' : '"disabled"'),
        },
        bus.disabled ? "Enable" : "Disable",
      ),
      h(
        "button",
        {
          disabled: !canEdit() || adding,
          title: canEdit() ? "Add a device node to this bus" : "Editing is disabled",
          onclick: () => {
            state.device = { bus: bus.path, query: "", entry: null, name: "", address: "", values: {} };
            rerender();
          },
        },
        "+ Device",
      ),
    ),
    adding ? addForm(m, bus) : null,
    h("div", { class: "bus-diagram" }, diagram(m, bus)),
    issueList(m, bus),
  );
}

export function renderBuses(m: UiModel): HTMLElement {
  const shown = m.buses.filter((b) => state.busShowAll || !b.disabled || b.devices.length);
  const hidden = m.buses.length - shown.length;
  const errors = m.buses.reduce((n, b) => n + b.issues.filter((i) => i.severity === "error").length, 0);
  return h(
    "div",
    { class: "buses", "data-scroll": "buses" },
    h(
      "div",
      { class: "pin-bar" },
      h(
        "label",
        { class: "check" },
        h("input", {
          type: "checkbox",
          "data-key": "bus-all",
          checked: state.busShowAll,
          onchange: (e: Event) => {
            state.busShowAll = (e.target as HTMLInputElement).checked;
            rerender();
          },
        }),
        "show disabled buses without devices",
      ),
      h("span", { class: errors ? "summary error-text" : "summary muted" }, `${m.buses.length} buses, ${errors} error${errors === 1 ? "" : "s"}`, hidden ? ` (${hidden} hidden)` : ""),
    ),
    shown.length ? shown.map((b) => busCard(m, b)) : h("div", { class: "empty" }, "No bus controllers in this context"),
  );
}

/** Bus section of the details panel: the bus a device sits on, editable address. */
export function busSection(m: UiModel, node: UiNode): HTMLElement | null {
  const asBus = m.buses.find((b) => b.path === node.path);
  const parent = m.buses.find((b) => b.devices.some((d) => d.path === node.path && d.link === "child"));
  if (!asBus && !parent) return null;
  const toTab = (path: string) => h("button", { class: "link", title: "Show in Buses tab", onclick: () => select(path, { tab: "buses" }) }, "show bus");

  if (asBus) {
    return h("dl", { class: "kv" }, h("dt", null, "Bus"), h("dd", null, `${asBus.type}, ${asBus.devices.length} device${asBus.devices.length === 1 ? "" : "s"} `, toTab(asBus.path)));
  }
  const bus = parent!;
  const d = bus.devices.find((x) => x.path === node.path)!;
  const ctrl = m.nodes[bus.path];
  const editing = state.address?.path === node.path;
  const what = bus.type === "spi" ? "Chip select" : "Address";
  const value = editing ? parseAddress(state.address!.text) : undefined;
  const apply = async (): Promise<void> => {
    if (value === undefined) return;
    const ok = await applyChange(
      () => api.setAddress({ nodePath: node.path, overlay: state.overlay, reg: `<${regCell(bus.type, value)}>`, unit: value.toString(16) }),
      `${what} set to ${regCell(bus.type, value)}`,
      `${what} change`,
    );
    if (ok) state.address = null;
  };
  return h(
    "dl",
    { class: "kv" },
    h("dt", null, "On bus"),
    h("dd", null, h("button", { class: "link", onclick: () => select(bus.path, { reveal: true }) }, title(ctrl, bus.path)), ` (${bus.type}) `, toTab(bus.path)),
    bus.type === "i2c" || bus.type === "spi"
      ? [
          h("dt", null, what),
          h(
            "dd",
            null,
            editing
              ? h(
                  "span",
                  { class: "editor inline" },
                  h("input", {
                    type: "text",
                    class: "mono",
                    "data-key": "bus-address",
                    value: state.address!.text,
                    oninput: (e: Event) => ((state.address!.text = (e.target as HTMLInputElement).value), rerender()),
                    onkeydown: (e: KeyboardEvent) => {
                      if (e.key === "Enter") void apply();
                      if (e.key === "Escape") ((state.address = null), rerender());
                    },
                  }),
                  h("button", { class: "primary", disabled: value === undefined || !canEdit(), title: "Writes reg; the node is renamed too when the overlay defines it", onclick: () => void apply() }, "Apply"),
                  h("button", { onclick: () => ((state.address = null), rerender()) }, "Cancel"),
                )
              : [
                  h("span", { class: "mono" }, d.reg ?? "not set"),
                  d.cs ? h("span", { class: "muted" }, ` → ${d.cs}`) : null,
                  h(
                    "button",
                    {
                      class: "icon",
                      title: `Change ${what.toLowerCase()}`,
                      disabled: !canEdit(),
                      onclick: () => {
                        state.address = { path: node.path, text: d.address !== undefined ? regCell(bus.type, d.address) : (d.reg ?? "") };
                        rerender();
                        requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[data-key="bus-address"]')?.focus());
                      },
                    },
                    "✎",
                  ),
                ],
          ),
        ]
      : null,
    d.frequency !== undefined ? [h("dt", null, "Max frequency"), h("dd", { class: "mono" }, hz(d.frequency))] : null,
  );
}
