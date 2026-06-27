// pm-tasks-jira doctor-cli — adapter-specific health checks (C-JIR-*)
import { type DoctorCheck, type DoctorContext } from "@llodev/pm-tasks-core/doctor";

// ---------------------------------------------------------------------------
// Probe interface — injected in tests; absent in standalone doctor invocations
// ---------------------------------------------------------------------------

export interface JiraProbe {
  /** Call mcp__atlassian__getVisibleJiraProjects and return project list */
  getProject?: (cloudId: string) => Promise<Array<{ key: string }>>;
}

// ---------------------------------------------------------------------------
// C-JIR-1: Estimation field consistent (pure config check — no MCP)
// ---------------------------------------------------------------------------

const C_JIR_1: DoctorCheck = {
  id: "C-JIR-1",
  label: "Estimation field consistent",
  severity: "error",
  async run(ctx: DoctorContext): Promise<{ ok: boolean; message: string; fixHint?: string }> {
    const cfg = ctx.config as Record<string, unknown>;
    const estimation = (cfg["estimation"] ?? {}) as Record<string, unknown>;
    const jiraTarget = estimation["jiraTarget"];

    if (jiraTarget !== "story_points") {
      return { ok: true, message: "jiraTarget is not story_points — fieldId not required" };
    }

    const fieldId = estimation["fieldId"];
    if (typeof fieldId === "string" && fieldId.length > 0) {
      return { ok: true, message: `fieldId present: ${fieldId}` };
    }

    return {
      ok: false,
      message: "estimation.jiraTarget is story_points but estimation.fieldId is missing or empty",
      fixHint: "Add fieldId to estimation block, or run pm-tasks-jira init to re-detect.",
    };
  },
};

// ---------------------------------------------------------------------------
// C-JIR-2: Project reachable (probe-based; degrades to warn when no probe)
// ---------------------------------------------------------------------------

function makeC_JIR_2(probe?: JiraProbe): DoctorCheck {
  return {
    id: "C-JIR-2",
    label: "Project reachable",
    severity: "warn",
    async run(ctx: DoctorContext): Promise<{ ok: boolean; message: string; fixHint?: string }> {
      if (!probe?.getProject) {
        return {
          ok: false,
          message:
            "No Jira probe injected; skipping reachability check. Run from a Claude Code session to verify.",
        };
      }

      const cfg = ctx.config as Record<string, unknown>;
      const project = (cfg["project"] ?? {}) as Record<string, unknown>;
      const site = (cfg["site"] ?? {}) as Record<string, unknown>;
      const key = typeof project["key"] === "string" ? project["key"] : "";
      const cloudId = typeof site["cloudId"] === "string" ? site["cloudId"] : "";

      try {
        const projects = await probe.getProject(cloudId);
        const found = projects.some((p) => p.key === key);
        if (found) {
          return { ok: true, message: `project ${key} is reachable` };
        }
        return {
          ok: false,
          message: `project ${key} not found in accessible Jira projects`,
          fixHint: "Ensure the Atlassian MCP is authenticated and the project key matches.",
        };
      } catch (e) {
        return {
          ok: false,
          message: `reachability probe error: ${(e as Error).message}`,
          fixHint: "Ensure the Atlassian MCP is authenticated and the project key matches.",
        };
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Factory + default export
// ---------------------------------------------------------------------------

/** Create the jira-specific check array, optionally with a live probe for C-JIR-2. */
export function makeJiraChecks(probe?: JiraProbe): DoctorCheck[] {
  return [C_JIR_1, makeC_JIR_2(probe)];
}

/** Pre-built checks without a probe (used when running standalone without MCP). */
export const ADAPTER_CHECKS: DoctorCheck[] = makeJiraChecks();
