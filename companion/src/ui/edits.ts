// SPDX-License-Identifier: Apache-2.0
//
// Turns a visual-editor request into an LSP WorkspaceEdit on one overlay file.
// The edit is applied by Zed (workspace/applyEdit), so it lands in the buffer
// and never clobbers unsaved changes (SPEC 4.3, risk "dirty file").
//
// Strategy, most local first:
// 1. the property is already assigned in the target overlay -> replace it;
// 2. the node is already opened in the overlay (`&label {` / `node {`) -> insert
//    before its closing brace;
// 3. otherwise append `&label { ... };` (or `&{/path} { ... };`) to the overlay.

import { pathToFileURL } from "node:url";
import type { SourceCache } from "./model.js";

export interface EditRequest {
  nodePath: string;
  /** Target overlay (absolute path). */
  overlay: string;
  property: string;
  /**
   * DTS value text as it should appear after `=` (`"okay"`, `<1 2>`, `&gpio0`).
   * `true` writes a boolean property (`name;`), `null` removes it: the overlay's
   * own assignment is deleted, or `/delete-property/` is added otherwise.
   */
  value: string | true | null;
}

interface Pos {
  line: number;
  character: number;
}
interface Range {
  start: Pos;
  end: Pos;
}
export interface TextEdit {
  range: Range;
  newText: string;
}
export interface WorkspaceEdit {
  changes: Record<string, TextEdit[]>;
}

/** The parts of a serialized dts-lsp node the planner needs. */
export interface NodeSource {
  labels: string[];
  properties: { name: { value: string }; url: string; range: Range }[];
  nodes: { url: string; range: Range; scopeClose?: Pos }[];
}

const sameFile = (url: string, file: string) => url === pathToFileURL(file).href;

function statement(property: string, value: string | true | null): string {
  if (value === null) return `/delete-property/ ${property};`;
  if (value === true) return `${property};`;
  return `${property} = ${value};`;
}

export function planEdit(node: NodeSource, req: EditRequest, src: SourceCache): WorkspaceEdit {
  const uri = pathToFileURL(req.overlay).href;
  const edit = (e: TextEdit): WorkspaceEdit => ({ changes: { [uri]: [e] } });

  // 1. replace (or drop) the overlay's own assignment
  const own = node.properties.filter((p) => p.name.value === req.property && sameFile(p.url, req.overlay)).at(-1);
  if (own) {
    if (req.value === null) {
      const line = src.lines(req.overlay)[own.range.start.line] ?? "";
      const wholeLine = line.trim() === src.slice(req.overlay, own.range).trim();
      return edit({
        range: wholeLine
          ? { start: { line: own.range.start.line, character: 0 }, end: { line: own.range.start.line + 1, character: 0 } }
          : own.range,
        newText: "",
      });
    }
    return edit({ range: own.range, newText: statement(req.property, req.value) });
  }

  // 2. insert into the last block of this node in the overlay
  const block = node.nodes.filter((d) => sameFile(d.url, req.overlay) && d.scopeClose).at(-1);
  if (block?.scopeClose) {
    const close = block.scopeClose;
    const line = src.lines(req.overlay)[close.line] ?? "";
    const indent = /^\s*/.exec(line.slice(0, close.character))?.[0] ?? "";
    const onlyIndentBefore = line.slice(0, close.character).trim() === "";
    const text = `${indent}\t${statement(req.property, req.value)}\n`;
    return onlyIndentBefore
      ? edit({ range: { start: { line: close.line, character: 0 }, end: { line: close.line, character: 0 } }, newText: text })
      : edit({ range: { start: close, end: close }, newText: `\n${text}${indent}` });
  }

  // 3. append a new reference block
  const ref = node.labels[0] ? `&${node.labels[0]}` : `&{${req.nodePath}}`;
  const lines = src.lines(req.overlay);
  const last = Math.max(lines.length - 1, 0);
  const end = { line: last, character: (lines[last] ?? "").length };
  const lead = lines.length && lines.join("").trim() ? ((lines[last] ?? "") === "" ? "\n" : "\n\n") : "";
  return edit({
    range: { start: end, end },
    newText: `${lead}${ref} {\n\t${statement(req.property, req.value)}\n};\n`,
  });
}
