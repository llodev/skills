import { test, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const I18N_DIR = path.resolve(import.meta.dirname, "..", "..", "i18n");

async function loadAll(): Promise<Record<string, Record<string, string>>> {
  const files = (await readdir(I18N_DIR)).filter((f) => f.endsWith(".json"));
  const out: Record<string, Record<string, string>> = {};
  for (const f of files) {
    out[f] = JSON.parse(await readFile(path.join(I18N_DIR, f), "utf8")) as Record<string, string>;
  }
  return out;
}

test("all locale files share the same key set", async () => {
  const all = await loadAll();
  const ref = Object.keys(all["en-US.json"]).sort();
  for (const [name, data] of Object.entries(all)) {
    if (name === "en-US.json") continue;
    expect(Object.keys(data).sort()).toEqual(ref);
  }
});

test("all locale values are non-empty strings", async () => {
  const all = await loadAll();
  for (const [name, data] of Object.entries(all)) {
    for (const [k, v] of Object.entries(data)) {
      expect(typeof v, `${name}/${k} is not a string`).toBe("string");
      expect((v as string).length, `${name}/${k} is empty`).toBeGreaterThan(0);
    }
  }
});
