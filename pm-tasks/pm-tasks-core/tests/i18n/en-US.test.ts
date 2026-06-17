import { test, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";

const I18N_DIR = path.resolve(import.meta.dirname, "..", "..", "i18n");

test("en-US has all required core keys", async () => {
  const raw = await readFile(path.join(I18N_DIR, "en-US.json"), "utf8");
  const s = JSON.parse(raw) as Record<string, string>;
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
    expect(typeof s[k], `missing key: ${k}`).toBe("string");
    expect(s[k].length, `empty value for: ${k}`).toBeGreaterThan(0);
  }
});
