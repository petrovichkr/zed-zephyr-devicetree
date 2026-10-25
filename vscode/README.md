# Zephyr Devicetree for VS Code

Zephyr devicetree support for every board Zephyr supports. It shares its language core and
visual editor with the Zed extension from the same repository:

- [devicetree-language-server](https://github.com/kylebonnici/dts-lsp) for `.dts`, `.dtsi`,
  `.dtso` and `.overlay`: completion, hover, go-to-definition, references, rename,
  formatting, diagnostics.
- Build-aware contexts: every `build*/build_info.yml` becomes a context; the status bar shows
  the active one, click it (or run **Zephyr Devicetree: Switch Context**) to change it.
- A visual devicetree editor in an editor panel: **Zephyr Devicetree: Open Visual Editor**,
  or the code action "Devicetree: open visual editor" (`Ctrl+.`).
- Zephyr binding YAML: diagnostics with your Zephyr's `edtlib.py` rules, hover and navigation
  for `include:`, references from `compatible:`.

nRF DeviceTree runs its own devicetree-language-server on the same files. With both
installed the extension offers to turn its server off (`zephyrDevicetree.languageServer.enable`).

## Settings

- `zephyrDevicetree.server.settings`: the `devicetree` settings of dts-lsp
  ([keys](https://github.com/kylebonnici/dts-lsp#settings)); they override the defaults
  derived from the west workspace.
- `zephyrDevicetree.server.path` / `.arguments`: your own dts-lsp build.
- `zephyrDevicetree.visualEditor.openIn`: `panel` (default) or `browser`.

## Development

```sh
(cd ../companion && npm run build)   # the shared companion bundle
npm install
npm run build                        # dist/: extension, companion copy, dts-lsp
VSCODE_EXEC=/path/to/code npm test   # integration test on a west workspace (ZEPHYR_WORKSPACE)
npm run package                      # dist/zephyr-devicetree.vsix
```

Press F5 with this folder open, or `code --extensionDevelopmentPath=$PWD <workspace>`.

## License

Apache-2.0
