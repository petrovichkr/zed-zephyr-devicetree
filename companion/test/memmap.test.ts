// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { buildMemoryMap } from "../src/ui/memmap.js";
import type { UiNode } from "../src/ui/model.js";

const loc = { file: "/b.dts", line: 0, character: 0 };
const node = (path: string, over: Partial<UiNode> & { p?: Record<string, string> } = {}): UiNode => ({
  path,
  name: path.split("/").pop()!,
  labels: [],
  disabled: false,
  compatible: [],
  children: [],
  definitions: [],
  reg: [],
  issues: 0,
  ...over,
  props: Object.entries(over.p ?? {}).map(([name, value]) => ({ name, value, origin: loc, overridden: [] })),
});
const map = (...nodes: UiNode[]) => buildMemoryMap(Object.fromEntries(nodes.map((n) => [n.path, n])));
const F = "/soc/flash-controller@1/flash@8000000";
const P = `${F}/partitions`;

describe("buildMemoryMap", () => {
  const flash = [
    node(F, { labels: ["flash0"], compatible: ["soc-nv-flash"], children: [P], p: { reg: "<0x08000000 DT_SIZE_K(1024)>" } }),
    node(P, { children: [`${P}/partition@0`, `${P}/partition@20000`, `${P}/partition@30000`] }), // compatible lost: found by name
    node(`${P}/partition@0`, { labels: ["boot_partition"], p: { reg: "<0x0 DT_SIZE_K(64)>", "read-only": "" } }),
    node(`${P}/partition@20000`, { labels: ["slot0_partition"], p: { reg: "<0x20000 0x20000>" } }),
    node(`${P}/partition@30000`, { labels: ["oops_partition"], p: { reg: "<0x30000 0x8000>" } }),
    node("/chosen", { p: { "zephyr,flash": "&flash0", "zephyr,code-partition": "&slot0_partition", "zephyr,sram": "&sram0" } }),
  ];

  it("lays out on-chip flash partitions with gaps, overlaps and chosen entries", () => {
    const [m] = map(...flash);
    expect(m).toMatchObject({ name: "flash0", kind: "flash", base: 0x08000000, size: 1024 * 1024, chosen: ["flash"], partitions: P });
    expect(m!.segments.map((s) => [s.name, s.offset, s.size, s.lane, s.overlap, s.readOnly, s.chosen])).toEqual([
      ["boot_partition", 0, 0x10000, 0, false, true, []],
      ["slot0_partition", 0x20000, 0x20000, 0, true, false, ["code-partition"]],
      ["oops_partition", 0x30000, 0x8000, 1, true, false, []],
    ]);
    expect(m!.gaps).toEqual([
      { offset: 0x10000, size: 0x10000 },
      { offset: 0x40000, size: 1024 * 1024 - 0x40000 },
    ]);
    expect(m!.issues).toEqual(["slot0_partition overlaps oops_partition"]);
  });

  it("sizes SPI NOR from its size in bits and nests RAM regions", () => {
    const nodes = [
      node("/soc/spi@1/flash@0", { labels: ["w25q128"], compatible: ["jedec,spi-nor"], children: ["/soc/spi@1/flash@0/partitions"], p: { reg: "<0>", size: "<DT_SIZE_M(128)>" } }),
      node("/soc/spi@1/flash@0/partitions", { compatible: ["fixed-partitions"], children: ["/soc/spi@1/flash@0/partitions/partition@0"] }),
      node("/soc/spi@1/flash@0/partitions/partition@0", { labels: ["storage"], p: { reg: "<0x0 0x100000>" } }),
      node("/memory@20000000", { labels: ["sram0"], compatible: ["mmio-sram"], p: { reg: "<0x20000000 0x20000>" } }),
      node("/soc/memory@20010000", { labels: ["shm"], compatible: ["zephyr,memory-region"], p: { reg: "<0x20010000 0x1000>" } }),
      node("/chosen", { p: { "zephyr,sram": "&sram0" } }),
    ];
    const [spi, ram] = map(...nodes);
    expect(spi).toMatchObject({ name: "w25q128", base: undefined, size: 16 * 1024 * 1024 });
    expect(ram).toMatchObject({ name: "sram0", kind: "ram", base: 0x20000000, size: 0x20000, chosen: ["sram"] });
    expect(ram!.segments.map((s) => [s.name, s.offset, s.size])).toEqual([["shm", 0x10000, 0x1000]]);
  });
});
