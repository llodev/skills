import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  onTaskStart,
  onTaskComplete,
  __resetHookCacheForTests,
  type HookResult,
} from "../../src/plan-execution/hooks.js";
import type { Runtime, TransportResult } from "../../src/runtime/index.js";

// ---------------------------------------------------------------------------
// Mock adapter factory
// ---------------------------------------------------------------------------

interface CallRecord {
  verb: string;
  req: unknown;
}

function createMockAdapter(): {
  adapter: Runtime;
  calls: CallRecord[];
  responses: {
    taskCreate: TransportResult<Record<string, unknown>>[];
    taskMove: TransportResult<Record<string, unknown>>[];
    checklistCheck: TransportResult<Record<string, unknown>>[];
    taskClose: TransportResult<Record<string, unknown>>[];
    taskDueDateSet: TransportResult<Record<string, unknown>>[];
    taskAssigneeAdd: TransportResult<Record<string, unknown>>[];
    taskCommentAdd: TransportResult<Record<string, unknown>>[];
  };
  throwOnNextCall: Set<string>;
} {
  const calls: CallRecord[] = [];
  const responses = {
    taskCreate: [] as TransportResult<Record<string, unknown>>[],
    taskMove: [] as TransportResult<Record<string, unknown>>[],
    checklistCheck: [] as TransportResult<Record<string, unknown>>[],
    taskClose: [] as TransportResult<Record<string, unknown>>[],
    taskDueDateSet: [] as TransportResult<Record<string, unknown>>[],
    taskAssigneeAdd: [] as TransportResult<Record<string, unknown>>[],
    taskCommentAdd: [] as TransportResult<Record<string, unknown>>[],
  };
  const throwOnNextCall = new Set<string>();

  const adapter: Runtime = {
    async taskCreate(req) {
      calls.push({ verb: "task.create", req });
      if (throwOnNextCall.has("task.create")) {
        throwOnNextCall.delete("task.create");
        throw new Error("transport blew up");
      }
      return (
        responses.taskCreate.shift() || {
          ok: true,
          data: { taskId: "mock-task-id" },
        }
      );
    },
    async taskMove(req) {
      calls.push({ verb: "task.move", req });
      if (throwOnNextCall.has("task.move")) {
        throwOnNextCall.delete("task.move");
        throw new Error("transport blew up");
      }
      return (
        responses.taskMove.shift() || {
          ok: true,
          data: {
            previousListOrSectionId: "prev-list",
            newListOrSectionId: "new-list",
          },
        }
      );
    },
    async checklistCheck(req) {
      calls.push({ verb: "checklist.check", req });
      if (throwOnNextCall.has("checklist.check")) {
        throwOnNextCall.delete("checklist.check");
        throw new Error("transport blew up");
      }
      return (
        responses.checklistCheck.shift() || {
          ok: true,
          data: { itemId: "item-id" },
        }
      );
    },
    async taskClose(req) {
      calls.push({ verb: "task.close", req });
      if (throwOnNextCall.has("task.close")) {
        throwOnNextCall.delete("task.close");
        throw new Error("transport blew up");
      }
      return (
        responses.taskClose.shift() || {
          ok: true,
          data: { taskId: req.taskId },
        }
      );
    },
    async taskDueDateSet(req) {
      calls.push({ verb: "task.due-date.set", req });
      if (throwOnNextCall.has("task.due-date.set")) {
        throwOnNextCall.delete("task.due-date.set");
        throw new Error("transport blew up");
      }
      return (
        responses.taskDueDateSet.shift() || {
          ok: true,
          data: { taskId: req.taskId },
        }
      );
    },
    async taskAssigneeAdd(req) {
      calls.push({ verb: "task.assignee.add", req });
      if (throwOnNextCall.has("task.assignee.add")) {
        throwOnNextCall.delete("task.assignee.add");
        throw new Error("transport blew up");
      }
      return (
        responses.taskAssigneeAdd.shift() || {
          ok: true,
          data: { assigneeId: "assignee-id" },
        }
      );
    },
    async taskCommentAdd(req) {
      calls.push({ verb: "task.comment.add", req });
      if (throwOnNextCall.has("task.comment.add")) {
        throwOnNextCall.delete("task.comment.add");
        throw new Error("transport blew up");
      }
      return (
        responses.taskCommentAdd.shift() || {
          ok: true,
          data: { commentId: "comment-id" },
        }
      );
    },
  };

  return { adapter, calls, responses, throwOnNextCall };
}

// ---------------------------------------------------------------------------
// Test setup/teardown
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(tmpdir(), "plan-execution-hooks-"));
  __resetHookCacheForTests();
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// onTaskStart tests
// ---------------------------------------------------------------------------

describe("onTaskStart", () => {
  it("happy path: moves to listsWipId", async () => {
    const { adapter, calls, responses } = createMockAdapter();
    responses.taskMove = [
      {
        ok: true,
        data: {
          previousListOrSectionId: "todo",
          newListOrSectionId: "wip-list-1",
        },
      },
    ];

    const result = await onTaskStart({
      adapter,
      task: { id: "task-123", listsWipId: "wip-list-1" },
    });

    expect(result).toEqual({
      ok: true,
      performed: ["task.move"],
      skipped: [],
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({
      verb: "task.move",
      req: { taskId: "task-123", targetListOrSectionId: "wip-list-1" },
    });
  });

  it("ALREADY_IN_STATE: card already in wip list", async () => {
    const { adapter, calls, responses } = createMockAdapter();
    responses.taskMove = [
      {
        ok: false,
        code: "ALREADY_IN_STATE",
      },
    ];

    const result = await onTaskStart({
      adapter,
      task: { id: "task-123", listsWipId: "wip-list-1" },
    });

    expect(result).toEqual({
      ok: true,
      performed: [],
      skipped: ["task.move"],
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].verb).toBe("task.move");
  });

  it("missing listsWipId + full audit context: emits WARN entry", async () => {
    const { adapter, calls } = createMockAdapter();
    const auditLogPath = path.join(tmpDir, "audit.jsonl");

    const result = await onTaskStart({
      adapter,
      task: { id: "task-123" },
      auditLogPath,
      tool: "trello",
      session: "sess-abc",
    });

    expect(result).toEqual({
      ok: true,
      performed: [],
      skipped: ["task.move"],
    });
    expect(calls).toHaveLength(0);

    const logContent = await readFile(auditLogPath, "utf8");
    const line = logContent.trim();
    const entry = JSON.parse(line);

    expect(entry).toMatchObject({
      verb: "plan-execution.on-task-start",
      level: "warn",
      reason: "MISSING_WIP_LIST",
      ok: true,
      tool: "trello",
      session: "sess-abc",
      id: "task-123",
    });
    expect(entry.ts).toBeDefined();
  });

  it("missing listsWipId + no audit context: silent no-op (no audit write)", async () => {
    const { adapter, calls } = createMockAdapter();

    const result = await onTaskStart({
      adapter,
      task: { id: "task-123" },
    });

    expect(result).toEqual({
      ok: true,
      performed: [],
      skipped: ["task.move"],
    });
    expect(calls).toHaveLength(0);

    const auditLogPath = path.join(tmpDir, "audit.jsonl");
    let error: unknown;
    try {
      await access(auditLogPath);
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    const nodeError = error as NodeJS.ErrnoException;
    expect(nodeError.code).toBe("ENOENT");
  });

  it("hard transport failure (non-ALREADY_IN_STATE): ok flips to false", async () => {
    const { adapter, calls, responses } = createMockAdapter();
    responses.taskMove = [
      {
        ok: false,
        code: "RATE_LIMITED",
      },
    ];

    const result = await onTaskStart({
      adapter,
      task: { id: "task-123", listsWipId: "wip-list-1" },
    });

    expect(result).toEqual({
      ok: false,
      performed: [],
      skipped: ["task.move"],
    });
    expect(calls).toHaveLength(1);
  });

  it("transport throws: safeCall catches → ok false, never throws", async () => {
    const { adapter, calls, throwOnNextCall } = createMockAdapter();
    throwOnNextCall.add("task.move");

    let thrown = false;
    let result: HookResult | undefined;
    try {
      result = await onTaskStart({
        adapter,
        task: { id: "task-123", listsWipId: "wip-list-1" },
      });
    } catch {
      thrown = true;
    }

    expect(thrown).toBe(false);
    expect(result).toEqual({
      ok: false,
      performed: [],
      skipped: ["task.move"],
    });
    expect(calls).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// onTaskComplete tests
// ---------------------------------------------------------------------------

describe("onTaskComplete", () => {
  it("happy path with checklist: all 4 verbs dispatched in order, performed has all 4", async () => {
    const { adapter, calls, responses } = createMockAdapter();
    responses.checklistCheck = [{ ok: true, data: { itemId: "item-1" } }];
    responses.taskMove = [
      {
        ok: true,
        data: {
          previousListOrSectionId: "wip",
          newListOrSectionId: "done",
        },
      },
    ];
    responses.taskCommentAdd = [{ ok: true, data: { commentId: "cmt-1" } }];
    responses.taskClose = [{ ok: true, data: { taskId: "task-123" } }];

    const result = await onTaskComplete({
      adapter,
      task: {
        id: "task-123",
        listsDoneId: "done-list",
        checklistId: "chk-1",
        checklistItemId: "item-1",
      },
      commitSha: "abc1234",
      branch: "v1.9.0",
    });

    expect(result).toEqual({
      ok: true,
      performed: ["checklist.check", "task.move", "task.comment.add", "task.close"],
      skipped: [],
    });
    expect(calls.map((c) => c.verb)).toEqual([
      "checklist.check",
      "task.move",
      "task.comment.add",
      "task.close",
    ]);

    const commentCall = calls[2];
    expect(commentCall.req).toMatchObject({
      text: "Completed at abc1234 on v1.9.0",
      clientToken: "abc1234",
    });
  });

  it("happy path without branch: text omits branch suffix", async () => {
    const { adapter, calls, responses } = createMockAdapter();
    responses.checklistCheck = [{ ok: true, data: { itemId: "item-1" } }];
    responses.taskMove = [
      { ok: true, data: { previousListOrSectionId: "wip", newListOrSectionId: "done" } },
    ];
    responses.taskCommentAdd = [{ ok: true, data: { commentId: "cmt-1" } }];
    responses.taskClose = [{ ok: true, data: { taskId: "task-123" } }];

    const result = await onTaskComplete({
      adapter,
      task: {
        id: "task-123",
        listsDoneId: "done-list",
        checklistId: "chk-1",
        checklistItemId: "item-1",
      },
      commitSha: "abc1234",
    });

    expect(result.ok).toBe(true);
    const commentCall = calls[2];
    expect((commentCall.req as Record<string, unknown>).text).toBe("Completed at abc1234");
  });

  it("checklist fields absent: checklist.check step skipped, NOT dispatched", async () => {
    const { adapter, calls, responses } = createMockAdapter();
    responses.taskMove = [
      { ok: true, data: { previousListOrSectionId: "wip", newListOrSectionId: "done" } },
    ];
    responses.taskCommentAdd = [{ ok: true, data: { commentId: "cmt-1" } }];
    responses.taskClose = [{ ok: true, data: { taskId: "task-123" } }];

    const result = await onTaskComplete({
      adapter,
      task: {
        id: "task-123",
        listsDoneId: "done-list",
      },
      commitSha: "abc1234",
    });

    expect(result).toEqual({
      ok: true,
      performed: ["task.move", "task.comment.add", "task.close"],
      skipped: ["checklist.check"],
    });
    expect(calls.map((c) => c.verb)).toEqual(["task.move", "task.comment.add", "task.close"]);
  });

  it("ALL verbs return ALREADY_IN_STATE: ok stays true, all 4 in skipped, calls all dispatched", async () => {
    const { adapter, calls, responses } = createMockAdapter();
    responses.checklistCheck = [{ ok: false, code: "ALREADY_IN_STATE" }];
    responses.taskMove = [{ ok: false, code: "ALREADY_IN_STATE" }];
    responses.taskCommentAdd = [{ ok: false, code: "ALREADY_IN_STATE" }];
    responses.taskClose = [{ ok: false, code: "ALREADY_IN_STATE" }];

    const result = await onTaskComplete({
      adapter,
      task: {
        id: "task-123",
        listsDoneId: "done-list",
        checklistId: "chk-1",
        checklistItemId: "item-1",
      },
      commitSha: "abc1234",
    });

    expect(result).toEqual({
      ok: true,
      performed: [],
      skipped: ["checklist.check", "task.move", "task.comment.add", "task.close"],
    });
    expect(calls).toHaveLength(4);
  });

  it("best-effort dispatch: one verb fails, subsequent ones still run", async () => {
    const { adapter, calls, responses } = createMockAdapter();
    responses.checklistCheck = [{ ok: true, data: { itemId: "item-1" } }];
    responses.taskMove = [{ ok: false, code: "RATE_LIMITED" }];
    responses.taskCommentAdd = [{ ok: true, data: { commentId: "cmt-1" } }];
    responses.taskClose = [{ ok: true, data: { taskId: "task-123" } }];

    const result = await onTaskComplete({
      adapter,
      task: {
        id: "task-123",
        listsDoneId: "done-list",
        checklistId: "chk-1",
        checklistItemId: "item-1",
      },
      commitSha: "abc1234",
    });

    expect(result.ok).toBe(false);
    expect(result.performed).toContain("checklist.check");
    expect(result.performed).toContain("task.comment.add");
    expect(result.performed).toContain("task.close");
    expect(result.skipped).toContain("task.move");
    expect(calls).toHaveLength(4);
  });

  it("safeCall: thrown exception classified as failure, sequence continues", async () => {
    const { adapter, calls, responses, throwOnNextCall } = createMockAdapter();
    responses.checklistCheck = [{ ok: true, data: { itemId: "item-1" } }];
    responses.taskMove = [
      { ok: true, data: { previousListOrSectionId: "wip", newListOrSectionId: "done" } },
    ];
    throwOnNextCall.add("task.comment.add");
    responses.taskClose = [{ ok: true, data: { taskId: "task-123" } }];

    let thrown = false;
    let result: HookResult | undefined;
    try {
      result = await onTaskComplete({
        adapter,
        task: {
          id: "task-123",
          listsDoneId: "done-list",
          checklistId: "chk-1",
          checklistItemId: "item-1",
        },
        commitSha: "abc1234",
      });
    } catch {
      thrown = true;
    }

    expect(thrown).toBe(false);
    expect(result?.ok).toBe(false);
    expect(result?.performed).toContain("checklist.check");
    expect(result?.performed).toContain("task.move");
    expect(result?.performed).toContain("task.close");
    expect(result?.skipped).toContain("task.comment.add");
    expect(calls).toHaveLength(4);
  });

  it("idempotency: first call success, second call no-op", async () => {
    const { adapter, calls, responses } = createMockAdapter();
    responses.checklistCheck = [{ ok: true, data: { itemId: "item-1" } }];
    responses.taskMove = [
      { ok: true, data: { previousListOrSectionId: "wip", newListOrSectionId: "done" } },
    ];
    responses.taskCommentAdd = [{ ok: true, data: { commentId: "cmt-1" } }];
    responses.taskClose = [{ ok: true, data: { taskId: "task-123" } }];

    const result1 = await onTaskComplete({
      adapter,
      task: {
        id: "card-1",
        listsDoneId: "done-list",
        checklistId: "chk-1",
        checklistItemId: "item-1",
      },
      commitSha: "abc",
    });

    expect(result1.ok).toBe(true);
    expect(result1.performed).toContain("checklist.check");
    expect(result1.performed).toContain("task.move");
    expect(result1.performed).toContain("task.comment.add");
    expect(result1.performed).toContain("task.close");

    const result2 = await onTaskComplete({
      adapter,
      task: {
        id: "card-1",
        listsDoneId: "done-list",
        checklistId: "chk-1",
        checklistItemId: "item-1",
      },
      commitSha: "abc",
    });

    expect(result2).toEqual({
      ok: true,
      performed: [],
      skipped: ["checklist.check", "task.move", "task.comment.add", "task.close"],
    });
    expect(calls).toHaveLength(4);
  });

  it("idempotency: different commitSha is NOT a no-op", async () => {
    const { adapter, calls, responses } = createMockAdapter();
    responses.checklistCheck = [
      { ok: true, data: { itemId: "item-1" } },
      { ok: true, data: { itemId: "item-1" } },
    ];
    responses.taskMove = [
      { ok: true, data: { previousListOrSectionId: "wip", newListOrSectionId: "done" } },
      { ok: true, data: { previousListOrSectionId: "wip", newListOrSectionId: "done" } },
    ];
    responses.taskCommentAdd = [
      { ok: true, data: { commentId: "cmt-1" } },
      { ok: true, data: { commentId: "cmt-2" } },
    ];
    responses.taskClose = [
      { ok: true, data: { taskId: "task-123" } },
      { ok: true, data: { taskId: "task-123" } },
    ];

    await onTaskComplete({
      adapter,
      task: {
        id: "card-1",
        listsDoneId: "done-list",
        checklistId: "chk-1",
        checklistItemId: "item-1",
      },
      commitSha: "abc",
    });

    const result2 = await onTaskComplete({
      adapter,
      task: {
        id: "card-1",
        listsDoneId: "done-list",
        checklistId: "chk-1",
        checklistItemId: "item-1",
      },
      commitSha: "def",
    });

    expect(result2.performed).toContain("checklist.check");
    expect(result2.performed).toContain("task.move");
    expect(result2.performed).toContain("task.comment.add");
    expect(result2.performed).toContain("task.close");
    expect(calls).toHaveLength(8);
  });

  it("idempotency: different task.id is NOT a no-op", async () => {
    const { adapter, calls, responses } = createMockAdapter();
    responses.checklistCheck = [
      { ok: true, data: { itemId: "item-1" } },
      { ok: true, data: { itemId: "item-1" } },
    ];
    responses.taskMove = [
      { ok: true, data: { previousListOrSectionId: "wip", newListOrSectionId: "done" } },
      { ok: true, data: { previousListOrSectionId: "wip", newListOrSectionId: "done" } },
    ];
    responses.taskCommentAdd = [
      { ok: true, data: { commentId: "cmt-1" } },
      { ok: true, data: { commentId: "cmt-2" } },
    ];
    responses.taskClose = [
      { ok: true, data: { taskId: "task-123" } },
      { ok: true, data: { taskId: "task-456" } },
    ];

    await onTaskComplete({
      adapter,
      task: {
        id: "card-1",
        listsDoneId: "done-list",
        checklistId: "chk-1",
        checklistItemId: "item-1",
      },
      commitSha: "abc",
    });

    const result2 = await onTaskComplete({
      adapter,
      task: {
        id: "card-2",
        listsDoneId: "done-list",
        checklistId: "chk-1",
        checklistItemId: "item-1",
      },
      commitSha: "abc",
    });

    expect(result2.performed).toContain("checklist.check");
    expect(result2.performed).toContain("task.move");
    expect(result2.performed).toContain("task.comment.add");
    expect(result2.performed).toContain("task.close");
    expect(calls).toHaveLength(8);
  });

  it("idempotency: failed first call leaves memo unset, retry re-attempts", async () => {
    const { adapter, calls, responses } = createMockAdapter();
    responses.checklistCheck = [
      { ok: true, data: { itemId: "item-1" } },
      { ok: true, data: { itemId: "item-1" } },
    ];
    responses.taskMove = [
      { ok: false, code: "RATE_LIMITED" },
      { ok: true, data: { previousListOrSectionId: "wip", newListOrSectionId: "done" } },
    ];
    responses.taskCommentAdd = [
      { ok: true, data: { commentId: "cmt-1" } },
      { ok: true, data: { commentId: "cmt-2" } },
    ];
    responses.taskClose = [
      { ok: true, data: { taskId: "task-123" } },
      { ok: true, data: { taskId: "task-123" } },
    ];

    const result1 = await onTaskComplete({
      adapter,
      task: {
        id: "card-1",
        listsDoneId: "done-list",
        checklistId: "chk-1",
        checklistItemId: "item-1",
      },
      commitSha: "abc",
    });

    expect(result1.ok).toBe(false);

    const result2 = await onTaskComplete({
      adapter,
      task: {
        id: "card-1",
        listsDoneId: "done-list",
        checklistId: "chk-1",
        checklistItemId: "item-1",
      },
      commitSha: "abc",
    });

    expect(result2.ok).toBe(true);
    expect(result2.performed).toContain("checklist.check");
    expect(result2.performed).toContain("task.move");
    expect(result2.performed).toContain("task.comment.add");
    expect(result2.performed).toContain("task.close");
    expect(calls).toHaveLength(8);
  });

  it("__resetHookCacheForTests actually clears the memo", async () => {
    const { adapter, calls, responses } = createMockAdapter();
    responses.checklistCheck = [
      { ok: true, data: { itemId: "item-1" } },
      { ok: true, data: { itemId: "item-1" } },
    ];
    responses.taskMove = [
      { ok: true, data: { previousListOrSectionId: "wip", newListOrSectionId: "done" } },
      { ok: true, data: { previousListOrSectionId: "wip", newListOrSectionId: "done" } },
    ];
    responses.taskCommentAdd = [
      { ok: true, data: { commentId: "cmt-1" } },
      { ok: true, data: { commentId: "cmt-2" } },
    ];
    responses.taskClose = [
      { ok: true, data: { taskId: "task-123" } },
      { ok: true, data: { taskId: "task-123" } },
    ];

    const result1 = await onTaskComplete({
      adapter,
      task: {
        id: "card-1",
        listsDoneId: "done-list",
        checklistId: "chk-1",
        checklistItemId: "item-1",
      },
      commitSha: "abc",
    });

    expect(result1.ok).toBe(true);

    __resetHookCacheForTests();

    const result2 = await onTaskComplete({
      adapter,
      task: {
        id: "card-1",
        listsDoneId: "done-list",
        checklistId: "chk-1",
        checklistItemId: "item-1",
      },
      commitSha: "abc",
    });

    expect(result2.performed).toContain("checklist.check");
    expect(result2.performed).toContain("task.move");
    expect(result2.performed).toContain("task.comment.add");
    expect(result2.performed).toContain("task.close");
    expect(calls).toHaveLength(8);
  });
});
