import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

// vitest v4 treats each `skills/*`/`packages/*` glob match as its own
// project. Doc-only skills (e.g. the ts-ddd-* family) ship illustrative
// `examples/*.test.ts` files but no runnable suite — and vitest does NOT
// apply this file's `test.exclude` to config-less project directories, so a
// glob-only exclude can't stop them from being collected. Restricting
// `projects` to directories that actually hold a `src/` tree is what keeps
// them out: only real packages (pm-tasks adapters + testkit) have `src/`,
// and packaging a doc-only skill adds a `package.json` but never a `src/`,
// so this stays correct after the ts-ddd family is packaged. `test.exclude`
// below is kept as defense-in-depth for any src-package-with-`examples/` case.
function srcDirs(base: string): string[] {
  return readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(base, entry.name, "src")))
    .map((entry) => `${base}/${entry.name}`);
}

export default defineConfig({
  test: {
    projects: [...srcDirs("skills"), ...srcDirs("packages")],
    // Illustrative examples/*.test.ts files are documentation shipped inside
    // packages, not a runnable suite — they import placeholder packages
    // (e.g. @acme/*) that don't exist in this repo.
    exclude: [...configDefaults.exclude, "**/examples/**"],
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
