#!/usr/bin/env node
// Agent-agnostic lint for the pm-tasks family SKILL.md, references, and anti-patterns
// (skills/pm-tasks-*). See skills/pm-tasks-core/references/agent-agnostic-lint.md for the contract.

import { readFile } from "node:fs/promises";
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path
  .resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
  .replace(/\/$/, "");

// Pattern → { regex, caseSensitive }
const BANNED = [
  { name: "superpowers", regex: /\bsuperpowers\b/i, caseSensitive: false },
  { name: "sdd", regex: /\bsdd\b/i, caseSensitive: false },
  { name: "Claude Code", regex: /Claude Code/, caseSensitive: true },
  { name: "Claude-only", regex: /Claude-only/, caseSensitive: true },
  { name: "Claude assumes", regex: /Claude assumes/, caseSensitive: true },
];

// Substring allowlist — if a banned-pattern hit's surrounding text matches any
// of these allowlist patterns, the hit is suppressed.
const ALLOWLIST = [
  /claude\.ai\b/i, // vendor product name (claude.ai Asana)
  /claude-ai-asana-mcp/, // npm package for the Asana MCP server
  /\bclaude-code\b/, // compatibility-tag idiomatic spelling (lowercase, hyphenated)
  /MCP setup — Claude Code/, // section header listing MCP setup steps per agent
  /Claude Code does NOT interpolate/, // CLI behavior note in MCP config guide
  /Claude Code marketplace/, // skillpm + Claude Code marketplace cascade (vendor product)
];

function walk(dir, results = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, results);
    else if (full.endsWith(".md")) results.push(full);
  }
  return results;
}

function findMatchingFiles() {
  const out = [];
  const skillsDir = path.join(ROOT, "skills");
  for (const pkgDir of readdirSync(skillsDir)) {
    // Scope: pm-tasks family only (multi-agent published adapters).
    if (!pkgDir.startsWith("pm-tasks-")) continue;
    const pkgPath = path.join(skillsDir, pkgDir);
    if (!statSync(pkgPath).isDirectory()) continue;
    const skill = path.join(pkgPath, "SKILL.md");
    try {
      statSync(skill);
      out.push(skill);
    } catch {
      /* no SKILL.md in this package — skip */
    }
    for (const sub of ["references", "anti-patterns"]) {
      try {
        const subDir = path.join(pkgPath, sub);
        if (statSync(subDir).isDirectory()) walk(subDir, out);
      } catch {
        /* dir absent — skip */
      }
    }
  }
  return out;
}

// Skip body content rule application to frontmatter (everything between the
// opening and closing --- on the file's first lines).
function stripFrontmatter(text) {
  if (!text.startsWith("---\n")) return text;
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return text;
  return text.slice(end + 5);
}

function checkFile(filePath, text) {
  const body = stripFrontmatter(text);
  const lines = body.split(/\r?\n/);
  const violations = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of BANNED) {
      const match = pattern.regex.exec(line);
      if (!match) continue;
      // Check allowlist — if any allowlist pattern matches the same line, suppress.
      const allowed = ALLOWLIST.some((al) => al.test(line));
      if (allowed) continue;
      violations.push({
        file: filePath,
        line: i + 1,
        pattern: pattern.name,
        snippet: line.trim(),
      });
    }
  }
  return violations;
}

async function main() {
  const files = findMatchingFiles();
  let allViolations = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const v = checkFile(file, text);
    allViolations = allViolations.concat(v);
  }

  // The lint rule's own design doc is self-exempt (it must contain the patterns).
  allViolations = allViolations.filter(
    (v) => !v.file.endsWith("/agent-agnostic-lint.md"),
  );

  if (allViolations.length === 0) {
    console.log("agent-agnostic-lint: ✓ no violations");
    process.exit(0);
  }
  console.error(`agent-agnostic-lint: ${allViolations.length} violation(s)`);
  for (const v of allViolations) {
    console.error(
      `  ${path.relative(ROOT, v.file)}:${v.line}  ${v.pattern}  → ${v.snippet}`,
    );
  }
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
