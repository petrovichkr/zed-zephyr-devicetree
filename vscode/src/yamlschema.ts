// SPDX-License-Identifier: Apache-2.0
//
// JSON Schema for binding YAML through redhat.vscode-yaml's contributor API.
// It covers files under dts/bindings/ only; the schema stays permissive because
// the Zephyr Bindings server checks keys with the workspace's edtlib.py rules.

import { readFileSync } from "node:fs";
import * as vscode from "vscode";

const YAML_EXTENSION = "redhat.vscode-yaml";
const SCHEMA_URI = "zephyr-binding://schema/binding.json";

interface YamlApi {
  registerContributor(
    name: string,
    requestSchema: (resource: string) => string | undefined,
    requestSchemaContent: (uri: string) => string | undefined,
    label?: string,
  ): boolean;
}

export function isBindingPath(resource: string): boolean {
  return /\/dts\/bindings\/.+\.ya?ml$/.test(vscode.Uri.parse(resource).path);
}

/** Registers the schema once per session; false without the YAML extension. */
export async function registerBindingSchema(context: vscode.ExtensionContext, enabled: () => boolean): Promise<boolean> {
  const ext = vscode.extensions.getExtension<YamlApi>(YAML_EXTENSION);
  if (!ext) return false;
  const api = ext.isActive ? ext.exports : await ext.activate().then(
    (a) => a,
    () => undefined,
  );
  if (typeof api?.registerContributor !== "function") return false;
  const content = readFileSync(context.asAbsolutePath("schemas/zephyr-binding.schema.json"), "utf8");
  api.registerContributor(
    "zephyr-binding",
    (resource) => (enabled() && isBindingPath(resource) ? SCHEMA_URI : undefined),
    (uri) => (uri === SCHEMA_URI ? content : undefined),
    "Zephyr binding",
  );
  return true;
}
