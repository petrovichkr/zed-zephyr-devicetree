#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
//
// Copies the shared companion bundle and the pinned devicetree-language-server
// into dist/, so the .vsix runs without downloads (ARCHITECTURE D33).

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const companion = join(root, "..", "companion", "dist", "companion.cjs");
const server = join(root, "node_modules", "devicetree-language-server");

if (!existsSync(companion)) throw new Error(`${companion} is missing: run "npm run build" in companion/`);
mkdirSync(dist, { recursive: true });
// one changelog for both editors; vsce wants it next to package.json
cpSync(join(root, "..", "CHANGELOG.md"), join(root, "CHANGELOG.md"));
cpSync(companion, join(dist, "companion.cjs"));
rmSync(join(dist, "dts-lsp"), { recursive: true, force: true });
for (const f of ["package.json", "dist", "meta-schemas", "LICENSE", "README.md"]) {
  if (existsSync(join(server, f))) cpSync(join(server, f), join(dist, "dts-lsp", f), { recursive: true });
}
