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
// New child nodes (planChild) go the same way, steps 2 and 3.

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
  /** CHILD = `name@addr { }`, REF = `&label { }`. */
  nodes: { type?: string; url: string; range: Range; scopeClose?: Pos; name?: { address?: { url: string; range: Range }[] } }[];
}

export interface ChildRequest {
  parentPath: string;
  overlay: string;
  /** Node name with unit address, `accel@19`. */
  name: string;
  props: { name: string; value: string | true }[];
}

export interface AddressRequest {
  nodePath: string;
  overlay: string;
  /** New `reg` value text, `<0x18>`. */
  reg: string;
  /** New unit address, `18`. */
  unit: string;
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
  return edit(insertInto(node, req.nodePath, req.overlay, [statement(req.property, req.value)], src));
}

/** A new child node, written into the parent's block in the overlay or a new `&parent { }`. */
export function planChild(parent: NodeSource, req: ChildRequest, src: SourceCache): WorkspaceEdit {
  const body = [`${req.name} {`, ...req.props.map((p) => `\t${statement(p.name, p.value)}`), "};"];
  return { changes: { [pathToFileURL(req.overlay).href]: [insertInto(parent, req.parentPath, req.overlay, body, src)] } };
}

/**
 * New `reg` plus, when every `name@addr { }` definition of the node lives in
 * the overlay, the matching unit address. A node also defined elsewhere keeps
 * its name: renaming it in the overlay would create a second node.
 */
export function planAddress(node: NodeSource, req: AddressRequest, src: SourceCache): WorkspaceEdit {
  const uri = pathToFileURL(req.overlay).href;
  const edits = planEdit(node, { nodePath: req.nodePath, overlay: req.overlay, property: "reg", value: req.reg }, src).changes[uri]!;
  const named = node.nodes.filter((d) => d.type === "CHILD");
  if (named.length && named.every((d) => sameFile(d.url, req.overlay))) {
    for (const d of named) for (const a of d.name?.address ?? []) if (sameFile(a.url, req.overlay)) edits.push({ range: a.range, newText: req.unit });
  }
  return { changes: { [uri]: edits } };
}

/** Steps 2 and 3: `lines` (one indent level below the node) go into its last block or a new reference block. */
function insertInto(node: NodeSource, nodePath: string, overlay: string, lines: string[], src: SourceCache): TextEdit {
  // 2. insert into the last block of this node in the overlay
  const block = node.nodes.filter((d) => sameFile(d.url, overlay) && d.scopeClose).at(-1);
  if (block?.scopeClose) {
    const close = block.scopeClose;
    const line = src.lines(overlay)[close.line] ?? "";
    const indent = /^\s*/.exec(line.slice(0, close.character))?.[0] ?? "";
    const onlyIndentBefore = line.slice(0, close.character).trim() === "";
    const text = lines.map((l) => `${indent}\t${l}\n`).join("");
    return onlyIndentBefore
      ? { range: { start: { line: close.line, character: 0 }, end: { line: close.line, character: 0 } }, newText: text }
      : { range: { start: close, end: close }, newText: `\n${text}${indent}` };
  }

  // 3. append a new reference block
  const ref = node.labels[0] ? `&${node.labels[0]}` : `&{${nodePath}}`;
  const all = src.lines(overlay);
  const last = Math.max(all.length - 1, 0);
  const end = { line: last, character: (all[last] ?? "").length };
  const lead = all.length && all.join("").trim() ? ((all[last] ?? "") === "" ? "\n" : "\n\n") : "";
  return { range: { start: end, end }, newText: `${lead}${ref} {\n${lines.map((l) => `\t${l}\n`).join("")}};\n` };
}
