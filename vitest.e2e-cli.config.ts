import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/e2e-cli/**/*.test.ts"],
    testTimeout: 30000,
    fileParallelism: false,
  },
});
