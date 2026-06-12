#!/usr/bin/env node
import { readFile, access } from "node:fs/promises";
import { globSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LINK_RE = /\[[^\]]+\]\(([^)#]+?)(#[^)]*)?\)/g;

const files = globSync("pm-tasks-*/**/*.md", { cwd: ROOT });

let failed = false;
for (const rel of files) {
  const full = path.join(ROOT, rel);
  const src = await readFile(full, "utf8");
  for (const m of src.matchAll(LINK_RE)) {
    const target = m[1];
    if (/^(https?:|mailto:)/.test(target)) continue;
    const resolved = path.resolve(path.dirname(full), target);
    try {
      await access(resolved);
    } catch {
      failed = true;
      console.error(`FAIL ${rel}: dead link -> ${target}`);
    }
  }
}
if (!failed) console.log(`ok   ${files.length} files checked`);
process.exit(failed ? 1 : 0);
