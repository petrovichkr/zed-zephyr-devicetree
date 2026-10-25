# Zephyr Devicetree for Zed

Zephyr devicetree support for the [Zed](https://zed.dev) editor, for every board Zephyr supports.

Status: **stage 0** (see [docs/SPEC.md](docs/SPEC.md)). It provides:

- Syntax highlighting, outline and brackets for `.dts`, `.dtsi`, `.dtso` and `.overlay`
  ([tree-sitter-devicetree](https://github.com/joelspadin/tree-sitter-devicetree)).
- [devicetree-language-server](https://github.com/kylebonnici/dts-lsp) with completion, hover,
  go-to-definition, references, rename, formatting and diagnostics.
- Zero-config defaults for west workspaces: `zephyr.base` from `.west/config` (or `$ZEPHYR_BASE`)
  supplies the Zephyr include paths and bindings.

Planned: contexts detected automatically from `build*/build_info.yml` (sysbuild included),
a browser-based visual devicetree editor, and Zephyr YAML bindings support.

## Install (development)

1. `rustup target add wasm32-wasip2`
2. In Zed run `zed: install dev extension` and pick this directory.
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

- `cargo build --target wasm32-wasip2` / `cargo test` / `cargo clippy --target wasm32-wasip2`
- `scripts/check_queries.py <files…>` compiles the `.scm` queries and runs them on sample files
  (needs `pip install tree-sitter <tree-sitter-devicetree checkout>`).
- `scripts/smoke_lsp.mjs <server.js> <workspace> <file>` exercises the language server headlessly.

## License

Apache-2.0
