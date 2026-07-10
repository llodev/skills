import type { Task } from "../index.js";

export interface TaskDueDateSetInput {
  cardId: string;
  dueAt: string | null;
}

export interface TaskDueDateSetOutput {
  ok: true;
}

export function createTaskDueDateSetFake(
  store: Map<string, Task>,
): (input: TaskDueDateSetInput) => Promise<TaskDueDateSetOutput> {
  return async (input: TaskDueDateSetInput): Promise<TaskDueDateSetOutput> => {
    const task = store.get(input.cardId);
    if (!task) {
      throw new Error(`task.due-date.set: task "${input.cardId}" not found`);
    }
    task.dueAt = input.dueAt;
    return { ok: true };
  };
}
