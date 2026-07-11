// Tests for adapter-scoped registerI18nRoot + loadStrings in registry.ts
// Covers: adapter keys vs core, custom scope registration, unknown scope error, locale fallback.

import { test, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  registerI18nRoot,
  loadStrings,
  listLocales,
  interpolate,
} from "../../src/i18n/registry.js";

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

test("loadStrings rethrows non-ENOENT read errors (root is a file, not a dir)", async () => {
  const tmpDir = mkdtempSync(path.join(tmpdir(), "registry-notdir-"));
  try {
    const filePath = path.join(tmpDir, "not-a-dir");
    writeFileSync(filePath, "x");
    // Registering a FILE as the root makes readFile(root/<locale>.json) fail with
    // ENOTDIR — a non-ENOENT error that must propagate rather than trigger the
    // en-US fallback.
    registerI18nRoot("file-root-scope", filePath);
    await expect(loadStrings("file-root-scope", "en-US")).rejects.toMatchObject({
      code: "ENOTDIR",
    });
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("listLocales returns sorted locale names from a registered dir", async () => {
  const tmpDir = mkdtempSync(path.join(tmpdir(), "registry-locales-"));
  try {
    writeFileSync(path.join(tmpDir, "pt-BR.json"), "{}");
    writeFileSync(path.join(tmpDir, "en-US.json"), "{}");
    writeFileSync(path.join(tmpDir, "es-ES.json"), "{}");
    writeFileSync(path.join(tmpDir, "README.md"), "ignore me"); // non-json filtered out
    registerI18nRoot("locales-scope", tmpDir);
    expect(await listLocales("locales-scope")).toEqual(["en-US", "es-ES", "pt-BR"]);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("listLocales throws on unknown adapterPkg", async () => {
  await expect(listLocales("missing-scope-xyz")).rejects.toThrow(
    "unknown adapterPkg for i18n: missing-scope-xyz",
  );
});

test("interpolate substitutes present vars and leaves missing ones literal", () => {
  expect(interpolate("hi {name}, id {id}", { name: "Ana" })).toBe("hi Ana, id {id}");
  expect(interpolate("no placeholders", {})).toBe("no placeholders");
});
