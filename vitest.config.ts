import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["pm-tasks/*/src/**/*.ts"],
      exclude: [
        "pm-tasks/*/src/**/*.test.ts",
        "pm-tasks/*/src/bin/**",
        "pm-tasks/*/src/doctor-cli.ts",
        "**/dist/**",
      ],
      thresholds: {
        lines: 50,
        branches: 75,
        functions: 60,
        statements: 50,
      },
    },
  },
});
