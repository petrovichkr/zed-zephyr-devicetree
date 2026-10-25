// SPDX-License-Identifier: Apache-2.0

import { request } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyChanges } from "../src/documents.js";
import { isLoopbackHost, UiServer, type UiBackend } from "../src/ui/server.js";

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
    catalog: async (bus) => (bus === "i2c" ? [{ compatible: "st,lis2dh12", file: "/b.yaml", required: [] }] : []),
    addNode: async (req) => {
      edits.push(req);
      return { applied: true };
    },
    setAddress: async (req) => {
      edits.push(req);
      return { applied: true };
    },
    editMany: async (overlay, list) => {
      edits.push({ overlay, list });
      return { applied: true };
    },
    assignPin: async (req) => {
      edits.push(req);
      return { applied: true };
    },
    createOverlay: async () => ({ applied: true, file: "/w/app/boards/b.overlay" }),
    movePin: async (req) => {
      edits.push(req);
      return { applied: false, conflict: ["/soc/x"] };
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
    expect((await call("/api/contexts", { token: token(), host: "localhost.evil.example:80" })).status).toBe(403);
  });

  it("accepts a forwarded loopback port (VS Code Remote)", async () => {
    expect((await call("/api/contexts", { token: token(), host: "localhost:41234" })).status).toBe(200);
    expect(isLoopbackHost("[::1]:8080")).toBe(true);
    expect(isLoopbackHost("127.0.0.1")).toBe(false);
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

  it("serves the device catalog and node additions", async () => {
    const cat = await call("/api/catalog?bus=i2c", { token: token() });
    expect(JSON.parse(cat.body).map((e: { compatible: string }) => e.compatible)).toEqual(["st,lis2dh12"]);
    edits.length = 0;
    const body = JSON.stringify({ parentPath: "/soc/i2c@1", overlay: "/o.overlay", name: "accel@19", props: [{ name: "reg", value: "<0x19>" }, { name: "x", value: true }] });
    expect(JSON.parse((await call("/api/add-node", { token: token(), method: "POST", body, type: "application/json" })).body)).toEqual({ applied: true });
    const addr = JSON.stringify({ nodePath: "/soc/i2c@1/accel@19", overlay: "/o.overlay", reg: "<0x18>", unit: "18" });
    await call("/api/address", { token: token(), method: "POST", body: addr, type: "application/json" });
    expect(edits).toEqual([
      { parentPath: "/soc/i2c@1", overlay: "/o.overlay", name: "accel@19", props: [{ name: "reg", value: "<0x19>" }, { name: "x", value: true }] },
      { nodePath: "/soc/i2c@1/accel@19", overlay: "/o.overlay", reg: "<0x18>", unit: "18" },
    ]);
  });
});
