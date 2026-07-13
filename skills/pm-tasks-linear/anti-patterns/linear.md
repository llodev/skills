# Linear ingestion anti-patterns

Apply when Phase 4 / Phase 5 / Phase 5b target Linear. Authoritative formatting + publish detail lives in [`../SKILL.md`](../SKILL.md).

## Paste health and fallbacks

- Generic card title maps to Linear `title` — if absent, synthesize from the first non-empty heading.
- Description sections map to Markdown headings with **literal newlines** — never use `\n` escape sequences in strings passed to Linear MCP tools (the MCP server instructions explicitly require literal newlines).
- If no `.linear.json` is found, produce a paste-ready Markdown issue body and print install instructions. Do not silently skip config loading.

## Linear

**NEVER write labels without reading first (replace-set trap).**
Linear's `labelIds` on `save_issue` is a replace-set — writing any label overwrites the entire label array. Always call `get_issue` to read current label ids, strip `est:*`, merge the new label, and write the full set in a single `save_issue` call. Failure to read first clobbers all existing labels.

**NEVER fake checklists with `- [ ]` in description.**
`- [ ]` syntax in a Linear issue description is decorative text with no machine-addressable state. Checklist items must be **sub-issues** (`save_issue { parentId }`). `checklist.check` moves a sub-issue to a completed-type state — it cannot target description text. Using description markdown checkboxes makes check/uncheck impossible without full description rewrites.

**NEVER assume cycles exist on a team.**
Not all Linear teams use cycles. Always guard on `config.cycles.enabled` before calling `list_cycles` or passing `cycleId` to `save_issue`. Return `NOT_APPLICABLE` when disabled — do not error. Even when `config.cycles.enabled` is true, the team may have no active cycles yet; surface the MCP error directly rather than fabricating a cycle.

**NEVER resolve state by name.**
Linear state names are locale-dependent, customizable by each team, and can change at any time. Always resolve states by **type** string (`unstarted`, `started`, `completed`, `canceled`, `backlog`, `duplicate`). Read from `config.states[]` which maps type → id. Hard-coding names like `"In Progress"` or `"Done"` will break when teams rename them.

**NEVER omit `id` when updating an issue.**
`save_issue` is an upsert — when `id` is absent, it **silently creates a new issue**. There is no warning or error. Always pass the issue `id` (identifier or UUID) on any update verb (`task.move`, `task.close`, `task.due-date.set`, `task.assignee.add`, `task.parent.set`, `task.estimate.set`, `task.sprint.set`). Omitting it in an update context creates a duplicate issue that cannot be programmatically deleted.

**NEVER assume you can delete a Linear issue via MCP.**
The Linear MCP has no `delete_issue` tool (only `delete_comment`, `delete_attachment`, `delete_status_update`). Dogfood test issues must be cleaned up via the Linear UI or archived. Do not write code paths that depend on programmatic issue deletion.

**NEVER treat `task.assignee.add` as multi-assignee.**
Linear supports only one assignee per issue. `save_issue { assignee }` is a **set** operation, not an add. Passing a second assignee replaces the first. If the calling convention (e.g. Asana) expects multi-assignee, adapt by picking the primary assignee and discarding the rest (document this in the task comment if relevant).

**NEVER pass `linearTarget: "points"` with a non-point strategy.**
Strategies like `ideal_hours` or raw `t_shirt` (without a `sizeMap`) do not produce `n.points`. If `linearTarget === "points"` and `n.points === null`, the transport returns `INVALID_REQUEST`. This is a config coherence error — fix by re-running `pm-tasks-linear init` and aligning the strategy with the target.

## Cross-tool

**NEVER** apply Linear's quirks (replace-set labels, `save_issue` upsert, type-based state resolution, single assignee, cycle team-gating) to another adapter after switching targets mid-chat. Re-load that adapter's SKILL.md and apply only its rules.

## UI is the source of truth for activity attribution

The Linear MCP does not provide a full changelog. `get_issue` returns current field values, not historical transitions. When auditing a multi-step autonomous run, verify the full activity timeline in the Linear UI — the UI is the human's audit log.
