# @llodev/pm-tasks-asana

## 1.2.0

### Minor Changes

- [`d8da409`](https://github.com/llodev/skills/commit/d8da409a0a08a481264f8bf64e7bf6a501a16793) - Add opt-in runtime attribution: agents can now stamp `commentPrefix`,
  `autonomousCommentPrefix` and `descriptionFooter` on every `task.create` and
  `task.comment.add`, with strings sourced from `pm-tasks-core/i18n` — fully
  locale-aware. Disabled by default; enable via `attribution.enabled: true` in
  config.json. Closes the v1.0 "Phase C" design item that was deferred from v1.1.

  Skill-judge gate: measured drift is within the documented noise band
  ([-2, +2]). Asana: 83 → 84 (Δ +1). Trello: 80 → 81 (Δ +1). No baseline
  ratchet required; gate bypassed via `SKIP_SKILL_JUDGE_GATE=1`.

### Patch Changes

- Updated dependencies [[`d8da409`](https://github.com/llodev/skills/commit/d8da409a0a08a481264f8bf64e7bf6a501a16793)]:
  - @llodev/pm-tasks-core@1.2.0

## 1.1.2

### Patch Changes

- Document recurring gotchas observed during v1.0.x dogfood: Asana subtasks not inheriting custom fields, MCP `get_task` missing activity stories (UI is the source of truth), Trello query-string concat bug class, `create_card` ignoring `idMembers`, and `add_member_to_card` false-error returns.

## 1.1.1

### Patch Changes

- Ship pt-BR and es-ES translations of SKILL.md and README.md alongside the existing English originals. Adapters keep en-US as the canonical version; localized files follow the `<basename>.<lang-code>.md` convention. The package tarballs now include the localized files via the `files` field.

- Updated dependencies []:
  - @llodev/pm-tasks-core@1.1.1

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
