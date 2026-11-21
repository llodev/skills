import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CORE_CHECKS, type DoctorCheck, type DoctorContext } from "@llodev/pm-tasks-core/doctor";
import {
  ADAPTER_CHECKS,
  makeClickUpChecks,
  runDoctor,
  type ClickUpProbe,
  type DoctorDeps,
} from "../src/doctor-cli.js";
import { ClickUpInitError } from "../src/init-api.js";

type Json = Record<string, unknown>;

const WS = "90130000001";
const LIST_A = "901330000001";
const LIST_B = "901330000002";
const UNKNOWN_LIST = "901339999999";
// A synthetic token (no `pk_<id>_` shape, so secret scanners stay quiet).
const FAKE_TOKEN = "fake-clickup-token-NOT-REAL-7f3a9c";
/** The en-US advisory of C-CLK-7 and C-CLK-8 when there is no probe. */
const NO_PROBE =
  "Live ClickUp checks (C-CLK-7, C-CLK-8) skipped: set CLICKUP_API_TOKEN to run them.";

function baseConfig(): Json {
  return {
    version: "1",
    locale: "en-US",
    workspace: { id: WS, name: "Workspace" },
    lists: [
      {
        id: LIST_A,
        name: "Backlog",
        space: "Space 1",
        statuses: { open: "to do", wip: "in progress", done: "complete" },
      },
      {
        id: LIST_B,
        name: "Delivery",
        space: "Space 1",
        statuses: { open: "Open", done: "done", closed: "Closed" },
      },
    ],
    defaultListId: LIST_A,
    members: [{ id: "30200001", name: "Alex Doe", email: "user@example.com", alias: "alex" }],
    estimation: { enabled: true, strategy: "ideal_hours", clickupTarget: "time", hoursPerDay: 6 },
    defaults: { assigneeAlias: "me", escalateToAlias: "alex" },
    autonomous: { enabled: false, allow: [], scope: { lists: [LIST_A] } },
  };
}

function makeCtx(config: unknown = baseConfig(), configPath = "/nonexistent/.clickup.json") {
  const ctx: DoctorContext = {
    tool: "clickup",
    configPath,
    config,
    manifest: { tool: "clickup", verbs: [] },
    schema: {},
    auditLogPath: "/nonexistent/audit.log",
    auditRotationMaxBytes: 10 * 1024 * 1024,
  };
  return ctx;
}

function withConfig(overrides: Json): DoctorContext {
  return makeCtx({ ...baseConfig(), ...overrides });
}

function check(id: string, probe?: ClickUpProbe): DoctorCheck {
  const found = makeClickUpChecks(probe).find((c) => c.id === id);
  if (!found) throw new Error(`no check ${id}`);
  return found;
}

/** Live statuses that match every pin of baseConfig (case and spacing differ on purpose). */
const LIVE: Record<string, string[]> = {
  [LIST_A]: ["to do", "in progress", "review", "complete"],
  [LIST_B]: [" OPEN ", "Done", "closed"],
};

interface RecordingProbe extends ClickUpProbe {
  workspaceCalls: number;
  listCalls: string[];
}

function makeProbe(
  live: Record<string, string[] | Error> = LIVE,
  workspaces: Array<{ id: string }> | Error = [{ id: WS }],
): RecordingProbe {
  const probe: RecordingProbe = {
    workspaceCalls: 0,
    listCalls: [],
    async getWorkspaces() {
      probe.workspaceCalls += 1;
      if (workspaces instanceof Error) throw workspaces;
      return workspaces;
    },
    async getListStatuses(listId: string) {
      probe.listCalls.push(listId);
      const entry = live[listId];
      if (entry instanceof Error) throw entry;
      if (entry === undefined) throw new ClickUpInitError("HTTP", "ClickUp init: HTTP 404.", 404);
      return entry;
    },
  };
  return probe;
}

// ---------------------------------------------------------------------------
// Check catalog
// ---------------------------------------------------------------------------

describe("makeClickUpChecks", () => {
  const IDS = ["C-CLK-1", "C-CLK-2", "C-CLK-3", "C-CLK-4", "C-CLK-6", "C-CLK-7", "C-CLK-8"];

  it("ships C-CLK-1..4 and 6..8 in order; C-CLK-5 (sprints) does not exist", () => {
    expect(makeClickUpChecks().map((c) => c.id)).toEqual(IDS);
    expect(ADAPTER_CHECKS.map((c) => c.id)).toEqual(IDS);
  });

  it("live checks skip with ok:true and an advisory when no probe and no token", async () => {
    for (const id of ["C-CLK-7", "C-CLK-8"]) {
      const result = await check(id).run(makeCtx());
      expect(result.ok, id).toBe(true);
      expect(result.message, id).toBe(NO_PROBE);
    }
  });
});

// ---------------------------------------------------------------------------
// C-CLK-1: config present and parseable
// ---------------------------------------------------------------------------

describe("C-CLK-1 — config present and parseable", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "clk-doctor-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("passes on a config with a version", async () => {
    expect((await check("C-CLK-1").run(makeCtx())).ok).toBe(true);
  });

  it("fails with the no-config message when the file does not exist", async () => {
    const result = await check("C-CLK-1").run(makeCtx({}, path.join(dir, ".clickup.json")));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("No .clickup.json found");
  });

  it("fails as invalid when the file exists but is empty or not valid JSON", async () => {
    const file = path.join(dir, ".clickup.json");
    await writeFile(file, "{ not json", "utf8");
    const result = await check("C-CLK-1").run(makeCtx({}, file));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("not valid JSON");
    expect(result.message).toContain(file);
  });

  it("fails when the version is missing or the config is not an object", async () => {
    const { version: _omit, ...noVersion } = baseConfig();
    expect((await check("C-CLK-1").run(makeCtx(noVersion))).ok).toBe(false);
    expect((await check("C-CLK-1").run(makeCtx([baseConfig()]))).ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// C-CLK-2: workspace.id present
// ---------------------------------------------------------------------------

describe("C-CLK-2 — workspace id present", () => {
  it("passes when workspace.id is set", async () => {
    const result = await check("C-CLK-2").run(makeCtx());
    expect(result.ok).toBe(true);
    expect(result.message).toContain(WS);
  });

  it.each([
    ["absent workspace", { workspace: undefined }],
    ["no id", { workspace: { name: "Workspace" } }],
    ["blank id", { workspace: { id: "  ", name: "Workspace" } }],
    ["numeric id", { workspace: { id: 90130000001, name: "Workspace" } }],
  ])("fails on %s", async (_label, overrides) => {
    const result = await check("C-CLK-2").run(withConfig(overrides));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("workspace.id");
    expect(result.fixHint).toContain("init");
  });
});

// ---------------------------------------------------------------------------
// C-CLK-3: every list pins open and done
// ---------------------------------------------------------------------------

describe("C-CLK-3 — every list pins open and done", () => {
  it("passes when every list pins open and done (wip and closed are optional)", async () => {
    expect((await check("C-CLK-3").run(makeCtx())).ok).toBe(true);
  });

  it.each([
    ["absent", undefined],
    ["empty", []],
  ])("fails when lists is %s", async (_label, lists) => {
    const result = await check("C-CLK-3").run(withConfig({ lists }));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("No lists found");
  });

  it("fails per list on a missing open or a blank done status (hand-edited config)", async () => {
    const result = await check("C-CLK-3").run(
      withConfig({
        lists: [
          { id: LIST_A, name: "Backlog", statuses: { done: "complete" } },
          { id: LIST_B, name: "Delivery", statuses: { open: "Open", done: "   " } },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain(`Backlog (${LIST_A}) has no open status pinned`);
    expect(result.message).toContain(`Delivery (${LIST_B}) has no done status pinned`);
  });

  it("fails on a list without a statuses block", async () => {
    const result = await check("C-CLK-3").run(withConfig({ lists: [{ id: LIST_A }] }));
    expect(result.ok).toBe(false);
    expect(result.message).toContain(LIST_A);
  });
});

// ---------------------------------------------------------------------------
// C-CLK-4: estimation coherent
// ---------------------------------------------------------------------------

describe("C-CLK-4 — estimation coherent", () => {
  const estimation = (e: Json): DoctorContext =>
    withConfig({ estimation: { ...(baseConfig().estimation as Json), ...e } });

  it("is a warn-severity check", () => {
    expect(check("C-CLK-4").severity).toBe("warn");
  });

  it.each(["ideal_hours", "ideal_days"])("passes a time target with %s", async (strategy) => {
    expect((await check("C-CLK-4").run(estimation({ strategy }))).ok).toBe(true);
  });

  it("passes a point strategy with clickupTarget none", async () => {
    const ctx = estimation({ strategy: "fibonacci", clickupTarget: "none" });
    expect((await check("C-CLK-4").run(ctx)).ok).toBe(true);
  });

  it.each(["fibonacci", "story_points", "t_shirt", "three_point"])(
    "warns on clickupTarget time with the point strategy %s",
    async (strategy) => {
      const result = await check("C-CLK-4").run(estimation({ strategy }));
      expect(result.ok).toBe(false);
      expect(result.message).toContain("not time-based");
    },
  );

  it.each([0, 0.5, 25, "8", Number.NaN])("fails when hoursPerDay is %s", async (hoursPerDay) => {
    const result = await check("C-CLK-4").run(estimation({ hoursPerDay }));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("hoursPerDay");
  });

  it.each([1, 24, undefined])("accepts hoursPerDay %s", async (hoursPerDay) => {
    expect((await check("C-CLK-4").run(estimation({ hoursPerDay }))).ok).toBe(true);
  });

  it("estimation.enabled:false is ok with a note, even with an incoherent block", async () => {
    const ctx = estimation({ enabled: false, strategy: "fibonacci", hoursPerDay: 99 });
    const result = await check("C-CLK-4").run(ctx);
    expect(result.ok).toBe(true);
    expect(result.message).toContain("disabled");
  });

  it("no estimation block is ok with a note", async () => {
    const result = await check("C-CLK-4").run(withConfig({ estimation: undefined }));
    expect(result.ok).toBe(true);
    expect(result.message).toContain("disabled");
  });
});

// ---------------------------------------------------------------------------
// C-CLK-6: autonomous scope and default aliases
// ---------------------------------------------------------------------------

describe("C-CLK-6 — autonomous scope and default aliases", () => {
  const ADVISORY = "autonomous mode is off";

  it("passes with the scope inside lists[] and resolvable aliases; advises autonomous is off", async () => {
    const result = await check("C-CLK-6").run(makeCtx());
    expect(result.ok).toBe(true);
    expect(result.message).toContain(ADVISORY);
  });

  it("C-CLK-6 fails when scope names an unconfigured list", async () => {
    const result = await check("C-CLK-6").run(
      withConfig({
        autonomous: { enabled: true, allow: [], scope: { lists: [LIST_A, UNKNOWN_LIST] } },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain(UNKNOWN_LIST);
    expect(result.message).not.toContain(ADVISORY);
    expect(result.fixHint).toBeDefined();
  });

  it.each(["me", "alex"])("defaults resolve to me or a member alias: %s", async (alias) => {
    const ctx = withConfig({ defaults: { assigneeAlias: alias, escalateToAlias: alias } });
    expect((await check("C-CLK-6").run(ctx)).ok).toBe(true);
  });

  it.each(["30200001", "Alex Doe", "user@example.com", "ghost"])(
    "a member id, name or email is not an alias, for either default: %j",
    async (alias) => {
      const ctx = withConfig({ defaults: { assigneeAlias: alias, escalateToAlias: alias } });
      const result = await check("C-CLK-6").run(ctx);
      expect(result.ok).toBe(false);
      expect(result.message).toContain(`defaults.assigneeAlias "${alias}" matches no member alias`);
      expect(result.message).toContain(
        `defaults.escalateToAlias "${alias}" matches no member alias`,
      );
    },
  );

  it.each(["me", "alex", "30200001", "Alex Doe", "user@example.com", "ghost", "", 30200001])(
    "agrees with core C-CFG-4 on defaults.assigneeAlias %j (empty or non-string is unset)",
    async (alias) => {
      const ctx = withConfig({ defaults: { assigneeAlias: alias } });
      const core = CORE_CHECKS.find((c) => c.id === "C-CFG-4");
      expect(core).toBeDefined();
      expect((await check("C-CLK-6").run(ctx)).ok).toBe((await core?.run(ctx))?.ok);
    },
  );

  it("fails naming each default alias that matches no member", async () => {
    const result = await check("C-CLK-6").run(
      withConfig({ defaults: { assigneeAlias: "ghost", escalateToAlias: "nobody" } }),
    );
    expect(result.ok).toBe(false);
    expect(result.message).toContain('defaults.assigneeAlias "ghost"');
    expect(result.message).toContain('defaults.escalateToAlias "nobody"');
  });

  it("without a members cache only me resolves", async () => {
    const ok = withConfig({ members: undefined, defaults: { assigneeAlias: "me" } });
    expect((await check("C-CLK-6").run(ok)).ok).toBe(true);
    const bad = withConfig({ members: undefined, defaults: { escalateToAlias: "alex" } });
    expect((await check("C-CLK-6").run(bad)).ok).toBe(false);
  });

  it("autonomous.enabled true drops the advisory; an absent block keeps it", async () => {
    const on = withConfig({ autonomous: { enabled: true, allow: [], scope: { lists: [] } } });
    expect((await check("C-CLK-6").run(on)).message).not.toContain(ADVISORY);
    const absent = await check("C-CLK-6").run(withConfig({ autonomous: undefined }));
    expect(absent.ok).toBe(true);
    expect(absent.message).toContain(ADVISORY);
  });
});

// ---------------------------------------------------------------------------
// C-CLK-7: ClickUp reachable (live)
// ---------------------------------------------------------------------------

describe("C-CLK-7 — ClickUp reachable", () => {
  it("passes when the configured workspace is among the probe's workspaces", async () => {
    const probe = makeProbe();
    const result = await check("C-CLK-7", probe).run(makeCtx());
    expect(result.ok).toBe(true);
    expect(probe.workspaceCalls).toBe(1);
  });

  it("fails when the credential cannot see the configured workspace", async () => {
    const result = await check("C-CLK-7", makeProbe(LIVE, [{ id: "90139999999" }])).run(makeCtx());
    expect(result.ok).toBe(false);
    expect(result.message).toContain(WS);
    // The shipped CLI reaches ClickUp through the token only.
    expect(result.fixHint).toBe(
      "Check CLICKUP_API_TOKEN, and that workspace.id is a workspace of that account.",
    );
  });

  it("a probe that throws a ClickUpInitError fails with that error's message", async () => {
    const auth = new ClickUpInitError(
      "AUTH",
      "ClickUp init: authentication failed (HTTP 401).",
      401,
    );
    const result = await check("C-CLK-7", makeProbe(LIVE, auth)).run(makeCtx());
    expect(result.ok).toBe(false);
    expect(result.message).toContain("authentication failed (HTTP 401)");
  });

  it("any other probe error is reported generically, never echoed", async () => {
    const leaky = new Error(`request failed: Authorization: ${FAKE_TOKEN}`);
    const result = await check("C-CLK-7", makeProbe(LIVE, leaky)).run(makeCtx());
    expect(result.ok).toBe(false);
    expect(result.message).toContain("the ClickUp probe failed");
    expect(JSON.stringify(result)).not.toContain(FAKE_TOKEN);
  });

  it("skips without probing when workspace.id is not set (C-CLK-2 reports it)", async () => {
    const probe = makeProbe();
    const result = await check("C-CLK-7", probe).run(withConfig({ workspace: undefined }));
    expect(result.ok).toBe(true);
    expect(probe.workspaceCalls).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// C-CLK-8: pinned statuses exist in ClickUp (live)
// ---------------------------------------------------------------------------

describe("C-CLK-8 — pinned statuses exist in ClickUp", () => {
  it("passes when every pinned status exists (trimmed, case-insensitive), one call per list", async () => {
    const probe = makeProbe();
    const result = await check("C-CLK-8", probe).run(makeCtx());
    expect(result.ok).toBe(true);
    expect(probe.listCalls).toEqual([LIST_A, LIST_B]);
  });

  it("C-CLK-8 reports drift when a pinned status was renamed", async () => {
    const probe = makeProbe({ ...LIVE, [LIST_A]: ["to do", "doing", "complete"] });
    const result = await check("C-CLK-8", probe).run(makeCtx());
    expect(result.ok).toBe(false);
    expect(result.message).toContain(
      `List Backlog (${LIST_A}): the pinned status "in progress" (wip) no longer exists in ClickUp`,
    );
    expect(result.message).not.toContain(LIST_B);
    expect(result.fixHint).toContain("init");
  });

  it("reports every drifted role of every list", async () => {
    const probe = makeProbe({ [LIST_A]: ["in progress", "complete"], [LIST_B]: ["open", "done"] });
    const result = await check("C-CLK-8", probe).run(makeCtx());
    expect(result.ok).toBe(false);
    expect(result.message).toContain('"to do" (open)');
    expect(result.message).toContain('"Closed" (closed)');
    expect(result.message).not.toContain("(done)");
  });

  it("a list the probe cannot find fails that list only; the next list is still probed, no retry", async () => {
    const missing = new ClickUpInitError(
      "HTTP",
      "ClickUp init: the ClickUp API returned HTTP 404.",
      404,
    );
    const probe = makeProbe({ [LIST_A]: missing, [LIST_B]: LIVE[LIST_B] });
    const result = await check("C-CLK-8", probe).run(makeCtx());
    expect(result.ok).toBe(false);
    expect(result.message).toContain(`Backlog (${LIST_A})`);
    expect(result.message).toContain("HTTP 404");
    expect(result.message).not.toContain(LIST_B);
    expect(probe.listCalls).toEqual([LIST_A, LIST_B]);
  });

  describe("a list read refused or rate-limited", () => {
    const LIST_C = "901330000003";
    const threeLists = (): Json[] => [
      ...(baseConfig().lists as Json[]),
      { id: LIST_C, name: "Later", statuses: { open: "to do", done: "complete" } },
    ];
    /** The AUTH error init-api throws on a 401/403 (its hint names the token variable). */
    const refused = (status: 401 | 403) =>
      new ClickUpInitError(
        "AUTH",
        `ClickUp init: authentication failed (HTTP ${status}). Set CLICKUP_API_TOKEN to a valid ClickUp personal API token.`,
        status,
      );
    const inaccessible = (list: string, status: number) =>
      `List ${list}: ClickUp refused to read it (HTTP ${status}) although the workspace is reachable`;

    it("after a RATE_LIMIT error C-CLK-8 stops probing and reports one result for the remaining lists", async () => {
      const err = new ClickUpInitError("RATE_LIMIT", "ClickUp init: HTTP 429.", 429);
      const probe = makeProbe({ [LIST_A]: err, [LIST_B]: LIVE[LIST_B], [LIST_C]: LIVE[LIST_A] });
      const result = await check("C-CLK-8", probe).run(withConfig({ lists: threeLists() }));
      expect(result.ok).toBe(false);
      expect(probe.listCalls).toEqual([LIST_A]);
      expect(result.message).toContain(`Backlog (${LIST_A}) could not be read`);
      expect(result.message).toContain("2 more list(s) were not checked");
      expect(result.message).not.toContain(LIST_B);
      expect(result.message).not.toContain(LIST_C);
    });

    it("an AUTH answer for one list names it inaccessible and the next lists are still checked", async () => {
      // LIST_B lost its pinned closed status: the drift must still be reported.
      const probe = makeProbe({
        [LIST_A]: refused(401),
        [LIST_B]: ["Open", "done"],
        [LIST_C]: LIVE[LIST_A],
      });
      const result = await check("C-CLK-8", probe).run(withConfig({ lists: threeLists() }));
      expect(result.ok).toBe(false);
      expect(probe.listCalls).toEqual([LIST_A, LIST_B, LIST_C]);
      expect(result.message).toContain(inaccessible(`Backlog (${LIST_A})`, 401));
      expect(result.message).toContain("Remove it from lists[] or re-run init.");
      expect(result.message).toContain(
        `List Delivery (${LIST_B}): the pinned status "Closed" (closed) no longer exists in ClickUp`,
      );
      expect(result.message).not.toContain("not checked");
      expect(result.message).not.toContain("could not be read");
      expect(result.message).not.toContain(LIST_C);
      expect(result.message).not.toContain("CLICKUP_API_TOKEN");
    });

    it("an AUTH answer for every list gives one line per list with its HTTP status", async () => {
      const probe = makeProbe({
        [LIST_A]: refused(401),
        [LIST_B]: refused(403),
        [LIST_C]: refused(401),
      });
      const result = await check("C-CLK-8", probe).run(withConfig({ lists: threeLists() }));
      expect(result.ok).toBe(false);
      expect(probe.listCalls).toEqual([LIST_A, LIST_B, LIST_C]);
      expect(result.message).toContain(inaccessible(`Backlog (${LIST_A})`, 401));
      expect(result.message).toContain(inaccessible(`Delivery (${LIST_B})`, 403));
      expect(result.message).toContain(inaccessible(`Later (${LIST_C})`, 401));
      expect(result.message.match(/ClickUp refused to read it/g)).toHaveLength(3);
      expect(result.message).not.toContain("not checked");
      expect(result.message).not.toContain("CLICKUP_API_TOKEN");
    });

    it("the inaccessible-list line is localized", async () => {
      const probe = makeProbe({ [LIST_A]: refused(401), [LIST_B]: LIVE[LIST_B] });
      const result = await check("C-CLK-8", probe).run(withConfig({ locale: "pt-BR" }));
      expect(result.ok).toBe(false);
      expect(result.message).toContain(
        `Lista Backlog (${LIST_A}): o ClickUp recusou a leitura (HTTP 401)`,
      );
    });
  });

  it("a list id repeated in the config is probed once", async () => {
    const lists = baseConfig().lists as Json[];
    const probe = makeProbe();
    const result = await check("C-CLK-8", probe).run(withConfig({ lists: [...lists, lists[0]] }));
    expect(result.ok).toBe(true);
    expect(probe.listCalls).toEqual([LIST_A, LIST_B]);
  });

  it("when C-CLK-7 fails, C-CLK-8 reports one skipped ok result and probes no list", async () => {
    const probe = makeProbe(LIVE, new ClickUpInitError("NETWORK", "ClickUp init: network error."));
    const checks = makeClickUpChecks(probe);
    const ctx = makeCtx();
    const results = [];
    for (const c of checks) results.push(await c.run(ctx));
    const byId = Object.fromEntries(checks.map((c, i) => [c.id, results[i]]));
    expect(byId["C-CLK-7"].ok).toBe(false);
    expect(byId["C-CLK-8"].ok).toBe(true);
    expect(byId["C-CLK-8"].message).toBe(
      "Status drift check skipped because C-CLK-7 failed (see its message).",
    );
    expect(probe.workspaceCalls).toBe(1);
    expect(probe.listCalls).toEqual([]);
  });

  it("reports drift in the config locale", async () => {
    const probe = makeProbe({ ...LIVE, [LIST_A]: ["to do", "complete"] });
    const result = await check("C-CLK-8", probe).run(withConfig({ locale: "pt-BR" }));
    expect(result.ok).toBe(false);
    expect(result.message).toContain("não existe mais no ClickUp");
  });
});

// ---------------------------------------------------------------------------
// runDoctor
// ---------------------------------------------------------------------------

describe("runDoctor", () => {
  let dir: string;
  let configFile: string;
  let fetchSpy: ReturnType<typeof blockFetch>;

  // Hermetic by default: a token is set in process.env (as in the maintainer's
  // shell) and fetch never reaches the network unless a test installs its own answer.
  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "clk-doctor-run-"));
    configFile = path.join(dir, "custom.json");
    vi.stubEnv("LLODEV_PM_TASKS_LOG_DIR", path.join(dir, "logs"));
    vi.stubEnv("CLICKUP_API_TOKEN", FAKE_TOKEN);
    fetchSpy = blockFetch();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true });
  });

  async function writeConfig(config: unknown, file = configFile): Promise<void> {
    await writeFile(file, JSON.stringify(config), "utf8");
  }

  /** A fetch spy that never reaches the network. */
  function blockFetch() {
    return vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network in tests"));
  }

  async function doctor(
    argv: string[],
    deps: DoctorDeps = {},
  ): Promise<{ out: string; code: number | undefined }> {
    let out = "";
    let code: number | undefined;
    await runDoctor(
      { tool: "clickup", argv },
      {
        env: {},
        write: (text) => {
          out += text;
        },
        exit: (c) => {
          code = c;
        },
        ...deps,
      },
    );
    return { out, code };
  }

  interface JsonReport {
    tool: string;
    configPath: string;
    results: Array<{ id: string; ok: boolean; message: string; fixHint: string | null }>;
    summary: { pass: number; warn: number; fail: number; exitCode: number };
  }

  const parse = (out: string): JsonReport => JSON.parse(out) as JsonReport;
  const result = (report: JsonReport, id: string) => report.results.find((r) => r.id === id);

  it("a healthy config with live checks passing exits 0; --json output is parseable", async () => {
    await writeConfig(baseConfig());
    const { out, code } = await doctor(["--json", "--config", configFile], { probe: makeProbe() });
    const report = parse(out);
    expect(report.tool).toBe("clickup");
    expect(report.summary).toMatchObject({ fail: 0, warn: 0, exitCode: 0 });
    expect(report.results.map((r) => r.id)).toEqual(
      expect.arrayContaining(["C-CFG-1", "C-CLK-1", "C-CLK-7", "C-CLK-8"]),
    );
    expect(code).toBe(0);
  });

  it("--config override is honored", async () => {
    await writeConfig(baseConfig());
    const report = parse((await doctor(["--json", "--config", configFile])).out);
    expect(report.configPath).toBe(configFile);
    expect(result(report, "C-FS-1")?.ok).toBe(true);
    expect(result(report, "C-CLK-1")?.ok).toBe(true);
  });

  it("defaults to ./.clickup.json in the working directory", async () => {
    await writeConfig(baseConfig(), path.join(dir, ".clickup.json"));
    vi.spyOn(process, "cwd").mockReturnValue(dir);
    const report = parse((await doctor(["--json"])).out);
    expect(report.configPath).toBe(path.join(dir, ".clickup.json"));
    expect(result(report, "C-CLK-1")?.ok).toBe(true);
  });

  it("a missing config file exits 1 with the no-config message", async () => {
    const missing = path.join(dir, "absent.json");
    const { out, code } = await doctor(["--json", "--config", missing]);
    expect(result(parse(out), "C-CLK-1")?.message).toContain("No .clickup.json found");
    expect(code).toBe(1);
  });

  it("--fix-hints-only lists only the failing checks", async () => {
    await writeConfig({ ...baseConfig(), workspace: { id: "", name: "Workspace" } });
    const { out, code } = await doctor(["--fix-hints-only", "--config", configFile]);
    expect(out).toContain("| C-CLK-2 |");
    expect(out).not.toContain("| C-CLK-3 |");
    expect(out).not.toContain("| C-CLK-1 |");
    expect(code).toBe(1);
  });

  it("a warning-only report exits 0 (point strategy with a time target)", async () => {
    const estimation = { enabled: true, strategy: "fibonacci", clickupTarget: "time" };
    await writeConfig({ ...baseConfig(), estimation });
    const { out, code } = await doctor(["--json", "--config", configFile]);
    const report = parse(out);
    expect(result(report, "C-CLK-4")?.ok).toBe(false);
    expect(report.summary.fail).toBe(0);
    expect(code).toBe(0);
  });

  it("hoursPerDay outside 1–24 fails C-CLK-4 and the run exits 1 (the schema check rejects it too)", async () => {
    const estimation = { strategy: "ideal_days", clickupTarget: "time", hoursPerDay: 30 };
    await writeConfig({ ...baseConfig(), estimation });
    const { out, code } = await doctor(["--json", "--config", configFile]);
    const report = parse(out);
    expect(result(report, "C-CLK-4")?.ok).toBe(false);
    expect(result(report, "C-CFG-1")?.ok).toBe(false);
    expect(code).toBe(1);
  });

  it("live checks skip with ok:true and an advisory when no probe and no token; fetch is never called", async () => {
    await writeConfig(baseConfig());
    const { out, code } = await doctor(["--json", "--config", configFile], { env: {} });
    const report = parse(out);
    for (const id of ["C-CLK-7", "C-CLK-8"]) {
      expect(result(report, id)?.ok, id).toBe(true);
      expect(result(report, id)?.message, id).toBe(NO_PROBE);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(code).toBe(0);
  });

  it("an injected env: {} wins over a CLICKUP_API_TOKEN set in process.env (zero fetch calls)", async () => {
    expect(process.env.CLICKUP_API_TOKEN === FAKE_TOKEN).toBe(true);
    await writeConfig(baseConfig());
    const report = parse((await doctor(["--json", "--config", configFile], { env: {} })).out);
    expect(result(report, "C-CLK-7")?.message).toBe(NO_PROBE);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("without an env dep, runDoctor reads process.env (and the test fetch stays blocked)", async () => {
    await writeConfig(baseConfig());
    const report = parse(
      (await doctor(["--json", "--config", configFile], { env: undefined })).out,
    );
    expect(result(report, "C-CLK-7")?.ok).toBe(false);
    expect(fetchSpy.mock.calls.map((c) => String(c[0]))).toEqual([
      "https://api.clickup.com/api/v2/team",
    ]);
  });

  it("with CLICKUP_API_TOKEN set and no injected probe, the read-only REST probe is used", async () => {
    const statuses = (names: string[]) => ({
      statuses: names.map((status, orderindex) => ({ status, type: "custom", orderindex })),
    });
    const bodies: Record<string, unknown> = {
      "/team": { teams: [{ id: WS, name: "Workspace", members: [] }] },
      [`/list/${LIST_A}`]: statuses(LIVE[LIST_A]),
      [`/list/${LIST_B}`]: statuses(LIVE[LIST_B]),
    };
    fetchSpy.mockImplementation(async (input, init) => {
      const url = String(input);
      expect(init?.method).toBe("GET");
      expect(new Headers(init?.headers).get("Authorization")).toBe(FAKE_TOKEN);
      const key = url.replace("https://api.clickup.com/api/v2", "");
      return new Response(JSON.stringify(bodies[key] ?? {}), { status: key in bodies ? 200 : 404 });
    });
    await writeConfig(baseConfig());
    const { out, code } = await doctor(["--json", "--config", configFile], {
      env: { CLICKUP_API_TOKEN: `"${FAKE_TOKEN}"` },
    });
    const report = parse(out);
    expect(result(report, "C-CLK-7")?.ok).toBe(true);
    expect(result(report, "C-CLK-8")?.ok).toBe(true);
    expect(fetchSpy.mock.calls.map((c) => String(c[0]))).toEqual([
      "https://api.clickup.com/api/v2/team",
      `https://api.clickup.com/api/v2/list/${LIST_A}`,
      `https://api.clickup.com/api/v2/list/${LIST_B}`,
    ]);
    expect(code).toBe(0);
  });

  it("an injected probe wins over CLICKUP_API_TOKEN", async () => {
    await writeConfig(baseConfig());
    const probe = makeProbe();
    await doctor(["--json", "--config", configFile], {
      env: { CLICKUP_API_TOKEN: FAKE_TOKEN },
      probe,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(probe.workspaceCalls).toBe(1);
  });

  const failingFetches: Array<[string, () => Promise<Response>]> = [
    [
      "a 401 that echoes the token",
      async () => new Response(`bad token ${FAKE_TOKEN}`, { status: 401 }),
    ],
    [
      "a 500 that echoes the token",
      async () => new Response(`{"err":"${FAKE_TOKEN}"}`, { status: 500 }),
    ],
    [
      "a rejected fetch that echoes the token",
      async () => {
        throw new Error(`connect failed, Authorization: ${FAKE_TOKEN}`);
      },
    ],
  ];

  it.each(failingFetches)("the token never appears in reports (%s)", async (_label, respond) => {
    fetchSpy.mockImplementation(respond);
    await writeConfig(baseConfig());
    const env = { CLICKUP_API_TOKEN: FAKE_TOKEN };
    const md = await doctor(["--config", configFile], { env });
    const json = await doctor(["--json", "--config", configFile], { env });
    for (const out of [md.out, json.out]) {
      expect(out).toContain("C-CLK-7");
      expect(out).not.toContain(FAKE_TOKEN);
    }
    const report = parse(json.out);
    expect(result(report, "C-CLK-7")?.ok).toBe(false);
    expect(result(report, "C-CLK-8")?.ok).toBe(true);
  });

  it.each(failingFetches)(
    "the token never appears in reports when /team succeeds and a list read fails (%s)",
    async (label, respond) => {
      const team = { teams: [{ id: WS, name: "Workspace", members: [] }] };
      fetchSpy.mockImplementation(async (input) =>
        String(input).endsWith("/team") ? new Response(JSON.stringify(team)) : respond(),
      );
      await writeConfig(baseConfig());
      const env = { CLICKUP_API_TOKEN: FAKE_TOKEN };
      const md = await doctor(["--config", configFile], { env });
      const json = await doctor(["--json", "--config", configFile], { env });
      for (const out of [md.out, json.out]) {
        expect(out).toContain("C-CLK-8");
        expect(out).not.toContain(FAKE_TOKEN);
      }
      const report = parse(json.out);
      expect(result(report, "C-CLK-7")?.ok).toBe(true);
      expect(result(report, "C-CLK-8")?.ok).toBe(false);
      // A 401 on a list after /team succeeded: that list is inaccessible, the next is still read.
      expect(result(report, "C-CLK-8")?.message).toContain(
        label.includes("401")
          ? `List Backlog (${LIST_A}): ClickUp refused to read it (HTTP 401)`
          : `Backlog (${LIST_A}) could not be read`,
      );
      expect(result(report, "C-CLK-8")?.message).toContain(`Delivery (${LIST_B})`);
    },
  );

  it("the token never appears in reports (a malformed token is rejected before any request)", async () => {
    await writeConfig(baseConfig());
    const malformed = `${FAKE_TOKEN}é`;
    const { out } = await doctor(["--json", "--config", configFile], {
      env: { CLICKUP_API_TOKEN: malformed },
    });
    expect(out).not.toContain(FAKE_TOKEN);
    expect(result(parse(out), "C-CLK-7")?.ok).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
