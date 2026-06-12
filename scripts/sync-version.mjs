#!/usr/bin/env node
// After `changeset version` bumps package.json, mirror new versions into SKILL.md frontmatter
import { readFile, writeFile } from "node:fs/promises";
import { globSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import matter from "gray-matter";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkgFiles = globSync("pm-tasks-*/package.json", { cwd: ROOT });

for (const rel of pkgFiles) {
  const dir = path.dirname(path.join(ROOT, rel));
  const pkg = JSON.parse(await readFile(path.join(ROOT, rel), "utf8"));
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
