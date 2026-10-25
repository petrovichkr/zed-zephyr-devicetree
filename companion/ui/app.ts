// SPDX-License-Identifier: Apache-2.0
//
// Browser side of the visual devicetree editor (SPEC 4.3). Served as one
// self-contained page by the companion; talks to it via /api (see api.ts).

import * as api from "./api.js";
import { renderBuses } from "./buses.js";
import { renderDetails } from "./details.js";
import { h, patch } from "./dom.js";
import { tail } from "./format.js";
import { renderClocks } from "./clocks.js";
import { renderInterrupts } from "./irqs.js";
import { renderMemory } from "./memory.js";
import { renderOverview } from "./overview.js";
import { renderPins } from "./pins.js";
import { renderTree } from "./tree.js";
import { createOverlay, errorText, notify, refresh, rerender, setRenderer, state } from "./state.js";

const root = document.getElementById("app")!;

function header(): HTMLElement {
  const m = state.model;
  const ctxs = state.contexts.length ? state.contexts : m ? [m.context] : [];
  const overlays = m?.context.overlays ?? [];
  return h(
    "header",
    null,
    h("span", { class: "brand" }, "Devicetree"),
    h(
      "label",
      null,
      "Context ",
      h(
        "select",
        {
          "data-key": "context",
          disabled: !ctxs.length,
          value: ctxs.find((c) => c.active)?.id ?? m?.context.id ?? "",
          onchange: async (e: Event) => {
            try {
              await api.setActive((e.target as HTMLSelectElement).value);
            } catch (err) {
              notify("error", errorText(err));
            }
            void refresh();
          },
        },
        ctxs.length ? ctxs.map((c) => h("option", { value: c.id }, c.names.join(", ") || c.id)) : h("option", { value: "" }, "—"),
      ),
    ),
    m
      ? overlays.length
        ? h(
            "label",
            null,
            "Write to ",
            h(
              "select",
              {
                "data-key": "overlay",
                value: state.overlay,
                title: state.overlay,
                onchange: (e: Event) => {
                  state.overlay = (e.target as HTMLSelectElement).value;
                  rerender();
                },
              },
              overlays.map((o) => h("option", { value: o, title: o }, tail(o))),
            ),
          )
        : m.context.newOverlay
          ? h(
              "span",
              { class: "note" },
              "This build has no user overlay. ",
              h("button", { class: "small", disabled: state.busy, title: `Create ${m.context.newOverlay}`, onclick: () => void createOverlay() }, `Create ${tail(m.context.newOverlay, 2)}`),
            )
          : h("span", { class: "note" }, "This build has no user overlay: editing is disabled.")
      : null,
    m?.context.pending?.length
      ? h(
          "span",
          { class: "note", title: m.context.pending.join("\n") },
          `${m.context.pending.map((p) => tail(p, 2)).join(", ")} is not in the build yet, rebuild pristine: `,
          h("code", null, m.context.rebuild ?? "west build -p"),
        )
      : null,
    h("span", { class: "spacer" }),
    state.busy ? h("span", { class: "muted" }, "Applying…") : null,
    h("span", { class: `dot ${state.connected ? "up" : "down"}`, title: state.connected ? "Connected to companion" : "Disconnected from companion, reconnecting…" }),
  );
}

function tabs(): HTMLElement {
  const tab = (id: typeof state.tab, text: string): HTMLElement =>
    h(
      "button",
      {
        class: `tab${state.tab === id ? " active" : ""}`,
        role: "tab",
        "aria-selected": String(state.tab === id),
        onclick: () => {
          state.tab = id;
          if (id === "tree") state.scrollToSelected = true;
          rerender();
        },
      },
      text,
    );
  return h(
    "nav",
    { class: "tabs", role: "tablist" },
    tab("tree", "Tree"),
    tab("overview", "Overview"),
    tab("buses", `Buses${busErrors(state.model)}`),
    tab("memory", `Memory${state.model?.memoryMap.some((x) => x.issues.length) ? " (!)" : ""}`),
    state.model?.clocks ? tab("clocks", `Clocks${state.model.clocks.issues.some((i) => i.severity === "error") ? " (!)" : ""}`) : null,
    state.model?.interrupts.length ? tab("irqs", "IRQ") : null,
    tab("pins", `Pins${state.model?.pins.conflicts.length ? ` (${state.model.pins.conflicts.length} conflict${state.model.pins.conflicts.length === 1 ? "" : "s"})` : ""}`),
  );
}

function busErrors(m: typeof state.model): string {
  const n = m?.buses.reduce((acc, b) => acc + b.issues.filter((i) => i.severity === "error").length, 0) ?? 0;
  return n ? ` (${n} error${n === 1 ? "" : "s"})` : "";
}

function message(): HTMLElement | null {
  const msg = state.message;
  if (!msg) return null;
  return h(
    "div",
    { class: `message ${msg.kind}`, role: msg.kind === "error" ? "alert" : "status" },
    h("span", null, msg.text),
    h("button", { class: "icon", title: "Dismiss", onclick: () => ((state.message = null), rerender()) }, "✕"),
  );
}

function body(): HTMLElement {
  const m = state.model;
  if (!state.loaded) return h("main", { class: "center muted" }, "Loading…");
  if (!m) return h("main", { class: "center muted" }, "Waiting for devicetree context… Open a .dts or .overlay file in Zed.");
  if (state.tab === "memory") return h("main", { class: "split memory-split" }, renderMemory(m), renderDetails(m));
  if (state.tab === "clocks") return h("main", { class: "single" }, renderClocks(m));
  if (state.tab === "overview") return h("main", { class: "split overview-split" }, renderOverview(m), renderDetails(m));
  if (state.tab === "irqs") return h("main", { class: "split irqs-split" }, renderInterrupts(m), renderDetails(m));
  if (state.tab === "buses") return h("main", { class: "split buses-split" }, renderBuses(m), renderDetails(m));
  if (state.tab === "pins") return h("main", { class: "single" }, renderPins(m));
  return h("main", { class: "split" }, renderTree(m), renderDetails(m));
}

setRenderer(() => {
  patch(root, [header(), tabs(), message(), body()]);
  document.title = state.model ? `Devicetree – ${state.model.context.names.join(", ")}` : "Devicetree";
});

let wasDown = false;
api.events(
  () => void refresh(),
  (up) => {
    if (up && wasDown) void refresh();
    wasDown = !up;
    if (state.connected !== up) {
      state.connected = up;
      rerender();
    }
  },
);
rerender();
void refresh();
