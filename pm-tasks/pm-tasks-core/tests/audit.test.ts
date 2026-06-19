import { createReadStream, mkdtempSync, rmSync, writeFileSync, statSync } from "node:fs";
import { mkdir, readFile, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { describe, it, expect, afterEach } from "vitest";
import { appendAuditEntry, queryAuditLog, resolveDataDir, rotateAuditLog } from "../src/audit.js";
import type { AuditEntry } from "../src/audit.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  return mkdtempSync(path.join(tmpdir(), "pm-tasks-audit-"));
}

function makeEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    ts: new Date().toISOString(),
    verb: "task.create",
    tool: "trello",
    ok: true,
    session: "test-session",
    ...overrides,
  };
}

/** Write a gz archive from a JSONL string */
async function writeGzArchive(filePath: string, jsonl: string): Promise<void> {
  const { Readable } = await import("node:stream");
  const dest = (await import("node:fs")).createWriteStream(filePath);
  await pipeline(Readable.from([jsonl]), createGzip(), dest);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("appendAuditEntry", () => {
  it("writes a valid JSONL line that round-trips", async () => {
    const dir = makeTmpDir();
    const logPath = path.join(dir, "audit.log");
    try {
      const entry = makeEntry({ session: "s1" });
      await appendAuditEntry(entry, { logPath });
      const content = await readFile(logPath, "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0])).toEqual(entry);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("appends (does not replace) on subsequent calls", async () => {
    const dir = makeTmpDir();
    const logPath = path.join(dir, "audit.log");
    try {
      const e1 = makeEntry({ session: "s1", name: "first" });
      const e2 = makeEntry({ session: "s2", name: "second" });
      await appendAuditEntry(e1, { logPath });
      await appendAuditEntry(e2, { logPath });
      const content = await readFile(logPath, "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0])).toEqual(e1);
      expect(JSON.parse(lines[1])).toEqual(e2);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("concurrent Promise.all — all 10 entries written without corruption", async () => {
    const dir = makeTmpDir();
    const logPath = path.join(dir, "audit.log");
    try {
      const entries = Array.from({ length: 10 }, (_, i) =>
        makeEntry({ session: `concurrent-${i}`, name: `entry-${i}` }),
      );
      await Promise.all(entries.map((e) => appendAuditEntry(e, { logPath })));
      const content = await readFile(logPath, "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      expect(lines).toHaveLength(10);
      const parsed = lines.map((l) => JSON.parse(l) as AuditEntry);
      for (const entry of entries) {
        expect(parsed).toContainEqual(entry);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("rotateAuditLog", () => {
  it("under-threshold returns { rotated: false } and leaves log unchanged", async () => {
    const dir = makeTmpDir();
    const logPath = path.join(dir, "audit.log");
    try {
      const entry = makeEntry();
      await appendAuditEntry(entry, { logPath });
      const before = await readFile(logPath, "utf8");

      const result = await rotateAuditLog({
        logPath,
        maxSizeBytes: 10 * 1024 * 1024, // 10 MB — tiny file won't hit this
      });

      expect(result.rotated).toBe(false);
      expect(result.archive).toBeUndefined();
      const after = await readFile(logPath, "utf8");
      expect(after).toBe(before);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("over-threshold: renames + gzips, log is fresh empty, archive contains original content", async () => {
    const dir = makeTmpDir();
    const logPath = path.join(dir, "audit.log");
    try {
      // Write enough content to exceed a tiny threshold
      const lines: string[] = [];
      for (let i = 0; i < 5; i++) {
        const e = makeEntry({ name: `entry-${i}` });
        lines.push(JSON.stringify(e));
        await appendAuditEntry(e, { logPath });
      }
      const original = (await readFile(logPath, "utf8")).trim();

      const result = await rotateAuditLog({ logPath, maxSizeBytes: 1 }); // 1 byte threshold

      expect(result.rotated).toBe(true);
      expect(result.archive).toBeDefined();
      expect(result.archive).toMatch(/\.gz$/);

      // Log is now empty
      const fresh = await readFile(logPath, "utf8");
      expect(fresh).toBe("");

      // Archive contains original content
      const { createReadStream: crs } = await import("node:fs");
      const { createGunzip } = await import("node:zlib");
      const { createInterface } = await import("node:readline");
      const rl = createInterface({
        input: crs(result.archive!).pipe(createGunzip()),
        crlfDelay: Infinity,
      });
      const archiveLines: string[] = [];
      for await (const line of rl) {
        if (line.trim()) archiveLines.push(line);
      }
      rl.close();
      expect(archiveLines.join("\n")).toBe(original);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("archive name matches pattern; second same-day rotation increments N", async () => {
    const dir = makeTmpDir();
    const logPath = path.join(dir, "audit.log");
    try {
      const pattern = /audit\.log\.\d{4}-\d{2}-\d{2}-\d+\.jsonl\.gz$/;

      // First rotation
      await appendAuditEntry(makeEntry(), { logPath });
      const r1 = await rotateAuditLog({ logPath, maxSizeBytes: 1 });
      expect(r1.archive).toMatch(pattern);
      const n1 = parseInt(r1.archive!.match(/-(\d+)\.jsonl\.gz$/)![1], 10);

      // Second rotation same day
      await appendAuditEntry(makeEntry(), { logPath });
      const r2 = await rotateAuditLog({ logPath, maxSizeBytes: 1 });
      expect(r2.archive).toMatch(pattern);
      const n2 = parseInt(r2.archive!.match(/-(\d+)\.jsonl\.gz$/)![1], 10);

      expect(n2).toBeGreaterThan(n1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("keep parameter: oldest archives pruned when over limit", async () => {
    const dir = makeTmpDir();
    const logPath = path.join(dir, "audit.log");
    const keep = 3;
    // Create keep+3=6 existing archives. Rotation adds 1 more → 7 total.
    // After prune: 7 - keep(3) = 4 oldest removed.
    const existing = keep + 3; // 6 pre-existing archives
    try {
      // Manually create `existing` gz archives with staggered mtimes
      const archivePaths: string[] = [];
      for (let i = 1; i <= existing; i++) {
        const name = `audit.log.2026-01-01-${i}.jsonl.gz`;
        const p = path.join(dir, name);
        await writeGzArchive(
          p,
          `{"ts":"2026-01-01T00:00:00Z","verb":"task.create","tool":"trello","ok":true,"session":"s${i}"}\n`,
        );
        // Set mtime to i seconds past epoch so order is deterministic
        await utimes(p, new Date(i * 1000), new Date(i * 1000));
        archivePaths.push(p);
      }

      // Write a fresh (small) log — rotation will trigger size check
      await appendAuditEntry(makeEntry(), { logPath });
      const result = await rotateAuditLog({ logPath, maxSizeBytes: 1, keep });

      expect(result.rotated).toBe(true);
      // 6 pre-existing + 1 new from rotation = 7 total → 7 - keep(3) = 4 pruned
      expect(result.prunedArchives).toHaveLength(4);

      // The 4 oldest (i=1,2,3,4) should be pruned
      for (let i = 1; i <= 4; i++) {
        expect(result.prunedArchives).toContain(archivePaths[i - 1]);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("maxAgeDays: entries older than cutoff are pruned; fresh entries remain", async () => {
    const dir = makeTmpDir();
    const logPath = path.join(dir, "audit.log");
    try {
      const now = new Date();
      const old = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const fresh = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

      // 6 old + 4 fresh entries
      const allEntries: AuditEntry[] = [];
      for (let i = 0; i < 6; i++) {
        const e = makeEntry({ ts: old.toISOString(), name: `old-${i}` });
        allEntries.push(e);
        await appendAuditEntry(e, { logPath });
      }
      for (let i = 0; i < 4; i++) {
        const e = makeEntry({ ts: fresh.toISOString(), name: `fresh-${i}` });
        allEntries.push(e);
        await appendAuditEntry(e, { logPath });
      }

      const result = await rotateAuditLog({
        logPath,
        maxSizeBytes: 100 * 1024 * 1024, // high — no size-based rotation
        maxAgeDays: 5, // prune entries older than 5 days
      });

      expect(result.prunedEntries).toBe(6);

      const content = await readFile(logPath, "utf8");
      const lines = content.trim().split("\n").filter(Boolean);
      expect(lines).toHaveLength(4);
      for (const line of lines) {
        const e = JSON.parse(line) as AuditEntry;
        expect(e.name as string).toMatch(/^fresh-/);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("queryAuditLog", () => {
  it("streams all 50 entries from a live log", async () => {
    const dir = makeTmpDir();
    const logPath = path.join(dir, "audit.log");
    try {
      const entries: AuditEntry[] = [];
      for (let i = 0; i < 50; i++) {
        const e = makeEntry({ name: `e-${i}` });
        entries.push(e);
        await appendAuditEntry(e, { logPath });
      }
      const result: AuditEntry[] = [];
      for await (const e of queryAuditLog({ logPath })) {
        result.push(e);
      }
      expect(result).toHaveLength(50);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("since filter: only entries with ts >= since are returned", async () => {
    const dir = makeTmpDir();
    const logPath = path.join(dir, "audit.log");
    try {
      const cutoff = new Date();
      const before = new Date(cutoff.getTime() - 5000);
      const after = new Date(cutoff.getTime() + 5000);

      const e1 = makeEntry({ ts: before.toISOString(), name: "before" });
      const e2 = makeEntry({ ts: after.toISOString(), name: "after" });
      await appendAuditEntry(e1, { logPath });
      await appendAuditEntry(e2, { logPath });

      const result: AuditEntry[] = [];
      for await (const e of queryAuditLog({ logPath, since: cutoff.toISOString() })) {
        result.push(e);
      }
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("after");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("tool filter: only matching tool entries returned", async () => {
    const dir = makeTmpDir();
    const logPath = path.join(dir, "audit.log");
    try {
      await appendAuditEntry(makeEntry({ tool: "trello" }), { logPath });
      await appendAuditEntry(makeEntry({ tool: "asana" }), { logPath });
      await appendAuditEntry(makeEntry({ tool: "trello" }), { logPath });

      const result: AuditEntry[] = [];
      for await (const e of queryAuditLog({ logPath, tool: "trello" })) {
        result.push(e);
      }
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.tool === "trello")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("verb filter: only matching verb entries returned", async () => {
    const dir = makeTmpDir();
    const logPath = path.join(dir, "audit.log");
    try {
      await appendAuditEntry(makeEntry({ verb: "task.create" }), { logPath });
      await appendAuditEntry(makeEntry({ verb: "task.close" }), { logPath });
      await appendAuditEntry(makeEntry({ verb: "task.create" }), { logPath });

      const result: AuditEntry[] = [];
      for await (const e of queryAuditLog({ logPath, verb: "task.create" })) {
        result.push(e);
      }
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.verb === "task.create")).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("includeArchives: archive entries come before live-log entries, oldest-first", async () => {
    const dir = makeTmpDir();
    const logPath = path.join(dir, "audit.log");
    try {
      // Create two gz archives with distinct sessions
      const arch1Path = path.join(dir, "audit.log.2026-01-01-1.jsonl.gz");
      const arch2Path = path.join(dir, "audit.log.2026-01-02-1.jsonl.gz");

      await writeGzArchive(
        arch1Path,
        `{"ts":"2026-01-01T00:00:00Z","verb":"task.create","tool":"trello","ok":true,"session":"arch1"}\n`,
      );
      await writeGzArchive(
        arch2Path,
        `{"ts":"2026-01-02T00:00:00Z","verb":"task.create","tool":"trello","ok":true,"session":"arch2"}\n`,
      );
      // arch1 older mtime
      await utimes(arch1Path, new Date(1000), new Date(1000));
      await utimes(arch2Path, new Date(2000), new Date(2000));

      // Live log entry
      const liveEntry = makeEntry({ session: "live", ts: new Date().toISOString() });
      await appendAuditEntry(liveEntry, { logPath });

      const result: AuditEntry[] = [];
      for await (const e of queryAuditLog({ logPath, includeArchives: true })) {
        result.push(e);
      }

      expect(result).toHaveLength(3);
      expect(result[0].session).toBe("arch1");
      expect(result[1].session).toBe("arch2");
      expect(result[2].session).toBe("live");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("resolveDataDir", () => {
  it("returns XDG-based path by default", () => {
    const orig = process.env.XDG_DATA_HOME;
    const origOverride = process.env.LLODEV_PM_TASKS_LOG_DIR;
    delete process.env.LLODEV_PM_TASKS_LOG_DIR;
    delete process.env.XDG_DATA_HOME;
    try {
      const p = resolveDataDir("trello");
      expect(p).toContain(path.join(".local", "share", "llodev", "pm-tasks", "trello"));
    } finally {
      if (orig !== undefined) process.env.XDG_DATA_HOME = orig;
      if (origOverride !== undefined) process.env.LLODEV_PM_TASKS_LOG_DIR = origOverride;
    }
  });

  it("respects LLODEV_PM_TASKS_LOG_DIR override", () => {
    const orig = process.env.LLODEV_PM_TASKS_LOG_DIR;
    process.env.LLODEV_PM_TASKS_LOG_DIR = "/custom/log/dir";
    try {
      expect(resolveDataDir("asana")).toBe("/custom/log/dir/asana");
    } finally {
      if (orig !== undefined) process.env.LLODEV_PM_TASKS_LOG_DIR = orig;
      else delete process.env.LLODEV_PM_TASKS_LOG_DIR;
    }
  });
});
