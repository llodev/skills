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
