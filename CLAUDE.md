# zed-zephyr-devicetree

Extensions for [Zed](https://zed.dev) and VS Code (D33) that support Zephyr devicetree (`.dts`,
`.dtsi`, `.overlay`) and binding YAML. An analog of the nRF DeviceTree extension for VS Code, but
for every board Zephyr supports.

Design overview: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Code comments cite its
decisions as "ARCHITECTURE Dn". Design decisions change only with the maintainer's agreement.

## Key points

- Language core: [`devicetree-language-server`](https://github.com/kylebonnici/dts-lsp)
  (npm, Apache-2.0). The extensions install and start it. Core improvements (including
  auto-contexts from `build_info.yml`) go upstream; temporary workarounds stay in the
  extension and are marked `TODO(upstream)`.
- Grammar: `joelspadin/tree-sitter-devicetree` at a pinned `rev` (Zed); our own TextMate
  grammar in VS Code.
- Verify changes on a real west workspace with builds (sysbuild, several boards); tests and
  scripts take it from `ZEPHYR_WORKSPACE`. Never write into that workspace from tests.

## Repository layout (guide)

```
zed/                        # Zed wrapper (D33); point `zed: install dev extension` here
  extension.toml            # id, name, version, schema_version, [grammars.*], [language_servers.*]
  Cargo.toml                # crate-type = ["cdylib"], zed_extension_api
  src/lib.rs                # impl zed::Extension: installs dts-lsp, writes and starts the companion
  languages/devicetree/     # config.toml + highlights/brackets/indents/outline/injections.scm
  LICENSE                   # copy of the root one: the Zed registry wants it in the extension dir
vscode/                     # VS Code wrapper (D33): src/extension.ts (two LanguageClients), src/webview.ts,
                            #   src/yamlschema.ts, syntaxes/, schemas/, test/
  dist/                     # generated: extension.js, companion.cjs copy, dts-lsp; not committed
companion/                  # Node/TS LSP proxy (D15), shared by both editors: src/{main,proxy,jsonrpc,west,zephyr}.ts, test/
companion/dist/companion.cjs  # bundle, COMMITTED (include_str! in zed/src/lib.rs, D17)
companion/src/bindings/     # binding YAML language server (`companion.cjs --bindings`, D22)
companion/src/ui/           # visual editor backend: model.ts (contract with the UI), edits.ts, server.ts, backend.ts
companion/ui/               # visual editor frontend (vanilla TS) -> dist/ui.html, embedded in the bundle
docs/ARCHITECTURE.md        # public design overview
```

Zed docs: https://zed.dev/docs/extensions/developing-extensions and
https://zed.dev/docs/extensions/languages. The API changes; check the current version and
`zed_extension_api` on docs.rs.

## Development

- Debug install in Zed: run `zed: install dev extension` and pick the `zed/` folder.
  Logs: `zed: open log` or `zed --foreground`.
- **After changes in `companion/src` or `companion/ui`**: `cd companion && npm run typecheck && npm run typecheck:ui && npm test && npm run build`,
  then `cargo build` in `zed/` and `npm run build` in `vscode/`. Without rebuilding the bundle
  the editors run the old companion.
- VS Code: `cd vscode && npm run typecheck && npm run build`; `VSCODE_EXEC=/usr/share/code/code npm test`
  (integration test on `ZEPHYR_WORKSPACE`/`ZEPHYR_FILE` in a throwaway profile), `npm run test:grammar <files>`
  after editing the TextMate grammar, `npm run package` → `dist/zephyr-devicetree.vsix`.
  Debugging: F5 in `vscode/`.
- The companion is shared: its behaviour for Zed must not change because of VS Code features;
  those are enabled only through the client's `capabilities.experimental.zephyrDevicetree`.
- The Rust part builds for `wasm32-wasip2` (`rustup target add wasm32-wasip2`).
- Checks (in `zed/`): `cargo fmt --check`, `cargo clippy --target wasm32-wasip2`, `cargo test`.
- After editing `.scm`: `scripts/check_queries.py <devicetree files>` (venv with `tree-sitter` and
  the built grammar). An invalid query silently disables highlighting in Zed.
- Check LSP changes without an editor via `scripts/smoke_lsp.mjs` on a west workspace
  (`COMPANION=companion/dist/companion.cjs` runs through the companion with empty user settings;
  `UI_CHECK="<nodePath>|<prop>|<value>"` exercises the web UI end to end, the edit is printed, not applied).
- UI without an editor: `node companion/scripts/dev-ui.mjs <model.json>` (stub API, token `dev`).
- Read dts-lsp's custom API in its sources at the tag of `NPM_VERSION` (`zed/src/lib.rs`)
  (`server/src/server.ts`, section `CUSTOM APIS`), not in the minified bundle.
- In Zed, captures with the same name resolve in favour of the **last** pattern: general rules go first.

## Conventions

- Talk to the user in Russian. Code, identifiers and commits are in English.
- Conventional Commits. Apache-2.0 license, SPDX headers in sources.
- Versions of external dependencies (grammar, LSP, npm packages) are pinned explicitly.
- Paths are handled cross-platform (Linux, macOS, Windows).
