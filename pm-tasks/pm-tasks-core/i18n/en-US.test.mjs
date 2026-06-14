import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const HERE = import.meta.dirname;

test("en-US has all required core keys", async () => {
  const raw = await readFile(path.join(HERE, "en-US.json"), "utf8");
  const s = JSON.parse(raw);
  const requiredKeys = [
    "localePromptHeader",
    "localePromptQuestion",
    "scopePromptHeader",
    "scopePromptLocal",
    "scopePromptGlobal",
    "scopePromptOverrideHint",
    "scopePromptQuestion",
    "yesNoYes",
    "yesNoNo",
    "multiSelectQuestion",
    "promptPickQuestion",
    "promptPickSkip",
    "autonomousPromptQuestion",
    "autonomousAddedTitle",
    "autonomousReviewBody",
    "configWritten",
    "errAuthMissing",
    "errInvalidConfig",
  ];
  for (const k of requiredKeys) {
    assert.equal(typeof s[k], "string", `missing key: ${k}`);
    assert.ok(s[k].length > 0, `empty value for: ${k}`);
  }
});
