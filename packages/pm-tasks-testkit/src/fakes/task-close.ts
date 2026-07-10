import type { Task } from "../index.js";

export interface TaskCloseInput {
  cardId: string;
}

export interface TaskCloseOutput {
  ok: true;
}

export function createTaskCloseFake(
  store: Map<string, Task>,
): (input: TaskCloseInput) => Promise<TaskCloseOutput> {
  return async (input: TaskCloseInput): Promise<TaskCloseOutput> => {
    const task = store.get(input.cardId);
    if (!task) {
      throw new Error(`task.close: task "${input.cardId}" not found`);
    }
    task.closed = true;
    return { ok: true };
  };
}
