import test from "node:test";
import assert from "node:assert/strict";
import { loadStrings, interpolate, listLocales, getAttribution } from "./init-lib.mjs";

test("loadStrings('core', 'en-US') returns the en-US table", async () => {
  const s = await loadStrings("core", "en-US");
  assert.equal(typeof s.localePromptHeader, "string");
  assert.match(s.localePromptHeader, /init/i);
});

test("loadStrings('core', 'pt-BR') returns pt-BR table", async () => {
  const s = await loadStrings("core", "pt-BR");
  assert.match(s.localePromptHeader, /idioma/i);
});

test("loadStrings falls back to en-US when locale unknown", async () => {
  const s = await loadStrings("core", "xx-YY");
  const en = await loadStrings("core", "en-US");
  assert.deepEqual(s, en);
});

test("interpolate replaces {tokens}", () => {
  const out = interpolate("Hello {name}, {n}!", { name: "Enki", n: 42 });
  assert.equal(out, "Hello Enki, 42!");
});

test("listLocales('core') returns BCP-47 codes sorted", async () => {
  const locales = await listLocales("core");
  assert.ok(locales.includes("en-US"));
  assert.ok(locales.includes("pt-BR"));
  assert.ok(locales.includes("es-ES"));
  assert.deepEqual([...locales].sort(), locales, "locales should be sorted");
});

test("promptScope uses strings.scopePromptHeader from supplied locale strings", async () => {
  const strings = await loadStrings("core", "pt-BR");
  // Assert that the strings table has the expected placeholders.
  assert.match(strings.scopePromptHeader, /\{tool\}/);
  assert.match(strings.scopePromptLocal, /\{localPath\}/);
  assert.match(strings.scopePromptGlobal, /\{globalPath\}/);
});

test("getAttribution returns prefix+footer for normal mode", async () => {
  const att = await getAttribution({
    locale: "pt-BR",
    tool: "trello",
    agent: "claude-opus",
    autonomous: false,
    config: { attribution: { enabled: true, includeAgentName: true } },
  });
  assert.equal(att.commentPrefix, "[claude-opus]");
  assert.match(att.descriptionFooter, /publicado por claude-opus via @llodev\/pm-tasks-trello/);
});

test("autonomous mode uses autonomousCommentPrefix", async () => {
  const att = await getAttribution({ locale: "en-US", tool: "asana", agent: "claude-opus", autonomous: true, config: { attribution: { enabled: true, includeAgentName: true } } });
  assert.match(att.commentPrefix, /autonomous/);
});

test("returns null markers when attribution disabled", async () => {
  const att = await getAttribution({ locale: "en-US", tool: "trello", agent: "x", autonomous: false, config: {} });
  assert.equal(att.commentPrefix, null);
  assert.equal(att.descriptionFooter, null);
});

test("respects autonomousOnly flag — silent in normal mode", async () => {
  const att = await getAttribution({ locale: "en-US", tool: "trello", agent: "x", autonomous: false, config: { attribution: { enabled: true, autonomousOnly: true } } });
  assert.equal(att.commentPrefix, null);
});
