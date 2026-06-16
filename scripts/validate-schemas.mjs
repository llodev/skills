#!/usr/bin/env node
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const SKIP = new Set(["node_modules", ".git", ".changeset", ".github", "docs", "scripts"]);
const MAX_DEPTH = 5;

async function walk(dir, depth = 0, acc = []) {
  if (depth > MAX_DEPTH) return acc;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP.has(entry.name) || entry.name.startsWith(".")) continue;
      await walk(full, depth + 1, acc);
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".json") &&
      path.basename(path.dirname(full)) === "schemas"
    ) {
      acc.push(path.relative(ROOT, full));
    }
  }
  return acc;
}

const schemaFiles = await walk(ROOT);

// Pass 1: register every schema by $id so cross-schema $ref resolves
const schemas = [];
for (const rel of schemaFiles) {
  const full = path.join(ROOT, rel);
  const schema = JSON.parse(await readFile(full, "utf8"));
  schemas.push({ rel, schema });
  if (schema.$id) {
    ajv.addSchema(schema, schema.$id);
  }
}

// Pass 2: compile each schema (resolves cross-references via in-memory registry)
let failed = false;
for (const { rel, schema } of schemas) {
  try {
    if (schema.$id) {
      ajv.getSchema(schema.$id);
    } else {
      ajv.compile(schema);
    }
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
