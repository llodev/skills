#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { globSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import matter from "gray-matter";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REQUIRED = ["name", "description"];
const RECOMMENDED = ["license", "metadata"];

const files = globSync("pm-tasks-*/SKILL.md", { cwd: ROOT });

let failed = false;
for (const rel of files) {
  const src = await readFile(path.join(ROOT, rel), "utf8");
  const fm = matter(src).data ?? {};
  const errs = [];
  for (const k of REQUIRED) if (!fm[k]) errs.push(`missing required field: ${k}`);
  if (typeof fm.name === "string" && !/^[a-z0-9-]+$/.test(fm.name)) {
    errs.push(`name must be kebab-case: got "${fm.name}"`);
  }
  if (typeof fm.description === "string") {
    const len = fm.description.length;
    if (len < 200) errs.push(`description too short (${len} < 200)`);
    if (len > 1200) errs.push(`description too long (${len} > 1200)`);
  }
  for (const k of RECOMMENDED) if (!fm[k]) console.warn(`warn ${rel}: missing recommended field: ${k}`);
  if (errs.length) {
    failed = true;
    console.error(`FAIL ${rel}`);
    errs.forEach((e) => console.error(`     ${e}`));
  } else {
    console.log(`ok   ${rel}`);
  }
}
if (files.length === 0) console.log("(no SKILL.md found yet)");
process.exit(failed ? 1 : 0);
