import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], name: "pm-tasks-asana", coverage: { enabled: true } },
});
