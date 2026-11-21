import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], name: "pm-tasks-clickup", coverage: { enabled: true } },
});
