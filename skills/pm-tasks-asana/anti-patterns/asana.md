# Asana ingestion anti-patterns

Apply when Phase 4 / Phase 5 / Phase 5b target Asana. Authoritative formatting + publish detail lives in [`../SKILL.md`](../SKILL.md).

---

## Paste health and fallbacks

| Healthy paste                                                                                                         | If it degrades → fallback                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Prefer `**Section**` in task descriptions when `##` headings are unreliable; **only one** nesting level for subtasks. | Swap heading hierarchy for bold labels; split deep trees into sibling tasks. See [`../SKILL.md`](../SKILL.md) §Asana model. |

**Switching tools mid-thread:** re-load the new tool's adapter; do not carry Asana rules into Trello / Jira / Linear (see **Cross-tool** below).

---

## Asana

**NEVER** rely on `## Heading` hierarchy alone in descriptions for teams that proved **headings don't render**. **Why:** Asana rich-text inconsistency across clients; bold section labels (`**Deliverables**`) are safer fallback per [`../SKILL.md`](../SKILL.md) §Asana model.

**NEVER** model **multiple nesting levels** of subtasks beyond what Asana supports (one level of subtasks natively). **Why:** falsely implies hierarchy; flatten or split tasks.

**NEVER** put **Out of scope** or **Next step** into published Asana descriptions. **Why:** deferred work stays in the plan file, not in the task body.

**NEVER** call `create_tasks` / `create_task_preview_v4` before the user confirms the Phase 5 preview. **Why:** creates real workspace objects without approval.

**NEVER** use `create_task_preview_v4` as the default path for a full phase card with many checklist lines. **Why:** inline subtasks cap at 5; use parent + batched `create_tasks` with `parent` instead.

**NEVER** pass custom field **display names** (e.g. `"Discovery"`, `"Medium"`) in `custom_fields` to MCP — only **field GID → option GID** pairs resolved from `.asana.json`. **Why:** the API returns 400; display names drift between Asana UI edits and the config file.

**NEVER** guess `project.id`, `section.id`, or custom field GIDs when `.asana.json` exists. **Why:** stale or invented GIDs silently create tasks in the wrong project or column; always read the file or refresh via `get_project`.

**NEVER** send `custom_fields` as an **object** on `create_tasks` — it must be a **JSON string**; object form is only valid for `update_tasks`. **Why:** the tool schemas differ; wrong format causes silent failure or a 400 error.

**NEVER** set `section_id` without also setting `project_id` / `default_project`. **Why:** Asana API requires project context for section placement.

---

## Cross-tool

**NEVER** apply Asana's quirks to another adapter after switching targets mid-chat. **Why:** the user said "actually use Trello" — re-load that adapter and apply only its rules.

---

## UI is the source of truth for activity attribution

The MCP's `mcp__asana__get_task` returns user-authored comments but does NOT return activity stories (creation, section moves, assignee changes, custom-field edits, follower changes). Programmatic verification of attribution is therefore incomplete by design.

When auditing whether an agent action was correctly attributed to the agent account (not the human account), open the task in the Asana UI and inspect the activity feed. Do not infer attribution from the MCP response.

## Subtasks do NOT inherit custom fields automatically

Asana itself does not propagate `custom_fields` from a parent task to its subtasks at create time, regardless of project-level defaults. The adapter MUST replicate the parent's selected `inheritParentFields` (declared in `.asana.json` under `subtaskDefaults`) when creating each subtask:

```javascript
await createSubtasks({
  parent: parentGid,
  custom_fields: pick(parent.custom_fields, config.subtaskDefaults.inheritParentFields),
});
```

Failing to do this leaves subtasks with empty custom fields even when the parent had them set.
