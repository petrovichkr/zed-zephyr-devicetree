#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
//
// Integration test in a real VS Code with a throwaway profile (no other
// extensions, so nRF DeviceTree stays out).
//
// env ZEPHYR_WORKSPACE: west workspace to open (default: the reference project,
//   which is only read); ZEPHYR_FILE: .dts file in it to open;
// env VSCODE_EXEC: VS Code executable to use instead of downloading one.

import { mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runTests } from "@vscode/test-electron";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const workspace = process.env.ZEPHYR_WORKSPACE ?? join(homedir(), "zephyr-workspace");
process.env.ZEPHYR_WORKSPACE = workspace;
process.env.ZEPHYR_FILE ??= join(workspace, "boards/vendor/board/board.dts");

const profile = mkdtempSync(join(tmpdir(), "zephyr-dt-vscode-"));
try {
  await runTests({
    vscodeExecutablePath: process.env.VSCODE_EXEC,
    extensionDevelopmentPath: root,
    extensionTestsPath: join(root, "test", "suite.cjs"),
    launchArgs: [workspace, "--disable-extensions", "--disable-workspace-trust", "--skip-welcome", "--skip-release-notes",
      `--user-data-dir=${join(profile, "user")}`, `--extensions-dir=${join(profile, "ext")}`],
  });
} catch (e) {
  console.error("integration test failed:", e);
  process.exitCode = 1;
} finally {
  rmSync(profile, { recursive: true, force: true });
}
