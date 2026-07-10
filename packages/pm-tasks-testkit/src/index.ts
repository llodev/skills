import { createTaskCreateFake } from "./fakes/task-create.js";
import { createTaskMoveFake } from "./fakes/task-move.js";
import { createTaskCloseFake } from "./fakes/task-close.js";
import { createTaskCommentAddFake } from "./fakes/task-comment-add.js";
import { createTaskDueDateSetFake } from "./fakes/task-due-date-set.js";
import { createTaskAssigneeAddFake } from "./fakes/task-assignee-add.js";
import { createChecklistCheckFake } from "./fakes/checklist-check.js";

export type { TaskCreateInput, TaskCreateOutput } from "./fakes/task-create.js";
export type { TaskMoveInput, TaskMoveOutput } from "./fakes/task-move.js";
export type { TaskCloseInput, TaskCloseOutput } from "./fakes/task-close.js";
export type { TaskCommentAddInput, TaskCommentAddOutput } from "./fakes/task-comment-add.js";
export type { TaskDueDateSetInput, TaskDueDateSetOutput } from "./fakes/task-due-date-set.js";
export type { TaskAssigneeAddInput, TaskAssigneeAddOutput } from "./fakes/task-assignee-add.js";
export type { ChecklistCheckInput, ChecklistCheckOutput } from "./fakes/checklist-check.js";

export interface Task {
  id: string;
  title?: string;
  description?: string;
  /** Current list/state (e.g. "open", "wip", "done", or a raw list id) */
  list: string;
  closed: boolean;
  assignees: string[];
  comments: Array<{ id: string; text: string; ts: string }>;
  checklist: Array<{ id: string; text: string; checked: boolean }>;
  dueAt: string | null;
  meta: Record<string, unknown>;
}

export interface FakeAdapterOptions {
  /** Override the default incrementing id generator */
  idGenerator?: () => string;
  /** Override the default clock (returns ISO timestamp string) */
  clock?: () => string;
}

export interface FakeAdapter {
  "task.create": (
    input: import("./fakes/task-create.js").TaskCreateInput,
  ) => Promise<import("./fakes/task-create.js").TaskCreateOutput>;
  "task.move": (
    input: import("./fakes/task-move.js").TaskMoveInput,
  ) => Promise<import("./fakes/task-move.js").TaskMoveOutput>;
  "task.close": (
    input: import("./fakes/task-close.js").TaskCloseInput,
  ) => Promise<import("./fakes/task-close.js").TaskCloseOutput>;
  "task.comment.add": (
    input: import("./fakes/task-comment-add.js").TaskCommentAddInput,
  ) => Promise<import("./fakes/task-comment-add.js").TaskCommentAddOutput>;
  "task.due-date.set": (
    input: import("./fakes/task-due-date-set.js").TaskDueDateSetInput,
  ) => Promise<import("./fakes/task-due-date-set.js").TaskDueDateSetOutput>;
  "task.assignee.add": (
    input: import("./fakes/task-assignee-add.js").TaskAssigneeAddInput,
  ) => Promise<import("./fakes/task-assignee-add.js").TaskAssigneeAddOutput>;
  "checklist.check": (
    input: import("./fakes/checklist-check.js").ChecklistCheckInput,
  ) => Promise<import("./fakes/checklist-check.js").ChecklistCheckOutput>;
  /** Inspect a single task by id */
  getTask: (id: string) => Task | undefined;
  /** Return all stored tasks */
  getAllTasks: () => Task[];
  /** Clear all stored tasks (use between tests) */
  reset: () => void;
}

export function createFakeAdapter(opts?: FakeAdapterOptions): FakeAdapter {
  const store = new Map<string, Task>();
  let counter = 0;
  const defaultIdGen = (): string => `fake-${++counter}`;
  const defaultClock = (): string => new Date().toISOString();
  const idGen = opts?.idGenerator ?? defaultIdGen;
  const clock = opts?.clock ?? defaultClock;

  return {
    "task.create": createTaskCreateFake(store, idGen),
    "task.move": createTaskMoveFake(store),
    "task.close": createTaskCloseFake(store),
    "task.comment.add": createTaskCommentAddFake(store, idGen, clock),
    "task.due-date.set": createTaskDueDateSetFake(store),
    "task.assignee.add": createTaskAssigneeAddFake(store),
    "checklist.check": createChecklistCheckFake(store),
    getTask: (id: string) => store.get(id),
    getAllTasks: () => Array.from(store.values()),
    reset: () => store.clear(),
  };
}
