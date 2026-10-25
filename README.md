# Zephyr Devicetree for Zed

Zephyr devicetree support for the [Zed](https://zed.dev) editor, for every board Zephyr supports.

Status: MVP and Zephyr bindings support (stages 0–3 of [docs/SPEC.md](docs/SPEC.md)). It provides:

- Syntax highlighting, outline and brackets for `.dts`, `.dtsi`, `.dtso` and `.overlay`
  ([tree-sitter-devicetree](https://github.com/joelspadin/tree-sitter-devicetree)).
- [devicetree-language-server](https://github.com/kylebonnici/dts-lsp) with completion, hover,
  go-to-definition, references, rename, formatting and diagnostics.
- Zero-config defaults for west workspaces: `zephyr.base` from `.west/config` (or `$ZEPHYR_BASE`)
  supplies the Zephyr include paths and bindings.
- Build-aware contexts: every `build*/build_info.yml` (one per sysbuild image) becomes a
  context, the newest build that contains the current file wins, and code actions
  (`Ctrl+.`) switch between them.
- A visual devicetree editor in the browser: code action "Devicetree: open visual editor".
- Zephyr binding YAML: diagnostics with the rules of your Zephyr's `edtlib.py`, hover and
  go-to-definition for `include:`, references from `compatible:` to devicetree sources.
  "Go to Type Definition" on a devicetree node opens its binding.

## Install (development)

1. `rustup target add wasm32-wasip2`
2. In Zed run `zed: install dev extension` and pick the `zed/` directory of this repository.
3. Uninstall other devicetree extensions. They claim the same file suffixes.

## Settings

The extension passes `lsp.devicetree-language-server.settings` to the server as its
`devicetree` section. Your keys override the defaults the extension derives. The keys are
documented in the [dts-lsp README](https://github.com/kylebonnici/dts-lsp#settings).

```jsonc
// .zed/settings.json
{
  "lsp": {
    "devicetree-language-server": {
      "settings": {
        "contexts": [
          {
            "ctxName": "my-board",
            "dtsFile": "boards/vendor/my_board/my_board.dts",
            "overlays": ["app/boards/my_board.overlay"]
          }
        ]
      },
      // optional: use your own server build instead of the pinned npm package
      "binary": { "path": "devicetree-language-server", "arguments": ["--stdio"] }
    }
  }
}
```

## Development

Layout: `companion/` is the editor-neutral LSP proxy and visual editor (`companion/dist/companion.cjs`,
committed), `zed/` is the Zed extension that embeds it.

- In `zed/`: `cargo build --target wasm32-wasip2` / `cargo test` / `cargo clippy --target wasm32-wasip2`
- `scripts/check_queries.py <files…>` compiles the `.scm` queries and runs them on sample files
  (needs `pip install tree-sitter <tree-sitter-devicetree checkout>`).
- `scripts/smoke_lsp.mjs <server.js> <workspace> <file>` exercises the language server headlessly.

## License

Apache-2.0
