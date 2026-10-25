// SPDX-License-Identifier: Apache-2.0
//
// Zephyr knowledge on top of the west model: modules (module.yml), build
// directories (build_info.yml, sysbuild images) and the dts-lsp settings and
// contexts derived from them (SPEC R1-R6, D9, D10).

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { parse as parseYaml } from "yaml";
import type { WestWorkspace } from "./west.js";

export interface ZephyrModule {
  name: string;
  path: string;
  dtsRoot?: string;
  boardRoot?: string;
  snippetRoot?: string;
}

/** dts-lsp `Context` (subset we produce). */
export interface DtsContext {
  ctxName: string;
  cwd?: string;
  dtsFile: string;
  overlays: string[];
  includePaths: string[];
  zephyrBindings: string[];
  bindingType: "Zephyr";
  compileCommands?: string;
}

export interface BuildContext extends DtsContext {
  buildDir: string;
  image?: string;
  mtimeMs: number;
}

export interface DiscoveryOptions {
  /** Directories (relative to the topdir) whose children may be build dirs. */
  buildParents: string[];
  /** Directory-name globs that are never build dirs. */
  exclude: string[];
}

export const defaultDiscovery: DiscoveryOptions = {
  buildParents: [".", "build"],
  exclude: ["twister-out*", "twister-*", "twister"],
};

export function readModule(name: string, path: string): ZephyrModule | undefined {
  const file = join(path, "zephyr", "module.yml");
  if (!existsSync(file)) return undefined;
  const doc = parseYaml(readFileSync(file, "utf8")) ?? {};
  const s = doc.build?.settings ?? {};
  const abs = (v?: string) => (v === undefined ? undefined : resolve(path, v));
  return {
    name: doc.name ?? name,
    path,
    dtsRoot: abs(s.dts_root),
    boardRoot: abs(s.board_root),
    snippetRoot: abs(s.snippet_root),
  };
}

export function workspaceModules(ws: WestWorkspace): ZephyrModule[] {
  return ws.projects.flatMap((p) => readModule(p.name, p.path) ?? []);
}

const globToRegExp = (glob: string) =>
  new RegExp("^" + glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");

function subdirs(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("."))
      .map((d) => join(dir, d.name));
  } catch {
    return [];
  }
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

function readBuildInfo(file: string): any {
  try {
    return parseYaml(readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
}

function contextFromBuildInfo(file: string, ctxName: string, buildDir: string, image?: string): BuildContext | undefined {
  const info = readBuildInfo(file);
  const dt = info?.cmake?.devicetree;
  const files = strings(dt?.files);
  if (!files.length) return undefined;
  const dir = join(file, "..");
  const compileCommands = join(dir, "compile_commands.json");
  return {
    ctxName,
    buildDir,
    image,
    mtimeMs: statSync(file).mtimeMs,
    dtsFile: files[0]!,
    // build_info lists the board dts first, then every overlay in build order
    overlays: files.slice(1),
    includePaths: strings(dt["include-dirs"]),
    zephyrBindings: strings(dt["bindings-dirs"]),
    bindingType: "Zephyr",
    compileCommands: existsSync(compileCommands) ? compileCommands : undefined,
  };
}

/**
 * Every build directory under the configured parents, one context per image for
 * sysbuild builds. Newest first (SPEC D5).
 */
export function discoverBuilds(topdir: string, opts: DiscoveryOptions = defaultDiscovery): BuildContext[] {
  const exclude = opts.exclude.map(globToRegExp);
  const seen = new Set<string>();
  const out: BuildContext[] = [];
  for (const parent of opts.buildParents) {
    for (const dir of subdirs(resolve(topdir, parent))) {
      const name = dir.slice(dir.lastIndexOf(sep) + 1);
      if (seen.has(dir) || exclude.some((re) => re.test(name))) continue;
      seen.add(dir);
      const top = join(dir, "build_info.yml");
      if (!existsSync(top)) continue;
      const label = relative(topdir, dir).split(sep).join("/");
      const images = readBuildInfo(top)?.cmake?.images;
      if (Array.isArray(images) && images.length) {
        for (const img of images) {
          if (typeof img?.name !== "string") continue;
          const ctx = contextFromBuildInfo(join(dir, img.name, "build_info.yml"), `${label}/${img.name}`, dir, img.name);
          if (ctx) out.push(ctx);
        }
      } else {
        const ctx = contextFromBuildInfo(top, label, dir);
        if (ctx) out.push(ctx);
      }
    }
  }
  return out.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

/** Include paths of one dts root, in the order Zephyr's dts.cmake uses. */
function dtsRootIncludes(root: string): string[] {
  const dts = join(root, "dts");
  const arches = subdirs(dts).filter((d) => !/[\\/](bindings|common|vendor)$/.test(d));
  return [
    join(root, "include"),
    join(root, "include", "zephyr"),
    join(dts, "common"),
    join(dts, "vendor"),
    ...arches,
    dts,
  ].filter(existsSync);
}

/**
 * Defaults for files that are not part of any build (SPEC D9): every module's
 * dts_root first, Zephyr last.
 */
export function restrictedDefaults(ws: WestWorkspace, modules: ZephyrModule[]) {
  const roots = [...modules.flatMap((m) => m.dtsRoot ?? []), ...(ws.zephyrBase ? [ws.zephyrBase] : [])];
  const unique = [...new Set(roots)];
  return {
    cwd: ws.topdir,
    defaultBindingType: "Zephyr" as const,
    defaultIncludePaths: unique.flatMap(dtsRootIncludes),
    defaultZephyrBindings: unique.map((r) => join(r, "dts", "bindings")).filter(existsSync),
    // SDK and third-party modules must not be touched by rename refactorings
    defaultLockRenameEdits: externalRoots(ws),
    autoChangeContext: true,
    allowAdhocContexts: true,
  };
}

/** Projects that are not the manifest repository: Zephyr, HALs, other modules. */
export function externalRoots(ws: WestWorkspace): string[] {
  return ws.projects.filter((p) => resolve(p.path) !== resolve(ws.manifestPath)).map((p) => p.path);
}

export function isUnder(file: string, roots: string[]): boolean {
  return roots.some((r) => {
    const rel = relative(r, file);
    return rel === "" || (!rel.startsWith("..") && !/^[a-zA-Z]:/.test(rel) && !rel.startsWith(sep));
  });
}
