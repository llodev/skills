import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const HERE = import.meta.dirname;

const LOCALES = ["en-US", "pt-BR", "es-ES"];
const KEYS = [
  "attribution.descriptionFooter",
  "attribution.commentPrefix",
  "attribution.autonomousCommentPrefix",
];

for (const locale of LOCALES) {
  test(`${locale} — attribution keys exist and have {agent} token`, async () => {
    const raw = await readFile(path.join(HERE, `${locale}.json`), "utf8");
    const data = JSON.parse(raw);

    for (const key of KEYS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(data, key),
        `${locale}: missing key "${key}"`
      );
      const value = data[key];
      assert.equal(typeof value, "string", `${locale}/${key} must be a string`);
      assert.ok(value.length > 0, `${locale}/${key} must be non-empty`);
      assert.ok(
        value.includes("{agent}"),
        `${locale}/${key} must contain {agent} token — got: "${value}"`
      );
    }
  });

  test(`${locale} — attribution.descriptionFooter has {tool} token`, async () => {
    const raw = await readFile(path.join(HERE, `${locale}.json`), "utf8");
    const data = JSON.parse(raw);
    const value = data["attribution.descriptionFooter"];
    assert.equal(
      typeof value,
      "string",
      `${locale}/attribution.descriptionFooter must be a string`
    );
    assert.ok(
      value.includes("{tool}"),
      `${locale}/attribution.descriptionFooter must contain {tool} token — got: "${value}"`
    );
  });
}
