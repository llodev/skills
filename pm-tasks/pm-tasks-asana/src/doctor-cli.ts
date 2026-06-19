// pm-tasks-asana doctor-cli — adapter-specific health checks + runner
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { resolveDataDir } from "@llodev/pm-tasks-core/audit";
import { type DoctorCheck, type DoctorContext, runChecks } from "@llodev/pm-tasks-core/doctor";
import { renderReport, type RenderOpts } from "@llodev/pm-tasks-core/bin/doctor";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Asana-specific checks (C-ASN-1..3)
// ---------------------------------------------------------------------------

async function asanaFetch(urlPath: string, pat: string): Promise<{ status: number; ok: boolean }> {
  try {
    const res = await globalThis.fetch(`https://app.asana.com/api/1.0${urlPath}`, {
      headers: { Authorization: `Bearer ${pat}` },
    });
    return { status: res.status, ok: res.ok };
  } catch (e) {
    throw new Error(`network error: ${(e as Error).message}`);
  }
}

const C_ASN_1: DoctorCheck = {
  id: "C-ASN-1",
  label: "Asana REST /users/me returns 200",
  severity: "error",
  async run(_ctx) {
    const pat = process.env.LLODEV_PM_TASKS_ASANA_PAT;
    if (!pat) {
      return {
        ok: true,
        message: "LLODEV_PM_TASKS_ASANA_PAT env var missing — skipping auth probe",
      };
    }
    try {
      const res = await asanaFetch("/users/me", pat);
      if (res.ok) {
        return { ok: true, message: "/users/me returned 200" };
      }
      return {
        ok: false,
        message: `/users/me returned HTTP ${res.status}`,
        fixHint: "Re-generate your Asana personal access token.",
      };
    } catch (e) {
      return { ok: false, message: (e as Error).message };
    }
  },
};

const C_ASN_2: DoctorCheck = {
  id: "C-ASN-2",
  label: "Configured projects resolve",
  severity: "error",
  async run(ctx) {
    const pat = process.env.LLODEV_PM_TASKS_ASANA_PAT;
    if (!pat) {
      return {
        ok: true,
        message: "LLODEV_PM_TASKS_ASANA_PAT env var missing — skipping project probe",
      };
    }
    const cfg = ctx.config as Record<string, unknown>;
    const projects = (cfg["projects"] as Array<Record<string, unknown>> | undefined) ?? [];
    const failures: string[] = [];
    for (const proj of projects) {
      const id = String(proj["id"]);
      try {
        const res = await asanaFetch(`/projects/${id}?opt_fields=gid`, pat);
        if (!res.ok) failures.push(`${id} (HTTP ${res.status})`);
      } catch (e) {
        failures.push(`${id} (${(e as Error).message})`);
      }
    }
    if (failures.length === 0) {
      return { ok: true, message: `all ${projects.length} project(s) resolve` };
    }
    return {
      ok: false,
      message: `unresolvable projects: ${failures.join(", ")}`,
      fixHint: "Verify the project GID still exists or remove from config.",
    };
  },
};

const C_ASN_3: DoctorCheck = {
  id: "C-ASN-3",
  label: "Configured sections reachable",
  severity: "error",
  async run(ctx) {
    const pat = process.env.LLODEV_PM_TASKS_ASANA_PAT;
    if (!pat) {
      return {
        ok: true,
        message: "LLODEV_PM_TASKS_ASANA_PAT env var missing — skipping section probe",
      };
    }
    const cfg = ctx.config as Record<string, unknown>;
    const sections = (cfg["sections"] as Array<Record<string, unknown>> | undefined) ?? [];
    const failures: string[] = [];
    for (const sec of sections) {
      const id = String(sec["id"]);
      try {
        const res = await asanaFetch(`/sections/${id}?opt_fields=gid`, pat);
        if (!res.ok) failures.push(`${id} (HTTP ${res.status})`);
      } catch (e) {
        failures.push(`${id} (${(e as Error).message})`);
      }
    }
    if (failures.length === 0) {
      return { ok: true, message: `all ${sections.length} section(s) reachable` };
    }
    return {
      ok: false,
      message: `unreachable sections: ${failures.join(", ")}`,
      fixHint: "Verify the section GID still exists or remove from config.",
    };
  },
};

const ADAPTER_CHECKS: DoctorCheck[] = [C_ASN_1, C_ASN_2, C_ASN_3];

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
    configPath = path.resolve(process.cwd(), ".asana.json");
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
    tool: "asana",
    configPath,
    config,
    manifest,
    schema,
    auditLogPath: path.join(resolveDataDir("asana"), "audit.log"),
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
