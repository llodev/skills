import { test, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const I18N_DIR = path.resolve(import.meta.dirname, "..", "..", "i18n");

const LOCALES = ["en-US", "pt-BR", "es-ES"];
const KEYS = [
  "attribution.descriptionFooter",
  "attribution.commentPrefix",
  "attribution.autonomousCommentPrefix",
];

for (const locale of LOCALES) {
  test(`${locale} — attribution keys exist and have {agent} token`, async () => {
    const raw = await readFile(path.join(I18N_DIR, `${locale}.json`), "utf8");
    const data = JSON.parse(raw) as Record<string, string>;

    for (const key of KEYS) {
      expect(Object.prototype.hasOwnProperty.call(data, key)).toBe(true);
      const value = data[key];
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
      expect(value).toContain("{agent}");
    }
  });

  test(`${locale} — attribution.descriptionFooter has {tool} token`, async () => {
    const raw = await readFile(path.join(I18N_DIR, `${locale}.json`), "utf8");
    const data = JSON.parse(raw) as Record<string, string>;
    const value = data["attribution.descriptionFooter"];
    expect(typeof value).toBe("string");
    expect(value).toContain("{tool}");
  });
}
