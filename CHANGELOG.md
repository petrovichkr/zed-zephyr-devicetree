# Changelog

All notable changes to the Zed and VS Code extensions. Both are released with the same version.

## 0.1.0 (unreleased)

First public version.

- devicetree-language-server 0.14.3 for `.dts`, `.dtsi`, `.dtso` and `.overlay`: completion,
  hover, go-to-definition, references, rename, formatting, diagnostics.
- West workspace discovery: Zephyr base and module dts roots from the west manifest, no
  configuration needed.
- Build contexts from every `build*/build_info.yml`, one per sysbuild image; the newest build
  with the current file is active, code actions switch contexts. Multi-root workspaces.
- Visual editor: node tree with property editing, overview, buses and devices with an add-device
  catalog, memory map, STM32 clock tree, interrupts, logical pin grid with pin assignment
  (ESP32, STM32, nRF), GPIO flags, SVG export. Edits go through the editor buffer into the
  active overlay; builds without an overlay can create `boards/<board>.overlay`.
- Binding YAML: diagnostics with the rules of the workspace's `edtlib.py`, hover and navigation
  for `include:`, references from `compatible:`.
- Zed: tree-sitter highlighting, outline and brackets; the visual editor opens in the browser.
- VS Code: TextMate highlighting, visual editor in an editor panel that follows the theme and
  survives reloads, status bar context switcher, JSON Schema for binding files with
  redhat.vscode-yaml, warning when nRF DeviceTree runs a second server.
