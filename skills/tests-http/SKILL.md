---
name: tests-http
description: >-
  Generate, review, expand, or sync `.http` files (REST Client, VS Code
  httpYac, IntelliJ HTTP Client) for manual HTTP API test suites. Use when
  creating or syncing HTTP tests for controllers or ViewSets, covering every
  route, filter, and error, or editing `**/*.http`. Discovers the project
  layout or reads `.http-tests.yaml`. NestJS and DRF adapters live in
  references/. Do NOT use for pytest, Jest, Vitest, Playwright, or Supertest.
license: MIT
metadata:
  version: 0.0.0
  tags:
    - agent-skill
    - http
    - rest-client
    - tests
  family: tests
  role: skill
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

# HTTP Test Suite Generator

Produces **full-coverage** `.http` files from **source code** in the **current project** — not from assumed monorepo paths.

---

## Project context (before framework)

**MANDATORY — READ ENTIRE FILE**: [`references/project-discovery.md`](references/project-discovery.md) — config priority, discovery, when to ask the user.

Then read [`references/common.md`](references/common.md) completely.

Resolve `base_url`, auth, where `.http` files live, and canonical examples via:

1. User message → 2. `.http-tests.yaml` / `.http-tests.json` / `docs/http-tests.md` → 3. root agent guides (`CLAUDE` and `AGENTS` markdown), `.cursor/rules` → 4. repo discovery → 5. **ask user** if still ambiguous.

Template for optional config: [`examples/http-tests.project.yaml`](examples/http-tests.project.yaml).

---

## Framework selection

| Signal                                        | Adapter                                           |
| --------------------------------------------- | ------------------------------------------------- |
| User or project config says `nestjs` / `drf`  | That reference                                    |
| Handler is `*Controller.ts` / Nest decorators | [`references/nestjs.md`](references/nestjs.md)    |
| Handler is DRF `ViewSet` / `APIView`          | [`references/drf.md`](references/drf.md)          |
| Deps: `@nestjs/core` vs `djangorestframework` | Matching reference                                |
| Polyglot / unclear                            | **Ask** — do not guess from stale path heuristics |

**MANDATORY**: read the selected framework reference completely.

**Do NOT load** the other framework reference for the same task.

Optional skeleton: [`examples/nestjs-minimal.http`](examples/nestjs-minimal.http) or [`examples/drf-minimal.http`](examples/drf-minimal.http) — expand; never ship skeleton only.

---

## When to use / when not to use

**Use**: create/sync `.http` for HTTP APIs; new route/`@action` and matching `.http` is stale.

**Do not use**: pytest, Jest/Vitest, Playwright/e2e, Supertest-only; non-HTTP targets.

---

## Workflow

1. **Project context** — `project-discovery.md` (config → rules → discover → ask).
2. **Framework** — table above + framework reference.
3. **Read handler and related source** — order in framework reference; **paths from discovery/config**, not skill defaults.
4. **Mirror style** — best existing `.http` in repo, else templates in `examples/`.
5. **Write or sync** — `common.md` + framework mapping tables.
6. **Checklist** — `common.md` + framework checklist.

---

## NEVER

- **NEVER** assume `apps/api/`, monorepo layout, or paths from another repo. **Why**: breaks on single-app repos, different folder names, and polyglot setups.
- **NEVER** invent routes, filters, params, or error codes absent from code.
- **NEVER** hard-code DB IDs; use `# @name` chains or documented seeds only.
- **NEVER** wipe an existing `.http` on sync (diff-and-extend — `common.md`).
- **NEVER** use non-English text inside `.http` comments.
- **NEVER** skip auth negative cases to "make tests pass".
- **NEVER** load both `nestjs.md` and `drf.md` for one file.
- **NEVER** guess `base_url` or credentials when discovery and config are silent — **ask**.

---

## References

| File                                                                   | Purpose                                                      |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| [`references/project-discovery.md`](references/project-discovery.md)   | Config priority, discovery, user questions, IDE rule snippet |
| [`references/common.md`](references/common.md)                         | Formatting, sync, shared checklist                           |
| [`references/nestjs.md`](references/nestjs.md)                         | Nest handler → test mapping (paths discovered per project)   |
| [`references/drf.md`](references/drf.md)                               | DRF handler → test mapping (paths discovered per project)    |
| [`examples/http-tests.project.yaml`](examples/http-tests.project.yaml) | Optional repo overlay template                               |
