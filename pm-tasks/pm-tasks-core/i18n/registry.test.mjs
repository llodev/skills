// Tests for adapter-scoped registerI18nRoot + loadStrings in init-lib.mjs
// Covers: adapter keys vs core, custom scope registration, unknown scope error, locale fallback.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { registerI18nRoot, loadStrings } from "../scripts/init-lib.mjs";

const ASANA_I18N = path.resolve(
  import.meta.dirname,
  "../../pm-tasks-asana/i18n",
);
const TRELLO_I18N = path.resolve(
  import.meta.dirname,
  "../../pm-tasks-trello/i18n",
);

// Register adapter scopes once — mirrors what each adapter's init does at runtime.
registerI18nRoot("asana", ASANA_I18N);
registerI18nRoot("trello", TRELLO_I18N);

test("loadStrings('asana', 'pt-BR') returns asana-specific keys, NOT core keys", async () => {
  const result = await loadStrings("asana", "pt-BR");
  const coreRaw = await readFile(
    path.resolve(import.meta.dirname, "pt-BR.json"),
    "utf8",
  );
  const core = JSON.parse(coreRaw);

  // Asana-only discriminating key absent from core.
  assert.ok(
    Object.prototype.hasOwnProperty.call(result, "workspacePrompt"),
    'asana pt-BR must contain "workspacePrompt"',
  );
  // Core-only key must not bleed into adapter result.
  assert.ok(
    !Object.prototype.hasOwnProperty.call(result, "localePromptHeader"),
    'asana pt-BR must NOT contain core key "localePromptHeader"',
  );
  // Key sets must differ.
  const resultKeys = Object.keys(result).sort().join(",");
  const coreKeys = Object.keys(core).sort().join(",");
  assert.notEqual(
    resultKeys,
    coreKeys,
    "asana pt-BR key set must differ from core key set",
  );
});

test("loadStrings('trello', 'pt-BR') returns trello-specific keys, NOT core keys", async () => {
  const result = await loadStrings("trello", "pt-BR");
  const coreRaw = await readFile(
    path.resolve(import.meta.dirname, "pt-BR.json"),
    "utf8",
  );
  const core = JSON.parse(coreRaw);

  // Trello-only discriminating key absent from core.
  assert.ok(
    Object.prototype.hasOwnProperty.call(result, "boardsPrompt"),
    'trello pt-BR must contain "boardsPrompt"',
  );
  // Core-only key must not bleed into adapter result.
  assert.ok(
    !Object.prototype.hasOwnProperty.call(result, "localePromptHeader"),
    'trello pt-BR must NOT contain core key "localePromptHeader"',
  );
  // Key sets must differ.
  const resultKeys = Object.keys(result).sort().join(",");
  const coreKeys = Object.keys(core).sort().join(",");
  assert.notEqual(
    resultKeys,
    coreKeys,
    "trello pt-BR key set must differ from core key set",
  );
});

test("registerI18nRoot + loadStrings reads from registered dir", async () => {
  const tmpDir = mkdtempSync(path.join(tmpdir(), "registry-test-"));
  try {
    writeFileSync(
      path.join(tmpDir, "en-US.json"),
      JSON.stringify({ hello: "world" }),
    );
    registerI18nRoot("test-scope", tmpDir);
    const result = await loadStrings("test-scope", "en-US");
    assert.deepEqual(result, { hello: "world" });
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test("loadStrings('missing-scope', 'en-US') throws unknown adapterPkg error", async () => {
  await assert.rejects(
    () => loadStrings("missing-scope", "en-US"),
    (e) => {
      assert.ok(e instanceof Error, "must throw an Error");
      assert.equal(
        e.message,
        "unknown adapterPkg for i18n: missing-scope",
        "error message must match",
      );
      return true;
    },
  );
});

test("loadStrings('asana', 'ja-JP') falls back to asana en-US", async () => {
  const [fallback, enUs] = await Promise.all([
    loadStrings("asana", "ja-JP"),
    loadStrings("asana", "en-US"),
  ]);
  assert.deepEqual(
    fallback,
    enUs,
    "missing locale ja-JP must fall back to asana en-US, not core en-US",
  );
  // Confirm the fallback really is asana data, not core.
  assert.ok(
    Object.prototype.hasOwnProperty.call(fallback, "workspacePrompt"),
    'fallback must still contain asana key "workspacePrompt"',
  );
});
