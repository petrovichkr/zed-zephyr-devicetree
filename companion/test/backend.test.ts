// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { DocumentStore } from "../src/documents.js";
import type { Peer } from "../src/jsonrpc.js";
import { EditorBackend } from "../src/ui/backend.js";

function fakeServer() {
  const calls: string[] = [];
  const server = {
    async request(method: string) {
      calls.push(method);
      if (method === "devicetree/getContexts") return [{ id: "c1", ctxNames: ["build/x"], active: true, settings: {} }];
      if (method === "devicetree/serializedContext") {
        await new Promise((r) => setTimeout(r, 20));
        return { "/": { name: "/", fullName: "/", labels: [], properties: [], nodes: [], childNodes: [] } };
      }
      return undefined;
    },
  } as unknown as Peer;
  return { server, serializations: () => calls.filter((c) => c === "devicetree/serializedContext").length };
}

const backend = (server: Peer) =>
  new EditorBackend({ zed: server, server, docs: new DocumentStore(), external: () => [], canShowDocument: () => false });

describe("EditorBackend model cache", () => {
  it("shares one serialization between concurrent requests and reuses it until invalidated", async () => {
    const f = fakeServer();
    const b = backend(f.server);
    const [m1, m2] = await Promise.all([b.model(), b.model()]);
    expect(m1?.nodes["/"]).toBeDefined();
    expect(m2?.nodes["/"]).toBeDefined();
    expect(f.serializations()).toBe(1);

    await b.model();
    expect(f.serializations()).toBe(1);

    b.invalidate();
    await b.model();
    expect(f.serializations()).toBe(2);
  });
});
