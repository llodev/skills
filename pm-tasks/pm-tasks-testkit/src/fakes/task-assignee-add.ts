import type { Task } from "../index.js";

export interface TaskAssigneeAddInput {
  cardId: string;
  assignee: string;
}

export interface TaskAssigneeAddOutput {
  ok: true;
}

export function createTaskAssigneeAddFake(
  store: Map<string, Task>,
): (input: TaskAssigneeAddInput) => Promise<TaskAssigneeAddOutput> {
  return async (input: TaskAssigneeAddInput): Promise<TaskAssigneeAddOutput> => {
    const task = store.get(input.cardId);
    if (!task) {
      throw new Error(`task.assignee.add: task "${input.cardId}" not found`);
    }
    if (!task.assignees.includes(input.assignee)) {
      task.assignees.push(input.assignee);
    }
    return { ok: true };
  };
}
