import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  Runtime,
  TaskEstimateSetRequest,
  TransportResult,
} from "@llodev/pm-tasks-core/runtime";
import type { EstimationConfig } from "@llodev/pm-tasks-core/estimation";
import {
  createAdapter,
  createClickUpTransport,
  type ClickUpConfig,
  type ClickUpEstimationConfig,
  type CreateAdapterOptions,
} from "../src/index.js";
import {
  expectWorkspaceOnEveryCall,
  makeMcp,
  mcpFixture,
  type ResponseFn,
} from "./helpers/mcp-stub.js";

const PKG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The verbs kept for v1.0.0 (spec §14): `task.sprint.set` was dropped. */
const NINE_VERBS = [
  "task.create",
  "task.move",
  "checklist.check",
  "task.close",
  "task.due-date.set",
  "task.assignee.add",
  "task.comment.add",
  "task.parent.set",
  "task.estimate.set",
];

const WS = "9013000001";
const LIST_A = "1000400000000002"; // sandbox-a: the home list of every capture used here
const ESTIMATION: ClickUpEstimationConfig = {
  enabled: true,
  strategy: "ideal_hours",
  clickupTarget: "time",
};

function configWith(overrides: Partial<ClickUpConfig> = {}): ClickUpConfig {
  return {
    version: "1",
    workspace: { id: WS, name: "Workspace" },
    lists: [
      {
        id: LIST_A,
        name: "sandbox-a",
        statuses: { open: "to do", wip: "in progress", done: "complete", closed: "cancelled" },
      },
    ],
    estimation: ESTIMATION,
    ...overrides,
  };
}

let tmpDir: string;
let configPath: string;
let logDir: string;
let originalLogDir: string | undefined;

async function writeConfig(config: unknown): Promise<void> {
  await writeFile(configPath, JSON.stringify(config), "utf8");
}

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "pm-tasks-clickup-adapter-"));
  configPath = path.join(tmpDir, ".clickup.json");
  logDir = path.join(tmpDir, "logs");
  await writeConfig(configWith());
  originalLogDir = process.env.LLODEV_PM_TASKS_LOG_DIR;
  process.env.LLODEV_PM_TASKS_LOG_DIR = logDir;
});

afterEach(async () => {
  if (originalLogDir === undefined) delete process.env.LLODEV_PM_TASKS_LOG_DIR;
  else process.env.LLODEV_PM_TASKS_LOG_DIR = originalLogDir;
  await rm(tmpDir, { recursive: true, force: true });
});

/** The audit log the runtime writes under LLODEV_PM_TASKS_LOG_DIR, one entry per line. */
async function auditEntries(): Promise<Array<Record<string, unknown>>> {
  let raw: string;
  try {
    raw = await readFile(path.join(logDir, "clickup", "audit.log"), "utf8");
  } catch {
    return [];
  }
  return raw
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

/**
 * One stateful stub for every verb, built from the Task 0b captures. `get_task`
 * serves the current state of each captured task; `update_task` and the tag
 * tools change it the way ClickUp does, so later verbs see earlier writes.
 */
function omnibus() {
  const tasks = new Map<string, Record<string, unknown>>();
  for (const name of [
    "clickup_get_task.parent", // t000000001: root, "to do", assignee 100000001, tag est:2h
    "clickup_get_task.child", // t000000002: subtask of t000000001, leaf, 30 min estimate
    "clickup_get_task.child2.dates", // t000000003: subtask, due 2026-12-01 (04:00 at UTC-3)
    "clickup_get_task.mover.moved", // t000000004: root task in sandbox-b
  ]) {
    const task = mcpFixture(name) as Record<string, unknown>;
    tasks.set(task.id as string, task);
  }
  const known = (args: Record<string, unknown>): Record<string, unknown> => {
    const task = tasks.get(String(args.task_id));
    if (!task) throw new Error("Task not found");
    return task;
  };
  const tagged = (name: unknown) => ({ name, tag_bg: "#A875FF", tag_fg: "#A875FF" });
  const updated = mcpFixture("clickup_update_task") as Record<string, unknown>;
  const tagAdded = mcpFixture("clickup_add_tag_to_task") as Record<string, unknown>;
  const tagRemoved = mcpFixture("clickup_remove_tag_from_task") as Record<string, unknown>;
  const tagCreated = mcpFixture("clickup_create_space_tag.created") as Record<string, unknown>;

  const updateTask: ResponseFn = (args) => {
    const task = known(args);
    if (args.status !== undefined) task.status = args.status;
    // A date-only due date is stored at 04:00 of the account's UTC-3 day (S5).
    if (args.due_date !== undefined) task.due_date = String(Date.parse(`${args.due_date}T07:00Z`));
    if (args.assignees !== undefined) {
      task.assignees = (args.assignees as string[]).map((id) => ({ id: Number(id) }));
    }
    if (args.parent !== undefined) task.parent = args.parent;
    if (args.time_estimate !== undefined) task.time_estimate = Number(args.time_estimate) * 60_000;
    return { ...updated, task_id: task.id, task_url: task.url };
  };
  const addTag: ResponseFn = (args) => {
    const task = known(args);
    task.tags = [...(task.tags as unknown[]), tagged(args.tag_name)];
    return { ...tagAdded, task_id: task.id, tag_name: args.tag_name };
  };
  const removeTag: ResponseFn = (args) => {
    const task = known(args);
    const name = String(args.tag_name).toLowerCase();
    task.tags = (task.tags as Array<{ name: string }>).filter((t) => t.name.toLowerCase() !== name);
    return { ...tagRemoved, task_id: task.id, tag_name: args.tag_name };
  };
  const createTag: ResponseFn = (args) => ({ ...tagCreated, tag: tagged(args.name) });

  const responses = new Map<string, unknown>([
    ["clickup_create_task", mcpFixture("clickup_create_task.parent")],
    ["clickup_get_task", ((args) => structuredClone(known(args))) satisfies ResponseFn],
    ["clickup_update_task", updateTask],
    ["clickup_get_user", mcpFixture("clickup_get_user")],
    ["clickup_get_task_comments", mcpFixture("clickup_get_task_comments")],
    ["clickup_create_comment", mcpFixture("clickup_create_comment")],
    ["clickup_create_space_tag", createTag],
    ["clickup_add_tag_to_task", addTag],
    ["clickup_remove_tag_from_task", removeTag],
  ]);
  return { ...makeMcp(responses), tasks };
}

/** One successful call per manifest verb, in manifest order, against the omnibus stub. */
const VERB_RUNS: Record<string, (runtime: Runtime) => Promise<TransportResult<unknown>>> = {
  "task.create": (rt) =>
    rt.taskCreate({
      boardOrProjectId: LIST_A,
      listOrSectionId: "",
      name: "Ship the adapter",
      clientToken: "ct-create-1",
    }),
  "task.move": (rt) => rt.taskMove({ taskId: "t000000001", targetListOrSectionId: "wip" }),
  "checklist.check": (rt) =>
    rt.checklistCheck({
      taskId: "t000000001",
      checklistId: "t000000001",
      itemId: "t000000002",
      targetState: "complete",
    }),
  "task.close": (rt) => rt.taskClose({ taskId: "t000000001" }),
  "task.due-date.set": (rt) => rt.taskDueDateSet({ taskId: "t000000003", dueAt: "2026-12-15" }),
  "task.assignee.add": (rt) => rt.taskAssigneeAdd({ taskId: "t000000001", userId: "100000002" }),
  "task.comment.add": (rt) =>
    rt.taskCommentAdd({ taskId: "t000000001", text: "Shipped", clientToken: "ct-comment-1" }),
  "task.parent.set": (rt) => rt.taskParentSet({ taskId: "t000000004", parentId: "t000000001" }),
  // The caller passes the estimation block of .clickup.json as req.config.
  "task.estimate.set": (rt) =>
    rt.taskEstimateSet({
      taskId: "t000000002",
      input: 2,
      config: ESTIMATION as unknown as EstimationConfig,
    }),
};

async function manifestVerbs(): Promise<string[]> {
  const raw = await readFile(path.join(PKG, "manifest.json"), "utf8");
  return (JSON.parse(raw) as { verbs: string[] }).verbs;
}

/** Runs every manifest verb, in manifest order, through one runtime. */
async function runEveryVerb(session?: string) {
  const stub = omnibus();
  const runtime = await createAdapter({ configPath, mcp: stub.mcp, session });
  const results: Array<[string, TransportResult<unknown>]> = [];
  for (const verb of await manifestVerbs()) {
    const run = VERB_RUNS[verb];
    if (!run) throw new Error(`no omnibus call for ${verb}`);
    results.push([verb, await run(runtime)]);
  }
  return { ...stub, results };
}

// ---------------------------------------------------------------------------
// Manifest and package entry
// ---------------------------------------------------------------------------

describe("manifest", () => {
  it("manifest verbs equal the schema's autonomous.allow enum", async () => {
    const verbs = await manifestVerbs();
    expect(verbs).toEqual(NINE_VERBS);
    const schema = JSON.parse(await readFile(path.join(PKG, "schemas/config.json"), "utf8")) as {
      properties: { autonomous: { properties: { allow: { items: { enum: string[] } } } } };
    };
    const allow = schema.properties.autonomous.properties.allow.items.enum;
    expect([...allow].sort()).toEqual([...verbs].sort());
  });

  it("every manifest verb has its transport method, and the transport has no other method", async () => {
    const METHOD_OF: Record<string, string> = {
      "task.create": "taskCreate",
      "task.move": "taskMove",
      "checklist.check": "checklistCheck",
      "task.close": "taskClose",
      "task.due-date.set": "taskDueDateSet",
      "task.assignee.add": "taskAssigneeAdd",
      "task.comment.add": "taskCommentAdd",
      "task.parent.set": "taskParentSet",
      "task.estimate.set": "taskEstimateSet",
    };
    const verbs = await manifestVerbs();
    expect(Object.keys(METHOD_OF).sort()).toEqual([...verbs].sort());

    const transport = createClickUpTransport({ mcp: omnibus().mcp, config: configWith() });
    const methods = Object.entries(transport)
      .filter(([, value]) => typeof value === "function")
      .map(([key]) => key);
    for (const verb of verbs) expect(methods, verb).toContain(METHOD_OF[verb]);
    expect(methods.sort()).toEqual(Object.values(METHOD_OF).sort());
    expect(methods).not.toContain("taskSprintSet");
  });

  it("the package entry exports createAdapter and createClickUpTransport", () => {
    expect(typeof createAdapter).toBe("function");
    expect(typeof createClickUpTransport).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Runtime integration
// ---------------------------------------------------------------------------

describe("createAdapter: runtime integration", () => {
  it('every manifest verb runs through the runtime and returns the ok envelope with tool "clickup"', async () => {
    const { results, calls } = await runEveryVerb();
    expect(results.map(([verb]) => verb)).toEqual(NINE_VERBS);
    for (const [verb, result] of results) expect(result, verb).toMatchObject({ ok: true });
    const logged = (await auditEntries()).map((e) => [e.verb, e.tool]);
    expect(logged).toEqual(NINE_VERBS.map((verb) => [verb, "clickup"]));
    expectWorkspaceOnEveryCall(calls, WS);
  });

  it("the omnibus writes land where the verbs aim", async () => {
    const { results, tasks } = await runEveryVerb();
    const data = Object.fromEntries(results.map(([verb, r]) => [verb, r.ok ? r.data : r]));
    expect(data["task.create"]).toEqual({
      id: "t000000001",
      url: "https://app.clickup.com/t/t000000001",
    });
    expect(data["task.move"]).toEqual({
      previousListOrSectionId: "to do",
      newListOrSectionId: "in progress",
    });
    expect(data["checklist.check"]).toEqual({ previousState: "incomplete", newState: "complete" });
    expect(data["task.close"]).toEqual({ closed: true });
    expect(data["task.due-date.set"]).toMatchObject({ newDueAt: "2026-12-15" });
    expect(data["task.assignee.add"]).toEqual({
      added: true,
      currentAssigneeIds: ["100000001", "100000002"],
    });
    expect(data["task.comment.add"]).toMatchObject({ commentId: "1000400000000901" });
    expect(data["task.parent.set"]).toEqual({
      previousParentId: null,
      newParentId: "t000000001",
    });
    expect(data["task.estimate.set"]).toMatchObject({ fieldWritten: "time_estimate" });

    // The parent was moved to wip, then closed; its subtask was checked.
    expect(tasks.get("t000000001")?.status).toBe("complete");
    expect(tasks.get("t000000002")?.status).toBe("complete");
    expect(tasks.get("t000000002")?.time_estimate).toBe(120 * 60_000);
    expect(tasks.get("t000000004")?.parent).toBe("t000000001");
  });

  it("the audit log records the verb", async () => {
    await runEveryVerb("s-omnibus");
    const entries = await auditEntries();
    expect(entries.map((e) => e.verb)).toEqual(NINE_VERBS);
    for (const entry of entries) {
      expect(entry).toMatchObject({ tool: "clickup", ok: true, session: "s-omnibus" });
    }
  });

  it("a verb absent from the manifest is UNSUPPORTED_VERB", async () => {
    expect(await manifestVerbs()).not.toContain("task.sprint.set");
    const { mcp, calls } = omnibus();
    const runtime = await createAdapter({ configPath, mcp });
    await expect(
      runtime.taskSprintSet({ taskId: "t000000001", sprintRef: "Sprint 1" }),
    ).resolves.toEqual({ ok: false, code: "UNSUPPORTED_VERB" });
    expect(calls).toEqual([]);
    expect(await auditEntries()).toEqual([]);
  });

  it("autonomous.enabled false does not gate the runtime: core enforces no allowlist", async () => {
    // The core runtime has no autonomous check; the allowlist and scope are
    // enforced by the SKILL contract and validated by doctor.
    await writeConfig(configWith({ autonomous: { enabled: false, allow: [] } }));
    const { mcp, calls } = omnibus();
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskCommentAdd({ taskId: "t000000001", text: "Shipped" });
    expect(result).toMatchObject({ ok: true });
    expect(calls.map((c) => c.tool)).toEqual(["clickup_create_comment"]);
  });
});

// ---------------------------------------------------------------------------
// task.estimate.set: the estimation config through the runtime
// ---------------------------------------------------------------------------

describe("createAdapter: task.estimate.set through the runtime", () => {
  it("the estimation block of .clickup.json, passed as req.config, writes the estimate", async () => {
    // What a caller does: read .clickup.json and hand its estimation block over.
    const onDisk = JSON.parse(await readFile(configPath, "utf8")) as ClickUpConfig;
    const { mcp, calls } = omnibus();
    const runtime = await createAdapter({ configPath, mcp });
    const result = await runtime.taskEstimateSet({
      taskId: "t000000002",
      input: 2,
      config: onDisk.estimation as unknown as EstimationConfig,
    });
    expect(result).toMatchObject({ ok: true, data: { fieldWritten: "time_estimate" } });
    expect(calls).toContainEqual({
      tool: "clickup_update_task",
      args: { task_id: "t000000002", time_estimate: "120", workspace_id: WS },
    });
    expect(await auditEntries()).toEqual([
      expect.objectContaining({
        verb: "task.estimate.set",
        tool: "clickup",
        ok: true,
        id: "t000000002",
        fieldWritten: "time_estimate",
      }),
    ]);
  });

  it("the runtime does not inject the estimation block: a request without config is INVALID_REQUEST", async () => {
    const { mcp, calls } = omnibus();
    const runtime = await createAdapter({ configPath, mcp });
    const req = { taskId: "t000000002", input: 2 } as unknown as TaskEstimateSetRequest;
    const result = await runtime.taskEstimateSet(req);
    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_REQUEST",
      details: { reason: "estimation_config_required" },
    });
    expect(calls).toEqual([]);
  });

  it.each([
    ["absent", undefined],
    ["enabled:false", { ...ESTIMATION, enabled: false }],
  ])(
    "estimation %s in .clickup.json is NOT_APPLICABLE through the runtime",
    async (_label, estimation) => {
      await writeConfig(configWith({ estimation }));
      const { mcp, calls } = omnibus();
      const runtime = await createAdapter({ configPath, mcp });
      const result = await runtime.taskEstimateSet({
        taskId: "t000000002",
        input: 2,
        config: ESTIMATION as unknown as EstimationConfig,
      });
      expect(result).toMatchObject({
        ok: false,
        code: "NOT_APPLICABLE",
        details: { verb: "task.estimate.set", reason: "estimation_disabled" },
      });
      expect(calls).toEqual([]);
      expect(await auditEntries()).toEqual([
        expect.objectContaining({ verb: "task.estimate.set", ok: false, code: "NOT_APPLICABLE" }),
      ]);
    },
  );
});

// ---------------------------------------------------------------------------
// Pre-mortem: construction
// ---------------------------------------------------------------------------

describe("createAdapter: construction", () => {
  it("makes no MCP call at construction time", async () => {
    const { mcp, calls } = omnibus();
    await createAdapter({ configPath, mcp });
    expect(calls).toEqual([]);
  });

  it("a missing config file rejects with its path and the init hint, keeping the cause", async () => {
    const originalToken = process.env.CLICKUP_API_TOKEN;
    process.env.CLICKUP_API_TOKEN = "pk_000000_SECRETTOKENVALUE";
    try {
      const missing = path.join(tmpDir, "nonexistent.json");
      const { mcp, calls } = omnibus();
      const opts: CreateAdapterOptions = { configPath: missing, mcp };
      const error = await createAdapter(opts).then(
        () => null,
        (e: unknown) => e as Error & { cause?: unknown },
      );
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toContain(`config not found at ${missing}`);
      expect(error?.message).toContain("npx @llodev/pm-tasks-clickup init");
      expect(error?.message).not.toContain("SECRETTOKENVALUE");
      expect((error?.cause as { code?: string } | undefined)?.code).toBe("ENOENT");
      expect(calls).toEqual([]);
    } finally {
      if (originalToken === undefined) delete process.env.CLICKUP_API_TOKEN;
      else process.env.CLICKUP_API_TOKEN = originalToken;
    }
  });

  it("an unreadable config path rejects naming it, keeping the cause", async () => {
    const error = await createAdapter({ configPath: tmpDir, mcp: omnibus().mcp }).then(
      () => null,
      (e: unknown) => e as Error & { cause?: unknown },
    );
    expect(error?.message).toContain(`cannot read config at ${tmpDir}`);
    expect((error?.cause as { code?: string } | undefined)?.code).toBe("EISDIR");
  });

  it("a malformed JSON config rejects naming the file, keeping the cause", async () => {
    await writeFile(configPath, "not valid json{", "utf8");
    const error = await createAdapter({ configPath, mcp: omnibus().mcp }).then(
      () => null,
      (e: unknown) => e as Error & { cause?: unknown },
    );
    expect(error?.message).toContain(`invalid JSON in config at ${configPath}`);
    expect(error?.cause).toBeInstanceOf(SyntaxError);
  });

  const SHAPE_HINT = "(workspace.id and lists[] are required)";
  const badShapes: Array<[string, unknown]> = [
    ["no workspace", (({ workspace: _w, ...rest }) => rest)(configWith())],
    ["a workspace without id", { ...configWith(), workspace: { name: "Workspace" } }],
    ["an empty workspace.id", { ...configWith(), workspace: { id: "", name: "Workspace" } }],
    ["a non-string workspace.id", { ...configWith(), workspace: { id: 9013000001, name: "W" } }],
    ["lists that is not an array", { ...configWith(), lists: { [LIST_A]: { name: "sandbox-a" } } }],
    ["no lists", (({ lists: _l, ...rest }) => rest)(configWith())],
    ["an estimation that is null", { ...configWith(), estimation: null }],
    ["an estimation that is a string", { ...configWith(), estimation: "ideal_hours" }],
    ["a JSON array", [configWith()]],
    ["JSON null", null],
  ];

  it.each(badShapes)(
    "a config with %s rejects naming the path and the doctor, without echoing it",
    async (_case, config) => {
      // A marker in the file: the error must not carry the file content.
      const marked =
        config !== null && typeof config === "object" && !Array.isArray(config)
          ? { ...config, defaultListId: "MARKER-not-echoed-4d1" }
          : config;
      await writeConfig(marked);
      const { mcp, calls } = omnibus();
      const error = await createAdapter({ configPath, mcp }).then(
        () => null,
        (e: unknown) => e as Error,
      );
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe(
        `pm-tasks-clickup: invalid config at ${configPath} ${SHAPE_HINT} — run 'npx @llodev/pm-tasks-clickup init --doctor'`,
      );
      expect(error?.message).not.toContain("MARKER");
      expect(calls).toEqual([]);
    },
  );

  it("an empty lists[] and an absent estimation pass the shape guard (the doctor reports them)", async () => {
    await writeConfig(configWith({ lists: [], estimation: undefined }));
    const { mcp, calls } = omnibus();
    await expect(createAdapter({ configPath, mcp })).resolves.toBeDefined();
    expect(calls).toEqual([]);
  });

  it("a list without statuses still builds the adapter; status verbs return INVALID_REQUEST", async () => {
    // Validation is init/doctor's job: the runtime fails closed per verb instead.
    const lists = [{ id: LIST_A, name: "sandbox-a" }] as unknown as ClickUpConfig["lists"];
    await writeConfig(configWith({ lists }));
    const { mcp, calls } = omnibus();
    const runtime = await createAdapter({ configPath, mcp });
    const results = [
      await runtime.taskMove({ taskId: "t000000001", targetListOrSectionId: "wip" }),
      await runtime.taskClose({ taskId: "t000000001" }),
      await runtime.checklistCheck({
        taskId: "t000000001",
        checklistId: "t000000001",
        itemId: "t000000002",
        targetState: "complete",
      }),
    ];
    for (const result of results) {
      expect(result).toMatchObject({
        ok: false,
        code: "INVALID_REQUEST",
        details: { reason: "role_not_configured" },
      });
    }
    expect(calls.map((c) => c.tool)).toEqual([
      "clickup_get_task",
      "clickup_get_task",
      "clickup_get_task",
    ]);
  });
});
