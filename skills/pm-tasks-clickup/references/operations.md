# ClickUp CRUD operations

Verb → MCP tool mapping for `@llodev/pm-tasks-clickup`. Every verb returns the core result envelope; see [`../../pm-tasks-core/references/contract.md`](../../pm-tasks-core/references/contract.md) § Result envelope. Tool names omit your agent's server prefix. Every call also carries `workspace_id` from `.clickup.json`.

## Verb → MCP tool

| Core verb           | ClickUp MCP tool(s)                                                                                                                              | Request → parameters                                                                                                                                                                                               | Result `data`                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `task.create`       | `clickup_create_task`                                                                                                                            | `boardOrProjectId` → `list_id`; `listOrSectionId` → `status` (omitted when empty); `name`; `description` (+ `[ct:<token>]` footer) → `markdown_description`; `labels` → `tags`; `priority`; `dueDate` → `due_date` | `{ id, url }`                                     |
| `task.move`         | `clickup_get_task`, then `clickup_update_task {status}` or `clickup_move_task {list_id}`                                                         | `targetListOrSectionId`: `open` / `wip` / `done` (any case) or a list id of six or more digits                                                                                                                     | `{ previousListOrSectionId, newListOrSectionId }` |
| `checklist.check`   | `clickup_get_task`, `clickup_update_task {status}`                                                                                               | `itemId` = subtask id, `checklistId` = parent task id, `targetState` `complete` / `incomplete`                                                                                                                     | `{ previousState, newState }`                     |
| `task.close`        | `clickup_get_task`, `clickup_update_task {status}`                                                                                               | `taskId`; `closeListOrSectionId` is ignored (closing never changes the list)                                                                                                                                       | `{ closed: true }`                                |
| `task.due-date.set` | `clickup_get_task`, `clickup_get_user` (only when a due date is stored; cached on success), `clickup_update_task {due_date}`                     | `dueAt` must start with a real `YYYY-MM-DD`; only that date is sent                                                                                                                                                | `{ previousDueAt, newDueAt }`                     |
| `task.assignee.add` | `clickup_resolve_assignees` (non-numeric only), `clickup_get_task`, `clickup_update_task {assignees}`                                            | `userId`: numeric id, `"me"`, email or username                                                                                                                                                                    | `{ added, currentAssigneeIds }`                   |
| `task.comment.add`  | `clickup_get_task_comments` (with a token), `clickup_create_comment`                                                                             | `entity_type: "task"`, `entity_id: taskId`, `comment_text: "[ct:<token>] " + text` (marker only with `clientToken`)                                                                                                | `{ commentId, postedAt }`                         |
| `task.parent.set`   | `clickup_get_task`, `clickup_update_task {parent}`                                                                                               | `parentId` (trimmed); empty or `null` → `NOT_APPLICABLE`                                                                                                                                                           | `{ previousParentId, newParentId }`               |
| `task.estimate.set` | `clickup_get_task`, `clickup_update_task {time_estimate}`, `clickup_remove_tag_from_task`, `clickup_create_space_tag`, `clickup_add_tag_to_task` | `{ taskId, input, config }`, where `config` is the `.clickup.json` `estimation` block; see [`estimation.md`](estimation.md)                                                                                        | `{ normalized, fieldWritten }`                    |

Every verb except `task.create` rejects a blank id before any call (`task.estimate.set` after its on/off check): `INVALID_REQUEST`, `reason: "id_required"`, `details.field` names it.

## Reads before writes

All verbs but `task.create` and `task.comment.add` read the task first with one compact `clickup_get_task {task_id}` (no `include`); `task.assignee.add` resolves a non-numeric user before that read. The read is the only trusted source of the task's status, home list and parent: a response without `list.id`, a status name or a `parent` key is a shape error (`MCP_ERROR`), never a default. Write responses are envelopes (`{success, task_id, custom_id, task_url}`; `clickup_move_task` returns `new_list_id` and no URL) and are never read as a task.

## Per-verb notes

**`task.create`.** `boardOrProjectId` is required (`list_required`). The list may be any list, but if it is not in `lists[]` every later status verb on the task fails `list_not_configured`. `listOrSectionId` is a status **name** sent as is; role words are not resolved here, and a name the list lacks is rejected by ClickUp. Priority: `urgent`, `high`, `normal`, `low`, with `medium` → `normal`, case-insensitive; anything else is omitted. `dueDate` must start with a real calendar date (`invalid_due_date`; `null` counts as absent). `estimate` is ignored: call `task.estimate.set` afterwards. The `[ct:<token>]` footer is appended once, as its own paragraph. The transport does **not** look for an existing task: the duplicate lookup is the caller's (below). `url` falls back to `https://app.clickup.com/t/<task_id>`.

**`task.move`.** A role word resolves to the status pinned for that role in the task's **home list**. A target that is neither a role word nor six or more digits is `invalid_target`. Same status (trimmed, case-insensitive) → `ALREADY_IN_STATE` with `details.status`. A list id calls `clickup_move_task`: same list → `ALREADY_IN_STATE` with `details.listId`; a task with a parent → `subtask_cannot_move`. ClickUp requires the task's current status name to exist in the destination list. A status move returns status names in `previousListOrSectionId` / `newListOrSectionId`; a list move returns list ids. The transport never writes `start_date` (see Temporal handling).

**`checklist.check`.** `itemId` must be a subtask whose `parent` is `checklistId` (`not_a_checklist_item` otherwise). The item is complete when its status equals the pinned `done`; `complete` writes the pinned `done`, `incomplete` writes the pinned `open`. The list must pin `done` even to uncheck. Already in the requested state → `ALREADY_IN_STATE` with `details.state`.

**`task.close`.** Target = the pinned `done` status. A task already at the pinned `done` **or** at the pinned `closed` status (for example "cancelled") is left alone and returns `{ closed: true }` without a write: a cancelled task is not turned into a done one. Closing a parent does not close its open subtasks (ClickUp leaves them as they are).

**`task.due-date.set`.** Date-only: the time of day in `dueAt` is dropped, and `newDueAt` is the `YYYY-MM-DD` sent. ClickUp stores it as 04:00 in the account's timezone. `previousDueAt` is the ISO instant of the stored value (or `null`). The write is skipped when the stored instant's **local** date, computed with `utc_offset` from `clickup_get_user`, equals the requested date. `clickup_get_user` is read lazily, only when the task already has a due date, and cached on success; a failed read is retried on the next call, and this call writes anyway. Clearing a due date is not supported: `null` or any non-date is `invalid_due_date`. Relative dates ("tomorrow") must be computed from `clickup_get_user.current_time` before the call.

**`task.assignee.add`.** A non-numeric `userId` (`"me"`, an email, a username) is resolved first with `clickup_resolve_assignees {assignees: [userId]}`; anything but exactly one numeric id is `assignee_unresolved` (an auth or rate-limit failure keeps its own code). `members[].alias` values are not accepted: map an alias to its `members[].id` first. Already assigned → `{ added: false, currentAssigneeIds }` with no write. Otherwise the write is the **union** of the assignees just read and the new id, because `assignees` replaces the whole set. `"me"` is whoever the MCP is authenticated as, person or agent account.

**`task.comment.add`.** `text` must be non-empty (`text_required`) and at most 40,000 characters including the marker (`text_too_long`). With a `clientToken`, the transport first reads the **first page** of `clickup_get_task_comments {task_id}`; a comment whose text contains `[ct:<token>]` (ClickUp keeps the marker verbatim) is returned with its own date instead of posting again. Without a token, every call posts. The attribution prefix, when enabled, must already be in `text`. Use `clickup_create_comment`; `clickup_create_task_comment` is deprecated.

**`task.parent.set`.** ClickUp also **moves the task into the parent's list**; the result does not report the new list (the response type has no field for it). If that list is not in `lists[]`, status verbs on the task then fail `list_not_configured`. The MCP cannot clear a parent: an empty or `null` `parentId` is `NOT_APPLICABLE`, `reason: "detach_unsupported"` (detach in the ClickUp UI). A task cannot be its own parent (`self_parent`); there is no deeper cycle guard: ClickUp decides. Already under that parent → no write.

**`task.estimate.set`.** See [`estimation.md`](estimation.md).

## Duplicate lookup for `task.create`

The transport only embeds the marker; the caller looks first:

1. `clickup_search {keywords: "ct:<token>"}`. Search without brackets: ClickUp stores `markdown_description` with them escaped (`\[ct:<token>\]`), while `text_content` keeps them plain.
2. For each `results[]` entry with `type: "task"`, confirm with `clickup_get_task {task_id}` that `text_content` contains `[ct:<token>]`.
3. Found → return that task's ref and create only what is missing (subtasks by name, from `include: ["subtasks"]`). Not found → `task.create`.

## Status resolution and drift

`task.move`, `checklist.check` and `task.close` resolve statuses from config only, with no live lookup:

| Situation                                         | Result                                                     | Fix                                                              |
| ------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| Home list not in `lists[]`                        | `INVALID_REQUEST`, `list_not_configured`, `details.listId` | Re-run `init` and select the list                                |
| Role not pinned (no `wip`, or a hand-edited list) | `INVALID_REQUEST`, `role_not_configured`, `details.role`   | Re-run `init` and pick the status                                |
| Pinned status renamed or deleted in ClickUp       | `INVALID_REQUEST`, `status_rejected`, `details.status`     | Run the doctor (C-CLK-8 names list and role), then re-run `init` |
| Uncheck while the pinned `done` was renamed       | `ALREADY_IN_STATE` (the item no longer matches `done`)     | Run the doctor                                                   |

`wip` is the user's choice at `init` because ClickUp has no status type for "in progress" and several `custom` statuses usually compete. A list with no `custom` status gets no `wip`; `task.move` to `wip` then fails `role_not_configured` on its tasks.

## Idempotency

| Verb                | Rule                                                                             |
| ------------------- | -------------------------------------------------------------------------------- |
| `task.create`       | Caller's lookup above; the `[ct:<token>]` footer is the key                      |
| `task.move`         | Same status or same list → `ALREADY_IN_STATE`, no write                          |
| `checklist.check`   | Already complete / incomplete → `ALREADY_IN_STATE`, no write                     |
| `task.close`        | At pinned `done` or `closed` → `ok: true`, no write                              |
| `task.due-date.set` | Same local date → `ok: true`, no write                                           |
| `task.assignee.add` | Already assigned → `ok: true`, `added: false`, no write                          |
| `task.comment.add`  | Token already on the first comments page → `ok: true` with that comment, no post |
| `task.parent.set`   | Same parent → `ok: true`, no write                                               |
| `task.estimate.set` | Same estimate and tag → `ok: true`, zero writes                                  |

`ALREADY_IN_STATE` is a no-op signal, not a failure: core's plan-execution hooks put the verb in `skipped` and keep `ok: true`.

## Temporal handling (lifecycle fidelity)

Applies [`../../pm-tasks-core/references/lifecycle-fidelity.md`](../../pm-tasks-core/references/lifecycle-fidelity.md) to ClickUp:

- **Create:** `dueDate` → `due_date` (typed). Estimate through `task.estimate.set`.
- **Start (move → `wip`):** ClickUp stamps nothing. When the list or team tracks start dates, the agent follows the move with `clickup_update_task {task_id, start_date: "YYYY-MM-DD"}` for today (from `clickup_get_user.current_time`). Writing `start_date` alone leaves `due_date` unchanged.
- **Close:** `due_date` stays = the plan; never overwrite it. ClickUp leaves `date_closed` null for a `done`-type status, so completion is detected by the status, not by `date_closed`.

## Error codes

| Code               | When                                                                                                                                                                                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_REQUEST`  | Bad input or unusable config; `details.reason` is stable (`id_required`, `list_required`, `invalid_target`, `invalid_target_state`, `invalid_due_date`, `list_not_configured`, `role_not_configured`, `status_rejected`, `subtask_cannot_move`, `not_a_checklist_item`, `assignee_unresolved`, `text_required`, `text_too_long`, `self_parent`, estimation reasons) |
| `NOT_APPLICABLE`   | `task.parent.set` detach (`detach_unsupported`); `task.estimate.set` with estimation off (`estimation_disabled`)                                                                                                                                                                                                                                                    |
| `ALREADY_IN_STATE` | `task.move` / `checklist.check` with nothing to change                                                                                                                                                                                                                                                                                                              |
| `NOT_FOUND`        | The server said 404 or "not found" (task, list or comment)                                                                                                                                                                                                                                                                                                          |
| `AUTH_ERROR`       | 401/403, "unauthorized", "forbidden", "not authorized", an OAuth error: reconnect the ClickUp MCP. ClickUp's API also answers 401 for an id this account cannot read; if reconnecting does not help, check the task id.                                                                                                                                             |
| `RATE_LIMITED`     | 429 or "rate limit": wait and retry. Limits depend on the ClickUp plan                                                                                                                                                                                                                                                                                              |
| `MCP_ERROR`        | Any other server error (`details.message` is the server's text), an unexpected response shape, or a partial estimate                                                                                                                                                                                                                                                |
| `UNSUPPORTED_VERB` | A verb not in the manifest (see Known limitations)                                                                                                                                                                                                                                                                                                                  |

In autonomous mode the agent itself reports the core contract codes `INVALID_CONFIG`, `ALLOWLIST_VIOLATION`, `OUT_OF_SCOPE` and `FORBIDDEN_VERB` (see [`autonomous.md`](autonomous.md)). Error details carry the server message, never request arguments.

## Result envelope: ClickUp `details`

| Verb                | `details` fields                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `task.create`       | `{ id: "<task_id>", url: "https://app.clickup.com/t/<task_id>" }`                                                                |
| `task.move`         | `{ previousListOrSectionId: "<previous status name>", newListOrSectionId: "<pinned status name>" }`, or list ids for a list move |
| `checklist.check`   | `{ previousState: "incomplete" or "complete", newState: "complete" or "incomplete" }`                                            |
| `task.close`        | `{ closed: true }`                                                                                                               |
| `task.due-date.set` | `{ previousDueAt: "<ISO instant>" or null, newDueAt: "YYYY-MM-DD" }`                                                             |
| `task.assignee.add` | `{ added: true or false, currentAssigneeIds: ["<userId>", ...] }`                                                                |
| `task.comment.add`  | `{ commentId: "<id>", postedAt: "<ISO 8601>" }`                                                                                  |
| `task.parent.set`   | `{ previousParentId: "<task_id>" or null, newParentId: "<task_id>" }`                                                            |
| `task.estimate.set` | `{ normalized: NormalizedEstimate, fieldWritten: "time_estimate" or null }`                                                      |

## Known limitations

- **No sprint verb.** `task.sprint.set` answers `UNSUPPORTED_VERB`. ClickUp Sprints are lists: `task.move` with the destination list id moves a root task between lists, but the task then leaves its home list, so later status verbs fail `list_not_configured` unless `init` registers the destination list. Keeping a task in several lists needs the _Tasks in Multiple Lists_ ClickApp, which is plan-limited; the adapter does not use it.
- **Native checklists are not writable** through the MCP: checklist items are subtasks.
- **Renamed `done` status:** unchecking a subtask whose pinned `done` status was renamed in ClickUp reports `ALREADY_IN_STATE`; run the doctor.
- **Races:** read-then-write is not guarded; ClickUp has no conditional update.
- **Comments:** idempotency scans only the first page of comments.
- **Discovery:** `init` offers only non-archived workspaces, spaces, folders and lists.
- **Rate limit:** plan-dependent; do not assume a number.
- **Custom task ids** (`DEV-1234`) are not supported: pass native ids.
