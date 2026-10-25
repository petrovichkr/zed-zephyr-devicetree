# Zephyr Devicetree for Zed and VS Code

Zephyr devicetree support for every board Zephyr supports, in [Zed](https://zed.dev) and
VS Code. Both editors share one language core and one visual editor; see
[docs/SPEC.md](docs/SPEC.md) for the design and its decisions.

## Features

- [devicetree-language-server](https://github.com/kylebonnici/dts-lsp) for `.dts`, `.dtsi`,
  `.dtso` and `.overlay`: completion, hover, go-to-definition, references, rename, formatting
  and diagnostics.
- Syntax highlighting, outline and brackets (Zed:
  [tree-sitter-devicetree](https://github.com/joelspadin/tree-sitter-devicetree); VS Code: a
  TextMate grammar).
- Zero-config defaults for west workspaces: `zephyr.base` from `.west/config` (or
  `$ZEPHYR_BASE`) and the modules of the west manifest supply include paths and bindings.
- Build-aware contexts: every `build*/build_info.yml` (one per sysbuild image) becomes a
  context, and the newest build that contains the current file wins. Switch contexts with code
  actions (`Ctrl+.`) in both editors, or from the status bar in VS Code. Multi-root workspaces
  are supported.
- A visual devicetree editor: node tree with property editing, overview, buses and devices,
  memory map, STM32 clock tree, interrupts and a pin grid with pin assignment. Edits go to the
  overlay through the editor's buffer, so unsaved changes are kept. Builds without an overlay
  get an offer to create `boards/<board>.overlay`. Zed opens it in the browser, VS Code in an
  editor panel.
- Zephyr binding YAML: diagnostics with the rules of your Zephyr's `edtlib.py`, hover and
  go-to-definition for `include:`, references from `compatible:` to devicetree sources.
  "Go to Type Definition" on a devicetree node opens its binding. In VS Code with
  [YAML](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml) installed,
  binding files also get a JSON Schema.

## Install (development)

### Zed

1. `rustup target add wasm32-wasip2`
2. In Zed run `zed: install dev extension` and pick the `zed/` directory of this repository.
3. Uninstall other devicetree extensions. They claim the same file suffixes.

### VS Code

```sh
(cd companion && npm install && npm run build)
cd vscode && npm install && npm run package
code --install-extension dist/zephyr-devicetree.vsix
```

nRF DeviceTree runs its own devicetree-language-server on the same files. With both installed
the extension offers to turn its server off. See [vscode/README.md](vscode/README.md) for the
commands and settings.

## Settings

### Zed

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

### VS Code

The same `devicetree` settings go into `zephyrDevicetree.server.settings`; a custom server is
set with `zephyrDevicetree.server.path` and `zephyrDevicetree.server.arguments`.

## Development

| Directory | What it is |
|---|---|
| `companion/` | Editor-neutral LSP proxy in front of dts-lsp, the binding YAML server and the visual editor. Built into `companion/dist/companion.cjs`, which is committed. |
| `zed/` | Zed extension (Rust/WASM); embeds the companion bundle. |
| `vscode/` | VS Code extension (TypeScript); ships the companion and dts-lsp in the `.vsix`. |
| `scripts/` | Query check for Zed and a headless LSP smoke test. |

- `companion/`: `npm run typecheck && npm run typecheck:ui && npm test && npm run build`.
  Rebuild the bundle after every change, the editors run `dist/companion.cjs`.
- `zed/`: `cargo build --target wasm32-wasip2`, `cargo test`, `cargo clippy --target wasm32-wasip2`.
- `vscode/`: `npm run typecheck`, `npm run build`, `npm test` (integration test in VS Code on a
  west workspace, `VSCODE_EXEC` and `ZEPHYR_WORKSPACE`), `npm run test:grammar <files…>`,
  `npm run package`.
- `scripts/check_queries.py <files…>` compiles the Zed `.scm` queries and runs them on sample
  files (needs `pip install tree-sitter <tree-sitter-devicetree checkout>`).
- `scripts/smoke_lsp.mjs <server.js> <workspace> <file>` exercises the language server headlessly.

## License

Apache-2.0
