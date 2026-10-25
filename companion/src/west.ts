// SPDX-License-Identifier: Apache-2.0
//
// West workspace model (SPEC D16): topdir, zephyr base and the project list.
// Projects come from `west list` when west is available, otherwise from our own
// reading of the manifest with its imports. No layout is assumed.

import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { parse as parseYaml } from "yaml";

export interface WestProject {
  name: string;
  path: string; // absolute
}

export interface WestWorkspace {
  topdir: string;
  manifestPath: string; // absolute dir of the manifest repository
  manifestFile: string;
  zephyrBase?: string;
  projects: WestProject[]; // includes the manifest repository as "manifest"
}

export function findTopdir(start: string): string | undefined {
  for (let dir = resolve(start); ; dir = dirname(dir)) {
    if (existsSync(join(dir, ".west", "config"))) return dir;
    if (dirname(dir) === dir) return undefined;
  }
}

/** configparser-style INI, as written by `west config`. */
export function parseIni(text: string): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  let section: Record<string, string> | undefined;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith(";")) continue;
    const header = /^\[(.+)\]$/.exec(line);
    if (header) {
      section = out[header[1]!.trim()] ??= {};
    } else if (section) {
      const eq = line.search(/[=:]/);
      if (eq > 0) section[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
  }
  return out;
}

export async function loadWorkspace(start: string, env = process.env): Promise<WestWorkspace | undefined> {
  const topdir = findTopdir(start);
  if (!topdir) return undefined;
  const config = parseIni(readFileSync(join(topdir, ".west", "config"), "utf8"));
  const manifestPath = resolve(topdir, config.manifest?.path ?? ".");
  const manifestFile = config.manifest?.file ?? "west.yml";
  const base = config.zephyr?.base ?? env.ZEPHYR_BASE;
  const ws: WestWorkspace = {
    topdir,
    manifestPath,
    manifestFile,
    zephyrBase: base ? resolve(topdir, base) : undefined,
    projects: [],
  };
  ws.projects = (await westList(topdir, env)) ?? readManifestProjects(ws);
  if (!ws.zephyrBase) {
    const zephyr = ws.projects.find((p) => p.name === "zephyr");
    if (zephyr) ws.zephyrBase = zephyr.path;
  }
  return ws;
}

export function westCandidates(topdir: string, env = process.env): string[] {
  const exe = process.platform === "win32" ? ["Scripts", "west.exe"] : ["bin", "west"];
  const venvs = [env.VIRTUAL_ENV, join(topdir, ".venv"), join(topdir, "venv")].filter(Boolean) as string[];
  return [...venvs.map((v) => join(v, ...exe)).filter(existsSync), "west"];
}

async function westList(topdir: string, env: NodeJS.ProcessEnv): Promise<WestProject[] | undefined> {
  const run = promisify(execFile);
  for (const west of westCandidates(topdir, env)) {
    try {
      const { stdout } = await run(west, ["list", "-f", "{name}\t{abspath}"], {
        cwd: topdir,
        env,
        timeout: 15000,
      });
      const projects = stdout
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          const [name, path] = line.split("\t");
          return { name: name!, path: path! };
        });
      if (projects.length) return projects;
    } catch {
      // try the next candidate, then fall back to reading the manifest
    }
  }
  return undefined;
}

type ImportSpec =
  | boolean
  | string
  | string[]
  | {
      file?: string;
      "path-prefix"?: string;
      "name-allowlist"?: string | string[];
      "name-blocklist"?: string | string[];
    };

interface RawProject {
  name: string;
  path?: string;
  import?: ImportSpec;
}

const asList = (v: string | string[] | undefined) => (v === undefined ? undefined : [v].flat());

/**
 * Projects from the manifest and, recursively, from what it imports. Earlier
 * definitions win, as in west. Only what is needed to locate projects on disk is
 * implemented: path, path-prefix, name allow/block lists, manifest file and
 * directory imports.
 */
export function readManifestProjects(ws: Pick<WestWorkspace, "topdir" | "manifestPath" | "manifestFile">): WestProject[] {
  const found = new Map<string, WestProject>();
  found.set("manifest", { name: "manifest", path: ws.manifestPath });

  const visit = (file: string, prefix: string, allow?: string[], block?: string[], depth = 0) => {
    if (depth > 8 || !existsSync(file)) return;
    const manifest = (parseYaml(readFileSync(file, "utf8")) ?? {}).manifest ?? {};
    const projects: RawProject[] = manifest.projects ?? [];
    const imports: Array<() => void> = [];

    for (const p of projects) {
      if (allow && !allow.includes(p.name)) continue;
      if (block?.includes(p.name)) continue;
      if (found.has(p.name)) continue;
      // west applies an import's path-prefix to the importing project itself too
      // (reference: `zephyr` without `path` lands in dist/zephyrproject/zephyr)
      const own = typeof p.import === "object" && !Array.isArray(p.import) ? (p.import["path-prefix"] ?? "") : "";
      const path = resolve(ws.topdir, prefix, own, p.path ?? p.name);
      found.set(p.name, { name: p.name, path });
      if (p.import) imports.push(() => importFrom(path, p.import!, prefix, depth));
    }
    const self = manifest.self?.import as ImportSpec | undefined;
    if (self && depth === 0) imports.unshift(() => importFrom(ws.manifestPath, self, prefix, depth));
    imports.forEach((f) => f());
  };

  const importFrom = (projectPath: string, spec: ImportSpec, prefix: string, depth: number) => {
    if (spec === false) return;
    const specs = typeof spec === "object" && !Array.isArray(spec) ? spec : undefined;
    const files =
      spec === true
        ? ["west.yml"]
        : typeof spec === "string"
          ? [spec]
          : Array.isArray(spec)
            ? spec
            : [specs?.file ?? "west.yml"];
    const nextPrefix = join(prefix, specs?.["path-prefix"] ?? "");
    for (const f of files) {
      const target = isAbsolute(f) ? f : join(projectPath, f);
      visit(target, nextPrefix, asList(specs?.["name-allowlist"]), asList(specs?.["name-blocklist"]), depth + 1);
    }
  };

  visit(join(ws.manifestPath, ws.manifestFile), "");
  return [...found.values()];
}
