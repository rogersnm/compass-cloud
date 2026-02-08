import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
    exclude: ["node_modules"],
    testTimeout: 15000,
    fileParallelism: false,
  },
});
