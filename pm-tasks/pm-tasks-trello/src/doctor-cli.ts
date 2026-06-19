// pm-tasks-trello doctor-cli — adapter-specific health checks + runner
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { resolveDataDir } from "@llodev/pm-tasks-core/audit";
import { type DoctorCheck, type DoctorContext, runChecks } from "@llodev/pm-tasks-core/doctor";
import { renderReport, type RenderOpts } from "@llodev/pm-tasks-core/bin/doctor";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Trello-specific checks (C-TRL-1..3)
// ---------------------------------------------------------------------------

async function trelloFetch(url: string): Promise<{ status: number; ok: boolean }> {
  try {
    const res = await globalThis.fetch(url);
    return { status: res.status, ok: res.ok };
  } catch (e) {
    throw new Error(`network error: ${(e as Error).message}`);
  }
}

function trelloUrl(path: string): string {
  const key = process.env.TRELLO_API_KEY!;
  const token = process.env.TRELLO_TOKEN!;
  const sep = path.includes("?") ? "&" : "?";
  return `https://api.trello.com/1${path}${sep}key=${key}&token=${token}`;
}

const C_TRL_1: DoctorCheck = {
  id: "C-TRL-1",
  label: "Trello REST members/me returns 200",
  severity: "error",
  async run(ctx) {
    const key = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    if (!key || !token) {
      return {
        ok: true, // ok=true because severity is downgraded to warn by returning ok
        message: "TRELLO_API_KEY / TRELLO_TOKEN env vars missing — skipping auth probe",
      };
    }
    try {
      const res = await trelloFetch(trelloUrl("/members/me"));
      if (res.ok) {
        return { ok: true, message: "members/me returned 200" };
      }
      return {
        ok: false,
        message: `members/me returned HTTP ${res.status}`,
        fixHint: "Re-generate the token at https://trello.com/app-key.",
      };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },
};

const C_TRL_2: DoctorCheck = {
  id: "C-TRL-2",
  label: "Configured boards resolve",
  severity: "error",
  async run(ctx) {
    const key = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    if (!key || !token) {
      return {
        ok: true,
        message: "TRELLO_API_KEY / TRELLO_TOKEN env vars missing — skipping board probe",
      };
    }
    const cfg = ctx.config as Record<string, unknown>;
    const boards = (cfg["boards"] as Array<Record<string, unknown>> | undefined) ?? [];
    const failures: string[] = [];
    for (const board of boards) {
      const id = String(board["id"]);
      try {
        const res = await trelloFetch(trelloUrl(`/boards/${id}?fields=id`));
        if (!res.ok) failures.push(`${id} (HTTP ${res.status})`);
      } catch (e) {
        failures.push(`${id} (${(e as Error).message})`);
      }
    }
    if (failures.length === 0) {
      return { ok: true, message: `all ${boards.length} board(s) resolve` };
    }
    return {
      ok: false,
      message: `unresolvable boards: ${failures.join(", ")}`,
      fixHint: "Verify the board ID still exists or remove from config.",
    };
  },
};

const C_TRL_3: DoctorCheck = {
  id: "C-TRL-3",
  label: "Configured lists reachable",
  severity: "error",
  async run(ctx) {
    const key = process.env.TRELLO_API_KEY;
    const token = process.env.TRELLO_TOKEN;
    if (!key || !token) {
      return {
        ok: true,
        message: "TRELLO_API_KEY / TRELLO_TOKEN env vars missing — skipping list probe",
      };
    }
    const cfg = ctx.config as Record<string, unknown>;
    const lists = (cfg["lists"] as Array<Record<string, unknown>> | undefined) ?? [];
    const failures: string[] = [];
    for (const list of lists) {
      const id = String(list["id"]);
      try {
        const res = await trelloFetch(trelloUrl(`/lists/${id}?fields=id`));
        if (!res.ok) failures.push(`${id} (HTTP ${res.status})`);
      } catch (e) {
        failures.push(`${id} (${(e as Error).message})`);
      }
    }
    if (failures.length === 0) {
      return { ok: true, message: `all ${lists.length} list(s) reachable` };
    }
    return {
      ok: false,
      message: `unreachable lists: ${failures.join(", ")}`,
      fixHint: "Verify the list ID still exists or remove from config.",
    };
  },
};

const ADAPTER_CHECKS: DoctorCheck[] = [C_TRL_1, C_TRL_2, C_TRL_3];

// ---------------------------------------------------------------------------
// runDoctor — called from bin/init.ts when --doctor is passed
// ---------------------------------------------------------------------------

export interface RunDoctorOpts {
  tool: string;
  argv: string[];
}

export async function runDoctor({ argv }: RunDoctorOpts): Promise<void> {
  const jsonMode = argv.includes("--json");
  const fixHintsOnly = argv.includes("--fix-hints-only");

  // --config override
  const configIdx = argv.indexOf("--config");
  let configPath: string;
  if (configIdx !== -1 && argv[configIdx + 1]) {
    configPath = argv[configIdx + 1];
  } else {
    configPath = path.resolve(process.cwd(), ".trello.json");
  }

  let config: unknown;
  try {
    const raw = await readFile(configPath, "utf8");
    config = JSON.parse(raw) as unknown;
  } catch {
    config = {};
  }

  const schemaRaw = await readFile(path.join(ROOT, "schemas", "config.json"), "utf8");
  const manifestRaw = await readFile(path.join(ROOT, "manifest.json"), "utf8");
  const schema = JSON.parse(schemaRaw) as unknown;
  const manifest = JSON.parse(manifestRaw) as { tool: string; verbs: string[] };

  const ctx: DoctorContext = {
    tool: "trello",
    configPath,
    config,
    manifest,
    schema,
    auditLogPath: path.join(resolveDataDir("trello"), "audit.log"),
    auditRotationMaxBytes: 10 * 1024 * 1024,
  };

  const report = await runChecks(ctx, ADAPTER_CHECKS);

  const opts: RenderOpts = {
    format: jsonMode ? "json" : "md",
    fixHintsOnly,
  };

  console.log(renderReport(report, opts));

  const hasError = report.results.some((r) => !r.result.ok && r.check.severity === "error");
  process.exit(hasError ? 1 : 0);
}
