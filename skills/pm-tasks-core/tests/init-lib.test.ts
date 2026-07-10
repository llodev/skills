import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { writeFileSync, unlinkSync, readFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  loadStrings,
  interpolate,
  listLocales,
  getAttribution,
  writeConfig,
} from "../src/init-lib.js";

const HERE = path.dirname(fileURLToPath(import.meta.url));

describe("loadStrings", () => {
  it("returns the en-US table", async () => {
    const s = await loadStrings("core", "en-US");
    expect(typeof s.localePromptHeader).toBe("string");
    expect(s.localePromptHeader).toMatch(/init/i);
  });

  it("returns pt-BR table", async () => {
    const s = await loadStrings("core", "pt-BR");
    expect(s.localePromptHeader).toMatch(/idioma/i);
  });

  it("falls back to en-US when locale unknown", async () => {
    const s = await loadStrings("core", "xx-YY");
    const en = await loadStrings("core", "en-US");
    expect(s).toEqual(en);
  });
});

describe("interpolate", () => {
  it("replaces {tokens}", () => {
    const out = interpolate("Hello {name}, {n}!", { name: "Enki", n: 42 });
    expect(out).toBe("Hello Enki, 42!");
  });
});

describe("listLocales", () => {
  it("returns BCP-47 codes sorted", async () => {
    const locales = await listLocales("core");
    expect(locales).toContain("en-US");
    expect(locales).toContain("pt-BR");
    expect(locales).toContain("es-ES");
    expect([...locales].sort()).toEqual(locales);
  });
});

describe("promptScope strings table", () => {
  it("uses strings.scopePromptHeader from supplied locale strings", async () => {
    const strings = await loadStrings("core", "pt-BR");
    // Assert that the strings table has the expected placeholders.
    expect(strings.scopePromptHeader).toMatch(/\{tool\}/);
    expect(strings.scopePromptLocal).toMatch(/\{localPath\}/);
    expect(strings.scopePromptGlobal).toMatch(/\{globalPath\}/);
  });
});

describe("getAttribution", () => {
  it("returns prefix+footer for normal mode", async () => {
    const att = await getAttribution({
      locale: "pt-BR",
      tool: "trello",
      agent: "claude-opus",
      autonomous: false,
      config: { attribution: { enabled: true, includeAgentName: true } },
    });
    expect(att.commentPrefix).toBe("[claude-opus]");
    expect(att.descriptionFooter).toMatch(/publicado por claude-opus via @llodev\/pm-tasks-trello/);
  });

  it("autonomous mode uses autonomousCommentPrefix", async () => {
    const att = await getAttribution({
      locale: "en-US",
      tool: "asana",
      agent: "claude-opus",
      autonomous: true,
      config: { attribution: { enabled: true, includeAgentName: true } },
    });
    expect(att.commentPrefix).toMatch(/autonomous/);
  });

  it("returns null markers when attribution disabled", async () => {
    const att = await getAttribution({
      locale: "en-US",
      tool: "trello",
      agent: "x",
      autonomous: false,
      config: {},
    });
    expect(att.commentPrefix).toBeNull();
    expect(att.descriptionFooter).toBeNull();
  });

  it("respects autonomousOnly flag — silent in normal mode", async () => {
    const att = await getAttribution({
      locale: "en-US",
      tool: "trello",
      agent: "x",
      autonomous: false,
      config: { attribution: { enabled: true, autonomousOnly: true } },
    });
    expect(att.commentPrefix).toBeNull();
  });
});

describe("writeConfig", () => {
  it("writes the file when target does not exist", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pm-tasks-write-"));
    const target = path.join(dir, "fresh.json");
    try {
      await writeConfig(target, { hello: "world" });
      expect(existsSync(target)).toBe(true);
      expect(JSON.parse(readFileSync(target, "utf8"))).toEqual({ hello: "world" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("throws 'config already exists' when target exists and does NOT overwrite", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pm-tasks-write-"));
    const target = path.join(dir, "existing.json");
    try {
      writeFileSync(target, '{"original":true}\n');
      const before = readFileSync(target, "utf8");

      await expect(writeConfig(target, { overwrite: "should not happen" })).rejects.toThrow(
        /config already exists at .*existing\.json, aborting/,
      );

      const after = readFileSync(target, "utf8");
      expect(after).toBe(before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("creates the parent directory if it does not exist", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "pm-tasks-write-"));
    const target = path.join(dir, "nested", "deep", "config.json");
    try {
      await writeConfig(target, { nested: true });
      expect(existsSync(target)).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("promptLocale", () => {
  it("rejects out-of-range choice", async () => {
    // promptLocale binds `input`/`output` from node:process at module import time,
    // so stdin cannot be intercepted after-the-fact. We spawn a child process whose
    // real stdin is our controlled pipe. spawnSync closes stdin immediately (EOF),
    // which causes readline/promises to close the interface before question() resolves
    // on Node 24. Instead we use async spawn and write "9\n" only after the child's
    // stdout signals it is about to call question(), avoiding the premature-EOF race.
    const runnerPath = path.join(HERE, "_promptLocale-test-runner.mjs");
    // Point to the compiled dist output (produced by `pnpm build`)
    const libPath = path.join(HERE, "..", "dist", "init-lib.js");

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
      await new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, [runnerPath], {
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stderr = "";
        child.stderr.on("data", (d: Buffer) => (stderr += String(d)));

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
            reject(new Error(`child exited ${code}; stderr: ${stderr || "(empty)"}`));
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
});
