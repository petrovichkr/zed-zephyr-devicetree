// SPDX-License-Identifier: Apache-2.0
// Discovery on a synthetic workspace shaped like a real T2 workspace:
// manifest repo == topdir, zephyr imported with path-prefix and an allowlist,
// the repo itself is a module, sysbuild and plain builds, twister output.

import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { loadWorkspace, parseIni, readManifestProjects } from "../src/west.js";
import { discoverBuilds, externalRoots, isUnder, newOverlayTarget, pristineCommand, restrictedDefaults, withPendingOverlay, workspaceModules } from "../src/zephyr.js";

let top: string;
const put = (rel: string, text = "") => {
  const file = join(top, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};
const buildInfo = (files: string[], extra = "") =>
  `cmake:\n${extra}  devicetree:\n    bindings-dirs:\n     - '${top}/dts/bindings'\n    files:\n${files
    .map((f) => `     - '${top}/${f}'\n`)
    .join("")}    include-dirs:\n     - '${top}/dts'\n`;

beforeAll(() => {
  top = mkdtempSync(join(tmpdir(), "zdt-"));
  put(".west/config", "[manifest]\npath = .\nfile = west.yml\n\n[zephyr]\nbase = dist/zp/zephyr\n");
  put(
    "west.yml",
    `manifest:
  projects:
  - name: zephyr
    revision: v4.5.0-rc1
    import:
      path-prefix: dist/zp
      name-allowlist: [hal_stm32]
  - name: lora-ext
    path: dist/fwlib/lora-ext
  self:
    path: app
`,
  );
  put(
    "dist/zp/zephyr/west.yml",
    "manifest:\n  projects:\n  - name: hal_stm32\n    path: modules/hal/stm32\n  - name: hal_nordic\n    path: modules/hal/nordic\n",
  );
  put("dist/zp/zephyr/dts/bindings/base.yaml");
  put("dist/zp/zephyr/dts/arm/armv7-m.dtsi");
  put("dist/zp/zephyr/dts/common/skeleton.dtsi");
  put("dist/zp/zephyr/include/zephyr/devicetree.h");
  put("dist/zp/modules/hal/stm32/zephyr/module.yml", "name: hal_stm32\nbuild:\n  settings:\n    dts_root: .\n");
  put("dist/zp/modules/hal/stm32/dts/st/f4/stm32f405.dtsi");
  put("dist/fwlib/lora-ext/zephyr/module.yml", "build:\n  settings:\n    dts_root: .\n");
  put("dist/fwlib/lora-ext/dts/bindings/lora.yaml");
  put("zephyr/module.yml", "build:\n  settings:\n    board_root: .\n    dts_root: .\n");
  put("dts/bindings/vendor-prefixes.txt");

  // sysbuild: top-level images list, per-image build_info with devicetree
  put("build/main/build_info.yml", "cmake:\n  images:\n   - name: 'app'\n   - name: 'mcuboot'\n  sysbuild: 'true'\n");
  const app = (dir: string) => `  application:\n    source-dir: '${top}/${dir}'\n  board:\n    name: 'b'\n    qualifiers: 'soc/cpu'\n`;
  put("build/main/app/build_info.yml", buildInfo(["boards/b.dts"], app("apps/app")));
  put("build/main/mcuboot/build_info.yml", buildInfo(["boards/b.dts", "apps/app/sysbuild/mcuboot/boards/b.overlay"], app("dist/zp/bootloader/mcuboot/boot/zephyr")));
  put("build/main/app/compile_commands.json", "[]");
  // plain build
  put("build/ns/build_info.yml", buildInfo(["boards/native_sim.dts", "apps/app/boards/native_sim.overlay"]));
  // ignored
  put("build/twister-out/x/build_info.yml", buildInfo(["boards/b.dts"]));
  const old = new Date(Date.now() - 3600_000);
  utimesSync(join(top, "build/ns/build_info.yml"), old, old);
});

describe("west", () => {
  it("parses west config", () => {
    expect(parseIni("[zephyr]\nbase = a/b\n# c\n").zephyr?.base).toBe("a/b");
  });

  it("resolves projects through imports with path-prefix and allowlist", () => {
    const projects = readManifestProjects({ topdir: top, manifestPath: top, manifestFile: "west.yml" });
    const byName = Object.fromEntries(projects.map((p) => [p.name, p.path]));
    expect(byName.zephyr).toBe(join(top, "dist/zp/zephyr"));
    expect(byName.hal_stm32).toBe(join(top, "dist/zp/modules/hal/stm32"));
    expect(byName["lora-ext"]).toBe(join(top, "dist/fwlib/lora-ext"));
    expect(byName.hal_nordic).toBeUndefined();
  });

  it("finds the topdir from a nested directory", async () => {
    // no west binary on PATH inside the fixture: env without PATH forces the manifest reader
    const ws = await loadWorkspace(join(top, "build/main"), { PATH: "" });
    expect(ws?.topdir).toBe(top);
    expect(ws?.zephyrBase).toBe(join(top, "dist/zp/zephyr"));
  });
});

describe("zephyr", () => {
  it("builds one context per sysbuild image, newest first, skipping twister", () => {
    const builds = discoverBuilds(top);
    expect(builds.map((b) => b.ctxName)).toEqual(expect.arrayContaining(["build/main/app", "build/main/mcuboot", "build/ns"]));
    expect(builds).toHaveLength(3);
    expect(builds.at(-1)!.ctxName).toBe("build/ns");
    const mcuboot = builds.find((b) => b.ctxName === "build/main/mcuboot")!;
    expect(mcuboot.dtsFile).toBe(join(top, "boards/b.dts"));
    expect(mcuboot.overlays).toEqual([join(top, "apps/app/sysbuild/mcuboot/boards/b.overlay")]);
    expect(builds.find((b) => b.ctxName === "build/main/app")!.compileCommands).toBeDefined();
  });

  it("offers a board overlay in the application for a build without a user overlay", async () => {
    const ext = externalRoots((await loadWorkspace(top, { PATH: "" }))!);
    const builds = discoverBuilds(top);
    const app = builds.find((b) => b.ctxName === "build/main/app")!;
    const target = join(top, "apps/app/boards/b.overlay");
    expect(app.appDir).toBe(join(top, "apps/app"));
    expect(newOverlayTarget(app, ext)).toBe(target);
    // has a user overlay already
    expect(newOverlayTarget(builds.find((b) => b.ctxName === "build/main/mcuboot")!, ext)).toBeUndefined();
    // SDK application (hello_world, mcuboot): never written
    expect(newOverlayTarget({ ...app, appDir: join(top, "dist/zp/zephyr/samples/hello_world") }, ext)).toBeUndefined();
    expect(withPendingOverlay(app, ext).pending).toBeUndefined();

    put("apps/app/boards/b.overlay", "/* new */\n");
    expect(newOverlayTarget(app, ext)).toBeUndefined();
    const pending = withPendingOverlay(app, ext);
    expect(pending.overlays).toEqual([target]);
    expect(pending.pending).toEqual([target]);
    // once cmake lists it, nothing is pending
    expect(withPendingOverlay({ ...app, overlays: [target] }, ext).pending).toBeUndefined();
  });

  it("rebuilds pristine with the recorded west command", () => {
    expect(pristineCommand("/w/.venv/bin/west build -b b/soc/cpu apps/app -d build/main -p --sysbuild -- -DX=1", "build/main")).toBe(
      "west build -p -b b/soc/cpu apps/app -d build/main --sysbuild -- -DX=1",
    );
    expect(pristineCommand("west build -p auto -b b app", "build")).toBe("west build -p -b b app");
    expect(pristineCommand(undefined, "build/x")).toBe("west build -d build/x -p");
  });

  it("derives restricted-mode defaults from modules and zephyr", async () => {
    const ws = (await loadWorkspace(top, { PATH: "" }))!;
    const d = restrictedDefaults(ws, workspaceModules(ws));
    // module dts roots in project order (manifest repo first), Zephyr last;
    // hal_stm32 has a dts root but no bindings directory
    expect(d.defaultZephyrBindings).toEqual([
      join(top, "dts/bindings"),
      join(top, "dist/fwlib/lora-ext/dts/bindings"),
      join(top, "dist/zp/zephyr/dts/bindings"),
    ]);
    expect(d.defaultIncludePaths).toContain(join(top, "dist/zp/zephyr/dts/arm"));
    expect(d.defaultIncludePaths).toContain(join(top, "dist/zp/modules/hal/stm32/dts"));
    expect(d.defaultIncludePaths).not.toContain(join(top, "dist/zp/zephyr/dts/bindings"));
  });

  it("treats every non-manifest project as external", async () => {
    const ws = (await loadWorkspace(top, { PATH: "" }))!;
    const ext = externalRoots(ws);
    expect(isUnder(join(top, "dist/zp/zephyr/dts/arm/x.dtsi"), ext)).toBe(true);
    expect(isUnder(join(top, "boards/b.dts"), ext)).toBe(false);
  });
});
