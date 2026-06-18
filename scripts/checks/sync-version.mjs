#!/usr/bin/env node
// After `changeset version` bumps package.json, mirror new versions into:
//   - SKILL.md frontmatter (every package)
//   - .claude-plugin/marketplace.json plugin entries (only packages listed there)
import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import matter from "gray-matter";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SKIP = new Set(["node_modules", ".git", ".changeset", ".github", "docs", "scripts"]);
const MAX_DEPTH = 4;

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
    } else if (entry.isFile() && entry.name === "package.json") {
      acc.push(path.relative(ROOT, path.join(dir, entry.name)));
    }
  }
  return acc;
}

const pkgFiles = (await walk(ROOT)).filter((rel) => rel !== "package.json");
const pkgVersions = new Map();

for (const rel of pkgFiles) {
  const dir = path.dirname(path.join(ROOT, rel));
  const pkg = JSON.parse(await readFile(path.join(ROOT, rel), "utf8"));
  pkgVersions.set(path.basename(dir), pkg.version);
  const skillPath = path.join(dir, "SKILL.md");
  let src;
  try {
    src = await readFile(skillPath, "utf8");
  } catch {
    continue;
  }
  const parsed = matter(src);
  parsed.data.metadata ??= {};
  if (parsed.data.metadata.version === pkg.version) continue;
  parsed.data.metadata.version = pkg.version;
  await writeFile(skillPath, matter.stringify(parsed.content, parsed.data));
  console.log(`synced ${path.relative(ROOT, skillPath)} -> ${pkg.version}`);
}

const marketplacePath = path.join(ROOT, ".claude-plugin/marketplace.json");
try {
  const marketplace = JSON.parse(await readFile(marketplacePath, "utf8"));
  let changed = false;
  for (const plugin of marketplace.plugins ?? []) {
    const current = pkgVersions.get(plugin.name);
    if (current && plugin.version !== current) {
      console.log(`synced marketplace.json/${plugin.name} -> ${current}`);
      plugin.version = current;
      changed = true;
    }
  }
  if (changed) {
    await writeFile(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n");
  }
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}
