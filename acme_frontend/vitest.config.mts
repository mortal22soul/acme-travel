import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  oxc: { jsx: "react-jsx" },
  test: { include: ["tests/**/*.test.ts"], environment: "jsdom", setupFiles: ["./tests/setup.ts"] },
});
