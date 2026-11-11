#!/usr/bin/env node
// After `changeset version` bumps package.json, mirror new versions into:
//   - SKILL.md frontmatter (every package)
//   - .claude-plugin/marketplace.json plugin entries (only packages listed there)
//
// SKILL.md is edited in place: only the `metadata.version` line changes. Re-dumping
// the whole frontmatter through a YAML serializer re-wraps folded descriptions, which
// turns every release PR into a content diff and trips the skill-judge gate.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SKIP = new Set(["node_modules", ".git", ".changeset", ".github", "docs", "scripts"]);
const MAX_DEPTH = 4;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/;

/**
 * Returns `src` with the frontmatter `metadata.version` set to `version`, touching
 * nothing else. Adds the field (and the `metadata:` block) when missing. Returns
 * `src` unchanged when the version already matches. Throws when there is no
 * frontmatter.
 */
export function setFrontmatterVersion(src, version) {
  const match = FRONTMATTER.exec(src);
  if (!match) throw new Error("SKILL.md has no frontmatter");
  const lines = match[1].split(/\r?\n/);

  const metadataIndex = lines.findIndex((line) => /^metadata:\s*$/.test(line));
  let block;
  if (metadataIndex === -1) {
    block = [...lines, "metadata:", `  version: ${version}`];
  } else {
    let end = metadataIndex + 1;
    while (end < lines.length && (/^\s+\S/.test(lines[end]) || lines[end].trim() === "")) end++;
    const versionIndex = lines
      .slice(metadataIndex + 1, end)
      .findIndex((line) => /^\s+version:/.test(line));
    block = [...lines];
    if (versionIndex === -1) {
      const indent = /^(\s+)/.exec(lines[metadataIndex + 1] ?? "")?.[1] ?? "  ";
      block.splice(metadataIndex + 1, 0, `${indent}version: ${version}`);
    } else {
      const at = metadataIndex + 1 + versionIndex;
      block[at] = block[at].replace(/^(\s+version:\s*).*$/, `$1${version}`);
    }
  }

  const eol = src.includes("\r\n") ? "\r\n" : "\n";
  const head = `---${eol}${block.join(eol)}${eol}---${match[2]}`;
  return head + src.slice(match[0].length);
}

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

async function main() {
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
    const next = setFrontmatterVersion(src, pkg.version);
    if (next === src) continue;
    await writeFile(skillPath, next);
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
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
