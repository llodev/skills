#!/usr/bin/env node
// Fails when published skill content points at things only this repository has:
// internal docs (specs, roadmap, publishing guide), repo scripts, agent instruction
// files, local scratch folders, or wording that assumes the reader is inside this
// repo. Consumers install the packages into their own projects and cannot follow
// any of those references.
//
// Scope: for every package under skills/ and packages/, the paths listed in its
// package.json "files" field, excluding dist/ and CHANGELOG.md (generated).
// `docs/plans/*.md` is allowed: in the pm-tasks plan-execution docs it means the
// consumer's own plan files.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../..", import.meta.url).pathname;
const TEXT_FILE = /\.(md|json|ya?ml|txt)$/i;

const RULES = [
  { id: "internal-docs", re: /docs\/(superpowers|specs\/|roadmap|publishing-guide)|roadmap\.md/i },
  { id: "repo-scripts", re: /scripts\/(checks|shell|snapshots)\//i },
  { id: "agent-files", re: /\b(CLAUDE|AGENTS)\.md\b/ },
  { id: "local-scratch", re: /(^|[\s`(/])(\.superpowers|sandbox)\//i },
  { id: "repo-wording", re: /\b(this|our) (mono)?repo(sitory)?\b/i },
  { id: "origin-project", re: /your-best-day|apps\/(api|web)\/src/i },
  { id: "internal-roadmap", re: /roadmapped for v\d|release task/i },
];

function walk(path, out) {
  const stats = statSync(path);
  if (stats.isDirectory()) {
    for (const entry of readdirSync(path)) {
      if (entry === "node_modules" || entry === "dist" || entry === "coverage") continue;
      walk(join(path, entry), out);
    }
  } else if (TEXT_FILE.test(path) && !path.endsWith("CHANGELOG.md")) {
    out.push(path);
  }
}

function publishedFiles(pkgDir) {
  const manifest = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  const entries = (manifest.files ?? ["SKILL.md", "README.md"]).filter(
    (entry) => entry !== "dist" && !entry.startsWith("CHANGELOG"),
  );
  const files = [];
  for (const entry of entries) {
    const target = join(pkgDir, entry);
    if (existsSync(target)) walk(target, files);
  }
  return files;
}

const violations = [];
for (const base of ["skills", "packages"]) {
  for (const name of readdirSync(join(ROOT, base))) {
    const pkgDir = join(ROOT, base, name);
    if (!existsSync(join(pkgDir, "package.json"))) continue;
    for (const file of publishedFiles(pkgDir)) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, index) => {
          for (const rule of RULES) {
            if (rule.re.test(line)) {
              violations.push(
                `${relative(ROOT, file)}:${index + 1} [${rule.id}] ${line.trim().slice(0, 140)}`,
              );
              break;
            }
          }
        });
    }
  }
}

if (violations.length === 0) {
  console.log("published-content-lint: ✓ no internal references in published files");
  process.exit(0);
}
console.error(
  `published-content-lint: ${violations.length} internal reference(s) in published files`,
);
for (const violation of violations) console.error(`  ${violation}`);
process.exit(1);
