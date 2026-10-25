// SPDX-License-Identifier: Apache-2.0
//
// Bundles ui/ into one self-contained page, dist/ui.html (no external requests).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, transform } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ui = (f) => join(root, "ui", f);

const js = await build({
  entryPoints: [ui("app.ts")],
  bundle: true,
  format: "iife",
  minify: true,
  target: "es2020",
  write: false,
  legalComments: "none",
});
const css = await transform(readFileSync(ui("styles.css"), "utf8"), { loader: "css", minify: true });

// Inline text must not close its own element.
const script = js.outputFiles[0].text.replace(/<\/(script)/gi, "<\\/$1");
const style = css.code.replace(/<\/(style)/gi, "<\\/$1");
const html = readFileSync(ui("index.html"), "utf8")
  .replace("/*__STYLES__*/", () => style)
  .replace("/*__SCRIPT__*/", () => script);

const out = join(root, "dist", "ui.html");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(1)} KiB)`);
