# Architecture

Zephyr devicetree support for Zed and VS Code: an analog of nRF DeviceTree for every board
Zephyr supports. Code comments cite design decisions as "ARCHITECTURE Dn".

## Components

```
 editor (Zed / VS Code)
   │  LSP over stdio
   ▼
 companion.cjs --server ──► devicetree-language-server (dts-lsp, pinned npm version)
   │  workspace + build discovery, context switching, diagnostics filter
   └─ local HTTP server ──► visual editor page (ui.html), in a browser or a VS Code panel

 companion.cjs --bindings     binding YAML language server
```

- **dts-lsp** ([kylebonnici/dts-lsp](https://github.com/kylebonnici/dts-lsp)) does all language
  work: parsing, completion, hover, navigation, rename, formatting, diagnostics (D1). Its
  version is pinned because the companion relies on its undocumented `devicetree/*` API.
- **companion** (`companion/`, Node/TypeScript, bundled into one committed file) sits between
  the editor and dts-lsp and forwards LSP unchanged except where noted below (D15, D17). It is
  the same file in both editors.
- **Editor wrappers** are thin (D33): `zed/` (Rust/WASM) installs dts-lsp from npm, writes the
  embedded companion and starts it; `vscode/` (TypeScript) ships both in the `.vsix` and starts
  them with `vscode-languageclient`. Anything editor-specific lives in the wrapper; the companion
  speaks plain LSP and enables extras only when the client declares
  `capabilities.experimental.zephyrDevicetree`.

## Workspace and build contexts

- The companion finds the west workspace from `.west/config` and takes the project list from the
  west manifest, not from hard-coded paths: `zephyr_modules.txt` of a build, `west list`, or its
  own `west.yml` parser with `import` support (D6, D16). Each project contributes its
  `zephyr/module.yml` dts roots.
- Every `build*/build_info.yml` becomes a dts-lsp context, one per sysbuild image (D3). Twister
  output is ignored (D10). Contexts and defaults go to dts-lsp through its integration API
  (`setDefaultSettings`, `requestContext`, `removeContext`), so user settings stay on top (D18).
- The newest build containing the open file is active; code actions (and the VS Code status bar)
  switch contexts (D5).
- Without a build, files get a restricted mode: include paths and bindings from Zephyr and all
  module dts roots (D9).
- Multi-root workspaces: every folder is considered, each west topdir is scanned once; with
  several topdirs context names get a `<topdir>/` prefix.
- Zephyr ≥ 3.7 LTS, hardware model v2 only (D8). Linux, macOS and Windows paths (D11).

## Visual editor

- A web page served by the companion on `127.0.0.1` with a random port and a 128-bit session
  token; requests must carry a loopback `Host` (DNS rebinding) and JSON bodies (CSRF); the page
  is one self-contained file with a strict CSP (D2, D20). Zed opens it in the browser; VS Code
  in a webview panel through `asExternalUri` (D33).
- Its data is a compact model built from dts-lsp's `serializedContext` and `memoryViews` of the
  same server instance the editor uses (D15, D21). Values are shown as written in the sources.
- Edits are planned against the editor's buffers and applied with `workspace/applyEdit`, so
  unsaved changes are kept. Only overlays of the active context outside SDK/third-party
  projects are writable; an assignment is replaced in place, otherwise added to an existing node
  block or appended as `&label { … };` (D19).
- Tabs: node tree and properties, overview, buses and devices (add-device catalog from
  `zephyrTypeBindings`, address/CS checks, D30, D31), memory map, clock tree (STM32 with
  frequency limits, simplified ESP32, D27), interrupts, and a logical pin grid with pin
  assignment (D24, D26, D28). Graphics are hand-written SVG without libraries (D29).
- A build without a user overlay gets an offer to create `boards/<board>.overlay` in the
  application's configuration directory; a pristine rebuild is needed for CMake to pick it up
  (D32).

## Binding YAML

- A separate companion process (`--bindings`) attached to the editor's YAML language; it answers
  only for files inside binding directories of the workspace, Zephyr and builds (D7, D22).
- Rules (`ok_top`, `ok_prop_keys`, `ok_types`) are read from the workspace's own `edtlib.py`,
  with the Zephyr 4.5 sets as fallback (D23).
- In VS Code with `redhat.vscode-yaml`, binding files also get a permissive JSON Schema; the
  server then leaves key completion to it.

## Grammar

- Zed: [tree-sitter-devicetree](https://github.com/joelspadin/tree-sitter-devicetree) at a
  pinned commit (D13). VS Code: a TextMate grammar in `vscode/syntaxes/`, language id `dts` (the
  id other devicetree extensions use).

## Coexistence

nRF DeviceTree runs its own dts-lsp. In VS Code the extension detects it and offers to turn its
own server off (`zephyrDevicetree.languageServer.enable`); two servers on one file duplicate
diagnostics and completions.
