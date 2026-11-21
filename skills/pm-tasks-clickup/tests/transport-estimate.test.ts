import { afterEach, describe, it, expect } from "vitest";
import {
  createClickUpTransport,
  type ClickUpConfig,
  type ClickUpEstimationConfig,
  type ClickUpTaskEstimateSetRequest,
  type ClickUpTransport,
} from "../src/transport-clickup.js";
import { slugify, toMinutes } from "../src/estimation.js";
import {
  expectWorkspaceOnEveryCall,
  makeMcp,
  mcpFixture,
  type CallRecord,
} from "./helpers/mcp-stub.js";

const WS = "9013000001";
const LIST_A = "1000400000000002";
const SPACE = "901310000001"; // space.id of every get_task capture

const HOURS: ClickUpEstimationConfig = { strategy: "ideal_hours", clickupTarget: "time" };

/** The transport config; `null` means no estimation block at all. */
function configWith(estimation: ClickUpEstimationConfig | null): ClickUpConfig {
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
    ...(estimation !== null ? { estimation } : {}),
  };
}

const UPDATED = mcpFixture("clickup_update_task"); // {success, task_id, custom_id, task_url}
const TAG_CREATED = mcpFixture("clickup_create_space_tag.created") as Record<string, unknown>;
const TAG_ADDED = mcpFixture("clickup_add_tag_to_task") as Record<string, unknown>;
const TAG_REMOVED = mcpFixture("clickup_remove_tag_from_task") as Record<string, unknown>;

// t000000002: a leaf (subtasks_count 0), time_estimate 1800000 (30 min), no tags
const LEAF = "clickup_get_task.child";
// t000000001: subtasks_count 2, time_estimate 7200000 (2 h), tag est:2h
const WITH_SUBTASKS = "clickup_get_task.parent.reassigned";

/** A real `get_task` capture, optionally with fields overridden. */
function task(name: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { ...(mcpFixture(name) as Record<string, unknown>), ...overrides };
}

/** A real `get_task` capture with one key removed: a partial read. */
function taskWithout(name: string, key: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(task(name)).filter(([k]) => k !== key));
}

/** `get_task.tags` entries. */
const tags = (...names: string[]) =>
  names.map((name) => ({ name, tag_bg: "#A875FF", tag_fg: "#A875FF" }));

const recorded: CallRecord[][] = [];

// Every call of every test in this file carries the workspace id.
afterEach(() => {
  for (const calls of recorded.splice(0)) expectWorkspaceOnEveryCall(calls, WS);
});

function setup(
  responses: Record<string, unknown>,
  estimation: ClickUpEstimationConfig | null = HOURS,
) {
  const { mcp, calls } = makeMcp(new Map(Object.entries(responses)));
  recorded.push(calls);
  return { transport: createClickUpTransport({ mcp, config: configWith(estimation) }), calls };
}

/** ideal_hours 2 on the leaf task unless overridden. */
function estimate(transport: ClickUpTransport, req: Partial<ClickUpTaskEstimateSetRequest> = {}) {
  return transport.taskEstimateSet!({ taskId: "t000000002", input: 2, config: HOURS, ...req });
}

/**
 * A task whose time estimate and tags follow the writes the way ClickUp applies
 * them (U8): space tag names are stored lowercased, `add_tag_to_task` needs the
 * tag in the space, `remove_tag_from_task` ignores case.
 */
function liveTask(fixture: string, overrides: Record<string, unknown> = {}) {
  const state = task(fixture, overrides);
  const current = () => state.tags as Array<{ name: string }>;
  const tagNames = () => current().map((t) => t.name);
  const spaceTags = new Set(tagNames().map((n) => n.toLowerCase()));
  const responses: Record<string, (args: Record<string, unknown>) => unknown> = {
    clickup_get_task: () => structuredClone(state),
    clickup_update_task: (args) => {
      state.time_estimate = Number(args.time_estimate) * 60_000;
      return UPDATED;
    },
    clickup_create_space_tag: (args) => {
      const name = String(args.name).toLowerCase();
      const created = !spaceTags.has(name);
      spaceTags.add(name);
      return { ...TAG_CREATED, created, tag: { ...(TAG_CREATED.tag as object), name } };
    },
    clickup_add_tag_to_task: (args) => {
      const name = String(args.tag_name);
      if (!spaceTags.has(name.toLowerCase())) return { error: "Tag not found" };
      if (!tagNames().includes(name)) state.tags = [...current(), ...tags(name)];
      return { ...TAG_ADDED, tag_name: name };
    },
    clickup_remove_tag_from_task: (args) => {
      const name = String(args.tag_name).toLowerCase();
      state.tags = current().filter((t) => t.name.toLowerCase() !== name);
      return { ...TAG_REMOVED, tag_name: args.tag_name };
    },
  };
  return { state, tagNames, responses };
}

const tools = (calls: CallRecord[]) => calls.map((c) => c.tool);
const getTask = (taskId: string) => ({
  tool: "clickup_get_task",
  args: { task_id: taskId, workspace_id: WS },
});
const update = (args: Record<string, unknown>) => ({
  tool: "clickup_update_task",
  args: { ...args, workspace_id: WS },
});
const createTag = (name: string) => ({
  tool: "clickup_create_space_tag",
  args: { space_id: SPACE, name, workspace_id: WS },
});
const addTag = (taskId: string, name: string) => ({
  tool: "clickup_add_tag_to_task",
  args: { task_id: taskId, tag_name: name, workspace_id: WS },
});
const removeTag = (taskId: string, name: string) => ({
  tool: "clickup_remove_tag_from_task",
  args: { task_id: taskId, tag_name: name, workspace_id: WS },
});

// ---------------------------------------------------------------------------
// toMinutes / slugify
// ---------------------------------------------------------------------------

describe("toMinutes and slugify", () => {
  it("slugify and toMinutes unit cases", () => {
    expect(toMinutes("2h", 6)).toBe(120);
    expect(toMinutes("0.5h", 6)).toBe(30);
    expect(toMinutes("45m", 6)).toBe(45);
    expect(toMinutes("1.5d", 6)).toBe(540);
    expect(toMinutes("1.5d", 8)).toBe(720);
    expect(toMinutes("1.1d", 6)).toBe(396); // 395.99999999999994 before rounding
    expect(toMinutes("0.01h", 6)).toBe(1); // rounded to a whole minute
    expect(toMinutes("0h", 6)).toBe(0);
    // core emits only `<n>h` and `<n>d`; anything else, a negative, NaN, Infinity or an
    // exponent form (String(1e-9)) is not a time string.
    for (const bad of ["", "2", "2w", "1d 2h", "h", "-2h", "NaNh", "Infinityh", "1e-9h", " 2h"]) {
      expect(toMinutes(bad, 6), bad).toBeNaN();
    }

    expect(slugify("2 ideal hours")).toBe("2-ideal-hours");
    expect(slugify("1.5 ideal days")).toBe("1-5-ideal-days");
    expect(slugify("o=1, m=2, p=6")).toBe("o-1-m-2-p-6");
    expect(slugify("  XL  ")).toBe("xl");
    expect(slugify("3")).toBe("3");
    expect(slugify("---")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// task.estimate.set → clickup_update_task {time_estimate} + est:<slug> tag
// ---------------------------------------------------------------------------

describe("taskEstimateSet: writes", () => {
  it("ideal_hours 2 writes 120 minutes", async () => {
    const { transport, calls } = setup({
      clickup_get_task: task(LEAF),
      clickup_update_task: UPDATED,
      clickup_create_space_tag: TAG_CREATED,
      clickup_add_tag_to_task: TAG_ADDED,
    });
    const result = await estimate(transport);
    expect(result).toEqual({
      ok: true,
      data: {
        normalized: { timeString: "2h", humanReadable: "2 ideal hours", jiraTarget: "time" },
        fieldWritten: "time_estimate",
      },
    });
    expect(calls).toEqual([
      getTask("t000000002"),
      update({ task_id: "t000000002", time_estimate: "120" }),
      createTag("est:2-ideal-hours"),
      addTag("t000000002", "est:2-ideal-hours"),
    ]);
  });

  it("ideal_days 1.5 with hoursPerDay 6 writes 540 (6 is the default; a custom value is honored)", async () => {
    for (const [hoursPerDay, minutes] of [
      [undefined, "540"],
      [6, "540"],
      [8, "720"],
      [24, "2160"],
    ] as const) {
      const config: ClickUpEstimationConfig = {
        strategy: "ideal_days",
        clickupTarget: "time",
        ...(hoursPerDay !== undefined ? { hoursPerDay } : {}),
      };
      const { transport, calls } = setup(
        {
          clickup_get_task: task(LEAF),
          clickup_update_task: UPDATED,
          clickup_create_space_tag: TAG_CREATED,
          clickup_add_tag_to_task: TAG_ADDED,
        },
        config,
      );
      const result = await estimate(transport, { input: 1.5, config });
      expect(result).toEqual({
        ok: true,
        data: {
          normalized: { timeString: "1.5d", humanReadable: "1.5 ideal days", jiraTarget: "time" },
          fieldWritten: "time_estimate",
        },
      });
      expect(calls).toEqual([
        getTask("t000000002"),
        update({ task_id: "t000000002", time_estimate: minutes }),
        createTag("est:1-5-ideal-days"),
        addTag("t000000002", "est:1-5-ideal-days"),
      ]);
    }
  });

  it("point strategies write only the est tag, even with clickupTarget time (no time_estimate in any call)", async () => {
    const cases: Array<[ClickUpEstimationConfig, ClickUpTaskEstimateSetRequest["input"], string]> =
      [
        [{ strategy: "story_points", clickupTarget: "time" }, 3, "est:3"],
        [{ strategy: "fibonacci", clickupTarget: "time", scale: [1, 2, 3, 5, 8] }, 4, "est:4"],
        [{ strategy: "t_shirt", clickupTarget: "time", sizeMap: { M: 3 } }, "M", "est:m"],
        [
          { strategy: "three_point", clickupTarget: "time" },
          { optimistic: 1, likely: 2, pessimistic: 6 },
          "est:o-1-m-2-p-6",
        ],
      ];
    for (const [config, input, tag] of cases) {
      const { transport, calls } = setup(
        {
          clickup_get_task: task(LEAF),
          clickup_create_space_tag: TAG_CREATED,
          clickup_add_tag_to_task: TAG_ADDED,
        },
        config,
      );
      const result = await estimate(transport, { input, config });
      expect(result, config.strategy).toMatchObject({ ok: true, data: { fieldWritten: null } });
      if (result.ok) expect(result.data.normalized.points, config.strategy).toBeTypeOf("number");
      expect(calls, config.strategy).toEqual([
        getTask("t000000002"),
        createTag(tag),
        addTag("t000000002", tag),
      ]);
      expect(calls.some((c) => "time_estimate" in c.args)).toBe(false);
    }
  });

  it("a task with subtasks gets only the est tag (fieldWritten null, its time_estimate untouched)", async () => {
    const { transport, calls } = setup({
      clickup_get_task: task(WITH_SUBTASKS),
      clickup_remove_tag_from_task: TAG_REMOVED,
      clickup_create_space_tag: TAG_CREATED,
      clickup_add_tag_to_task: TAG_ADDED,
    });
    const result = await estimate(transport, { taskId: "t000000001", input: 3 });
    expect(result).toEqual({
      ok: true,
      data: {
        normalized: { timeString: "3h", humanReadable: "3 ideal hours", jiraTarget: "time" },
        fieldWritten: null,
      },
    });
    expect(calls).toEqual([
      getTask("t000000001"),
      removeTag("t000000001", "est:2h"),
      createTag("est:3-ideal-hours"),
      addTag("t000000001", "est:3-ideal-hours"),
    ]);
  });

  it("stale est:3 and Est:5 are both removed, other tags are kept, and the target is ensured", async () => {
    const live = liveTask(LEAF, { tags: tags("urgent", "est:3", "Est:5") });
    const { transport, calls } = setup(live.responses);
    const result = await estimate(transport);
    expect(result).toMatchObject({ ok: true, data: { fieldWritten: "time_estimate" } });
    expect(calls).toEqual([
      getTask("t000000002"),
      update({ task_id: "t000000002", time_estimate: "120" }),
      removeTag("t000000002", "est:3"),
      removeTag("t000000002", "Est:5"),
      createTag("est:2-ideal-hours"),
      addTag("t000000002", "est:2-ideal-hours"),
    ]);
    expect(live.tagNames()).toEqual(["urgent", "est:2-ideal-hours"]);
  });

  it("a tag missing on the task but already in the space (created:false) is still added", async () => {
    const existing = mcpFixture("clickup_create_space_tag.existing") as Record<string, unknown>;
    expect(existing.created).toBe(false);
    // time_estimate already 120 minutes: only the tag steps run.
    const { transport, calls } = setup({
      clickup_get_task: task(LEAF, { time_estimate: 7_200_000 }),
      clickup_create_space_tag: existing,
      clickup_add_tag_to_task: TAG_ADDED,
    });
    const result = await estimate(transport);
    expect(result).toMatchObject({ ok: true, data: { fieldWritten: "time_estimate" } });
    expect(calls).toEqual([
      getTask("t000000002"),
      createTag("est:2-ideal-hours"),
      addTag("t000000002", "est:2-ideal-hours"),
    ]);
  });

  it("the target tag among stale ones: only the stale ones are removed, create_space_tag is not called", async () => {
    // time_estimate already 120 minutes: no estimate write either.
    const { transport, calls } = setup({
      clickup_get_task: task(LEAF, {
        time_estimate: 7_200_000,
        tags: tags("est:3", "est:2-ideal-hours"),
      }),
      clickup_remove_tag_from_task: TAG_REMOVED,
    });
    const result = await estimate(transport);
    expect(result).toMatchObject({ ok: true, data: { fieldWritten: "time_estimate" } });
    expect(calls).toEqual([getTask("t000000002"), removeTag("t000000002", "est:3")]);
  });
});

describe("taskEstimateSet: idempotency and toggles", () => {
  it("re-run leaves exactly one est tag: a stale est:3 is replaced, and the same estimate again writes nothing", async () => {
    const live = liveTask(LEAF, { tags: tags("est:3") });
    const { transport, calls } = setup(live.responses);

    const first = await estimate(transport);
    expect(first).toMatchObject({ ok: true, data: { fieldWritten: "time_estimate" } });
    expect(calls).toEqual([
      getTask("t000000002"),
      update({ task_id: "t000000002", time_estimate: "120" }),
      removeTag("t000000002", "est:3"),
      createTag("est:2-ideal-hours"),
      addTag("t000000002", "est:2-ideal-hours"),
    ]);
    expect(live.tagNames()).toEqual(["est:2-ideal-hours"]);
    expect(live.state.time_estimate).toBe(7_200_000);

    // The same estimate again: one read, zero writes.
    const before = calls.length;
    expect(await estimate(transport)).toEqual(first);
    expect(calls.slice(before)).toEqual([getTask("t000000002")]);

    // A new estimate replaces both; still exactly one est:* tag.
    expect(await estimate(transport, { input: 3 })).toMatchObject({ ok: true });
    expect(live.tagNames()).toEqual(["est:3-ideal-hours"]);
    expect(live.state.time_estimate).toBe(10_800_000);
  });

  it("toggling target time→none stops writing time_estimate and never clears the stored one", async () => {
    const live = liveTask(LEAF);
    const timed = setup(live.responses);
    expect(await estimate(timed.transport)).toMatchObject({
      ok: true,
      data: { fieldWritten: "time_estimate" },
    });
    expect(live.state.time_estimate).toBe(7_200_000);

    // .clickup.json now says clickupTarget "none".
    const NONE: ClickUpEstimationConfig = { ...HOURS, clickupTarget: "none" };
    const tagOnly = setup(live.responses, NONE);
    const result = await estimate(tagOnly.transport, { input: 3, config: NONE });
    expect(result).toEqual({
      ok: true,
      data: {
        normalized: { timeString: "3h", humanReadable: "3 ideal hours", jiraTarget: "none" },
        fieldWritten: null,
      },
    });
    expect(tagOnly.calls).toEqual([
      getTask("t000000002"),
      removeTag("t000000002", "est:2-ideal-hours"),
      createTag("est:3-ideal-hours"),
      addTag("t000000002", "est:3-ideal-hours"),
    ]);
    expect(live.state.time_estimate).toBe(7_200_000);
    expect(live.tagNames()).toEqual(["est:3-ideal-hours"]);
  });

  it("estimation is NOT_APPLICABLE with no call when .clickup.json has no estimation block, or it or the request config says enabled:false", async () => {
    const cases: Array<[ClickUpEstimationConfig | null, ClickUpEstimationConfig]> = [
      [null, HOURS],
      [{ ...HOURS, enabled: false }, HOURS],
      [
        { ...HOURS, enabled: false },
        { ...HOURS, enabled: true },
      ],
      [HOURS, { ...HOURS, enabled: false }],
    ];
    for (const [transportConfig, requestConfig] of cases) {
      const { transport, calls } = setup({}, transportConfig);
      const result = await estimate(transport, { config: requestConfig });
      expect(result).toEqual({
        ok: false,
        code: "NOT_APPLICABLE",
        details: {
          verb: "task.estimate.set",
          reason: "estimation_disabled",
          message: expect.any(String),
        },
      });
      expect(calls).toEqual([]);
    }
  });

  it("a null estimation block in .clickup.json is NOT_APPLICABLE with no call (no TypeError)", async () => {
    const { mcp, calls } = makeMcp(new Map());
    recorded.push(calls);
    const config = { ...configWith(HOURS), estimation: null } as unknown as ClickUpConfig;
    const transport = createClickUpTransport({ mcp, config });
    const result = await estimate(transport);
    expect(result).toMatchObject({
      ok: false,
      code: "NOT_APPLICABLE",
      details: { verb: "task.estimate.set", reason: "estimation_disabled" },
    });
    expect(calls).toEqual([]);
  });

  it("no estimation block in .clickup.json and no request config is NOT_APPLICABLE with no call", async () => {
    const { transport, calls } = setup({}, null);
    const result = await transport.taskEstimateSet!({
      taskId: "t000000002",
      input: 2,
    } as ClickUpTaskEstimateSetRequest);
    expect(result).toMatchObject({
      ok: false,
      code: "NOT_APPLICABLE",
      details: { verb: "task.estimate.set", reason: "estimation_disabled" },
    });
    expect(calls).toEqual([]);
  });

  it("the request config drives strategy and target once .clickup.json enables estimation", async () => {
    // .clickup.json says story points; the request (the current config) says ideal hours.
    const { transport, calls } = setup(
      {
        clickup_get_task: task(LEAF),
        clickup_update_task: UPDATED,
        clickup_create_space_tag: TAG_CREATED,
        clickup_add_tag_to_task: TAG_ADDED,
      },
      { strategy: "story_points", clickupTarget: "none", enabled: true },
    );
    const result = await estimate(transport);
    expect(result).toMatchObject({ ok: true, data: { fieldWritten: "time_estimate" } });
    expect(calls[1]).toEqual(update({ task_id: "t000000002", time_estimate: "120" }));
  });
});

describe("taskEstimateSet: partial failures (A3)", () => {
  it("tag failure after the estimate write is partial: ok:false with the applied steps", async () => {
    const cases: Array<[Record<string, unknown>, string, string[], string]> = [
      [
        { clickup_create_space_tag: { error: "Something went wrong" } },
        "MCP_ERROR",
        ["time_estimate"],
        "tag_create",
      ],
      [
        {
          clickup_create_space_tag: TAG_CREATED,
          clickup_add_tag_to_task: { error: "Tag not found" },
        },
        "MCP_ERROR", // not NOT_FOUND: the task exists, a later step failed
        ["time_estimate", "tag_create"],
        "tag_add",
      ],
      [
        {
          clickup_create_space_tag: TAG_CREATED,
          clickup_add_tag_to_task: new Error("429 Too Many Requests"),
        },
        "RATE_LIMITED",
        ["time_estimate", "tag_create"],
        "tag_add",
      ],
    ];
    for (const [tagResponses, code, applied, failedStep] of cases) {
      const { transport, calls } = setup({
        clickup_get_task: task(LEAF),
        clickup_update_task: UPDATED,
        ...tagResponses,
      });
      const result = await estimate(transport);
      expect(result, failedStep).toEqual({
        ok: false,
        code,
        details: {
          verb: "task.estimate.set",
          partial: true,
          applied,
          failedStep,
          message: expect.any(String),
        },
      });
      // Never echoes the request (the estimate or the tag built from it).
      expect(JSON.stringify(result)).not.toContain("ideal");
      expect(tools(calls)[1]).toBe("clickup_update_task");
    }
  });

  it("a tag step failing after a remove succeeded is partial with applied [tag_remove]", async () => {
    // time_estimate already 120 minutes: the first write is the remove.
    const failedCreate = setup({
      clickup_get_task: task(LEAF, { time_estimate: 7_200_000, tags: tags("est:3") }),
      clickup_remove_tag_from_task: TAG_REMOVED,
      clickup_create_space_tag: { error: "Something went wrong" },
    });
    expect(await estimate(failedCreate.transport)).toMatchObject({
      ok: false,
      code: "MCP_ERROR",
      details: { partial: true, applied: ["tag_remove"], failedStep: "tag_create" },
    });
    expect(failedCreate.calls).toEqual([
      getTask("t000000002"),
      removeTag("t000000002", "est:3"),
      createTag("est:2-ideal-hours"),
    ]);

    // The second of two removes fails.
    const failedRemove = setup({
      clickup_get_task: task(LEAF, { time_estimate: 7_200_000, tags: tags("est:3", "est:5") }),
      clickup_remove_tag_from_task: (args: Record<string, unknown>) =>
        args.tag_name === "est:5" ? { error: "Something went wrong" } : TAG_REMOVED,
    });
    expect(await estimate(failedRemove.transport)).toMatchObject({
      ok: false,
      code: "MCP_ERROR",
      details: { partial: true, applied: ["tag_remove"], failedStep: "tag_remove" },
    });
  });

  it("a failure before anything was written is the plain classified failure", async () => {
    const failedWrite = setup({
      clickup_get_task: task(LEAF),
      clickup_update_task: new Error("401 Unauthorized"),
    });
    const write = await estimate(failedWrite.transport);
    expect(write).toEqual({
      ok: false,
      code: "AUTH_ERROR",
      details: { message: "401 Unauthorized" },
    });
    expect(failedWrite.calls).toEqual([
      getTask("t000000002"),
      update({ task_id: "t000000002", time_estimate: "120" }),
    ]);

    // Estimate already stored, no stale tag: the first write is create_space_tag.
    const failedTag = setup({
      clickup_get_task: task(LEAF, { time_estimate: 7_200_000 }),
      clickup_create_space_tag: { error: "Something went wrong" },
    });
    const tag = await estimate(failedTag.transport);
    expect(tag).toEqual({
      ok: false,
      code: "MCP_ERROR",
      details: { message: "Something went wrong" },
    });

    const notFound = setup({ clickup_get_task: { error: "Task not found" } });
    expect(await estimate(notFound.transport)).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(notFound.calls).toEqual([getTask("t000000002")]);
  });
});

describe("taskEstimateSet: validation", () => {
  it("ids are validated before any call", async () => {
    for (const taskId of ["", "   ", undefined, 42]) {
      const { transport, calls } = setup({});
      const result = await estimate(transport, { taskId: taskId as unknown as string });
      expect(result).toMatchObject({
        ok: false,
        code: "INVALID_REQUEST",
        details: { verb: "task.estimate.set", reason: "id_required", field: "taskId" },
      });
      expect(calls).toEqual([]);
    }
  });

  it("a read without tags, subtasks_count or space is a shape error and nothing is written", async () => {
    for (const read of [
      taskWithout(LEAF, "tags"),
      taskWithout(LEAF, "subtasks_count"),
      taskWithout(LEAF, "space"),
      task(LEAF, { tags: [{ tag_bg: "#000000" }] }), // an entry without a name
      task(LEAF, { subtasks_count: null }),
      task(LEAF, { space: null }),
    ]) {
      const { transport, calls } = setup({ clickup_get_task: read });
      const result = await estimate(transport);
      expect(result).toMatchObject({
        ok: false,
        code: "MCP_ERROR",
        details: { verb: "task.estimate.set" },
      });
      expect(calls).toEqual([getTask("t000000002")]);
    }
  });

  it("a normalization failure is INVALID_REQUEST with no call and no echo", async () => {
    const cases: Array<[ClickUpEstimationConfig, unknown]> = [
      [HOURS, "2h"],
      [{ strategy: "story_points", clickupTarget: "none" }, "three"],
      [{ strategy: "t_shirt", clickupTarget: "none", sizeMap: { M: 3 } }, "XXL"],
      [{ strategy: "three_point", clickupTarget: "none" }, 3],
    ];
    for (const [config, input] of cases) {
      const { transport, calls } = setup({}, config);
      const result = await estimate(transport, {
        config,
        input: input as ClickUpTaskEstimateSetRequest["input"],
      });
      expect(result, config.strategy).toMatchObject({
        ok: false,
        code: "INVALID_REQUEST",
        details: { verb: "task.estimate.set", reason: "invalid_estimate" },
      });
      expect(JSON.stringify(result)).not.toContain(String(input));
      expect(calls).toEqual([]);
    }
  });

  it("a non-positive, non-finite or unreadable time is INVALID_REQUEST with no call, whatever the target", async () => {
    for (const clickupTarget of ["time", "none"] as const) {
      for (const [strategy, input] of [
        ["ideal_hours", 0],
        ["ideal_hours", -2],
        ["ideal_hours", 1e-9], // "1e-9h"
        ["ideal_hours", Infinity],
        ["ideal_hours", NaN],
        ["ideal_days", 0.0001], // 0.036 minutes rounds to 0
      ] as const) {
        const config: ClickUpEstimationConfig = { strategy, clickupTarget };
        const { transport, calls } = setup({}, config);
        const result = await estimate(transport, { config, input });
        expect(result, `${strategy} ${input}`).toMatchObject({
          ok: false,
          code: "INVALID_REQUEST",
          details: { verb: "task.estimate.set", reason: "invalid_estimate" },
        });
        expect(calls).toEqual([]);
      }
    }
  });

  it("hoursPerDay outside 1–24 is INVALID_REQUEST with no call", async () => {
    for (const hoursPerDay of [0, 0.5, 25, NaN, "6"]) {
      const config = {
        strategy: "ideal_days",
        clickupTarget: "time",
        hoursPerDay,
      } as unknown as ClickUpEstimationConfig;
      const { transport, calls } = setup({}, config);
      const result = await estimate(transport, { config, input: 1 });
      expect(result, String(hoursPerDay)).toMatchObject({
        ok: false,
        code: "INVALID_REQUEST",
        details: { verb: "task.estimate.set", reason: "invalid_hours_per_day" },
      });
      expect(calls).toEqual([]);
    }
  });

  it("an estimate whose tag slug is empty is INVALID_REQUEST with no call", async () => {
    const config: ClickUpEstimationConfig = {
      strategy: "t_shirt",
      clickupTarget: "none",
      sizeMap: { 日本: 3 },
    };
    const { transport, calls } = setup({}, config);
    const result = await estimate(transport, { config, input: "日本" });
    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_REQUEST",
      details: { verb: "task.estimate.set", reason: "invalid_estimate" },
    });
    expect(calls).toEqual([]);
  });

  it("a request without an estimation config is INVALID_REQUEST with no call", async () => {
    const { transport, calls } = setup({});
    const result = await estimate(transport, {
      config: undefined as unknown as ClickUpEstimationConfig,
    });
    expect(result).toMatchObject({
      ok: false,
      code: "INVALID_REQUEST",
      details: { verb: "task.estimate.set", reason: "estimation_config_required" },
    });
    expect(calls).toEqual([]);
  });
});
