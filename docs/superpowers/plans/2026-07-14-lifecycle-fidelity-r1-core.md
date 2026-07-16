# Lifecycle Fidelity R1 (core) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the core `TaskCreateRequest` with optional create-time fields (labels/priority/estimate/dueDate — issue #47 Option A) and add the shared `lifecycle-fidelity.md` reference doc, so later adapter releases (R2–R4) can map create-time fields through the typed contract and follow the start/close guidance.

**Architecture:** Pure additive change to the core transport contract (one interface widened with optional fields) plus one new reference doc. The `task.create` handler already forwards the whole request to `transport.taskCreate`, so no handler logic changes — the widened type flows through untouched. No adapter code changes in R1 (adapters ignore the new optional fields until their own releases). No core `SKILL.md` change, so the skill-judge gate does not fire.

**Tech Stack:** TypeScript (core runtime types), Vitest (core tests), Markdown references, changesets, `make` targets.

## Global Constraints

- One PR = one changeset = one release. Branch = the version: `v1.14.0` (already checked out; core 1.13.0 → 1.14.0). — from `CLAUDE.md`.
- Release bump = **minor** for `@llodev/pm-tasks-core` (additive optional fields; no removals).
- Every new `TaskCreateRequest` field is **optional** — omitting them must not change any existing behavior or break any adapter's compilation.
- Reuse the existing `EstimateInput` type (`skills/pm-tasks-core/src/estimation.ts:33`, already imported into `transport.ts:13`) for the `estimate?` field — do not invent a new estimate type.
- If `contract.md` is edited at all, the edit must be **insertions-only** (0 deletions) or contract-check Phase A demands a major bump. Add lines; never delete or reflow existing lines.
- No core `SKILL.md` change in R1 (keeps the skill-judge gate out of this release).

---

## File Structure

| File                                                              | Responsibility                                                                                           |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `skills/pm-tasks-core/src/runtime/transport.ts`                   | widen `TaskCreateRequest` with optional `labels/priority/estimate/dueDate`                               |
| `skills/pm-tasks-core/tests/runtime/handlers/task-create.test.ts` | prove the new fields flow through the handler to the transport                                           |
| `skills/pm-tasks-core/references/lifecycle-fidelity.md`           | new: the shared principle + three moments + per-tool interpretation, consumed by adapter SKILLs in R2–R4 |
| `skills/pm-tasks-core/references/contract.md`                     | one insertions-only pointer line to the new reference doc                                                |
| `.changeset/<name>.md`                                            | core minor changeset                                                                                     |

---

## Task 1: Extend `TaskCreateRequest` with create-time fields

**Files:**

- Modify: `skills/pm-tasks-core/src/runtime/transport.ts:37-43` (the `TaskCreateRequest` interface)
- Test: `skills/pm-tasks-core/tests/runtime/handlers/task-create.test.ts`

**Interfaces:**

- Consumes: `EstimateInput` from `../estimation.js` (already imported at `transport.ts:13`).
- Produces: widened `TaskCreateRequest` with optional `labels?: string[]`, `priority?: string`, `estimate?: EstimateInput`, `dueDate?: string`. Adapters (R2–R4) read the subset they support.

- [ ] **Step 1: Write the failing pass-through test.** Add this test inside the existing `describe("taskCreateHandler", …)` block in `task-create.test.ts` (it reuses the file's `makeCtx` and `buildRecordingTransport` helpers):

```ts
it("forwards optional create-time fields (labels/priority/estimate/dueDate) to the transport", async () => {
  const { transport, calls } = buildRecordingTransport({
    ok: true,
    data: { id: "cardB", url: "https://trello.com/c/abc" },
  });
  const ctx = makeCtx({ transport });
  const req = {
    boardOrProjectId: "boardA",
    listOrSectionId: "listA",
    name: "Task with fields",
    labels: ["api", "web"],
    priority: "high",
    estimate: 8,
    dueDate: "2026-07-20",
  };
  const result = await taskCreateHandler(req, ctx);
  expect(result.ok).toBe(true);
  const created = calls.find((c) => c.method === "taskCreate");
  expect(created?.req).toMatchObject({
    labels: ["api", "web"],
    priority: "high",
    estimate: 8,
    dueDate: "2026-07-20",
  });
});
```

- [ ] **Step 2: Run the test — expect a TYPE failure.**

Run: `cd /Users/lloli/Workspace/skills && pnpm --filter @llodev/pm-tasks-core test -- task-create`
Expected: FAIL — TypeScript rejects the `req` object literal because `labels`/`priority`/`estimate`/`dueDate` are not on `TaskCreateRequest` yet (object-literal excess-property check), or the assertion cannot see the fields.

- [ ] **Step 3: Widen the interface.** In `transport.ts`, replace the `TaskCreateRequest` interface:

  Old:

  ```ts
  export interface TaskCreateRequest {
    boardOrProjectId: string; // Trello: idBoard; Asana: project gid
    listOrSectionId: string; // Trello: idList; Asana: section gid
    name: string; // card/task title
    description?: string; // optional body
    clientToken?: string; // for [ct:<token>] idempotency marker
  }
  ```

  New:

  ```ts
  export interface TaskCreateRequest {
    boardOrProjectId: string; // Trello: idBoard; Asana: project gid
    listOrSectionId: string; // Trello: idList; Asana: section gid
    name: string; // card/task title
    description?: string; // optional body
    clientToken?: string; // for [ct:<token>] idempotency marker
    // Create-time fields (issue #47, Option A). All optional and additive;
    // each adapter maps the subset its tool supports and ignores the rest.
    labels?: string[]; // adapter maps to its label/tag model
    priority?: string; // adapter maps to its priority model (may be NOT_APPLICABLE)
    estimate?: EstimateInput; // reuse core/estimation input; adapter normalizes
    dueDate?: string; // ISO 8601 date (YYYY-MM-DD)
  }
  ```

- [ ] **Step 4: Run the test — expect PASS.**

Run: `cd /Users/lloli/Workspace/skills && pnpm --filter @llodev/pm-tasks-core test -- task-create`
Expected: PASS (new test + all existing `taskCreateHandler` tests green).

- [ ] **Step 5: Verify the whole repo still typechecks** (adapters must still compile against the widened contract — optional fields are backward-compatible).

Run: `cd /Users/lloli/Workspace/skills && pnpm run typecheck`
Expected: exit 0, no errors in any package.

- [ ] **Step 6: Commit.**

```bash
cd /Users/lloli/Workspace/skills
git add skills/pm-tasks-core/src/runtime/transport.ts skills/pm-tasks-core/tests/runtime/handlers/task-create.test.ts
git commit -m "feat(pm-tasks-core): add optional create-time fields to TaskCreateRequest (#47 Option A)"
```

---

## Task 2: Add the `lifecycle-fidelity.md` reference + contract pointer

**Files:**

- Create: `skills/pm-tasks-core/references/lifecycle-fidelity.md`
- Modify: `skills/pm-tasks-core/references/contract.md` (one insertions-only pointer line)
- Test: `scripts/checks/validate-links.mjs`, `scripts/checks/contract-check.mjs`

**Interfaces:**

- Produces: `references/lifecycle-fidelity.md`, referenced by adapter SKILLs in R2–R4. No code.

- [ ] **Step 1: Create the reference doc** at `skills/pm-tasks-core/references/lifecycle-fidelity.md` with exactly this content (reference docs in this repo have no frontmatter — plain Markdown, matching the other files in `references/`):

```markdown
# Lifecycle Fidelity

A cross-adapter principle for the pm-tasks family. Across a task's life —
**create → start → close** — the task's live/primary fields reflect what is
true, and the **plan ↔ actual** gap is preserved wherever the tool allows.

This is **interpretive guidance, not a rule** (except the create moment, which
is deterministic). Each adapter's SKILL applies it per its tool's affordances;
the agent may exploit tool-specific features (e.g. a Trello Premium custom
field) to improve cohesion.

## The three moments

- **Create** — set the planned fields the tool supports (labels, priority,
  estimate, dueDate). Deterministic: the values are known, so this is carried
  by the typed `TaskCreateRequest` (`labels?`, `priority?`, `estimate?`,
  `dueDate?`); each adapter maps the subset its tool supports.
- **Start** (move → WIP) — stamp a start date where the tool supports one.
- **Close** — reflect the **actual** completion in the primary field; preserve
  the **plan** for a planned-vs-actual comparison.

## The close rule (plan vs actual)

Reflect the real completion in the live field; keep the plan.

- On tools that separate plan and actual **natively** — Asana `completed_at`,
  Jira `resolutiondate`, Linear `completedAt` — this is **free**: `dueDate`
  stays = plan, the auto timestamp is the actual, so do **not** overwrite the
  due date.
- On a tool with **no** auto completion timestamp — Trello — the agent
  actively overwrites `due` = actual completion date (+ `dueComplete`) and
  stashes the plan (original due + estimate) elsewhere (a description footer;
  a Premium custom field when available).

## Per-adapter interpretation

| Adapter    | Start (move→WIP)                                                                       | Close (real / plan)                                                                                 |
| ---------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Asana**  | `start_on` = today (must re-send the current `due_on` in the same `update_tasks` call) | `completed_at` auto = real; `due_on` stays = plan (native, no overwrite)                            |
| **Trello** | `start` = today (native field)                                                         | overwrite `due` = actual + `dueComplete`; plan → description footer (Premium custom field optional) |
| **Jira**   | no wired start field (custom field optional, documented)                               | `resolutiondate` auto = real; `duedate` stays = plan (native, no overwrite)                         |
| **Linear** | `startedAt` auto from the existing `task.move` → `"started"` state                     | `completedAt` auto = real from the existing `task.close`; `dueDate` stays = plan                    |

Rollout: create-time carried by the core contract (this doc's create moment);
start/close applied per adapter in that adapter's SKILL. See the umbrella
design in `docs/superpowers/specs/2026-07-14-lifecycle-fidelity-design.md`.
```

- [ ] **Step 2: Add one insertions-only pointer line in `contract.md`.** Append this line to the end of the file (do not modify or reflow any existing line — insertions only, or contract-check Phase A will demand a major bump):

```markdown
See [`lifecycle-fidelity.md`](lifecycle-fidelity.md) for the cross-adapter lifecycle-fidelity principle (create-time fields + start/close plan-vs-actual handling).
```

- [ ] **Step 3: Verify links resolve and contract-check passes.**

Run: `cd /Users/lloli/Workspace/skills && node scripts/checks/validate-links.mjs && node scripts/checks/contract-check.mjs`
Expected: links validator exit 0; contract-check prints `ok   contract.md additive-only (N insertions, 0 deletions) — minor permitted` and exits 0.

- [ ] **Step 4: Commit.**

```bash
cd /Users/lloli/Workspace/skills
git add skills/pm-tasks-core/references/lifecycle-fidelity.md skills/pm-tasks-core/references/contract.md
git commit -m "docs(pm-tasks-core): add lifecycle-fidelity reference + contract pointer"
```

---

## Task 3: Changeset + full validate

**Files:**

- Create: `.changeset/lifecycle-fidelity-r1-core.md`
- Test: `make validate`

**Interfaces:** none (release plumbing).

- [ ] **Step 1: Create the changeset** at `.changeset/lifecycle-fidelity-r1-core.md` with this content:

```markdown
---
"@llodev/pm-tasks-core": minor
---

Add optional create-time fields (`labels`, `priority`, `estimate`, `dueDate`) to `TaskCreateRequest` so adapters can map them through the typed transport at task creation (issue #47, Option A). All fields are optional and additive — no behavior change when omitted. Adds `references/lifecycle-fidelity.md` documenting the cross-adapter create → start → close plan-vs-actual principle consumed by adapter SKILLs (R2–R4).
```

- [ ] **Step 2: Run full validation.**

Run: `cd /Users/lloli/Workspace/skills && make validate`
Expected: exit 0 (schemas, frontmatter, links, tarball-snapshot, contract-check, lint, coverage, size all green). Note: no `SKILL.md` changed, so the skill-judge gate does not apply.

- [ ] **Step 3: Commit.**

```bash
cd /Users/lloli/Workspace/skills
git add .changeset/lifecycle-fidelity-r1-core.md
git commit -m "chore(release): changeset for pm-tasks-core create-time fields + lifecycle-fidelity doc"
```

---

## Self-Review

- **Spec coverage (R1 rows only):** `TaskCreateRequest` extension → Task 1 ✓. `references/lifecycle-fidelity.md` → Task 2 ✓. Core minor release → Task 3 ✓. R2–R4 are out of R1 scope by design (separate releases).
- **Placeholder scan:** none — all code and doc content is literal.
- **Type consistency:** `estimate?: EstimateInput` matches the existing `EstimateInput` import at `transport.ts:13` and the `TaskEstimateSetRequest.input` type; `dueDate?: string` matches the ISO-date convention used by `TaskDueDateSetRequest`.

## Release (user-driven, after all tasks green)

`make preflight` (no skill-judge gate — no SKILL.md change) → open PR `feat(release): v1.14.0 — pm-tasks-core create-time fields + lifecycle-fidelity` → merge → `make release-version` → `make release-publish`.

## Next (after R1 lands)

R2 (Asana) and R3 (Trello) each get their own spec-lite/plan → implementation cycle, consuming this contract + reference doc: create-time field mapping, `start` on move, and the close plan-vs-actual handling per `lifecycle-fidelity.md`.
