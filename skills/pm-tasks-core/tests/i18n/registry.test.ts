// Tests for adapter-scoped registerI18nRoot + loadStrings in registry.ts
// Covers: adapter keys vs core, custom scope registration, unknown scope error, locale fallback.

import { test, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { registerI18nRoot, loadStrings } from "../../src/i18n/registry.js";

const ASANA_I18N = path.resolve(import.meta.dirname, "..", "..", "..", "pm-tasks-asana", "i18n");
const TRELLO_I18N = path.resolve(import.meta.dirname, "..", "..", "..", "pm-tasks-trello", "i18n");

// Register adapter scopes once — mirrors what each adapter's init does at runtime.
registerI18nRoot("asana", ASANA_I18N);
registerI18nRoot("trello", TRELLO_I18N);

const CORE_PT_BR = path.resolve(import.meta.dirname, "..", "..", "i18n", "pt-BR.json");

test("loadStrings('asana', 'pt-BR') returns asana-specific keys, NOT core keys", async () => {
  const result = await loadStrings("asana", "pt-BR");
  const core = JSON.parse(await readFile(CORE_PT_BR, "utf8")) as Record<string, string>;

  // Asana-only discriminating key absent from core.
  expect(Object.prototype.hasOwnProperty.call(result, "workspacePrompt")).toBe(true);
  // Core-only key must not bleed into adapter result.
  expect(Object.prototype.hasOwnProperty.call(result, "localePromptHeader")).toBe(false);
  // Key sets must differ.
  expect(Object.keys(result).sort().join(",")).not.toBe(Object.keys(core).sort().join(","));
});

test("loadStrings('trello', 'pt-BR') returns trello-specific keys, NOT core keys", async () => {
  const result = await loadStrings("trello", "pt-BR");
  const core = JSON.parse(await readFile(CORE_PT_BR, "utf8")) as Record<string, string>;

  // Trello-only discriminating key absent from core.
  expect(Object.prototype.hasOwnProperty.call(result, "boardsPrompt")).toBe(true);
  // Core-only key must not bleed into adapter result.
  expect(Object.prototype.hasOwnProperty.call(result, "localePromptHeader")).toBe(false);
  // Key sets must differ.
  expect(Object.keys(result).sort().join(",")).not.toBe(Object.keys(core).sort().join(","));
});

test("registerI18nRoot + loadStrings reads from registered dir", async () => {
  const tmpDir = mkdtempSync(path.join(tmpdir(), "registry-test-"));
  try {
    writeFileSync(path.join(tmpDir, "en-US.json"), JSON.stringify({ hello: "world" }));
    registerI18nRoot("test-scope", tmpDir);
    const result = await loadStrings("test-scope", "en-US");
    expect(result).toEqual({ hello: "world" });
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("loadStrings('missing-scope-xyz', 'en-US') throws unknown adapterPkg error", async () => {
  await expect(loadStrings("missing-scope-xyz", "en-US")).rejects.toThrow(
    "unknown adapterPkg for i18n: missing-scope-xyz",
  );
});

test("loadStrings('asana', 'ja-JP') falls back to asana en-US", async () => {
  const [fallback, enUs] = await Promise.all([
    loadStrings("asana", "ja-JP"),
    loadStrings("asana", "en-US"),
  ]);
  expect(fallback).toEqual(enUs);
  // Confirm the fallback really is asana data, not core.
  expect(Object.prototype.hasOwnProperty.call(fallback, "workspacePrompt")).toBe(true);
});
