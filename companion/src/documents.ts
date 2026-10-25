// SPDX-License-Identifier: Apache-2.0
//
// Texts of the documents Zed has open, kept in sync from didOpen/didChange so
// edits are planned against the buffer the user sees, not the file on disk.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface Pos {
  line: number;
  character: number;
}
interface Change {
  range?: { start: Pos; end: Pos };
  text: string;
}

function offsetOf(text: string, pos: Pos): number {
  let offset = 0;
  for (let line = 0; line < pos.line; line++) {
    const nl = text.indexOf("\n", offset);
    if (nl < 0) return text.length;
    offset = nl + 1;
  }
  // LSP characters are UTF-16 code units, as are JS string indices
  return Math.min(offset + pos.character, text.length);
}

export function applyChanges(text: string, changes: Change[]): string {
  for (const c of changes) {
    if (!c.range) text = c.text;
    else text = text.slice(0, offsetOf(text, c.range.start)) + c.text + text.slice(offsetOf(text, c.range.end));
  }
  return text;
}

export class DocumentStore {
  private docs = new Map<string, string>();

  /** Feed every Zed -> server message through here. */
  observe(method: string | undefined, params: any): boolean {
    const uri: string | undefined = params?.textDocument?.uri;
    if (!uri?.startsWith("file:")) return false;
    const file = fileURLToPath(uri);
    switch (method) {
      case "textDocument/didOpen":
        this.docs.set(file, params.textDocument.text ?? "");
        return true;
      case "textDocument/didChange":
        this.docs.set(file, applyChanges(this.docs.get(file) ?? this.read(file), params.contentChanges ?? []));
        return true;
      case "textDocument/didClose":
        this.docs.delete(file);
        return true;
      case "textDocument/didSave":
        return true;
    }
    return false;
  }

  read = (file: string): string => this.docs.get(file) ?? readFileSync(file, "utf8");
}
