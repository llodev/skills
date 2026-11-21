# ClickUp ingestion anti-patterns

Apply when Phase 4, 5, 5b, 6 or 7 targets ClickUp. Formatting and publish detail live in [`../SKILL.md`](../SKILL.md); verb detail in [`../references/operations.md`](../references/operations.md).

## Paste health and fallbacks

- Generic card title → `name`; if absent, take the first non-empty heading.
- Descriptions are Markdown with literal newlines, sent as `markdown_description`.
- No `.clickup.json` → produce the paste-ready description and point to `init`. Do not guess list ids or status names to publish anyway.

## ClickUp

**NEVER hard-code a status name.**
Statuses are defined per list, named by each team and often localized ("to do", "a fazer", "pendiente"). Two lists in one workspace can disagree. Always go through the role pinned in `lists[].statuses` (`open`, `wip`, `done`, `closed`). A name that does not exist on the task's list is rejected (`Status does not exist`).

**NEVER pass `open`, `wip` or `done` as the `task.create` status.**
`listOrSectionId` is sent to ClickUp as a status name; role words are resolved only by `task.move`, `checklist.check` and `task.close`. Pass the list's pinned `open` name, or leave it empty for the list default.

**NEVER pass a list id where you mean a status.**
`task.move` treats six or more digits as a destination list: the task leaves its list, and if that list is not in `lists[]`, every later status verb on it fails `list_not_configured`. The same holds for core's plan-execution hooks: `listsWipId` / `listsDoneId` are `"wip"` / `"done"`, not ids.

**NEVER call `clickup_create_task_comment`.**
It is deprecated. Use `clickup_create_comment {entity_type: "task", entity_id, comment_text}`.

**NEVER assume `update_task.assignees` adds.**
It replaces the whole set: sending one id silently unassigns everyone else, including the human who owns the task. `task.assignee.add` reads the task and writes the union; if you call `clickup_update_task` yourself, do the same.

**NEVER pass a `members[].alias` as the assignee.**
The transport resolves ids, `"me"`, emails and usernames; an alias is none of these, so it fails closed (`assignee_unresolved`) or, worse, may match someone else's username. Map the alias to `members[].id` first.

**NEVER fake checklists with `- [ ]` in the description on MCP publish.**
ClickUp renders the task list, but nothing can address those boxes: `checklist.check` works on subtasks only, and the MCP cannot write native checklists either. Task-list lines are for paste-ready output, where a human ticks them by hand.

**NEVER write a native estimate on a parent and on its children.**
ClickUp keeps a parent's own `time_estimate`, and spaces with time-estimate roll-up show parent plus children in views: the effort is counted twice. Native estimates go on leaves; the parent gets the `est:` tag only. Create subtasks before estimating the parent.

**NEVER use `include_closed: false` as the "not done" filter.**
`clickup_filter_tasks` still returns `done`-type tasks with it. Filter with `statuses: [<every open- and custom-type status name of the scoped lists>]`, read with one `clickup_get_list` per list, and `subtasks: false`.

**NEVER filter plan tasks on the pinned open and wip names alone.**
A task parked in another custom status (`on hold`, `planning`, `at risk`) drops out of the result, comes back `missing`, and gets created a second time. Pass every status name whose type is not `done` or `closed`.

**NEVER read a write response as a task.**
`clickup_create_task` / `clickup_update_task` return `{success, task_id, custom_id, task_url}`; `clickup_move_task` returns `new_list_id` and no URL. There is no status, list, parent or assignee in them: read `clickup_get_task` when you need state.

**NEVER search for `[ct:<token>]` with the brackets.**
ClickUp stores the description with escaped brackets (`\[ct:…\]`). Search `clickup_search {keywords: "ct:<token>"}` and confirm against `text_content`.

**NEVER compute a relative date from your own clock.**
"Today" or "tomorrow" depends on the ClickUp account's timezone, and date-only values are stored at 04:00 local time. Read `clickup_get_user.current_time` first, then send `YYYY-MM-DD`.

**NEVER overwrite `due_date` at close, or wait for `date_closed`.**
`due_date` is the plan. ClickUp leaves `date_closed` null for `done`-type statuses: completion is the status itself.

**NEVER report `ALREADY_IN_STATE` as a failure.**
`task.move` and `checklist.check` use it to say "nothing to do". Retrying or escalating on it creates noise and, in loops, duplicate comments.

**NEVER expect `task.parent.set` to leave the task where it was.**
ClickUp moves the child into the parent's list. Check that list is configured (and in autonomous scope) before re-parenting across lists. Detaching is not possible through the MCP.

**NEVER delete or archive from this skill.**
The MCP exposes `clickup_delete_task`, but deletion, archiving and renaming are forbidden autonomous verbs and outside this adapter. Ask the human to clean up in the ClickUp UI.

**NEVER put the API token anywhere but the environment.**
`CLICKUP_API_TOKEN` is read only from the environment, by `init` and the doctor, for read-only discovery. Never paste it into chat, an issue, a commit or `.clickup.json`; the MCP uses its own OAuth.

## Cross-tool

**NEVER** carry ClickUp's quirks (per-list statuses, union assignee writes, list moves by id, leaf-only estimates) to another adapter after switching targets mid-chat, or bring another adapter's rules here (Linear's single assignee, Trello's due-date overwrite at close). Re-load that adapter's SKILL.md.

## The ClickUp UI is the human's audit trail

`clickup_get_task` returns current values, not history. When auditing an autonomous run, check the task's activity in ClickUp, alongside the runtime audit log.
