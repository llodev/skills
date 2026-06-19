import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["pm-tasks/*/src/**/*.ts"],
      exclude: ["pm-tasks/*/src/**/*.test.ts", "pm-tasks/*/src/bin/**", "**/dist/**"],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
    },
  },
});
