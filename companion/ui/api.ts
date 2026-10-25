// SPDX-License-Identifier: Apache-2.0

import type { UiCatalogEntry } from "../src/ui/catalog.js";
import type { AddressRequest, ChildRequest, EditRequest } from "../src/ui/edits.js";
import type { Loc, UiContext, UiModel } from "../src/ui/model.js";

export const token = new URLSearchParams(location.search).get("t") ?? "";

async function request(method: "GET" | "POST", path: string, body?: unknown): Promise<Response> {
  const headers: Record<string, string> = { "X-Token": token };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${method} ${path}: HTTP ${res.status}${text ? ` - ${text.slice(0, 300)}` : ""}`);
  }
  return res;
}

export async function getModel(): Promise<UiModel | null> {
  const res = await request("GET", "/api/model");
  return res.status === 204 ? null : ((await res.json()) as UiModel);
}

export const getContexts = async (): Promise<UiContext[]> => (await request("GET", "/api/contexts")).json();

export const setActive = async (id: string): Promise<void> => void (await request("POST", "/api/active", { id }));

export const open = async (loc: Loc): Promise<void> =>
  void (await request("POST", "/api/open", { file: loc.file, line: loc.line, character: loc.character }));

export async function edit(req: EditRequest): Promise<{ applied: boolean; error?: string }> {
  return (await request("POST", "/api/edit", req)).json();
}

type Result = { applied: boolean; error?: string };

export const getCatalog = async (bus: string): Promise<UiCatalogEntry[]> =>
  (await request("GET", `/api/catalog?bus=${encodeURIComponent(bus)}`)).json();

export const addNode = async (req: ChildRequest): Promise<Result> => (await request("POST", "/api/add-node", req)).json();

export const setAddress = async (req: AddressRequest): Promise<Result> => (await request("POST", "/api/address", req)).json();

export const movePin = async (req: {
  owner: string;
  function: string;
  from: string;
  to: string;
  overlay: string;
  force?: boolean;
}): Promise<Result & { conflict?: string[] }> => (await request("POST", "/api/move-pin", req)).json();

export const assignPin = async (req: { function: string; pin: string; owner: string; overlay: string; force?: boolean }): Promise<Result & { conflict?: string[] }> =>
  (await request("POST", "/api/assign-pin", req)).json();

export const editMany = async (overlay: string, edits: { nodePath: string; property: string; value: string | true | null }[]): Promise<Result> =>
  (await request("POST", "/api/edits", { overlay, edits })).json();

export const createOverlay = async (): Promise<Result & { file?: string }> => (await request("POST", "/api/create-overlay", {})).json();

export function events(onChanged: (reason: string) => void, onConnection: (up: boolean) => void): EventSource {
  const es = new EventSource(`/api/events?t=${encodeURIComponent(token)}`);
  es.addEventListener("changed", (e) => {
    let reason = "";
    try {
      reason = JSON.parse((e as MessageEvent).data).reason ?? "";
    } catch {
      // keep empty
    }
    onChanged(reason);
  });
  es.onopen = () => onConnection(true);
  es.onerror = () => onConnection(es.readyState === EventSource.OPEN);
  return es;
}
