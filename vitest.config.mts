import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup-env.ts"],
    clearMocks: true,
    fileParallelism: false,
  },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
