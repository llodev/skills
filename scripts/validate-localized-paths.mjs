#!/usr/bin/env node
/**
 * validate-localized-paths.mjs
 *
 * For every *.{pt-BR,es-ES}.md file:
 *   1. Parse markdown link/image syntax + HTML src/href attributes.
 *   2. Filter to relative paths only (skip http/https/mailto/# anchors/absolute paths).
 *   3. Resolve relative to file's directory; FAIL if path doesn't exist.
 *   4. Localized-preference rule (WARN only): if a link points to foo.md and
 *      foo.<this-lang>.md exists alongside it, warn to prefer the localized sibling.
 *
 * Exit 0 if no broken links (FAILs). WARNs printed but don't affect exit code.
 */

import { readFile, access, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set(["node_modules", ".git", ".changeset", ".github", "scripts"]);
const MAX_DEPTH = 8;

// Match *.pt-BR.md or *.es-ES.md
const LOCALIZED_RE = /^.+\.(pt-BR|es-ES)\.md$/;
// Extract lang tag from filename
const LANG_RE = /\.(pt-BR|es-ES)\.md$/;

// Markdown inline link/image: [text](path) or ![alt](path)
const MD_LINK_RE = /!?\[[^\]]*\]\(([^)#\s][^)]*?)(#[^)]*)?\)/g;
// Reference-style: [id]: path
const REF_LINK_RE = /^\s*\[[^\]]+\]:\s+(\S+)/gm;
// HTML src="..." or href="..."
const HTML_ATTR_RE = /(?:src|href)="([^"]+)"/g;

function extractLinks(src) {
  /** @type {{path: string, line: number}[]} */
  const results = [];
  const lines = src.split("\n");

  // Build line-start offsets for position→line lookup
  const offsets = [];
  let pos = 0;
  for (const line of lines) {
    offsets.push(pos);
    pos += line.length + 1;
  }
  const posToLine = (p) => {
    let lo = 0, hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= p) lo = mid; else hi = mid - 1;
    }
    return lo + 1; // 1-based
  };

  for (const m of src.matchAll(MD_LINK_RE)) {
    results.push({ path: m[1].trim(), line: posToLine(m.index) });
  }
  for (const m of src.matchAll(REF_LINK_RE)) {
    results.push({ path: m[1].trim(), line: posToLine(m.index) });
  }
  for (const m of src.matchAll(HTML_ATTR_RE)) {
    results.push({ path: m[1].trim(), line: posToLine(m.index) });
  }
  return results;
}

function isRelative(p) {
  if (/^(https?:|mailto:|file:|ftp:)/i.test(p)) return false;
  if (p.startsWith("#")) return false;
  if (p.startsWith("/")) return false;
  return true;
}

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function walk(dir, depth = 0, acc = []) {
  if (depth > MAX_DEPTH) return acc;
  let entries;
  try { entries = await readdir(dir, { withFileTypes: true }); } catch { return acc; }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP.has(entry.name) || entry.name.startsWith(".")) continue;
      await walk(path.join(dir, entry.name), depth + 1, acc);
    } else if (entry.isFile() && LOCALIZED_RE.test(entry.name)) {
      acc.push(path.join(dir, entry.name));
    }
  }
  return acc;
}

const files = await walk(ROOT);

let failCount = 0;
let warnCount = 0;
const failedFiles = new Set();

for (const full of files) {
  const rel = path.relative(ROOT, full);
  const langMatch = full.match(LANG_RE);
  const lang = langMatch ? langMatch[1] : null;

  let src;
  try { src = await readFile(full, "utf8"); } catch { continue; }

  const links = extractLinks(src);
  const fileDir = path.dirname(full);

  for (const { path: target, line } of links) {
    if (!isRelative(target)) continue;

    // Strip query string if any (rare in md, but safe)
    const cleanTarget = target.split("?")[0];
    const resolved = path.resolve(fileDir, cleanTarget);

    if (!(await fileExists(resolved))) {
      console.error(`FAIL ${rel}:${line} broken link: ${target}`);
      failCount++;
      failedFiles.add(rel);
      continue;
    }

    // Localized-preference rule: only for .md targets
    if (lang && cleanTarget.endsWith(".md") && !cleanTarget.includes(`.${lang}.`)) {
      // Derive what the localized sibling would be
      const targetBasename = path.basename(cleanTarget, ".md");
      const targetDir = path.dirname(resolved);
      const localizedSibling = path.join(targetDir, `${targetBasename}.${lang}.md`);

      if (await fileExists(localizedSibling)) {
        const expectedRel = path.relative(fileDir, localizedSibling);
        console.warn(`WARN  ${rel}:${line} prefer localized: '${target}' → '${expectedRel}'`);
        warnCount++;
      }
    }
  }
}

const fileCount = files.length;
if (failCount === 0) {
  console.log(`ok ${fileCount} files checked, ${warnCount} warns`);
} else {
  console.error(`FAIL ${failCount} broken links across ${failedFiles.size} files (${fileCount} files checked, ${warnCount} warns)`);
}
process.exit(failCount > 0 ? 1 : 0);
