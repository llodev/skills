#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { globSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const schemaFiles = globSync("pm-tasks-*/schemas/*.json", { cwd: ROOT });

let failed = false;
for (const rel of schemaFiles) {
  const full = path.join(ROOT, rel);
  const schema = JSON.parse(await readFile(full, "utf8"));
  try {
    ajv.compile(schema);
    console.log(`ok   ${rel}`);
  } catch (e) {
    console.error(`FAIL ${rel}: ${e.message}`);
    failed = true;
  }
}

if (schemaFiles.length === 0) {
  console.log("(no schemas found yet)");
}
process.exit(failed ? 1 : 0);
