// SPDX-License-Identifier: Apache-2.0

import { request } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyChanges } from "../src/documents.js";
import { UiServer, type UiBackend } from "../src/ui/server.js";

describe("applyChanges", () => {
  it("applies incremental and full changes", () => {
    const text = "&uart0 {\n\tstatus = \"disabled\";\n};\n";
    const edited = applyChanges(text, [
      { range: { start: { line: 1, character: 10 }, end: { line: 1, character: 20 } }, text: '"okay"' },
    ]);
    expect(edited).toBe('&uart0 {\n\tstatus = "okay";\n};\n');
    expect(applyChanges(edited, [{ text: "x" }])).toBe("x");
  });
});

describe("UiServer", () => {
  const edits: unknown[] = [];
  const backend: UiBackend = {
    contexts: async () => [{ id: "a", names: ["build/x"], active: true, overlays: [] }],
    model: async () => undefined,
    setActive: async () => undefined,
    open: async () => undefined,
    edit: async (req) => {
      edits.push(req);
      return { applied: true };
    },
  };
  const server = new UiServer(backend);
  let base: URL;

  beforeAll(async () => {
    base = new URL(await server.start());
  });
  afterAll(() => undefined);

  const call = (path: string, opts: { token?: string; host?: string; method?: string; body?: string; type?: string } = {}) =>
    new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = request(
        {
          host: "127.0.0.1",
          port: base.port,
          path,
          method: opts.method ?? "GET",
          headers: {
            host: opts.host ?? base.host,
            ...(opts.token !== undefined ? { "x-token": opts.token } : {}),
            ...(opts.type ? { "content-type": opts.type } : {}),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (c) => (body += c));
          res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
        },
      );
      req.on("error", reject);
      req.end(opts.body);
    });
  const token = () => base.searchParams.get("t")!;

  it("rejects requests without the token or with a foreign Host", async () => {
    expect((await call("/api/contexts")).status).toBe(403);
    expect((await call("/api/contexts", { token: "nope" })).status).toBe(403);
    expect((await call("/api/contexts", { token: token(), host: "evil.example:80" })).status).toBe(403);
  });

  it("serves the page and the API with the token", async () => {
    expect((await call(`/?t=${token()}`)).status).toBe(200);
    const res = await call("/api/contexts", { token: token() });
    expect(JSON.parse(res.body)[0].names).toEqual(["build/x"]);
    expect((await call("/api/model", { token: token() })).status).toBe(204);
  });

  it("accepts edits only as JSON", async () => {
    const body = JSON.stringify({ nodePath: "/a", overlay: "/o.overlay", property: "status", value: '"okay"' });
    expect((await call("/api/edit", { token: token(), method: "POST", body, type: "text/plain" })).status).toBe(500);
    const ok = await call("/api/edit", { token: token(), method: "POST", body, type: "application/json" });
    expect(JSON.parse(ok.body)).toEqual({ applied: true });
    expect(edits).toEqual([{ nodePath: "/a", overlay: "/o.overlay", property: "status", value: '"okay"' }]);
  });
});
