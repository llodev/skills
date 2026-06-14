# @llodev/pm-tasks-asana

## 1.1.0

### Minor Changes

- Localize init prompts in en-US, pt-BR, es-ES. The first prompt of `npx @llodev/pm-tasks-{asana,trello} init` is now a language picker, and every subsequent prompt is rendered in the chosen locale. The selected locale is recorded as `locale` at the root of the config JSON. New helpers in `@llodev/pm-tasks-core/init-lib`: `promptLocale`, `loadStrings`, `interpolate`, `listLocales`, `registerI18nRoot`. JSON Schemas updated to accept `locale` as an enum. No breaking changes — existing configs without `locale` continue to validate and adapters keep emitting en-US prompts if the strings table is omitted.

### Patch Changes

- Updated dependencies []:
  - @llodev/pm-tasks-core@1.1.0

## 1.0.2

### Patch Changes

- Allow `defaults.escalateToAlias` (and `defaults.assigneeAlias` on Trello) in the config schemas. The v1.0.1 init scripts emit these keys, but the JSON Schemas still had `additionalProperties: false` rejecting them — making `npx @llodev/pm-tasks-{asana,trello} init` fail at the validate step with "must NOT have additional properties". Trello init also now emits `assigneeAlias: "me"` for parity with Asana.

## 1.0.1

### Patch Changes

- Fix `npx @llodev/pm-tasks-asana init` silently doing nothing. Two bugs collapsed the init flow: (a) the `bin` entry was named `pm-tasks-asana-init` (not matching the package name), so npx never resolved the binary; (b) the script's `import.meta.url === file://${process.argv[1]}` guard failed under npx's symlinked bin shim, so even when invoked the `run()` entry-point was skipped. The bin is now `pm-tasks-asana` and the entry-point runs unconditionally.
- Cross-platform global config path. The init prompt now honors `LLODEV_PM_TASKS_CONFIG_HOME` first, then `XDG_CONFIG_HOME` (macOS/Linux), then `%APPDATA%` (Windows), then `~/.config` as the last fallback. The prompt prints the absolute path before asking, so the destination is always visible.
- Slug aliases are now Unicode-aware (via `@llodev/pm-tasks-core@1.0.1`): `"Em execução"` → `"em-execucao"`, `"Média"` → `"media"` (was `"em-execu-o"` / `"m-dia"`).
- Drop the language-specific regex for inferring the "closed" section. The init now explicitly asks: "Which section is the default for newly-created tasks?" and "Which section means 'closed / done'?" with sensible defaults (first / last picked) and a skip option.
- Add an explicit escalation prompt. After the member list is collected, the init asks: "Pick the escalation contact (will receive escalation comments + add_member on critical cards)" and stores it as `defaults.escalateToAlias`. The chosen member is re-aliased to `"owner"` if no other member already holds that alias.
- Fallback for empty membership lists: if the PAT's scope didn't return any project members beyond `me`, the init now offers a manual entry (gid + name + alias) so single-collaborator projects can still wire an escalation contact.
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

- Initial extraction from `plan-to-task-cards` Phase 5b (Asana).
- 6 CRUD verbs (create, checklist.check, close, due-date.set, assignee.add, comment.add).
- Parent task + subtasks model with custom-field inheritance.
- Autonomous mode behind `[autonomous]` sentinel + allowlist.
