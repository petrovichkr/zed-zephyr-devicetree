// SPDX-License-Identifier: Apache-2.0

use std::path::{Path, PathBuf};

use zed_extension_api::{
    self as zed, serde_json::json, serde_json::Map, serde_json::Value, settings::LspSettings,
    LanguageServerId, LanguageServerInstallationStatus, Result,
};

const SERVER_ID: &str = "devicetree-language-server";
const NPM_PACKAGE: &str = "devicetree-language-server";
/// Pinned on purpose: the extension relies on the server's `devicetree/*` custom API.
const NPM_VERSION: &str = "0.14.3";
const SERVER_ENTRY: &str = "node_modules/devicetree-language-server/dist/server.js";

/// Architecture directories under `$ZEPHYR_BASE/dts`.
/// TODO(stage 1): take the exact list from `build_info.yml` in the companion.
const ZEPHYR_DTS_ARCHES: &[&str] = &[
    "arc", "arm", "arm64", "nios2", "posix", "riscv", "rx", "sparc", "tricore", "x86", "xtensa",
];

struct ZephyrDevicetreeExtension {
    installed: bool,
}

impl ZephyrDevicetreeExtension {
    fn server_script(&mut self, id: &LanguageServerId) -> Result<String> {
        if !self.installed {
            if zed::npm_package_installed_version(NPM_PACKAGE)?.as_deref() != Some(NPM_VERSION) {
                zed::set_language_server_installation_status(
                    id,
                    &LanguageServerInstallationStatus::Downloading,
                );
                if let Err(e) = zed::npm_install_package(NPM_PACKAGE, NPM_VERSION) {
                    zed::set_language_server_installation_status(
                        id,
                        &LanguageServerInstallationStatus::Failed(e.clone()),
                    );
                    return Err(e);
                }
            }
            zed::set_language_server_installation_status(
                id,
                &LanguageServerInstallationStatus::None,
            );
            self.installed = true;
        }
        let dir = std::env::current_dir().map_err(|e| e.to_string())?;
        Ok(dir.join(SERVER_ENTRY).to_string_lossy().into_owned())
    }
}

impl zed::Extension for ZephyrDevicetreeExtension {
    fn new() -> Self {
        Self { installed: false }
    }

    fn language_server_command(
        &mut self,
        id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<zed::Command> {
        let binary = LspSettings::for_worktree(SERVER_ID, worktree)
            .ok()
            .and_then(|s| s.binary);
        let env = binary
            .as_ref()
            .and_then(|b| b.env.clone())
            .map(|env| env.into_iter().collect())
            .unwrap_or_default();

        if let Some(path) = binary.as_ref().and_then(|b| b.path.clone()) {
            let args = binary
                .and_then(|b| b.arguments)
                .unwrap_or_else(|| vec!["--stdio".into()]);
            return Ok(zed::Command {
                command: path,
                args,
                env,
            });
        }

        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args: vec![self.server_script(id)?, "--stdio".into()],
            env,
        })
    }

    fn language_server_workspace_configuration(
        &mut self,
        _id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<Value>> {
        let mut config = zephyr_defaults(worktree);
        let user = LspSettings::for_worktree(SERVER_ID, worktree)
            .ok()
            .and_then(|s| s.settings);
        if let Some(Value::Object(user)) = user {
            config.extend(user);
        }
        Ok(Some(json!({ "devicetree": config })))
    }
}

/// Settings derived from the west workspace when the worktree root is its topdir.
fn zephyr_defaults(worktree: &zed::Worktree) -> Map<String, Value> {
    let root = PathBuf::from(worktree.root_path());
    let mut config = Map::new();
    config.insert("cwd".into(), json!(root));
    config.insert("defaultBindingType".into(), json!("Zephyr"));
    config.insert("autoChangeContext".into(), json!(true));
    config.insert("allowAdhocContexts".into(), json!(true));

    let Some(base) = zephyr_base(worktree, &root) else {
        return config;
    };
    let dts = base.join("dts");
    let mut includes = vec![dts.clone(), dts.join("common"), dts.join("vendor")];
    includes.extend(ZEPHYR_DTS_ARCHES.iter().map(|arch| dts.join(arch)));
    includes.push(base.join("include"));
    includes.push(base.join("include").join("zephyr"));

    config.insert("defaultIncludePaths".into(), json!(includes));
    config.insert(
        "defaultZephyrBindings".into(),
        json!([dts.join("bindings")]),
    );
    config
}

/// `zephyr.base` from `.west/config`, then `$ZEPHYR_BASE`.
fn zephyr_base(worktree: &zed::Worktree, root: &Path) -> Option<PathBuf> {
    let from_west = worktree
        .read_text_file(".west/config")
        .ok()
        .and_then(|text| ini_value(&text, "zephyr", "base"))
        .map(|base| root.join(base));
    from_west.or_else(|| {
        worktree
            .shell_env()
            .into_iter()
            .find(|(key, _)| key == "ZEPHYR_BASE")
            .map(|(_, value)| PathBuf::from(value))
    })
}

/// Minimal INI lookup, enough for west's configparser-style files.
fn ini_value(text: &str, section: &str, key: &str) -> Option<String> {
    let mut in_section = false;
    for line in text.lines().map(str::trim) {
        if line.starts_with('[') && line.ends_with(']') {
            in_section = line[1..line.len() - 1].trim() == section;
        } else if in_section {
            if let Some((k, v)) = line.split_once('=') {
                if k.trim() == key {
                    return Some(v.trim().to_string());
                }
            }
        }
    }
    None
}

zed::register_extension!(ZephyrDevicetreeExtension);

#[cfg(test)]
mod tests {
    use super::ini_value;

    #[test]
    fn reads_zephyr_base_from_west_config() {
        let text =
            "[manifest]\npath = .\nfile = west.yml\n\n[zephyr]\nbase = dist/zephyrproject/zephyr\n";
        assert_eq!(
            ini_value(text, "zephyr", "base").as_deref(),
            Some("dist/zephyrproject/zephyr")
        );
        assert_eq!(ini_value(text, "manifest", "base"), None);
    }
}
