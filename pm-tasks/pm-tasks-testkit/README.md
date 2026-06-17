# @llodev/pm-tasks-testkit

In-memory fakes for the 7 canonical `pm-tasks` CRUD verbs. Drop this into your test suite to exercise skills or adapters that call `task.create`, `task.move`, `task.close`, `task.due-date.set`, `task.assignee.add`, `task.comment.add`, and `checklist.check` — without touching any real MCP server (Trello, Asana, Jira, etc.).

## Install

```sh
pnpm add -D @llodev/pm-tasks-testkit @llodev/pm-tasks-core
```

## Usage

```ts
import { createFakeAdapter } from "@llodev/pm-tasks-testkit";

// Create an adapter with deterministic id + clock for snapshot tests
const adapter = createFakeAdapter({
  idGenerator: (() => {
    let n = 0;
    return () => `task-${++n}`;
  })(),
  clock: () => "2026-01-01T00:00:00.000Z",
});

// Destructure verbs for cleaner call sites
const create = adapter["task.create"];
const move = adapter["task.move"];
const close = adapter["task.close"];
const addComment = adapter["task.comment.add"];
const setDue = adapter["task.due-date.set"];
const addAssignee = adapter["task.assignee.add"];

// Exercise verbs
const { ref } = await create({ title: "Implement login", list: "backlog" });
await addAssignee({ cardId: ref.id, assignee: "alice" });
await move({ cardId: ref.id, targetList: "in-progress" });
await addComment({ cardId: ref.id, text: "Starting now" });
await setDue({ cardId: ref.id, dueAt: "2026-02-01T00:00:00.000Z" });
await close({ cardId: ref.id });

// Inspect state
const task = adapter.getTask(ref.id);
console.log(task?.assignees); // ["alice"]
console.log(task?.closed); // true

// Clean up between tests
adapter.reset();
```

### With a hypothetical `pm-tasks-jira` adapter

```ts
// pm-tasks-jira/src/adapter.ts
import type { FakeAdapter } from "@llodev/pm-tasks-testkit";

// Your adapter accepts any object with the verb signatures
export function runWorkflow(adapter: FakeAdapter | JiraAdapter) {
  const create = adapter["task.create"];
  return create({ title: "Story" });
}

// pm-tasks-jira/tests/adapter.test.ts
import { createFakeAdapter } from "@llodev/pm-tasks-testkit";
import { runWorkflow } from "../src/adapter.js";

it("creates a task", async () => {
  const fake = createFakeAdapter();
  const result = await runWorkflow(fake);
  expect(result.ok).toBe(true);
});
```

## API

### `createFakeAdapter(opts?): FakeAdapter`

| Option        | Type           | Default                    | Description                                     |
| ------------- | -------------- | -------------------------- | ----------------------------------------------- |
| `idGenerator` | `() => string` | incrementing `fake-N`      | Custom id factory — use for deterministic tests |
| `clock`       | `() => string` | `new Date().toISOString()` | Custom ISO timestamp — use for snapshot tests   |

### Verb signatures

| Verb                | Input                                     | Returns                               |
| ------------------- | ----------------------------------------- | ------------------------------------- |
| `task.create`       | `{ title, description?, list?, ...meta }` | `{ ok, ref: { id, alias }, details }` |
| `task.move`         | `{ cardId, targetList }`                  | `{ ok, verb, cardId, targetList }`    |
| `task.close`        | `{ cardId }`                              | `{ ok }`                              |
| `task.comment.add`  | `{ cardId, text }`                        | `{ ok, commentId }`                   |
| `task.due-date.set` | `{ cardId, dueAt }`                       | `{ ok }`                              |
| `task.assignee.add` | `{ cardId, assignee }`                    | `{ ok }` (idempotent)                 |
| `checklist.check`   | `{ cardId, itemId, state }`               | `{ ok }`                              |

### Introspection methods

| Method          | Description                              |
| --------------- | ---------------------------------------- |
| `getTask(id)`   | Returns the stored `Task` or `undefined` |
| `getAllTasks()` | Returns all stored tasks as an array     |
| `reset()`       | Clears all stored tasks                  |

### `Task` shape

```ts
interface Task {
  id: string;
  title?: string;
  description?: string;
  list: string; // current list/state
  closed: boolean;
  assignees: string[];
  comments: Array<{ id: string; text: string; ts: string }>;
  checklist: Array<{ id: string; text: string; checked: boolean }>;
  dueAt: string | null;
  meta: Record<string, unknown>;
}
```

## Notes

- `task.move` and `task.close` are **independent** — moving a task does not close it, and closing does not move it.
- `task.assignee.add` is **idempotent** — adding the same assignee twice does not duplicate it.
- `checklist` items must be seeded directly into the task (via `getTask(id)!.checklist.push(...)`) — there is no `checklist.add` verb in the canonical set.
