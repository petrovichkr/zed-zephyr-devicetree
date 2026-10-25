// SPDX-License-Identifier: Apache-2.0
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    {
      // esbuild bundles `.html` with the text loader; mirror that in tests
      name: "html-as-text",
      transform(code, id) {
        if (id.endsWith(".html")) return { code: `export default ${JSON.stringify(code)};`, map: null };
      },
    },
  ],
});
