// SPDX-License-Identifier: Apache-2.0
//
// usage: companion.js --server <dts-lsp server.js | executable> [server args...] [--stdio]
//        companion.js --bindings [--stdio]   (Zephyr binding YAML language server)
// Speaks LSP on stdio; logs go to stderr (Zed shows them in the server log).

import { spawn } from "node:child_process";
import { Peer, readMessages } from "./jsonrpc.js";
import { Proxy } from "./proxy.js";
import { BindingsServer } from "./bindings/lsp.js";

function parseArgs(argv: string[]) {
  const i = argv.indexOf("--server");
  if (i < 0 || !argv[i + 1]) throw new Error("--server <path> is required");
  const server = argv[i + 1]!;
  const rest = argv.slice(i + 2).filter((a) => a !== "--stdio");
  return { server, args: [...rest, "--stdio"] };
}

if (process.argv.includes("--bindings")) {
  const server = new BindingsServer(new Peer(process.stdout, "zb-"));
  readMessages(process.stdin, (m) => server.handle(m));
} else {
  startProxy();
}

function startProxy(): void {
  const { server, args } = parseArgs(process.argv.slice(2));
  const isScript = /\.[cm]?js$/.test(server);
  const child = spawn(isScript ? process.execPath : server, isScript ? [server, ...args] : args, {
    stdio: ["pipe", "pipe", "inherit"],
  });
  child.on("exit", (code) => process.exit(code ?? 1));
  process.stdin.on("end", () => child.kill());

  const proxy = new Proxy(new Peer(process.stdout, "zc-"), new Peer(child.stdin!, "zc-"));
  readMessages(process.stdin, (m) => proxy.fromZed(m));
  readMessages(child.stdout!, (m) => proxy.fromServer(m));
}
