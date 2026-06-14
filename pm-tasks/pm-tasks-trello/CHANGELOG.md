# @llodev/pm-tasks-trello

## 1.1.0

### Minor Changes

- Localize init prompts in en-US, pt-BR, es-ES. The first prompt of `npx @llodev/pm-tasks-{asana,trello} init` is now a language picker, and every subsequent prompt is rendered in the chosen locale. The selected locale is recorded as `locale` at the root of the config JSON. New helpers in `@llodev/pm-tasks-core/init-lib`: `promptLocale`, `loadStrings`, `interpolate`, `listLocales`, `registerI18nRoot`. JSON Schemas updated to accept `locale` as an enum. No breaking changes — existing configs without `locale` continue to validate and adapters keep emitting en-US prompts if the strings table is omitted.

### Patch Changes

- Updated dependencies []:
  - @llodev/pm-tasks-core@1.1.0

## 1.0.3

### Patch Changes

- Fix `npx @llodev/pm-tasks-trello init` failing with HTTP 401 even when `TRELLO_API_KEY` + `TRELLO_TOKEN` are correctly exported. The internal `url(p)` builder appended `?key=...&token=...` even when `p` already contained a query string (every endpoint did — `/members/me?fields=...`, `/boards/.../lists?filter=open&fields=...`, etc.), producing URLs with TWO `?`. Trello parsed `fields=id,username,fullName?key=...` as one field value, leaving `key` effectively unset. Fix: detect existing query string and use `&` as separator. Bug was present since v1.0.0; only surfaced now because the init flow was unreachable until v1.0.1's npx fix.

## 1.0.2

### Patch Changes

- Allow `defaults.escalateToAlias` (and `defaults.assigneeAlias` on Trello) in the config schemas. The v1.0.1 init scripts emit these keys, but the JSON Schemas still had `additionalProperties: false` rejecting them — making `npx @llodev/pm-tasks-{asana,trello} init` fail at the validate step with "must NOT have additional properties". Trello init also now emits `assigneeAlias: "me"` for parity with Asana.

## 1.0.1

### Patch Changes

- Fix `npx @llodev/pm-tasks-trello init` silently doing nothing. Same two bugs as the asana adapter: (a) the `bin` entry was named `pm-tasks-trello-init` (not matching the package name), so npx never resolved the binary; (b) the script's `import.meta.url === file://${process.argv[1]}` guard failed under npx's symlinked bin shim, so even when invoked the `run()` entry-point was skipped. The bin is now `pm-tasks-trello` and the entry-point runs unconditionally.
- Cross-platform global config path (via `@llodev/pm-tasks-core@1.0.1`): honors `LLODEV_PM_TASKS_CONFIG_HOME` / `XDG_CONFIG_HOME` / `%APPDATA%`, prints the absolute target path before asking.
- Slug aliases are now Unicode-aware (via shared `aliasOf` in core).
- Drop the language-specific regex for inferring the "closed" list. The init now explicitly asks: "Which list is the default for newly-created cards?" and "Which list means 'closed / done'?" with sensible defaults (first / last picked).
- Fetch board members during init and add them to `members[]`. After collection, the init asks: "Pick the escalation contact" and stores it as `defaults.escalateToAlias` (the chosen member is re-aliased to `"owner"`). Manual fallback prompts for `(id, username, fullName)` when the Trello API returns no board members.
- `multiSelect`: empty input now means "select all" instead of "select none".
- README clarifies the per-OS defaults and the env override.

## 1.0.0

### Major Changes

- [`a571ab1`](https://github.com/llodev/skills/commit/a571ab1537ea7d3fe61c7b89c5be0f08d01f3838) - First stable release of the pm-tasks-\* family.

  - `@llodev/pm-tasks-core` — Phases 1–3 extraction pipeline (input → sections → generic card), 6 CRUD verbs (`task.create`, `checklist.check`, `task.close`, `task.due-date.set`, `task.assignee.add`, `task.comment.add`), autonomous-mode contract (allowlist + scope + rate-limit + audit log), shared init UX library.
  - `@llodev/pm-tasks-trello` — Trello adapter on the canonical generic card. Paste-friendly output, MCP-driven publish, autonomous mode against a board allowlist.
  - `@llodev/pm-tasks-asana` — Asana adapter with workspace/project/section + custom-field + subtask-inheritance support. Paste, MCP-driven publish, autonomous mode.

  Architecture, contract, and CRUD vocabulary documented in `docs/specs/2026-06-11-pm-tasks-design.md` and `docs/plans/2026-06-11-pm-tasks-v1.md`.

### Patch Changes

- Updated dependencies [[`a571ab1`](https://github.com/llodev/skills/commit/a571ab1537ea7d3fe61c7b89c5be0f08d01f3838)]:
  - @llodev/pm-tasks-core@1.0.0

## 0.1.0 (unreleased)

- Initial extraction from `plan-to-task-cards` Phase 5 (Trello).
- 6 CRUD verbs (create, checklist.check, close, due-date.set, assignee.add, comment.add).
- Autonomous mode behind `[autonomous]` sentinel + allowlist.
