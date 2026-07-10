// Regression test for the schema-$ref bug surfaced when running `make init-trello`
// after Phase 1 v1.3.2 shipped: the adapter config schema $refs
// `https://llodev.com/pm-tasks/attribution.schema.json` but validateConfig
// was compiling the adapter schema without registering core's reusable
// schemas with Ajv first, throwing MissingRefError.
//
// validateConfig must pre-register attribution.schema.json (and
// adapter-manifest.schema.json) before compiling any adapter schema.
import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { validateConfig } from "../src/init-lib.js";

const HERE = import.meta.dirname;
const TRELLO_SCHEMA_PATH = path.resolve(
  HERE,
  "..",
  "..",
  "pm-tasks-trello",
  "schemas",
  "config.json",
);
const ASANA_SCHEMA_PATH = path.resolve(
  HERE,
  "..",
  "..",
  "pm-tasks-asana",
  "schemas",
  "config.json",
);

async function loadSchema(p: string) {
  return JSON.parse(await readFile(p, "utf8"));
}

describe("validateConfig — adapter schemas that $ref core schemas", () => {
  it("accepts a minimal trello config with attribution enabled (resolves $ref to attribution.schema.json)", async () => {
    const schema = await loadSchema(TRELLO_SCHEMA_PATH);
    const config = {
      $schema: "https://llodev.github.io/skills/schemas/pm-tasks-trello.json",
      version: "1",
      boards: [{ id: "abc12345", alias: "main" }],
      lists: [{ boardAlias: "main", id: "list1234", name: "Backlog", alias: "backlog" }],
      attribution: { enabled: true },
    };
    const result = await validateConfig(config, schema);
    expect(result.ok).toBe(true);
  });

  it("accepts a minimal asana config with attribution enabled (resolves $ref to attribution.schema.json)", async () => {
    const schema = await loadSchema(ASANA_SCHEMA_PATH);
    const config = {
      $schema: "https://llodev.github.io/skills/schemas/pm-tasks-asana.json",
      version: "1",
      projects: [{ id: "1234567890", alias: "main" }],
      sections: [{ projectAlias: "main", id: "1234567891", name: "Backlog", alias: "backlog" }],
      attribution: { enabled: true },
    };
    const result = await validateConfig(config, schema);
    expect(result.ok).toBe(true);
  });

  it("rejects a trello config with unknown top-level field (sanity: validation actually runs)", async () => {
    const schema = await loadSchema(TRELLO_SCHEMA_PATH);
    const config = {
      version: "1",
      boards: [{ id: "abc12345", alias: "main" }],
      lists: [{ boardAlias: "main", id: "list1234", name: "Backlog", alias: "backlog" }],
      bogusField: true,
    };
    const result = await validateConfig(config, schema);
    expect(result.ok).toBe(false);
  });
});
