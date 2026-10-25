// SPDX-License-Identifier: Apache-2.0
//
// Zephyr knowledge on top of the west model: modules (module.yml), build
// directories (build_info.yml, sysbuild images) and the dts-lsp settings and
// contexts derived from them (ARCHITECTURE D3, D9, D10).

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
  /** Application configuration directory and board name (`cmake.application`, `cmake.board`). */
  appDir?: string;
  board?: string;
  /** `west build` command line of the build (top-level build_info). */
  westCommand?: string;
  /** Overlays the build will pick up after a cmake re-run, already passed to dts-lsp. */
  pending?: string[];
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

function contextFromBuildInfo(file: string, ctxName: string, buildDir: string, image?: string, westCommand?: string): BuildContext | undefined {
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
    // APPLICATION_CONFIG_DIR is where Zephyr looks for boards/<board>.overlay
    appDir: [info.cmake.application?.["configuration-dir"], info.cmake.application?.["source-dir"]].find((d) => typeof d === "string"),
    board: typeof info.cmake.board?.name === "string" ? info.cmake.board.name : undefined,
    westCommand,
  };
}

/** `<app>/boards/<board>.overlay`, the overlay Zephyr picks up without DTC_OVERLAY_FILE. */
export const boardOverlay = (b: BuildContext): string | undefined =>
  b.appDir && b.board ? join(b.appDir, "boards", `${b.board}.overlay`) : undefined;

/**
 * Where the visual editor may create an overlay for a build that has no user
 * overlay: the board overlay of an application outside the SDK and third-party
 * projects. Undefined when the build already has one or the file exists.
 */
export function newOverlayTarget(b: BuildContext, external: string[]): string | undefined {
  const file = boardOverlay(b);
  if (!file || isUnder(file, external) || existsSync(file)) return undefined;
  return b.overlays.some((o) => !isUnder(o, external)) ? undefined : file;
}

/**
 * Command that makes the build pick up a new board overlay. A plain cmake re-run
 * is not enough: the first configure caches an empty DTC_OVERLAY_FILE, and a
 * defined DTC_OVERLAY_FILE stops the search in boards/. So the original
 * `west build` command, pristine; `buildDir` is relative to the topdir.
 */
export function pristineCommand(westCommand: string | undefined, buildDir: string): string {
  if (!westCommand) return `west build -d ${buildDir} -p`;
  const args = westCommand.trim().split(/\s+/);
  // the recorded argv[0] is an absolute path to west (often inside a venv)
  if (/(^|[\\/])west(\.exe)?$/.test(args[0] ?? "")) args[0] = "west";
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (/^(-p|--pristine)(=\S*)?$/.test(args[i]!)) {
      if (/^(auto|always|never)$/.test(args[i + 1] ?? "")) i++;
      continue;
    }
    out.push(args[i]!);
    if (args[i] === "build" && out.length === 2) out.push("-p");
  }
  return out.join(" ");
}

/**
 * A board overlay created after the last cmake run is not in build_info yet;
 * pass it to dts-lsp anyway so the editor sees and edits it, and mark it pending.
 */
export function withPendingOverlay(b: BuildContext, external: string[]): BuildContext {
  const file = boardOverlay(b);
  if (!file || isUnder(file, external) || !existsSync(file)) return b;
  if (b.overlays.some((o) => !isUnder(o, external))) return b;
  return { ...b, overlays: [...b.overlays, file], pending: [file] };
}

/**
 * Every build directory under the configured parents, one context per image for
 * sysbuild builds. Newest first (ARCHITECTURE D5).
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
      const topInfo = readBuildInfo(top);
      const images = topInfo?.cmake?.images;
      const west = typeof topInfo?.west?.command === "string" ? topInfo.west.command : undefined;
      if (Array.isArray(images) && images.length) {
        for (const img of images) {
          if (typeof img?.name !== "string") continue;
          const ctx = contextFromBuildInfo(join(dir, img.name, "build_info.yml"), `${label}/${img.name}`, dir, img.name, west);
          if (ctx) out.push(ctx);
        }
      } else {
        const ctx = contextFromBuildInfo(top, label, dir, undefined, west);
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
 * Defaults for files that are not part of any build (ARCHITECTURE D9): every module's
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
