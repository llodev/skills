# pm-tasks-core ↔ adapter contract

> **Versioning:** Renaming or removing a field below is a **MAJOR** bump for `@llodev/pm-tasks-core`. Adding optional fields is a minor bump. CI `contract-check.yml` enforces this.

This document is the single source of truth that every `pm-tasks-<tool>` adapter consumes. Adapters MUST execute Phases 1–3 (defined here) before applying their tool-specific formatting.

## Phase 1 — Identify the input

Resolve which plan text to analyze:

1. `@path` in the prompt → read that file (full file, no range limits).
2. Inline pasted text → use as-is.
3. "this plan" / implicit → most recently opened plan file in the workspace.

Multiple plausible candidates → list them, recommend one default, confirm before proceeding.

## Phase 2 — Extract sections by intent

Map sections by intent (labels vary across languages and authoring styles):

| Concept       | Common labels                                              |
| ------------- | ---------------------------------------------------------- |
| Goal          | `Goal`, `Objective`, `Purpose`                             |
| Spec refs     | `Spec:`, `Design doc`, links to spec files                 |
| Prerequisites | `Pre-flight`, `Requirements`, `Baseline check`             |
| File map      | `File map`, `Files created/modified`, `Deliverables`       |
| Tasks         | `## Task N`, `### Task N`, numbered blocks                 |
| Task groups   | `## Block A`, thematic headers grouping tasks              |
| Done criteria | `Done when`, `Self-review checklist`, `Final verification` |
| Out of scope  | `Out of scope`, `What comes after`                         |
| Next step     | `What comes after`, `Phase N+1`, `Next phase`              |

Implicit sections → infer from structure. Tasks-only inputs → derive goal from first block, derive verification from last tasks, tag everything inferred with `(inferred)`.

## Phase 3 — Build the generic card

Produce blocks in the order defined in [`generic-card.md`](generic-card.md):

1. `title` — single line, ≤120 chars by default
2. `description` — goal + context + spec ref
3. `implementationChecklist` — task-line verbatim or compressed per `fidelity` decision
4. `verificationChecklist` — derived from done-when or last tasks
5. `timeline` — AI-assisted estimate
6. `labels` — derived from tags in the plan

## Decisions emitted by the core

The core resolves and exposes these decisions before Phase 4 begins. Adapters reference them by name:

| Decision   | Values                                                 | Default              |
| ---------- | ------------------------------------------------------ | -------------------- |
| `scope`    | `one-card-per-phase`, `parent+children`, `single-card` | `one-card-per-phase` |
| `audience` | `solo`, `squad`, `dense-board`                         | `solo`               |
| `fidelity` | `verbatim`, `compressed`                               | `compressed`         |
| `language` | `pt`, `en`, `mixed`                                    | detected from plan   |

## CRUD verb vocabulary

The 6 verbs of v1, with their semantic invariants and idempotency rules, live in [`crud-vocabulary.md`](crud-vocabulary.md). Adapters map each verb to one or more MCP tool calls.

## Result envelope

Every CRUD operation returns:

```json
{
  "ok": true,
  "verb": "<verb>",
  "tool": "<tool>",
  "ref": { "id": "<native-id>", "url": "<full-url>", "alias": "<alias-or-null>" },
  "details": {
    /* verb-specific */
  }
}
```

Failures:

```json
{ "ok": false, "code": "<CODE>", "verb": "<verb>", "message": "<human>", "details": {} }
```

Stable error codes: `FORBIDDEN_VERB`, `OUT_OF_SCOPE`, `ALLOWLIST_VIOLATION`, `RATE_LIMITED`, `REF_NOT_RESOLVED`, `MCP_ERROR`, `INVALID_CONFIG`.

## Standalone fallback

Adapters MUST include a short fallback section in their own `SKILL.md` (~10 lines) for when this core is not installed: ask user for minimum input (title + checklist), skip extraction.

## Compatibility notes for adapters

- Reference this file by relative path: `pm-tasks/pm-tasks-core/references/contract.md`.
- Declare `"@llodev/pm-tasks-core"` in `dependencies` for skillpm + Claude Code marketplace cascade. Vercel CLI users must install core manually — note this in the adapter description.
