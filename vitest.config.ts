import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    projects: ["pm-tasks/*/vitest.config.ts"],
    coverage: { provider: "v8", reporter: ["text", "lcov"] },
  },
});
