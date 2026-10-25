#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
//
// Tokenizes devicetree files with the TextMate grammar and checks that it stays
// balanced (every block closes at the end of the file) and that node names and
// properties get their scopes. The counterpart of scripts/check_queries.py.
//
// usage: grammar.mjs <file.dts|dtsi|overlay>...

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import oniguruma from "vscode-oniguruma";
import textmate from "vscode-textmate";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
await oniguruma.loadWASM(readFileSync(require.resolve("vscode-oniguruma/release/onig.wasm")).buffer);
const registry = new textmate.Registry({
  onigLib: Promise.resolve({ createOnigScanner: (p) => new oniguruma.OnigScanner(p), createOnigString: (s) => new oniguruma.OnigString(s) }),
  loadGrammar: async () => textmate.parseRawGrammar(readFileSync(join(root, "syntaxes/devicetree.tmLanguage.json"), "utf8"), "devicetree.json"),
});
const grammar = await registry.loadGrammar("source.devicetree");

let failed = 0;
for (const file of process.argv.slice(2)) {
  let stack = textmate.INITIAL;
  const seen = new Map();
  readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => {
    const r = grammar.tokenizeLine(line, stack);
    for (const t of r.tokens) {
      const scope = t.scopes.at(-1);
      if (/^(entity\.name\.(tag|label)|variable\.other\.(property|reference))/.test(scope)) seen.set(scope.split(".").slice(0, 3).join("."), (seen.get(scope) ?? 0) + 1);
    }
    stack = r.ruleStack;
  });
  const open = stack.depth - 1;
  const problems = [];
  if (open !== 0) problems.push(`${open} rule(s) still open at EOF`);
  if (/\{/.test(readFileSync(file, "utf8")) && !seen.has("entity.name.tag") && !seen.has("variable.other.reference")) problems.push("no node names");
  if (problems.length) failed++;
  console.log(`${problems.length ? "FAIL" : "ok  "} ${file}${problems.length ? ": " + problems.join(", ") : ""}`);
}
process.exitCode = failed ? 1 : 0;
