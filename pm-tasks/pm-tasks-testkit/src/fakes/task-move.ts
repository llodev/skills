import type { Task } from "../index.js";

export interface TaskMoveInput {
  cardId: string;
  targetList: string;
}

export interface TaskMoveOutput {
  ok: true;
  verb: "task.move";
  cardId: string;
  targetList: string;
}

export function createTaskMoveFake(
  store: Map<string, Task>,
): (input: TaskMoveInput) => Promise<TaskMoveOutput> {
  return async (input: TaskMoveInput): Promise<TaskMoveOutput> => {
    const task = store.get(input.cardId);
    if (!task) {
      throw new Error(`task.move: task "${input.cardId}" not found`);
    }
    task.list = input.targetList;
    return { ok: true, verb: "task.move", cardId: input.cardId, targetList: input.targetList };
  };
}
