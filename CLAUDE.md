# zed-zephyr-devicetree

Расширение для редактора [Zed](https://zed.dev) с поддержкой Zephyr Devicetree (`.dts`, `.dtsi`,
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

## Структура Zed-расширения (ориентир)

```
extension.toml              # id, name, version, schema_version, [grammars.*], [language_servers.*]
Cargo.toml                  # crate-type = ["cdylib"], zed_extension_api
src/lib.rs                  # impl zed::Extension: ставит dts-lsp, пишет и запускает companion
companion/                  # Node/TS LSP-прокси (D15): src/{main,proxy,jsonrpc,west,zephyr}.ts, test/
companion/dist/companion.cjs  # бандл, КОММИТИТСЯ (include_str! в lib.rs, D17)
languages/devicetree/       # config.toml + highlights/brackets/indents/outline/injections.scm
tests/fixtures/             # скелет структуры эталонного проекта (R8)
docs/SPEC.md
```

Документация Zed: https://zed.dev/docs/extensions/developing-extensions и
https://zed.dev/docs/extensions/languages. API меняется, сверяться с актуальной версией
и с `zed_extension_api` на docs.rs.

## Разработка

- Установка для отладки: в Zed выполнить `zed: install dev extension` и выбрать эту папку.
  Логи: `zed: open log` или `zed --foreground`.
- **После правок в `companion/src`**: `cd companion && npm run typecheck && npm test && npm run build`,
  затем `cargo build`. Без пересборки бандла Zed запустит старый companion.
- Rust-часть собирается под `wasm32-wasip2` (`rustup target add wasm32-wasip2`).
- Проверки: `cargo fmt --check`, `cargo clippy --target wasm32-wasip2`, `cargo test`.
- После правки `.scm`: `scripts/check_queries.py <файлы эталона>` (venv с `tree-sitter` и
  собранной грамматикой). Невалидный запрос в Zed молча отключает подсветку.
- Изменения в работе с LSP проверять без Zed через `scripts/smoke_lsp.mjs` на эталоне
  (`COMPANION=companion/dist/companion.cjs` — через companion, с пустыми user settings).
- Custom-API dts-lsp смотреть в исходниках на теге версии из `NPM_VERSION`
  (`server/src/server.ts`, раздел `CUSTOM APIS`), а не в минифицированном бандле.
- В Zed одноимённые captures разрешаются в пользу **последнего** шаблона: общие правила идут первыми.

## Соглашения

- С пользователем общаемся по-русски. Код, идентификаторы и коммиты пишем по-английски.
- Коммиты в стиле Conventional Commits. Лицензия Apache-2.0, SPDX-заголовки в исходниках.
- Версии внешних зависимостей (грамматика, LSP) фиксируются явно.
- Пути обрабатываются кроссплатформенно (Linux, macOS, Windows).
