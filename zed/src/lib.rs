// SPDX-License-Identifier: Apache-2.0

use zed_extension_api::{
    self as zed, serde_json::json, serde_json::Value, settings::LspSettings, LanguageServerId,
    LanguageServerInstallationStatus, Result,
};

const SERVER_ID: &str = "devicetree-language-server";
const BINDINGS_SERVER_ID: &str = "zephyr-bindings";
const NPM_PACKAGE: &str = "devicetree-language-server";
/// Pinned on purpose: the companion relies on the server's `devicetree/*` custom API.
const NPM_VERSION: &str = "0.14.3";
const SERVER_ENTRY: &str = "node_modules/devicetree-language-server/dist/server.js";

/// The companion (ARCHITECTURE D15) is bundled into the extension and written to the
/// extension's work directory, so a dev install needs no separate download.
const COMPANION_JS: &str = include_str!("../../companion/dist/companion.cjs");
const COMPANION_FILE: &str = "companion.cjs";

struct ZephyrDevicetreeExtension {
    installed: bool,
}

impl ZephyrDevicetreeExtension {
    fn install(&mut self, id: &LanguageServerId) -> Result<()> {
        if self.installed {
            return Ok(());
        }
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
        std::fs::write(COMPANION_FILE, COMPANION_JS).map_err(|e| e.to_string())?;
        zed::set_language_server_installation_status(id, &LanguageServerInstallationStatus::None);
        self.installed = true;
        Ok(())
    }
}

fn work_path(rel: &str) -> Result<String> {
    let dir = std::env::current_dir().map_err(|e| e.to_string())?;
    Ok(dir.join(rel).to_string_lossy().into_owned())
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
        self.install(id)?;
        if id.as_ref() == BINDINGS_SERVER_ID {
            return Ok(zed::Command {
                command: zed::node_binary_path()?,
                args: vec![work_path(COMPANION_FILE)?, "--bindings".into()],
                env: Default::default(),
            });
        }
        let binary = LspSettings::for_worktree(SERVER_ID, worktree)
            .ok()
            .and_then(|s| s.binary);
        let (path, arguments, env) = match binary {
            Some(b) => (b.path, b.arguments, b.env),
            None => (None, None, None),
        };

        // `binary.path` replaces the pinned dts-lsp; the companion still wraps it.
        let mut args = vec![work_path(COMPANION_FILE)?, "--server".into()];
        match path {
            Some(path) => {
                args.push(path);
                args.extend(arguments.unwrap_or_default());
            }
            None => args.push(work_path(SERVER_ENTRY)?),
        }

        Ok(zed::Command {
            command: zed::node_binary_path()?,
            args,
            env: env.map(|e| e.into_iter().collect()).unwrap_or_default(),
        })
    }

    fn language_server_workspace_configuration(
        &mut self,
        _id: &LanguageServerId,
        worktree: &zed::Worktree,
    ) -> Result<Option<Value>> {
        // Workspace defaults come from the companion through dts-lsp's integration
        // API; whatever the user sets here overrides them.
        let user = LspSettings::for_worktree(SERVER_ID, worktree)
            .ok()
            .and_then(|s| s.settings)
            .unwrap_or_else(|| json!({}));
        Ok(Some(json!({ "devicetree": user })))
    }
}

zed::register_extension!(ZephyrDevicetreeExtension);
