#!/usr/bin/env node
import { readFile, access, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LINK_RE = /\[[^\]]+\]\(([^)#]+?)(#[^)]*)?\)/g;
const SKIP = new Set(["node_modules", ".git", ".changeset", ".github", "docs", "scripts"]);
const MAX_DEPTH = 6;

async function walk(dir, depth = 0, acc = []) {
  if (depth > MAX_DEPTH) return acc;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP.has(entry.name) || entry.name.startsWith(".")) continue;
      await walk(path.join(dir, entry.name), depth + 1, acc);
    } else if (entry.isFile() && entry.name.endsWith(".md") && depth >= 1) {
      // skip root-level *.md (depth 0); only walk into family/package subtrees
      acc.push(path.relative(ROOT, path.join(dir, entry.name)));
    }
  }
  return acc;
}

const files = await walk(ROOT);

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
