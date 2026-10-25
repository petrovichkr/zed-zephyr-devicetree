// SPDX-License-Identifier: Apache-2.0
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { Peer, readMessages, type Message } from "../src/jsonrpc.js";
import { OPEN_UI_COMMAND, Proxy, SHOW_UI_REQUEST } from "../src/proxy.js";

function setup(experimental?: unknown) {
  const toClient = new PassThrough();
  const toServer = new PassThrough();
  const client: Message[] = [];
  const server: Message[] = [];
  readMessages(toClient, (m) => client.push(m));
  readMessages(toServer, (m) => server.push(m));
  const proxy = new Proxy(new Peer(toClient, "zc-"), new Peer(toServer, "zc-"));
  proxy.fromZed({ jsonrpc: "2.0", id: 1, method: "initialize", params: { capabilities: { experimental } } });
  return { proxy, client, server };
}

const tick = () => new Promise((r) => setTimeout(r, 10));

describe("Proxy client features", () => {
  it("drops dts-lsp notifications for Zed and forwards them on request", async () => {
    const zed = setup();
    zed.proxy.fromServer({ jsonrpc: "2.0", method: "devicetree/activeContextStableNotification", params: {} });
    const vscode = setup({ zephyrDevicetree: { notifications: true } });
    vscode.proxy.fromServer({ jsonrpc: "2.0", method: "devicetree/activeContextStableNotification", params: {} });
    await tick();
    expect(zed.client).toEqual([]);
    expect(vscode.client.map((m) => m.method)).toEqual(["devicetree/activeContextStableNotification"]);
  });

  it("asks a capable client to show the visual editor", async () => {
    const { proxy, client } = setup({ zephyrDevicetree: { showVisualEditor: true } });
    proxy.fromZed({ jsonrpc: "2.0", id: 2, method: "workspace/executeCommand", params: { command: OPEN_UI_COMMAND } });
    await tick();
    const show = client.find((m) => m.method === SHOW_UI_REQUEST)!;
    expect(show.params.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/\?t=[0-9a-f]{32}$/);
    proxy.fromZed({ jsonrpc: "2.0", id: show.id, result: { success: true } });
    await tick();
    expect(client.find((m) => m.id === 2)).toMatchObject({ result: null });
  });
});
