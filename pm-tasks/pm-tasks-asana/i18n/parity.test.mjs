import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const HERE = import.meta.dirname;

async function loadAll() {
  const files = (await readdir(HERE)).filter((f) => f.endsWith(".json"));
  const out = {};
  for (const f of files) out[f] = JSON.parse(await readFile(path.join(HERE, f), "utf8"));
  return out;
}

test("all locale files share the same key set", async () => {
  const all = await loadAll();
  const ref = Object.keys(all["en-US.json"]).sort();
  for (const [name, data] of Object.entries(all)) {
    if (name === "en-US.json") continue;
    const keys = Object.keys(data).sort();
    assert.deepEqual(keys, ref, `locale ${name} differs from en-US`);
  }
});

test("all locale values are non-empty strings", async () => {
  const all = await loadAll();
  for (const [name, data] of Object.entries(all)) {
    for (const [k, v] of Object.entries(data)) {
      assert.equal(typeof v, "string", `${name}/${k} is not a string`);
      assert.ok(v.length > 0, `${name}/${k} is empty`);
    }
  }
});
