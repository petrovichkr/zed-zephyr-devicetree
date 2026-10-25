// SPDX-License-Identifier: Apache-2.0
//
// Memory map (like the flash diagram of nRF DeviceTree): one column per memory
// device with its partitions or sub-regions, free gaps and overlaps.
//   flash  a node with a `fixed-partitions` child: on-chip flash (size from reg)
//          or SPI NOR (size from `size`, in bits); segments are the partitions
//   RAM    memory regions (mmio-sram, zephyr,memory-region, memory@, sram@);
//          segments are the regions that lie inside a larger one
// /chosen entries (zephyr,code-partition, zephyr,sram, ...) are attached to the
// node they point at.

import { cellNumber } from "./buses.js";
import type { UiNode } from "./model.js";
import { cells } from "./pins.js";

export interface UiMemSegment {
  path: string;
  /** Label or `label` property or node name. */
  name: string;
  /** Offset from the start of the memory. */
  offset: number;
  size: number;
  readOnly: boolean;
  disabled: boolean;
  chosen: string[];
  /** 0 normally; overlapping segments go to further lanes. */
  lane: number;
  overlap: boolean;
}

export interface UiMemory {
  path: string;
  name: string;
  kind: "flash" | "ram";
  /** Absolute address of offset 0 when the memory is mapped (on-chip flash, RAM). */
  base?: number;
  size: number;
  chosen: string[];
  disabled: boolean;
  /** Where new partitions go (flash only). */
  partitions?: string;
  segments: UiMemSegment[];
  gaps: { offset: number; size: number }[];
  issues: string[];
}

const num = (v: string | undefined, i = 0): number | undefined => {
  const c = cells(v ?? "")[i];
  return c === undefined ? undefined : cellNumber(c);
};
const prop = (n: UiNode, name: string) => n.props.find((p) => p.name === name)?.value;
const nameOf = (n: UiNode) => n.labels[0] ?? /"([^"]*)"/.exec(prop(n, "label") ?? "")?.[1] ?? n.name;
/** `<start size>` with one address and one size cell, the usual case for memories and partitions. */
const regOf = (n: UiNode): [number, number] | undefined => {
  const start = num(prop(n, "reg"), 0);
  const size = num(prop(n, "reg"), 1);
  return start !== undefined && size !== undefined ? [start, size] : n.reg[0] ? [n.reg[0].start, n.reg[0].size] : undefined;
};
const RAM = /^(mmio-sram|zephyr,memory-region)$/;

export function buildMemoryMap(nodes: Record<string, UiNode>): UiMemory[] {
  const all = Object.values(nodes);
  const byLabel = new Map(all.flatMap((n) => n.labels.map((l) => [l, n.path] as const)));
  const chosen = new Map<string, string[]>();
  for (const p of nodes["/chosen"]?.props ?? []) {
    const target = byLabel.get(/&([A-Za-z_]\w*)/.exec(p.value)?.[1] ?? "");
    if (target) chosen.set(target, [...(chosen.get(target) ?? []), p.name.replace(/^zephyr,/, "")]);
  }
  const out: UiMemory[] = [];

  // flash devices with partitions
  // the compatible may come from a location dts-lsp marks as virtual: the node name is the fallback
  const isPartitions = (n: UiNode) => n.compatible.includes("fixed-partitions") || /fixed-partitions/.test(n.binding ?? "") || n.name === "partitions";
  for (const parts of all.filter(isPartitions)) {
    const dev = nodes[parts.path.slice(0, parts.path.lastIndexOf("/"))];
    if (!dev) continue;
    const reg = regOf(dev);
    const bits = num(prop(dev, "size"));
    const onChip = dev.compatible.includes("soc-nv-flash");
    const size = onChip ? (reg?.[1] ?? 0) : bits ? bits / 8 : (reg?.[1] ?? 0);
    const segs = parts.children
      .map((c) => nodes[c])
      .filter((c): c is UiNode => !!c)
      .flatMap((c) => {
        const r = regOf(c);
        return r ? [{ path: c.path, name: nameOf(c), offset: r[0], size: r[1], readOnly: c.props.some((p) => p.name === "read-only"), disabled: c.disabled, chosen: chosen.get(c.path) ?? [], lane: 0, overlap: false }] : [];
      });
    if (!segs.length) continue;
    // the parent of an on-chip flash is the controller; the flash itself is mapped at its reg
    out.push(finish({ path: dev.path, name: nameOf(dev), kind: "flash", base: onChip ? reg?.[0] : undefined, size, chosen: chosen.get(dev.path) ?? [], disabled: dev.disabled, partitions: parts.path, segments: segs, gaps: [], issues: [] }));
  }

  // RAM regions, nested by address
  const rams = all
    .filter((n) => n.compatible.some((c) => RAM.test(c)) || (/^(memory|sram)@/.test(n.name) && !n.compatible.length))
    .flatMap((n) => {
      const r = regOf(n);
      return r && r[1] > 0 ? [{ n, start: r[0], size: r[1] }] : [];
    });
  const inside = (a: (typeof rams)[0], b: (typeof rams)[0]) => a !== b && a.start >= b.start && a.start + a.size <= b.start + b.size && a.size < b.size;
  for (const top of rams.filter((r) => !rams.some((o) => inside(r, o)))) {
    const direct = rams.filter((r) => inside(r, top) && !rams.some((o) => inside(r, o) && inside(o, top)));
    out.push(
      finish({
        path: top.n.path,
        name: nameOf(top.n),
        kind: "ram",
        base: top.start,
        size: top.size,
        chosen: chosen.get(top.n.path) ?? [],
        disabled: top.n.disabled,
        segments: direct.map((r) => ({ path: r.n.path, name: nameOf(r.n), offset: r.start - top.start, size: r.size, readOnly: false, disabled: r.n.disabled, chosen: chosen.get(r.n.path) ?? [], lane: 0, overlap: false })),
        gaps: [],
        issues: [],
      }),
    );
  }

  // code flash first, then other flash, then the chosen SRAM, then the rest by address
  const rank = (m: UiMemory) => (m.kind === "flash" ? (m.chosen.includes("flash") ? 0 : 1) : m.chosen.includes("sram") ? 2 : 3);
  return out.sort((a, b) => rank(a) - rank(b) || (a.base ?? 0) - (b.base ?? 0) || a.path.localeCompare(b.path));
}

/** Lanes for overlaps, free gaps and range checks. */
function finish(m: UiMemory): UiMemory {
  m.segments.sort((a, b) => a.offset - b.offset || b.size - a.size);
  const laneEnds: number[] = [];
  for (const s of m.segments) {
    let lane = laneEnds.findIndex((end) => end <= s.offset);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = s.offset + s.size;
    s.lane = lane;
  }
  for (const a of m.segments) {
    for (const b of m.segments) {
      if (a !== b && a.offset < b.offset + b.size && b.offset < a.offset + a.size) {
        a.overlap = true;
        if (a.offset < b.offset || (a.offset === b.offset && a.path < b.path)) m.issues.push(`${a.name} overlaps ${b.name}`);
      }
    }
    if (m.size && a.offset + a.size > m.size) m.issues.push(`${a.name} ends past the end of ${m.name}`);
  }
  let cursor = 0;
  for (const s of m.segments) {
    if (s.offset > cursor) m.gaps.push({ offset: cursor, size: s.offset - cursor });
    cursor = Math.max(cursor, s.offset + s.size);
  }
  if (m.size > cursor) m.gaps.push({ offset: cursor, size: m.size - cursor });
  return m;
}
