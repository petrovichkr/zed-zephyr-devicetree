// SPDX-License-Identifier: Apache-2.0
//
// What a Zephyr binding may contain. The authority is edtlib.py of the
// workspace's own Zephyr (the sets change between releases), read at startup;
// the built-in sets below are the 4.5 ones and serve as fallback.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface BindingRules {
  topKeys: Set<string>; // plus anything ending in -cells, plus include
  propKeys: Set<string>;
  types: Set<string>;
  source: string;
}

const FALLBACK = {
  topKeys: ["title", "description", "compatible", "bus", "on-bus", "class", "properties", "child-binding", "examples"],
  propKeys: [
    "description", "type", "required", "enum", "const", "default", "deprecated",
    "specifier-space", "min", "max", "min-len", "max-len", "dependency-mode",
  ],
  types: [
    "boolean", "int", "array", "uint8-array", "string", "string-array",
    "phandle", "phandles", "phandle-array", "path", "compound",
  ],
};

/** `name = {"a", "b",\n "c"}` from Python source. */
function pySet(src: string, name: string): string[] | undefined {
  const m = new RegExp(`\\b${name}\\s*=\\s*\\{([^}]*)\\}`).exec(src);
  if (!m) return undefined;
  const items = [...m[1]!.matchAll(/["']([^"']+)["']/g)].map((x) => x[1]!);
  return items.length ? items : undefined;
}

export function loadRules(zephyrBase?: string): BindingRules {
  const file = zephyrBase && join(zephyrBase, "scripts", "dts", "python-devicetree", "src", "devicetree", "edtlib.py");
  const src = file && existsSync(file) ? readFileSync(file, "utf8") : "";
  const top = pySet(src, "ok_top");
  const prop = pySet(src, "ok_prop_keys");
  const types = pySet(src, "ok_types");
  return {
    topKeys: new Set(top ?? FALLBACK.topKeys),
    propKeys: new Set(prop ?? FALLBACK.propKeys),
    types: new Set(types ?? FALLBACK.types),
    source: top && prop && types ? file! : "built-in (Zephyr 4.5)",
  };
}

export const INCLUDE_KEYS = new Set(["name", "property-allowlist", "property-blocklist", "child-binding"]);
