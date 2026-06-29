#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const REQUIRED_LOCALES = ["en-US", "pt-BR", "es-ES"];
const ADAPTERS = ["pm-tasks-core", "pm-tasks-asana", "pm-tasks-trello", "pm-tasks-jira"];

async function checkAdapter(adapter) {
  const root = path.join(REPO, "pm-tasks", adapter, "i18n");
  const files = await readdir(root);
  const tables = {};
  for (const loc of REQUIRED_LOCALES) {
    if (!files.includes(`${loc}.json`)) throw new Error(`${adapter}/${loc}.json missing`);
    tables[loc] = JSON.parse(await readFile(path.join(root, `${loc}.json`), "utf8"));
  }
  const refKeys = Object.keys(tables["en-US"]).sort();
  for (const loc of REQUIRED_LOCALES) {
    const k = Object.keys(tables[loc]).sort();
    if (JSON.stringify(k) !== JSON.stringify(refKeys)) {
      throw new Error(`${adapter}/${loc}.json key drift vs en-US`);
    }
  }
  return refKeys.length;
}

let total = 0;
for (const a of ADAPTERS) {
  const n = await checkAdapter(a);
  console.log(`ok   ${a}/i18n × ${REQUIRED_LOCALES.length} locales × ${n} keys`);
  total += n * REQUIRED_LOCALES.length;
}
console.log(`ok   ${total} translated strings checked`);
