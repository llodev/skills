import { describe, it, expect, beforeEach } from "vitest";
import { createFakeAdapter } from "../src/index.js";
import type { FakeAdapter } from "../src/index.js";

describe("pm-tasks-testkit", () => {
  let adapter: FakeAdapter;

  beforeEach(() => {
    adapter = createFakeAdapter({
      idGenerator: (() => {
        let n = 0;
        return () => `t${++n}`;
      })(),
      clock: () => "2026-06-17T00:00:00.000Z",
    });
  });

  // --- task.create ---
  it("task.create stores task with expected shape", async () => {
    const result = await adapter["task.create"]({ title: "Fix bug", description: "details" });
    expect(result.ok).toBe(true);
    expect(result.ref.id).toBe("t1");
    expect(result.ref.alias).toBeNull();
    expect(result.details.title).toBe("Fix bug");
    expect(result.details.list).toBe("open");
    expect(result.details.closed).toBe(false);
    expect(result.details.assignees).toEqual([]);
    expect(result.details.dueAt).toBeNull();
  });

  it("task.create respects custom list", async () => {
    const result = await adapter["task.create"]({ title: "Task", list: "wip" });
    expect(result.details.list).toBe("wip");
  });

  // --- task.move ---
  it("task.move changes list without setting closed", async () => {
    const created = await adapter["task.create"]({ title: "Move me" });
    const id = created.ref.id;
    await adapter["task.move"]({ cardId: id, targetList: "done" });
    const task = adapter.getTask(id)!;
    expect(task.list).toBe("done");
    expect(task.closed).toBe(false);
  });

  // --- task.close ---
  it("task.close sets closed without changing list", async () => {
    const created = await adapter["task.create"]({ title: "Close me", list: "wip" });
    const id = created.ref.id;
    await adapter["task.close"]({ cardId: id });
    const task = adapter.getTask(id)!;
    expect(task.closed).toBe(true);
    expect(task.list).toBe("wip");
  });

  // --- task.comment.add ---
  it("task.comment.add appends comment with id and deterministic ts", async () => {
    const created = await adapter["task.create"]({ title: "Commented task" });
    const id = created.ref.id;
    const result = await adapter["task.comment.add"]({ cardId: id, text: "Looks good" });
    expect(result.ok).toBe(true);
    expect(result.commentId).toBeTruthy();
    const task = adapter.getTask(id)!;
    expect(task.comments).toHaveLength(1);
    expect(task.comments[0].text).toBe("Looks good");
    expect(task.comments[0].ts).toBe("2026-06-17T00:00:00.000Z");
  });

  // --- task.due-date.set ---
  it("task.due-date.set sets dueAt field", async () => {
    const created = await adapter["task.create"]({ title: "Due task" });
    const id = created.ref.id;
    await adapter["task.due-date.set"]({ cardId: id, dueAt: "2026-07-01T00:00:00.000Z" });
    const task = adapter.getTask(id)!;
    expect(task.dueAt).toBe("2026-07-01T00:00:00.000Z");
  });

  it("task.due-date.set can clear dueAt to null", async () => {
    const created = await adapter["task.create"]({ title: "Clear due" });
    const id = created.ref.id;
    await adapter["task.due-date.set"]({ cardId: id, dueAt: "2026-07-01T00:00:00.000Z" });
    await adapter["task.due-date.set"]({ cardId: id, dueAt: null });
    expect(adapter.getTask(id)!.dueAt).toBeNull();
  });

  // --- task.assignee.add ---
  it("task.assignee.add adds assignee", async () => {
    const created = await adapter["task.create"]({ title: "Assign me" });
    const id = created.ref.id;
    await adapter["task.assignee.add"]({ cardId: id, assignee: "alice" });
    expect(adapter.getTask(id)!.assignees).toEqual(["alice"]);
  });

  it("task.assignee.add is idempotent — no duplicates on double add", async () => {
    const created = await adapter["task.create"]({ title: "Idempotent assign" });
    const id = created.ref.id;
    await adapter["task.assignee.add"]({ cardId: id, assignee: "bob" });
    await adapter["task.assignee.add"]({ cardId: id, assignee: "bob" });
    expect(adapter.getTask(id)!.assignees).toEqual(["bob"]);
  });

  // --- checklist.check ---
  it("checklist.check toggles item checked state", async () => {
    const created = await adapter["task.create"]({ title: "Checklist task" });
    const id = created.ref.id;
    // Manually insert a checklist item via store inspection
    const task = adapter.getTask(id)!;
    task.checklist.push({ id: "item-1", text: "Step 1", checked: false });

    await adapter["checklist.check"]({ cardId: id, itemId: "item-1", state: true });
    expect(adapter.getTask(id)!.checklist[0].checked).toBe(true);

    await adapter["checklist.check"]({ cardId: id, itemId: "item-1", state: false });
    expect(adapter.getTask(id)!.checklist[0].checked).toBe(false);
  });

  // --- introspection ---
  it("getAllTasks returns all stored tasks", async () => {
    await adapter["task.create"]({ title: "A" });
    await adapter["task.create"]({ title: "B" });
    expect(adapter.getAllTasks()).toHaveLength(2);
  });

  it("reset clears all tasks", async () => {
    await adapter["task.create"]({ title: "Gone" });
    adapter.reset();
    expect(adapter.getAllTasks()).toHaveLength(0);
  });

  // --- injection ---
  it("idGenerator injection produces deterministic ids", async () => {
    let n = 0;
    const a = createFakeAdapter({ idGenerator: () => `custom-${++n}` });
    const r = await a["task.create"]({ title: "X" });
    expect(r.ref.id).toBe("custom-1");
  });

  it("clock injection produces deterministic comment timestamps", async () => {
    const ts = "2099-01-01T00:00:00.000Z";
    const a = createFakeAdapter({ clock: () => ts });
    const r1 = await a["task.create"]({ title: "Y" });
    await a["task.comment.add"]({ cardId: r1.ref.id, text: "hi" });
    expect(a.getTask(r1.ref.id)!.comments[0].ts).toBe(ts);
  });
});
