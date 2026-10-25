// SPDX-License-Identifier: Apache-2.0
// LSP base protocol framing (Content-Length headers) over Node streams.

import type { Readable, Writable } from "node:stream";

export type Id = number | string;
export interface Message {
  jsonrpc: "2.0";
  id?: Id;
  method?: string;
  params?: any;
  result?: any;
  error?: { code: number; message: string; data?: unknown };
}

export function readMessages(stream: Readable, onMessage: (msg: Message) => void): void {
  let buf = Buffer.alloc(0);
  stream.on("data", (chunk: Buffer) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      const sep = buf.indexOf("\r\n\r\n");
      if (sep < 0) return;
      const header = buf.subarray(0, sep).toString("ascii");
      const len = Number(/content-length:\s*(\d+)/i.exec(header)?.[1]);
      if (!Number.isFinite(len)) throw new Error(`bad LSP header: ${header}`);
      if (buf.length < sep + 4 + len) return;
      const body = buf.subarray(sep + 4, sep + 4 + len).toString("utf8");
      buf = buf.subarray(sep + 4 + len);
      onMessage(JSON.parse(body));
    }
  });
}

export function writeMessage(stream: Writable, msg: Message): void {
  const body = Buffer.from(JSON.stringify(msg), "utf8");
  stream.write(`Content-Length: ${body.length}\r\n\r\n`);
  stream.write(body);
}

/**
 * One side of the proxy. Requests the companion originates use string ids with
 * a prefix, so they never collide with the numeric ids of Zed or dts-lsp.
 */
export class Peer {
  private next = 1;
  private pending = new Map<Id, { resolve: (v: any) => void; reject: (e: Error) => void }>();

  constructor(
    private readonly out: Writable,
    private readonly prefix: string,
  ) {}

  send(msg: Omit<Message, "jsonrpc">): void {
    writeMessage(this.out, { jsonrpc: "2.0", ...msg });
  }

  notify(method: string, params?: unknown): void {
    this.send({ method, params });
  }

  request<T = any>(method: string, params?: unknown): Promise<T> {
    const id = `${this.prefix}${this.next++}`;
    this.send({ id, method, params });
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  /** Returns true when `msg` answered one of our own requests. */
  settle(msg: Message): boolean {
    if (msg.method || msg.id === undefined) return false;
    const p = this.pending.get(msg.id);
    if (!p) return false;
    this.pending.delete(msg.id);
    if (msg.error) p.reject(new Error(msg.error.message));
    else p.resolve(msg.result);
    return true;
  }
}
