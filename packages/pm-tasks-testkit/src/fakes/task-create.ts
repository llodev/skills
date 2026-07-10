import type { Task } from "../index.js";

export interface TaskCreateInput {
  title: string;
  description?: string;
  list?: string;
  [key: string]: unknown;
}

export interface TaskCreateOutput {
  ok: true;
  ref: { id: string; alias: null };
  details: Task;
}

export function createTaskCreateFake(
  store: Map<string, Task>,
  idGen: () => string,
): (input: TaskCreateInput) => Promise<TaskCreateOutput> {
  return async (input: TaskCreateInput): Promise<TaskCreateOutput> => {
    const { title, description, list, ...rest } = input;
    const id = idGen();
    const task: Task = {
      id,
      title,
      description,
      list: list ?? "open",
      closed: false,
      assignees: [],
      comments: [],
      checklist: [],
      dueAt: null,
      meta: rest,
    };
    store.set(id, task);
    return { ok: true, ref: { id, alias: null }, details: task };
  };
}
