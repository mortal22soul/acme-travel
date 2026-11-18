import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      buffer: "node:buffer",
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    pool: "forks",
    setupFiles: ["./tests/setup.ts"],
  },
});
