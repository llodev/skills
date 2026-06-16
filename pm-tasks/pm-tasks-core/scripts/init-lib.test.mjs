import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadStrings, interpolate, listLocales, getAttribution } from "./init-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

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
  const att = await getAttribution({
    locale: "en-US",
    tool: "asana",
    agent: "claude-opus",
    autonomous: true,
    config: { attribution: { enabled: true, includeAgentName: true } },
  });
  assert.match(att.commentPrefix, /autonomous/);
});

test("returns null markers when attribution disabled", async () => {
  const att = await getAttribution({
    locale: "en-US",
    tool: "trello",
    agent: "x",
    autonomous: false,
    config: {},
  });
  assert.equal(att.commentPrefix, null);
  assert.equal(att.descriptionFooter, null);
});

test("respects autonomousOnly flag — silent in normal mode", async () => {
  const att = await getAttribution({
    locale: "en-US",
    tool: "trello",
    agent: "x",
    autonomous: false,
    config: { attribution: { enabled: true, autonomousOnly: true } },
  });
  assert.equal(att.commentPrefix, null);
});

test("promptLocale rejects out-of-range choice", async () => {
  // promptLocale binds `input`/`output` from node:process at module import time,
  // so stdin cannot be intercepted after-the-fact. We spawn a child process whose
  // real stdin is our controlled pipe. spawnSync closes stdin immediately (EOF),
  // which causes readline/promises to close the interface before question() resolves
  // on Node 24. Instead we use async spawn and write "9\n" only after the child's
  // stdout signals it is about to call question(), avoiding the premature-EOF race.
  const runnerPath = path.join(HERE, "_promptLocale-test-runner.mjs");
  const libPath = path.join(HERE, "init-lib.mjs");

  writeFileSync(
    runnerPath,
    `import { promptLocale } from ${JSON.stringify(libPath)};
try {
  await promptLocale("core");
  process.exit(2);
} catch (e) {
  if (/invalid choice: 9/.test(e.message)) process.exit(0);
  process.stderr.write(e.message + "\\n");
  process.exit(1);
}
`,
  );

  try {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [runnerPath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stderr = "";
      child.stderr.on("data", (d) => (stderr += d));

      // promptLocale writes the locale list to stdout before calling question().
      // Once we see output, all async work (listLocales + loadStrings) is done and
      // the readline interface is waiting — safe to send the answer without EOF race.
      child.stdout.once("data", () => {
        child.stdin.write("9\n");
        // Drain remaining stdout so the child is not blocked on backpressure.
        child.stdout.resume();
      });

      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("promptLocale child timed out"));
      }, 10_000);

      child.on("exit", (code) => {
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `child exited ${code}; stderr: ${stderr || "(empty)"}`,
            ),
          );
        }
      });
    });
  } finally {
    try {
      unlinkSync(runnerPath);
    } catch {
      /* ignore */
    }
  }
});
