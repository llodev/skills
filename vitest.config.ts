import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["pm-tasks/*/vitest.config.ts"],
    exclude: ["scripts/**", ".agents/**"],
    coverage: { provider: "v8", reporter: ["text", "lcov"] },
  },
});
