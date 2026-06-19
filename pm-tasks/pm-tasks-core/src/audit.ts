// @llodev/pm-tasks-core/audit
// Audit-log helpers: append, rotate, query.
// All I/O uses Node 20+ built-ins only — no new runtime deps.
import { createReadStream, createWriteStream } from "node:fs";
import {
  appendFile,
  mkdir,
  mkdtemp,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { pipeline } from "node:stream/promises";
import { createGunzip, createGzip } from "node:zlib";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditEntryBase {
  ts: string; // ISO 8601 with timezone
  verb: string; // one of the canonical CRUD verbs
  tool: string; // "trello" | "asana" | future adapters
  ok: boolean;
  session: string; // caller-provided id; random short id if missing
}

/**
 * AuditEntry is open: verb-specific extras (id, url, name, …) pass through
 * without type churn. See references/audit-log-format.md for known shapes.
 */
export type AuditEntry = AuditEntryBase & Record<string, unknown>;

// ---------------------------------------------------------------------------
// resolveDataDir
// ---------------------------------------------------------------------------

/**
 * Returns the data directory for the given tool's audit log.
 * Respects LLODEV_PM_TASKS_LOG_DIR env override, then XDG_DATA_HOME,
 * then ~/.local/share. Final path: <base>/llodev/pm-tasks/<tool>.
 */
export function resolveDataDir(tool: string): string {
  if (process.env.LLODEV_PM_TASKS_LOG_DIR) {
    return path.resolve(process.env.LLODEV_PM_TASKS_LOG_DIR, tool);
  }
  const base = process.env.XDG_DATA_HOME ?? path.join(homedir(), ".local", "share");
  return path.join(base, "llodev", "pm-tasks", tool);
}

// ---------------------------------------------------------------------------
// appendAuditEntry
// ---------------------------------------------------------------------------

export interface AppendOpts {
  logPath: string;
}

/**
 * Appends one JSONL line to logPath.
 * - Ensures the parent directory exists.
 * - Uses POSIX append-mode (flag "a") for atomic sub-4KB writes.
 * NOTE: Lines exceeding PIPE_BUF (~4KB on Linux/macOS) are not chunked;
 * callers should keep entries compact. See audit-log-format.md § Concurrency.
 */
export async function appendAuditEntry(entry: AuditEntry, opts: AppendOpts): Promise<void> {
  const { logPath } = opts;
  await mkdir(path.dirname(logPath), { recursive: true });
  const line = JSON.stringify(entry) + "\n";
  await appendFile(logPath, line, { encoding: "utf8", flag: "a" });
}

// ---------------------------------------------------------------------------
// rotateAuditLog
// ---------------------------------------------------------------------------

export interface RotateOpts {
  logPath: string;
  maxSizeBytes?: number; // default 10 MB
  maxAgeDays?: number; // if set, prune lines older than now - maxAgeDays
  keep?: number; // default 12 — number of gz archives to keep
}

export interface RotationResult {
  rotated: boolean;
  archive?: string; // path to gz written, if rotated
  prunedEntries?: number; // if maxAgeDays applied
  prunedArchives?: string[]; // archives removed due to keep limit
}

/**
 * Rotates the audit log:
 * 1. (Optional) Age-prune: rewrite log keeping only entries >= now - maxAgeDays.
 * 2. Size check: if < maxSizeBytes, return { rotated: false }.
 * 3. Rename current log → audit.log.YYYY-MM-DD-N.jsonl, gzip it, remove uncompressed.
 * 4. Touch a fresh empty logPath.
 * 5. Prune oldest gz archives beyond `keep`.
 */
export async function rotateAuditLog(opts: RotateOpts): Promise<RotationResult> {
  const { logPath, maxSizeBytes = 10 * 1024 * 1024, maxAgeDays, keep = 12 } = opts;

  const result: RotationResult = { rotated: false };

  // Ensure log exists (may be absent on first run)
  try {
    await stat(logPath);
  } catch {
    return result;
  }

  // ---- Step 1: Age prune -----------------------------------------------
  if (maxAgeDays !== undefined) {
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);
    const lines = await readLines(logPath);
    const kept: string[] = [];
    let pruned = 0;
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as { ts?: string };
        if (entry.ts && new Date(entry.ts) < cutoff) {
          pruned++;
          continue;
        }
      } catch {
        // keep invalid lines
      }
      kept.push(line);
    }
    if (pruned > 0) {
      // Atomic rewrite via tmp + rename
      const tmpDir = await mkdtemp(path.join(path.dirname(logPath), ".audit-tmp-"));
      const tmpFile = path.join(tmpDir, "audit.log");
      try {
        await writeFile(tmpFile, kept.join("\n") + (kept.length ? "\n" : ""), "utf8");
        await rename(tmpFile, logPath);
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
      result.prunedEntries = pruned;
    }
  }

  // ---- Step 2: Size check -----------------------------------------------
  let fileSize: number;
  try {
    const s = await stat(logPath);
    fileSize = s.size;
  } catch {
    return result;
  }

  if (fileSize < maxSizeBytes) {
    return result;
  }

  // ---- Step 3: Rename + gzip -------------------------------------------
  const logDir = path.dirname(logPath);
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const archiveName = await nextArchiveName(logDir, dateStr);
  const archivePath = path.join(logDir, archiveName);
  const gzPath = archivePath + ".gz";

  // Use a tmp dir for the gz so we can rename atomically
  const tmpDir = await mkdtemp(path.join(logDir, ".audit-rot-"));
  try {
    const tmpGz = path.join(tmpDir, archiveName + ".gz");

    // Rename current log to intermediate name inside tmpDir for reading
    const tmpIntermediate = path.join(tmpDir, archiveName);
    await rename(logPath, tmpIntermediate);

    // Gzip the intermediate file
    await pipeline(createReadStream(tmpIntermediate), createGzip(), createWriteStream(tmpGz));

    // Move gz to final position
    await mkdir(logDir, { recursive: true });
    await rename(tmpGz, gzPath);

    // Remove uncompressed intermediate
    await unlink(tmpIntermediate);
  } catch (err) {
    // On failure, attempt to restore the log from tmpDir if it was moved
    const tmpIntermediate = path.join(tmpDir, archiveName);
    try {
      await rename(tmpIntermediate, logPath);
    } catch {
      // best-effort restore
    }
    await rm(tmpDir, { recursive: true, force: true });
    throw err;
  }
  await rm(tmpDir, { recursive: true, force: true });

  result.archive = gzPath;

  // ---- Step 4: Touch fresh empty log ------------------------------------
  // Atomic create-if-absent: between Step 3's rename and this touch, a
  // concurrent appendAuditEntry may race in and create logPath with new
  // entries. `flag: "wx"` fails fast with EEXIST in that case; we accept
  // the loss of "empty" semantics — the file exists with the racer's
  // content, which is exactly what we want preserved. Closes CodeQL
  // `js/file-system-race`.
  try {
    await writeFile(logPath, "", { encoding: "utf8", flag: "wx" });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }

  // ---- Step 5: Prune oldest archives ------------------------------------
  result.prunedArchives = await pruneArchives(logDir, keep);

  result.rotated = true;
  return result;
}

// ---------------------------------------------------------------------------
// queryAuditLog
// ---------------------------------------------------------------------------

export interface QueryOpts {
  logPath: string;
  since?: string; // ISO 8601; entries with ts >= since
  tool?: string;
  verb?: string;
  includeArchives?: boolean; // default false
}

/**
 * Streams JSONL entries from the audit log (and optionally gzipped archives).
 * Invalid lines are silently skipped.
 * If includeArchives is true, yields archive entries (oldest first) before live-log entries.
 */
export async function* queryAuditLog(opts: QueryOpts): AsyncIterable<AuditEntry> {
  const { logPath, since, tool, verb, includeArchives = false } = opts;

  const sinceDate = since ? new Date(since) : undefined;

  function matches(entry: AuditEntry): boolean {
    if (sinceDate && new Date(entry.ts) < sinceDate) return false;
    if (tool !== undefined && entry.tool !== tool) return false;
    if (verb !== undefined && entry.verb !== verb) return false;
    return true;
  }

  if (includeArchives) {
    const logDir = path.dirname(logPath);
    const archives = await listArchivesSorted(logDir);
    for (const archivePath of archives) {
      yield* streamGzJsonl(archivePath, matches);
    }
  }

  yield* streamJsonl(logPath, matches);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function readLines(filePath: string): Promise<string[]> {
  const content = await import("node:fs/promises").then((m) => m.readFile(filePath, "utf8"));
  return content.split("\n");
}

async function nextArchiveName(logDir: string, dateStr: string): Promise<string> {
  let n = 1;
  while (true) {
    const candidate = `audit.log.${dateStr}-${n}.jsonl`;
    const gz = path.join(logDir, candidate + ".gz");
    try {
      await stat(gz);
      n++;
    } catch {
      return candidate;
    }
  }
}

async function listArchivesSorted(logDir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(logDir);
  } catch {
    return [];
  }
  const gz = entries.filter((e) => /^audit\.log\.\d{4}-\d{2}-\d{2}-\d+\.jsonl\.gz$/.test(e));
  // Sort by mtime ascending (oldest first)
  const withMtime = await Promise.all(
    gz.map(async (name) => {
      const full = path.join(logDir, name);
      const s = await stat(full);
      return { full, mtime: s.mtimeMs };
    }),
  );
  withMtime.sort((a, b) => a.mtime - b.mtime);
  return withMtime.map((x) => x.full);
}

async function pruneArchives(logDir: string, keep: number): Promise<string[]> {
  const archives = await listArchivesSorted(logDir);
  const excess = archives.length - keep;
  if (excess <= 0) return [];
  const toRemove = archives.slice(0, excess);
  for (const p of toRemove) {
    await unlink(p);
  }
  return toRemove;
}

async function* streamJsonl(
  filePath: string,
  predicate: (e: AuditEntry) => boolean,
): AsyncIterable<AuditEntry> {
  let stream: ReturnType<typeof createReadStream>;
  try {
    stream = createReadStream(filePath, { encoding: "utf8" });
  } catch {
    return;
  }
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as AuditEntry;
        if (predicate(entry)) yield entry;
      } catch {
        // skip invalid lines
      }
    }
  } finally {
    rl.close();
  }
}

async function* streamGzJsonl(
  archivePath: string,
  predicate: (e: AuditEntry) => boolean,
): AsyncIterable<AuditEntry> {
  let fileStream: ReturnType<typeof createReadStream>;
  try {
    fileStream = createReadStream(archivePath);
  } catch {
    return;
  }
  const gunzip = createGunzip();
  const rl = createInterface({
    input: fileStream.pipe(gunzip),
    crlfDelay: Infinity,
  });
  try {
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const entry = JSON.parse(line) as AuditEntry;
        if (predicate(entry)) yield entry;
      } catch {
        // skip invalid lines
      }
    }
  } finally {
    rl.close();
  }
}
