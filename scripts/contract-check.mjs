#!/usr/bin/env node
// Fails the PR if pm-tasks/pm-tasks-core/references/contract.md changed without a matching major changeset.
import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const BASE = process.env.GITHUB_BASE_REF || "main";
const CONTRACT = "pm-tasks/pm-tasks-core/references/contract.md";

const changed = execSync(`git diff --name-only origin/${BASE}...HEAD`, { encoding: "utf8" })
  .trim()
  .split("\n");
if (!changed.includes(CONTRACT)) {
  console.log("ok   contract.md unchanged");
  process.exit(0);
}

const csDir = ".changeset";
if (!existsSync(csDir)) {
  console.error("FAIL contract changed but .changeset/ missing");
  process.exit(1);
}

const csFiles = execSync(`ls ${csDir}/*.md 2>/dev/null || true`, { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);
let hasCoreMajor = false;
for (const f of csFiles) {
  const src = await readFile(f, "utf8");
  if (/^"@llodev\/pm-tasks-core":\s*major\s*$/m.test(src)) {
    hasCoreMajor = true;
    break;
  }
}

if (hasCoreMajor) {
  console.log("ok   contract.md changed with matching core major bump");
  process.exit(0);
}
console.error("FAIL contract.md changed but no major changeset for @llodev/pm-tasks-core");
process.exit(1);
