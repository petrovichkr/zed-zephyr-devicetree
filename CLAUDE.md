# zed-zephyr-devicetree

Расширение для редакторов [Zed](https://zed.dev) и VS Code (D33) с поддержкой Zephyr Devicetree (`.dts`, `.dtsi`,
`.overlay`) и YAML-биндингов. Аналог VS Code-расширения nRF DeviceTree, но для всех плат,
поддерживаемых Zephyr.

**Источник истины: [`docs/SPEC.md`](docs/SPEC.md).** Там решения D1…D14, требования R1…R8, этапы
и открытые вопросы. Решения меняются только по согласованию с пользователем, после чего
SPEC.md обновляется.

## Ключевое

- Языковое ядро — [`devicetree-language-server`](https://github.com/kylebonnici/dts-lsp)
  (npm, Apache-2.0). Расширение его ставит и запускает. Доработки ядра (в том числе
  автоконтексты из `build_info.yml`) отправляем в upstream; временные обходы держим в
  расширении и помечаем `TODO(upstream)`.
- Грамматика — `joelspadin/tree-sitter-devicetree` на фиксированном `rev`.
- Эталонный проект: `~/zephyr-workspace/`. Это T2 west-workspace,
  Zephyr лежит в `dist/zephyrproject/zephyr`, репозиторий сам является модулем, есть
  sysbuild, snippets и много `build/*`. Изменения проверять на нём. **Его не модифицировать.**

## Структура репозитория (ориентир)

```
zed/                        # Zed-обёртка (D33); `zed: install dev extension` указывать на неё
  extension.toml            # id, name, version, schema_version, [grammars.*], [language_servers.*]
  Cargo.toml                # crate-type = ["cdylib"], zed_extension_api
  src/lib.rs                # impl zed::Extension: ставит dts-lsp, пишет и запускает companion
  languages/devicetree/     # config.toml + highlights/brackets/indents/outline/injections.scm
  LICENSE                   # копия корневой: реестр Zed требует лицензию в каталоге расширения
vscode/                     # VS Code-обёртка (D33): src/extension.ts (два LanguageClient), src/webview.ts, syntaxes/, test/
  dist/                     # генерируется: extension.js, копия companion.cjs, dts-lsp; не коммитится
companion/                  # Node/TS LSP-прокси (D15), общий для обоих редакторов: src/{main,proxy,jsonrpc,west,zephyr}.ts, test/
companion/dist/companion.cjs  # бандл, КОММИТИТСЯ (include_str! в zed/src/lib.rs, D17)
companion/src/ui/           # визуальный редактор, backend: model.ts (контракт с UI), edits.ts, server.ts, backend.ts
companion/ui/               # визуальный редактор, frontend (vanilla TS) -> dist/ui.html, вшивается в бандл
tests/fixtures/             # скелет структуры эталонного проекта (R8)
docs/SPEC.md
```

Документация Zed: https://zed.dev/docs/extensions/developing-extensions и
https://zed.dev/docs/extensions/languages. API меняется, сверяться с актуальной версией
и с `zed_extension_api` на docs.rs.

## Разработка

- Установка для отладки: в Zed выполнить `zed: install dev extension` и выбрать папку `zed/`.
  Логи: `zed: open log` или `zed --foreground`.
- **После правок в `companion/src` или `companion/ui`**: `cd companion && npm run typecheck && npm run typecheck:ui && npm test && npm run build`,
  затем `cargo build` в `zed/`. Без пересборки бандла Zed запустит старый companion.
- VS Code: `cd vscode && npm run typecheck && npm run build`; `VSCODE_EXEC=/usr/share/code/code npm test`
  (интеграционный тест на эталоне, временный профиль), `npm run test:grammar <файлы>` после правки
  TextMate-грамматики, `npm run package` → `dist/zephyr-devicetree.vsix`. Отладка: F5 в `vscode/`.
- Companion общий: его поведение для Zed не должно меняться от возможностей VS Code — они
  включаются только через `capabilities.experimental.zephyrDevicetree` клиента.
- Rust-часть собирается под `wasm32-wasip2` (`rustup target add wasm32-wasip2`).
- Проверки (в `zed/`): `cargo fmt --check`, `cargo clippy --target wasm32-wasip2`, `cargo test`.
- После правки `.scm`: `scripts/check_queries.py <файлы эталона>` (venv с `tree-sitter` и
  собранной грамматикой). Невалидный запрос в Zed молча отключает подсветку.
- Изменения в работе с LSP проверять без Zed через `scripts/smoke_lsp.mjs` на эталоне
  (`COMPANION=companion/dist/companion.cjs` — через companion, с пустыми user settings;
  `UI_CHECK="<nodePath>|<prop>|<value>"` — сквозная проверка веб-UI, правка печатается, но не применяется).
- UI без Zed: `node companion/scripts/dev-ui.mjs <model.json>` (заглушка API, токен `dev`).
- Custom-API dts-lsp смотреть в исходниках на теге версии из `NPM_VERSION` (`zed/src/lib.rs`)
  (`server/src/server.ts`, раздел `CUSTOM APIS`), а не в минифицированном бандле.
- В Zed одноимённые captures разрешаются в пользу **последнего** шаблона: общие правила идут первыми.

## Соглашения

- С пользователем общаемся по-русски. Код, идентификаторы и коммиты пишем по-английски.
- Коммиты в стиле Conventional Commits. Лицензия Apache-2.0, SPDX-заголовки в исходниках.
- Версии внешних зависимостей (грамматика, LSP) фиксируются явно.
- Пути обрабатываются кроссплатформенно (Linux, macOS, Windows).
