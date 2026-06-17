import type { Task } from "../index.js";

export interface TaskCommentAddInput {
  cardId: string;
  text: string;
}

export interface TaskCommentAddOutput {
  ok: true;
  commentId: string;
}

export function createTaskCommentAddFake(
  store: Map<string, Task>,
  idGen: () => string,
  clock: () => string,
): (input: TaskCommentAddInput) => Promise<TaskCommentAddOutput> {
  return async (input: TaskCommentAddInput): Promise<TaskCommentAddOutput> => {
    const task = store.get(input.cardId);
    if (!task) {
      throw new Error(`task.comment.add: task "${input.cardId}" not found`);
    }
    const commentId = idGen();
    task.comments.push({ id: commentId, text: input.text, ts: clock() });
    return { ok: true, commentId };
  };
}
