#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
//
// Writes THIRD_PARTY_NOTICES.md for what each extension ships: the npm packages
// esbuild bundled (found through its `// node_modules/...` path comments) and,
// for VS Code, devicetree-language-server. Run after building both bundles;
// CI checks that the committed files are current.
//
// usage: node scripts/notices.mjs [--check]

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Package directories (relative to `base`) whose files a bundle contains. */
function bundled(file, base) {
  const dirs = new Set();
  for (const m of readFileSync(file, "utf8").matchAll(/^\/\/ ((?:node_modules\/(?:@[^/\n]+\/)?[^/\n]+\/)+)/gm)) {
    dirs.add(join(base, m[1]));
  }
  return [...dirs];
}

function describe(dir) {
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const file = readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(f));
  return { name: pkg.name, version: pkg.version, license: pkg.license ?? "see text", text: file ? readFileSync(join(dir, file), "utf8").trim() : undefined };
}

function render(title, packages, extra = "") {
  const list = [...new Map(packages.map((p) => [`${p.name}@${p.version}`, p])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const body = list
    .map((p) => `## ${p.name} ${p.version}\n\nLicense: ${p.license}\n\n${p.text ? "```\n" + p.text + "\n```" : `No license file in the package; ${p.license}.`}\n`)
    .join("\n");
  return `# Third-party notices\n\n${title}\n\n${extra}${body}`;
}

const companionDeps = bundled(join(root, "companion/dist/companion.cjs"), join(root, "companion")).map(describe);
const vscodeDeps = bundled(join(root, "vscode/dist/extension.js"), join(root, "vscode")).map(describe);
const dtsLsp = JSON.parse(readFileSync(join(root, "vscode/node_modules/devicetree-language-server/package.json"), "utf8"));

const outputs = {
  "zed/THIRD_PARTY_NOTICES.md": render(
    "The Zed extension embeds `companion.cjs`, which bundles the packages below. devicetree-language-server is installed from npm at run time and is not part of the extension.",
    companionDeps,
  ),
  "vscode/THIRD_PARTY_NOTICES.md": render(
    "The VS Code extension ships `extension.js` and `companion.cjs`, which bundle the packages below, and devicetree-language-server.",
    [...vscodeDeps, ...companionDeps],
    `## devicetree-language-server ${dtsLsp.version}\n\nLicense: ${dtsLsp.license}. Copyright Kyle Micallef Bonnici, https://github.com/kylebonnici/dts-lsp.\nThe licenses of the packages it bundles are in \`dist/dts-lsp/dist/THIRD_PARTY_LICENSES.txt\`.\n\n`,
  ),
};

let stale = 0;
for (const [rel, text] of Object.entries(outputs)) {
  const file = join(root, rel);
  if (process.argv.includes("--check")) {
    if (!existsSync(file) || readFileSync(file, "utf8") !== text) {
      console.error(`${rel} is out of date: run node scripts/notices.mjs`);
      stale++;
    }
  } else writeFileSync(file, text);
}
process.exitCode = stale ? 1 : 0;
