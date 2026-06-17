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

### Scope of the `language` decision

The `language` decision governs **two distinct surfaces**, with different sources:

| Surface                                                                                                          | Source of language                                         |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **User-authored content** (card title, description, checklist items)                                             | Mirrors the **plan document's** language (verbatim)        |
| **Adapter-rendered strings** (attribution prefix, autonomous-mode system comments, error messages, init prompts) | Driven by `config.locale` in `.<tool>.json` (e.g. `pt-BR`) |

Adapters MUST NOT translate user-authored content — verbatim is the contract. If the plan is in Portuguese, cards stay in Portuguese; if mixed, cards stay mixed. The `config.locale` only governs strings the adapter itself emits.

**Why this split:** users author plans in whatever language fits the work (often mixing PT/EN technical terms). The adapter is not a translator. But the adapter IS the source of its own metadata (attribution, system comments), so those should match the user's preferred display locale.

## CRUD verb vocabulary

The 7 canonical verbs of v1, with their semantic invariants and idempotency rules, live in [`crud-vocabulary.md`](crud-vocabulary.md). Adapters map each verb to one or more MCP tool calls.

The 7th verb — `task.move` — was added in v1.5.0 (additive, non-breaking). Schema: `{ cardId: string, targetList: "open" | "wip" | "done" | string }`. The string tier accepts raw list IDs for adapter-specific cases; the enum tier handles named workflow states.

`task.move` is **independent** of `task.close`. `task.close` moves the card to a terminal state AND sets the completion flag (e.g., `dueComplete`, `completed`). `task.move` only repositions the card — useful when the visual transition and the closed-flag are separate operations in the adapter (e.g., Asana section change vs. `completed: true`).

## Custom verbs (extension API)

Adapters MAY declare custom verbs in addition to the 7 canonical verbs. Custom verbs MUST use a namespace prefix matching the tool name declared in the adapter's `manifest.json`. Examples:

- `trello.card.cover-image.set` — Trello-only feature.
- `linear.cycle.move` — Linear-only feature.
- `asana.section.move` — Asana-only feature.

Rules:

- Custom verbs MUST be declared in the adapter's `manifest.json` alongside the canonical verbs the adapter implements.
- Custom verbs MUST be documented in the adapter's `SKILL.md` (the grep cross-check in `scripts/contract-check.mjs` enforces this).
- Custom verbs MUST start with `<tool>.` (the namespace prefix equals the manifest's `tool` field) — `contract-check.mjs` rejects any custom verb that doesn't match its declared tool.
- Custom verbs do NOT replace canonical verbs. An adapter declaring `trello.card.cover-image.set` still must implement the 7 canonical verbs if it supports them.
- Consumers can branch on the manifest at runtime to discover which custom verbs an adapter supports.

The schema for `manifest.json` ([`pm-tasks-core/schemas/adapter-manifest.schema.json`](../schemas/adapter-manifest.schema.json)) accepts both canonical verbs and namespaced custom verbs via regex; the tool/namespace consistency check is enforced by `contract-check.mjs`.

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
