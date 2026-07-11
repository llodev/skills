import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // vitest v4 removed the standalone workspace file; projects live here now.
    projects: ["skills/*", "packages/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      include: ["skills/*/src/**/*.ts", "packages/*/src/**/*.ts"],
      exclude: [
        "skills/*/src/**/*.test.ts",
        "skills/*/src/bin/**",
        "skills/*/src/doctor-cli.ts",
        "packages/*/src/**/*.test.ts",
        "packages/*/src/bin/**",
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
