// SPDX-License-Identifier: Apache-2.0

import type { UiContext, UiModel } from "../src/ui/model.js";
import * as api from "./api.js";

export type Tab = "tree" | "memory" | "pins";

export const CUSTOM = "\u0000custom";

export interface AddDraft {
  /** Binding property name, CUSTOM for a free-form name, "" when nothing is chosen. */
  name: string;
  custom: string;
  text: string;
  checked: boolean;
}

export const emptyAdd = (): AddDraft => ({ name: "", custom: "", text: "", checked: true });

export const state = {
  loaded: false,
  model: null as UiModel | null,
  contexts: [] as UiContext[],
  parents: new Map<string, string>(),
  selected: "/",
  expanded: new Set<string>(["/"]),
  tab: "tree" as Tab,
  search: "",
  overlay: "",
  overlayContext: "",
  editing: null as { prop: string; text: string } | null,
  add: emptyAdd(),
  openOverrides: new Set<string>(),
  message: null as { kind: "error" | "info"; text: string } | null,
  busy: false,
  connected: true,
  scrollToSelected: false,
  pinFilter: "",
  pinOnlyConflicts: false,
  /** Pin to highlight and scroll to in the Pins tab. */
  pinFocus: "",
  pinScroll: false,
  unknownOpen: false,
};

let renderer = (): void => {};
export const setRenderer = (f: () => void): void => void (renderer = f);
export const rerender = (): void => renderer();

let messageTimer: number | undefined;
export function notify(kind: "error" | "info", text: string): void {
  state.message = { kind, text };
  window.clearTimeout(messageTimer);
  if (kind === "info") messageTimer = window.setTimeout(() => ((state.message = null), rerender()), 3000);
  rerender();
}
export const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

export const canEdit = (): boolean => !!state.model && state.model.context.overlays.includes(state.overlay) && !state.busy;

function setModel(m: UiModel | null): void {
  state.model = m;
  state.parents.clear();
  if (!m) return;
  for (const n of Object.values(m.nodes)) for (const c of n.children) state.parents.set(c, n.path);
  if (!m.nodes[state.selected]) {
    let p = state.selected;
    while (p !== "/" && !m.nodes[p]) p = p.slice(0, p.lastIndexOf("/")) || "/";
    selectPath(m.nodes[p] ? p : m.root);
  }
  const overlays = m.context.overlays;
  if (state.overlayContext !== m.context.id || !overlays.includes(state.overlay)) {
    state.overlay = overlays[overlays.length - 1] ?? "";
    state.overlayContext = m.context.id;
  }
  if (state.editing && !m.nodes[state.selected]?.props.some((p) => p.name === state.editing!.prop)) state.editing = null;
}

let refreshing = false;
let again = false;
/** Refetches model and contexts; concurrent calls collapse into one more round. */
export async function refresh(): Promise<void> {
  if (refreshing) {
    again = true;
    return;
  }
  refreshing = true;
  try {
    do {
      again = false;
      const [m, ctxs] = await Promise.all([api.getModel(), api.getContexts().catch(() => null)]);
      setModel(m);
      state.contexts = ctxs ?? (m ? [m.context] : []);
      state.loaded = true;
    } while (again);
  } catch (e) {
    notify("error", errorText(e));
  } finally {
    refreshing = false;
    rerender();
  }
}

export function ancestors(path: string): string[] {
  const out: string[] = [];
  for (let p = state.parents.get(path); p !== undefined; p = state.parents.get(p)) out.push(p);
  return out;
}

function selectPath(path: string): void {
  if (path !== state.selected) {
    state.editing = null;
    state.add = emptyAdd();
    state.openOverrides.clear();
  }
  state.selected = path;
}

export function select(path: string, opts: { reveal?: boolean; tab?: Tab } = {}): void {
  selectPath(path);
  if (opts.tab) state.tab = opts.tab;
  if (opts.reveal) {
    for (const a of ancestors(path)) state.expanded.add(a);
    state.scrollToSelected = true;
  }
  rerender();
}

export function showPin(pin: string): void {
  state.tab = "pins";
  state.pinFocus = pin;
  state.pinScroll = true;
  const p = pin.toLowerCase();
  if (state.pinFilter && !p.includes(state.pinFilter.trim().toLowerCase())) state.pinFilter = "";
  if (state.pinOnlyConflicts && !state.model?.pins.conflicts.includes(pin)) state.pinOnlyConflicts = false;
  rerender();
}

export async function openLoc(loc: { file: string; line: number; character: number }): Promise<void> {
  try {
    await api.open(loc);
  } catch (e) {
    notify("error", errorText(e));
  }
}

export async function applyEdit(nodePath: string, property: string, value: string | true | null): Promise<boolean> {
  if (!canEdit()) return false;
  state.busy = true;
  rerender();
  try {
    const res = await api.edit({ nodePath, overlay: state.overlay, property, value });
    if (!res.applied) {
      notify("error", `Edit of ${property} not applied${res.error ? `: ${res.error}` : ""}`);
      return false;
    }
    notify("info", value === null ? `Removed ${property}` : `Wrote ${property}`);
    return true;
  } catch (e) {
    notify("error", errorText(e));
    return false;
  } finally {
    state.busy = false;
    rerender();
    void refresh();
  }
}
