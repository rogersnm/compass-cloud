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
    env: {
      DATABASE_URL: "postgresql://compass:compass@localhost:5434/compass_test",
      JWT_SECRET: "test-secret-key-for-vitest",
    },
  },
});
