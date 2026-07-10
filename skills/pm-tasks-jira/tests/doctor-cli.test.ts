import { describe, it, expect } from "vitest";
import { makeJiraChecks, type JiraProbe } from "../src/doctor-cli.js";
import type { DoctorContext } from "@llodev/pm-tasks-core/doctor";

// ---------------------------------------------------------------------------
// Minimal DoctorContext factory
// ---------------------------------------------------------------------------

function makeCtx(config: unknown): DoctorContext {
  return {
    tool: "jira",
    configPath: ".jira.json",
    config,
    manifest: { tool: "jira", verbs: [] },
    schema: {},
    auditLogPath: "/tmp/jira/audit.log",
    auditRotationMaxBytes: 10 * 1024 * 1024,
  };
}

// ---------------------------------------------------------------------------
// C-JIR-1: Estimation field consistent
// ---------------------------------------------------------------------------

describe("C-JIR-1 — Estimation field consistent", () => {
  const [C_JIR_1] = makeJiraChecks();

  it("(a) jiraTarget=story_points WITH fieldId → ok", async () => {
    const ctx = makeCtx({
      estimation: { jiraTarget: "story_points", fieldId: "customfield_10016" },
    });
    const result = await C_JIR_1.run(ctx);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("customfield_10016");
  });

  it("(b) jiraTarget=story_points WITHOUT fieldId → error", async () => {
    const ctx = makeCtx({
      estimation: { jiraTarget: "story_points" },
    });
    const result = await C_JIR_1.run(ctx);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("fieldId");
    expect(result.fixHint).toContain("pm-tasks-jira init");
    expect(C_JIR_1.severity).toBe("error");
  });

  it("(c) jiraTarget=none WITHOUT fieldId → ok (fieldId not required)", async () => {
    const ctx = makeCtx({
      estimation: { jiraTarget: "none" },
    });
    const result = await C_JIR_1.run(ctx);
    expect(result.ok).toBe(true);
  });

  it("missing estimation block → ok (no jiraTarget = not story_points)", async () => {
    const ctx = makeCtx({});
    const result = await C_JIR_1.run(ctx);
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// C-JIR-2: Project reachable
// ---------------------------------------------------------------------------

describe("C-JIR-2 — Project reachable", () => {
  it("(d) no probe injected → ok: true (skip), message mentions no probe", async () => {
    const [, C_JIR_2] = makeJiraChecks(); // no probe
    const ctx = makeCtx({
      site: { cloudId: "cloud-abc", url: "https://acme.atlassian.net" },
      project: { key: "ACME", style: "company-managed" },
    });
    const result = await C_JIR_2.run(ctx);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("No Jira probe");
    expect(C_JIR_2.severity).toBe("warn");
  });

  it("(e) probe present, key found → ok: true", async () => {
    const probe: JiraProbe = {
      getProject: async () => [{ key: "ACME" }, { key: "OTHER" }],
    };
    const [, C_JIR_2] = makeJiraChecks(probe);
    const ctx = makeCtx({
      site: { cloudId: "cloud-abc", url: "https://acme.atlassian.net" },
      project: { key: "ACME", style: "company-managed" },
    });
    const result = await C_JIR_2.run(ctx);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("ACME");
  });

  it("(f) probe present, key missing → ok: false", async () => {
    const probe: JiraProbe = {
      getProject: async () => [{ key: "OTHER" }, { key: "DIFF" }],
    };
    const [, C_JIR_2] = makeJiraChecks(probe);
    const ctx = makeCtx({
      site: { cloudId: "cloud-abc", url: "https://acme.atlassian.net" },
      project: { key: "ACME", style: "company-managed" },
    });
    const result = await C_JIR_2.run(ctx);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("ACME");
    expect(result.fixHint).toContain("Atlassian MCP");
    expect(C_JIR_2.severity).toBe("warn");
  });

  it("probe throws → ok: false with error message", async () => {
    const probe: JiraProbe = {
      getProject: async () => {
        throw new Error("network timeout");
      },
    };
    const [, C_JIR_2] = makeJiraChecks(probe);
    const ctx = makeCtx({
      site: { cloudId: "cloud-abc", url: "https://acme.atlassian.net" },
      project: { key: "ACME", style: "company-managed" },
    });
    const result = await C_JIR_2.run(ctx);
    expect(result.ok).toBe(false);
    expect(result.message).toContain("network timeout");
  });
});
