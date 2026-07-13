import { describe, it, expect } from "vitest";
import { makeLinearChecks, type LinearProbe } from "../src/doctor-cli.js";
import type { DoctorContext } from "@llodev/pm-tasks-core/doctor";

// ---------------------------------------------------------------------------
// Minimal DoctorContext builder
// ---------------------------------------------------------------------------

function makeCtx(configOverrides: Record<string, unknown> = {}): DoctorContext {
  const config: Record<string, unknown> = {
    version: "1",
    team: { id: "team-abc", key: "ENG", name: "Engineering" },
    states: [
      { id: "s-done", name: "Done", type: "completed" },
      { id: "s-todo", name: "Todo", type: "unstarted" },
    ],
    labels: [{ id: "l-1", name: "bug" }],
    members: [{ id: "u-1", name: "Alice", email: "alice@example.com" }],
    estimation: {
      strategy: "fibonacci",
      linearTarget: "points",
      enabled: true,
    },
    cycles: { enabled: true },
    ...configOverrides,
  };

  return {
    tool: "linear",
    configPath: "/tmp/.linear.json",
    config,
    manifest: {
      tool: "linear",
      verbs: ["task.create", "task.move"],
    },
    schema: {},
    auditLogPath: "/tmp/audit.log",
    auditRotationMaxBytes: 10 * 1024 * 1024,
  };
}

// ---------------------------------------------------------------------------
// C-LIN-1: Config present and parseable
// ---------------------------------------------------------------------------

describe("C-LIN-1 — config present", () => {
  it("passes on valid config with version field", async () => {
    const [C_LIN_1] = makeLinearChecks();
    const result = await C_LIN_1.run(makeCtx());
    expect(result.ok).toBe(true);
  });

  it("fails when config is empty", async () => {
    const [C_LIN_1] = makeLinearChecks();
    const ctx = makeCtx();
    ctx.config = {};
    const result = await C_LIN_1.run(ctx);
    expect(result.ok).toBe(false);
  });

  it("fails when version field is missing", async () => {
    const [C_LIN_1] = makeLinearChecks();
    const result = await C_LIN_1.run(makeCtx({ version: undefined }));
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// C-LIN-2: Team id resolvable
// ---------------------------------------------------------------------------

describe("C-LIN-2 — team id resolvable", () => {
  it("passes when team.id and team.key present", async () => {
    const [, C_LIN_2] = makeLinearChecks();
    const result = await C_LIN_2.run(makeCtx());
    expect(result.ok).toBe(true);
  });

  it("fails when team.id is missing", async () => {
    const [, C_LIN_2] = makeLinearChecks();
    const result = await C_LIN_2.run(makeCtx({ team: { key: "ENG", name: "Eng" } }));
    expect(result.ok).toBe(false);
  });

  it("fails when team is absent", async () => {
    const [, C_LIN_2] = makeLinearChecks();
    const result = await C_LIN_2.run(makeCtx({ team: undefined }));
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// C-LIN-3: Completed state present
// ---------------------------------------------------------------------------

describe("C-LIN-3 — completed state present", () => {
  it("passes when a state with type=completed exists", async () => {
    const [, , C_LIN_3] = makeLinearChecks();
    const result = await C_LIN_3.run(makeCtx());
    expect(result.ok).toBe(true);
  });

  it("fails when no completed-type state", async () => {
    const [, , C_LIN_3] = makeLinearChecks();
    const result = await C_LIN_3.run(
      makeCtx({ states: [{ id: "s-todo", name: "Todo", type: "unstarted" }] }),
    );
    expect(result.ok).toBe(false);
  });

  it("fails when states is absent", async () => {
    const [, , C_LIN_3] = makeLinearChecks();
    const result = await C_LIN_3.run(makeCtx({ states: undefined }));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("states[] is empty");
  });

  it("fails when states is an empty array", async () => {
    const [, , C_LIN_3] = makeLinearChecks();
    const result = await C_LIN_3.run(makeCtx({ states: [] }));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("states[] is empty");
  });
});

// ---------------------------------------------------------------------------
// C-LIN-4: estimation config coherent
// ---------------------------------------------------------------------------

describe("C-LIN-4 — estimation coherent", () => {
  it("passes on valid estimation block", async () => {
    const [, , , C_LIN_4] = makeLinearChecks();
    const result = await C_LIN_4.run(makeCtx());
    expect(result.ok).toBe(true);
  });

  it("fails when estimation.enabled is undefined", async () => {
    const [, , , C_LIN_4] = makeLinearChecks();
    const result = await C_LIN_4.run(
      makeCtx({ estimation: { strategy: "fibonacci", linearTarget: "points" } }),
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain("enabled");
  });

  it("fails when enabled=false but linearTarget=points", async () => {
    const [, , , C_LIN_4] = makeLinearChecks();
    const result = await C_LIN_4.run(
      makeCtx({
        estimation: { strategy: "fibonacci", linearTarget: "points", enabled: false },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain("inconsistent");
  });

  it("passes when enabled=false and linearTarget=none", async () => {
    const [, , , C_LIN_4] = makeLinearChecks();
    const result = await C_LIN_4.run(
      makeCtx({
        estimation: { strategy: "fibonacci", linearTarget: "none", enabled: false },
      }),
    );
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// C-LIN-5: cycles config present
// ---------------------------------------------------------------------------

describe("C-LIN-5 — cycles config present", () => {
  it("passes when cycles.enabled is a boolean", async () => {
    const [, , , , C_LIN_5] = makeLinearChecks();
    const result = await C_LIN_5.run(makeCtx());
    expect(result.ok).toBe(true);
  });

  it("fails when cycles block is absent", async () => {
    const [, , , , C_LIN_5] = makeLinearChecks();
    const result = await C_LIN_5.run(makeCtx({ cycles: undefined }));
    expect(result.ok).toBe(false);
  });

  it("fails when cycles.enabled is not boolean", async () => {
    const [, , , , C_LIN_5] = makeLinearChecks();
    const result = await C_LIN_5.run(makeCtx({ cycles: { enabled: "yes" } }));
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// C-LIN-6: autonomous scope consistent
// ---------------------------------------------------------------------------

describe("C-LIN-6 — autonomous scope", () => {
  it("passes when no autonomous block", async () => {
    const [, , , , , C_LIN_6] = makeLinearChecks();
    const result = await C_LIN_6.run(makeCtx({ autonomous: undefined }));
    expect(result.ok).toBe(true);
  });

  it("passes when autonomous scope teams includes team id", async () => {
    const [, , , , , C_LIN_6] = makeLinearChecks();
    const result = await C_LIN_6.run(
      makeCtx({
        autonomous: {
          enabled: false,
          allow: ["task.create"],
          scope: { teams: ["team-abc"] },
        },
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("fails when autonomous scope teams excludes the configured team id", async () => {
    const [, , , , , C_LIN_6] = makeLinearChecks();
    const result = await C_LIN_6.run(
      makeCtx({
        autonomous: {
          enabled: false,
          allow: ["task.create"],
          scope: { teams: ["team-OTHER"] },
        },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain("team-abc");
  });
});

// ---------------------------------------------------------------------------
// C-LIN-7: Team reachable (probe-based)
// ---------------------------------------------------------------------------

describe("C-LIN-7 — team reachable", () => {
  it("skips gracefully when no probe provided", async () => {
    const [, , , , , , C_LIN_7] = makeLinearChecks();
    const result = await C_LIN_7.run(makeCtx());
    expect(result.ok).toBe(true);
    expect(result.message).toContain("skipping");
  });

  it("passes when probe returns the team", async () => {
    const probe: LinearProbe = {
      getTeam: async (id) => ({ id, key: "ENG" }),
    };
    const [, , , , , , C_LIN_7] = makeLinearChecks(probe);
    const result = await C_LIN_7.run(makeCtx());
    expect(result.ok).toBe(true);
  });

  it("fails when probe returns null", async () => {
    const probe: LinearProbe = {
      getTeam: async () => null,
    };
    const [, , , , , , C_LIN_7] = makeLinearChecks(probe);
    const result = await C_LIN_7.run(makeCtx());
    expect(result.ok).toBe(false);
  });

  it("probe throws → ok: false with error message", async () => {
    const probe: LinearProbe = {
      getTeam: async () => {
        throw new Error("network timeout");
      },
    };
    const [, , , , , , C_LIN_7] = makeLinearChecks(probe);
    const result = await C_LIN_7.run(makeCtx());
    expect(result.ok).toBe(false);
    expect(result.message).toContain("network timeout");
  });
});
