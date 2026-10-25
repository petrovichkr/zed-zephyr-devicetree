// SPDX-License-Identifier: Apache-2.0

import type { EditRequest } from "../src/ui/edits.js";
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
