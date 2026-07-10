#!/usr/bin/env node
// rotate-audit.mjs — CLI wrapper around rotateAuditLog from dist/audit.js
// Usage: node scripts/rotate-audit.mjs --tool <name> [--max-size <bytes>]
//        [--max-age <days>] [--keep <n>] [--log-path <path>]
import { join } from "node:path";
import { rotateAuditLog, resolveDataDir } from "../dist/audit.js";

// ---------------------------------------------------------------------------
// Tiny hand-rolled arg parser
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    switch (flag) {
      case "--tool":
        out.tool = value;
        i++;
        break;
      case "--max-size":
        out.maxSize = Number(value);
        i++;
        break;
      case "--max-age":
        out.maxAge = Number(value);
        i++;
        break;
      case "--keep":
        out.keep = Number(value);
        i++;
        break;
      case "--log-path":
        out.logPath = value;
        i++;
        break;
      default:
        // ignore unknown flags
        break;
    }
  }
  return out;
}

const parsed = parseArgs(process.argv.slice(2));

if (!parsed.tool) {
  process.stderr.write(
    "error: --tool <name> is required\n" +
      "usage: node scripts/rotate-audit.mjs --tool <name> [--max-size <bytes>] [--max-age <days>] [--keep <n>] [--log-path <path>]\n",
  );
  process.exit(2);
}

const resolvedLogPath =
  parsed.logPath ?? join(resolveDataDir(parsed.tool), "audit.log");

const rotateOpts = {
  logPath: resolvedLogPath,
  ...(parsed.maxSize !== undefined && { maxSizeBytes: parsed.maxSize }),
  ...(parsed.maxAge !== undefined && { maxAgeDays: parsed.maxAge }),
  ...(parsed.keep !== undefined && { keep: parsed.keep }),
};

try {
  const result = await rotateAuditLog(rotateOpts);
  const output = {
    tool: parsed.tool,
    logPath: resolvedLogPath,
    ...result,
  };
  process.stdout.write(JSON.stringify(output) + "\n");
  process.exit(0);
} catch (err) {
  process.stderr.write(
    `error: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
}
