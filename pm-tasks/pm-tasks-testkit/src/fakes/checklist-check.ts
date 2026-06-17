import type { Task } from "../index.js";

export interface ChecklistCheckInput {
  cardId: string;
  itemId: string;
  state: boolean;
}

export interface ChecklistCheckOutput {
  ok: true;
}

export function createChecklistCheckFake(
  store: Map<string, Task>,
): (input: ChecklistCheckInput) => Promise<ChecklistCheckOutput> {
  return async (input: ChecklistCheckInput): Promise<ChecklistCheckOutput> => {
    const task = store.get(input.cardId);
    if (!task) {
      throw new Error(`checklist.check: task "${input.cardId}" not found`);
    }
    const item = task.checklist.find((i) => i.id === input.itemId);
    if (!item) {
      throw new Error(
        `checklist.check: item "${input.itemId}" not found in task "${input.cardId}"`,
      );
    }
    item.checked = input.state;
    return { ok: true };
  };
}
