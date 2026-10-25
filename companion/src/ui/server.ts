// SPDX-License-Identifier: Apache-2.0
//
// Local HTTP server of the visual editor (ARCHITECTURE D15). Listens on 127.0.0.1
// only, on a random port; every request must carry the per-session token and a
// loopback Host header (DNS rebinding). The port in Host may differ when the
// editor forwards it (VS Code Remote, `asExternalUri`). Model changes are pushed
// over SSE.

import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
// The page is a single self-contained file built by scripts/build-ui.mjs.
import html from "../../dist/ui.html";
import type { UiCatalogEntry } from "./catalog.js";
import type { AddressRequest, ChildRequest, EditRequest } from "./edits.js";
import type { Loc, UiContext, UiModel } from "./model.js";
import type { PinAssignRequest, PinMoveRequest } from "./pinedits.js";

export interface UiBackend {
  contexts(): Promise<UiContext[]>;
  model(): Promise<UiModel | undefined>;
  setActive(id: string): Promise<void>;
  open(loc: Loc): Promise<void>;
  edit(req: EditRequest): Promise<{ applied: boolean; error?: string }>;
  catalog(bus: string): Promise<UiCatalogEntry[]>;
  addNode(req: ChildRequest): Promise<{ applied: boolean; error?: string }>;
  setAddress(req: AddressRequest): Promise<{ applied: boolean; error?: string }>;
  editMany(overlay: string, edits: { nodePath: string; property: string; value: string | true | null }[]): Promise<{ applied: boolean; error?: string }>;
  movePin(req: PinMoveRequest): Promise<{ applied: boolean; error?: string; conflict?: string[] }>;
  assignPin(req: PinAssignRequest): Promise<{ applied: boolean; error?: string; conflict?: string[] }>;
  createOverlay(): Promise<{ applied: boolean; error?: string; file?: string }>;
}

const MAX_BODY = 1 << 20;

export class UiServer {
  private readonly token = randomBytes(16).toString("hex");
  private readonly clients = new Set<ServerResponse>();
  private port = 0;

  constructor(private readonly backend: UiBackend) {}

  get url(): string {
    return `http://127.0.0.1:${this.port}/?t=${this.token}`;
  }

  async start(): Promise<string> {
    if (this.port) return this.url;
    const server = createServer((req, res) => {
      this.handle(req, res).catch((e) => send(res, 500, { error: String(e?.message ?? e) }));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    this.port = (server.address() as AddressInfo).port;
    server.unref();
    return this.url;
  }

  /** Tell every open page to refetch. */
  changed(reason: string): void {
    const frame = `event: changed\ndata: ${JSON.stringify({ reason })}\n\n`;
    for (const c of this.clients) c.write(frame);
  }

  private authorized(req: IncomingMessage, url: URL): boolean {
    if (!isLoopbackHost(req.headers.host)) return false;
    const given = String(req.headers["x-token"] ?? url.searchParams.get("t") ?? "");
    const a = Buffer.from(given);
    const b = Buffer.from(this.token);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (!this.authorized(req, url)) return send(res, 403, { error: "forbidden" });

    const route = `${req.method} ${url.pathname}`;
    switch (route) {
      case "GET /":
        res.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "content-security-policy": "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
        });
        return void res.end(html);
      case "GET /api/events":
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-store", connection: "keep-alive" });
        res.write(": connected\n\n");
        this.clients.add(res);
        req.on("close", () => this.clients.delete(res));
        return;
      case "GET /api/contexts":
        return send(res, 200, await this.backend.contexts());
      case "GET /api/model": {
        const model = await this.backend.model();
        return model ? send(res, 200, model) : void res.writeHead(204).end();
      }
      case "POST /api/active":
        await this.backend.setActive(String((await body(req)).id));
        return send(res, 200, {});
      case "POST /api/open": {
        const b = await body(req);
        await this.backend.open({ file: String(b.file), line: Number(b.line) || 0, character: Number(b.character) || 0 });
        return send(res, 200, {});
      }
      case "POST /api/edit": {
        const b = await body(req);
        const value = b.value === true || b.value === null ? b.value : String(b.value);
        return send(
          res,
          200,
          await this.backend.edit({ nodePath: String(b.nodePath), overlay: String(b.overlay), property: String(b.property), value }),
        );
      }
      case "GET /api/catalog":
        return send(res, 200, await this.backend.catalog(url.searchParams.get("bus") ?? ""));
      case "POST /api/add-node": {
        const b = await body(req);
        const props = Array.isArray(b.props)
          ? b.props.map((p: any) => ({ name: String(p?.name), value: p?.value === true ? (true as const) : String(p?.value) }))
          : [];
        return send(
          res,
          200,
          await this.backend.addNode({
            parentPath: String(b.parentPath),
            overlay: String(b.overlay),
            name: String(b.name),
            label: typeof b.label === "string" && /^[A-Za-z_]\w*$/.test(b.label) ? b.label : undefined,
            props,
          }),
        );
      }
      case "POST /api/address": {
        const b = await body(req);
        return send(
          res,
          200,
          await this.backend.setAddress({ nodePath: String(b.nodePath), overlay: String(b.overlay), reg: String(b.reg), unit: String(b.unit) }),
        );
      }
      case "POST /api/move-pin": {
        const b = await body(req);
        return send(
          res,
          200,
          await this.backend.movePin({
            owner: String(b.owner),
            function: String(b.function),
            from: String(b.from),
            to: String(b.to),
            overlay: String(b.overlay),
            force: b.force === true,
          }),
        );
      }
      case "POST /api/edits": {
        const b = await body(req);
        const edits = (Array.isArray(b.edits) ? b.edits : []).map((e: any) => ({
          nodePath: String(e?.nodePath),
          property: String(e?.property),
          value: e?.value === true ? (true as const) : e?.value === null ? null : String(e?.value),
        }));
        return send(res, 200, await this.backend.editMany(String(b.overlay), edits));
      }
      case "POST /api/assign-pin": {
        const b = await body(req);
        return send(
          res,
          200,
          await this.backend.assignPin({ function: String(b.function), pin: String(b.pin), owner: String(b.owner), overlay: String(b.overlay), force: b.force === true }),
        );
      }
      case "POST /api/create-overlay":
        await body(req);
        return send(res, 200, await this.backend.createOverlay());
      default:
        return send(res, 404, { error: "not found" });
    }
  }
}

function send(res: ServerResponse, status: number, data: unknown): void {
  if (res.headersSent) return void res.end();
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(data));
}

async function body(req: IncomingMessage): Promise<any> {
  if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) throw new Error("expected JSON");
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error("body too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

/** `127.0.0.1:<port>`, `localhost:<port>` or `[::1]:<port>`; any port. */
export function isLoopbackHost(host: string | undefined): boolean {
  return /^(127\.0\.0\.1|localhost|\[::1\]):\d{1,5}$/.test(host ?? "");
}
