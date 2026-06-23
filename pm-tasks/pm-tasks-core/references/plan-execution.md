# Plan-execution mode

When a calling agent passes a plan reference to a `pm-tasks-<tool>` adapter, the adapter loads its config, discovers which plan tasks already exist as cards/tasks in the PM tool, and returns a triage report. The calling agent decides what to do with each bucket — this skill never drives the agent's task loop.

This document is the authoritative contract for Plan-execution mode in v1.9.0. The runtime helpers (`requireConfig`, `discoverPlanTasks`) live in `@llodev/pm-tasks-core`. Each adapter wires its own MCP transport and config schema; the contract below applies uniformly.

## Triggers

A skill enters Plan-execution mode when ANY of:

- The prompt includes a plan file path (typically `docs/plans/*.md` or another `.md` file containing the plan)
- The prompt includes the `--plan-exec` flag
- The prompt references a plan slug paired with an already-loaded `.<tool>.json` config

No agent-specific framework signal is used. The mode is detected purely from the prompt's plan-related vocabulary; the calling agent need not announce itself.

## Discovery contract

Discovery is a two-step operation:

1. `requireConfig({ configPath, tool, schema? })` loads + (optionally) validates the adapter config. On any failure it throws `ConfigRequiredError` (see § ConfigRequiredError below) — discovery does not proceed without a valid config.
2. `discoverPlanTasks({ planRef, listOpenTasks })` fetches all open tasks in scope via the caller-supplied lister and matches them against the plan reference.

The adapter owns the `listOpenTasks` callback: it knows which MCP tool to invoke (`mcp__trello__trello_get_board_cards`, `mcp__claude_ai_Asana__get_tasks`, etc.) and which scope filters to apply. `pm-tasks-core` stays adapter-agnostic — it only consumes the `DiscoveredTask[]` the callback returns.

### Matching rules

Exact, case-sensitive, no fuzzy:

| Outcome   | Condition                                  | Surfaced in                     |
| --------- | ------------------------------------------ | ------------------------------- |
| Found     | exactly one task with `title === expected` | `found: DiscoveredTask[]`       |
| Missing   | zero tasks with matching title             | `missing: string[]`             |
| Ambiguous | two or more tasks with matching title      | `ambiguous: DiscoveredTask[][]` |

For **bare-slug mode** (planRef is a string with no `.md` extension), the helper instead returns ALL tasks whose `description` includes the `[plan:<slug>]` marker — no expected-titles loop runs, and `missing` and `ambiguous` are not populated (they remain empty arrays).

### PlanRef forms

| `planRef` value                                              | Behavior                                                                                                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `string[]` (e.g. `["Task A", "Task B"]`)                     | Use the array directly as expected titles. Exact match.                                                                                         |
| String ending in `.md` (e.g. `docs/plans/2026-06-22-foo.md`) | Read file. Parse H3 (`### …`) headings as expected titles. Derive slug from filename (strips leading `YYYY-MM-DD-` prefix and `.md` extension). |
| Bare slug (e.g. `headless-runtime`)                          | No expected titles. Collect all open tasks bearing the `[plan:<slug>]` marker in description.                                                   |

The `DiscoveredTask` shape returned by the lister:

```ts
interface DiscoveredTask {
  id: string;
  title: string;
  description?: string;
}
```

The `DiscoveryResult` shape returned by `discoverPlanTasks`:

```ts
interface DiscoveryResult {
  found: DiscoveredTask[];
  missing: string[];
  ambiguous: DiscoveredTask[][];
}
```

### The `listOpenTasks` callback contract

The callback is invoked exactly once per `discoverPlanTasks` call. It must:

- Return only **open** tasks in the relevant scope (whatever "open" + "scope" mean for the adapter — closed/archived cards should be filtered out before returning).
- Return tasks with stable `id` strings; the calling agent uses these ids verbatim to address subsequent verbs (`task.close`, `checklist.check`, …).
- Surface MCP/network errors by rejecting the promise — `discoverPlanTasks` does not retry, it re-raises so the calling agent can decide whether to back off.

Pagination, scope filters, and authentication are entirely the callback's concern. `discoverPlanTasks` treats the returned array as the complete universe of candidates.

### Slug derivation edge cases

`filenameToSlug` strips a leading `YYYY-MM-DD-` prefix and the `.md` extension, but leaves the rest of the basename intact. Two specifics worth knowing:

- `docs/plans/2026-06-22-headless-runtime.md` → slug `headless-runtime`
- `docs/plans/refactor-auth.md` → slug `refactor-auth` (no date prefix, returned as-is)
- `docs/plans/2026-06-22.md` → slug is the empty string; the `[plan:<slug>]` marker becomes `[plan:]`, which is unlikely to match anything useful. Calling agents should reject empty slugs upstream.

The matching marker convention (`[plan:<slug>]` in the task description) is recognized by `discoverPlanTasks` only when planRef is a bare slug (or when called directly with the slug derived from a `.md` file path). It is the **calling agent's** responsibility to insert that marker into the description of any task it creates from the plan.

## ConfigRequiredError

`requireConfig` throws `ConfigRequiredError` (subclass of `Error`) when:

| `error.code`       | Trigger                                  | Recovery                                                                                       |
| ------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `MISSING`          | File does not exist (ENOENT)             | run `npx @llodev/pm-tasks-<tool> init`                                                         |
| `INVALID_JSON`     | File exists but `JSON.parse` fails       | open the file in an editor; fix syntax                                                         |
| `SCHEMA_VIOLATION` | JSON parses but fails the adapter schema | run `npx @llodev/pm-tasks-<tool> init` to regenerate, OR fix the field cited in `error.errors` |

Fields on every thrown instance:

| Field      | Type                                                | Notes                                                                                                         |
| ---------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `name`     | `"ConfigRequiredError"`                             | Standard `Error.name`                                                                                         |
| `code`     | `"MISSING" \| "INVALID_JSON" \| "SCHEMA_VIOLATION"` | Branch on this; do NOT parse `message`                                                                        |
| `toolPath` | `string`                                            | The configPath the helper tried to read                                                                       |
| `tool`     | `string`                                            | e.g. `"trello"` or `"asana"`                                                                                  |
| `hint`     | `string`                                            | Human-readable recovery suggestion (always references the correct `npx @llodev/pm-tasks-<tool> init` command) |
| `errors`   | `unknown[] \| null \| undefined`                    | ajv errors on `SCHEMA_VIOLATION`; absent on other codes                                                       |
| `message`  | `string`                                            | Full prose: `pm-tasks-core: config <reason> at <toolPath> — <hint>`                                           |

Calling-agent recovery pattern (pseudocode):

```ts
try {
  const config = await requireConfig({ configPath, tool: "trello" });
  // proceed
} catch (e) {
  if (e instanceof ConfigRequiredError) {
    // surface e.hint to the user, suggest the init command, do NOT proceed
  } else {
    // unknown I/O error — propagate
  }
}
```

The `schema` option is intentionally caller-supplied — `pm-tasks-core` does not auto-load adapter schemas. Adapters typically read `pm-tasks-<tool>/schemas/config.json` from their own package and pass the parsed object as `opts.schema`.

## Failure modes

| Failure                                               | Where it surfaces                                                  | Caller action                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `ConfigRequiredError{code: MISSING}`                  | `requireConfig` throws                                             | Surface the init hint; abort discovery                                                |
| `ConfigRequiredError{code: INVALID_JSON}`             | `requireConfig` throws                                             | Surface "JSON syntax error"; suggest opening the file                                 |
| `ConfigRequiredError{code: SCHEMA_VIOLATION}`         | `requireConfig` throws                                             | Surface `error.errors` cited fields; suggest re-running init                          |
| `DiscoveryResult{missing: [...]}`                     | `discoverPlanTasks` returns                                        | Create missing cards via standard `task.create` flow (Phase 4/5 of the adapter skill) |
| `DiscoveryResult{ambiguous: [[…], …]}`                | `discoverPlanTasks` returns                                        | Prompt the user to pick the correct card per ambiguous group; do not auto-resolve     |
| `listOpenTasks` callback rejects                      | `discoverPlanTasks` throws (re-raises)                             | MCP / network failure surfaced verbatim; calling agent retries or aborts              |
| Empty plan (no H3 in `.md` file, or empty `string[]`) | `discoverPlanTasks` returns `{found:[], missing:[], ambiguous:[]}` | Calling agent treats this as "no work to do"                                          |

Unexpected filesystem errors during `requireConfig` (anything other than ENOENT — e.g. EACCES, EISDIR) are re-thrown unchanged. They are NOT wrapped in `ConfigRequiredError`; the calling agent receives the raw `NodeJS.ErrnoException`. This split keeps the structured-error contract small: only the three documented `code` values appear on `ConfigRequiredError`, and everything else is an unforeseen I/O fault.

### Idempotency expectations

Discovery is read-only and side-effect-free — calling `discoverPlanTasks` twice with the same arguments returns the same triage (modulo concurrent edits to the underlying board). Calling agents may safely re-run discovery between task executions to re-check the state of `ambiguous` or `missing` buckets the user has resolved out-of-band.

## Hook contract (Phase 5 forward-reference)

Discovery is the **read** side of plan-execution mode. The **write** side — checking off checklist items, posting per-task progress comments, moving cards across lists at task boundaries — lands in Phase 5 as boundary hooks (`onTaskStart`, `onTaskComplete`).

The Phase 5 hook contract:

- `onTaskStart({ adapter, task })` — typically moves the card to the WIP list (if `lists.wip` is configured) and posts a "started" comment; idempotent if called twice.
- `onTaskComplete({ adapter, task, commitSha, branch })` — runs the standard verb sequence: `checklist.check` matching item, `task.move` to done list, `task.comment.add` with commit metadata, `task.close`. Idempotency is enforced by per-verb state guards plus the `[ct:<commitSha>]` marker on comments.

Hooks are caller-invoked — this skill does not auto-fire them. The calling agent decides when each hook runs (typically at the start/end of each plan task it executes).

Full hook contract: see `pm-tasks/pm-tasks-core/references/plan-execution-hooks.md` (added in v1.9.0 by Phase 5).

## Examples

### Example 1 — explicit task titles

```ts
import { requireConfig, discoverPlanTasks, ConfigRequiredError } from "@llodev/pm-tasks-core";
import { createTrelloTransport } from "@llodev/pm-tasks-trello";

const config = await requireConfig({ configPath: ".trello.json", tool: "trello" });
const transport = createTrelloTransport({ mcp: yourMcpCaller });

const triage = await discoverPlanTasks({
  planRef: ["Implement auth", "Write tests", "Ship docs"],
  listOpenTasks: async () => /* call mcp__trello__trello_get_board_cards via yourMcpCaller */ [],
});

console.log(triage.found.length, "tasks already exist");
console.log(triage.missing, "need to be created");
```

### Example 2 — plan file with discovered slug

```ts
const triage = await discoverPlanTasks({
  planRef: "docs/plans/2026-06-22-headless-runtime.md",
  listOpenTasks: async () => /* … */ [],
});
// expectedTitles parsed from H3 headings in the file
// slug = "headless-runtime" (auto-derived for the [plan:<slug>] marker convention)
```

### Example 3 — bare slug for marker-based collection

```ts
const triage = await discoverPlanTasks({
  planRef: "headless-runtime",
  listOpenTasks: async () => /* … */ [],
});
// triage.found contains every task whose description includes "[plan:headless-runtime]"
// triage.missing and triage.ambiguous are empty arrays (no expected-titles loop runs)
```

## Hooks

The plan-execution module exposes two callable hooks for the calling agent
to invoke at task boundaries:

- `onTaskStart({ adapter, task, auditLogPath?, tool?, session? })` — moves
  the task's card to the configured "work in progress" list. If
  `task.listsWipId` is absent, returns a no-op and (when audit context is
  fully provided) appends one WARN audit entry. Always returns
  `{ ok, performed, skipped }`. Never throws.

- `onTaskComplete({ adapter, task, commitSha, branch? })` — runs the
  task-completion 4-verb sequence: optional `checklist.check` → `task.move`
  to the done list → `task.comment.add` (with `clientToken: commitSha` so
  the transport prepends the persistent `[ct:<commitSha>]` dedup marker) →
  `task.close`. Always returns `{ ok, performed, skipped }`. Never throws.

### Result classification

For each verb call, the result is classified into `performed` or `skipped`:

| Transport result                                 | Classification         | Effect on overall `ok` |
| ------------------------------------------------ | ---------------------- | ---------------------- |
| `{ ok: true, data }`                             | `performed.push(verb)` | unchanged              |
| `{ ok: false, code: "ALREADY_IN_STATE" }`        | `skipped.push(verb)`   | unchanged              |
| `{ ok: false, code: other }` or thrown exception | `skipped.push(verb)`   | flips to `false`       |

Best-effort dispatch: a failed verb does NOT abort the remaining sequence.
The caller reads `ok` first; `performed` and `skipped` distinguish the
outcome of each individual verb.

### Idempotency

`onTaskComplete` is idempotent within a single process. A repeat call with
the SAME `task.id` AND SAME `commitSha` short-circuits and returns:

```
{ ok: true, performed: [], skipped: ["checklist.check", "task.move",
  "task.comment.add", "task.close"] }
```

The short-circuit is gated by a process-local memo that records only
successful completions (`ok === true`). A prior call that hard-failed (any
verb returned a code other than `ALREADY_IN_STATE`, or threw) leaves the
memo unset, so the next call re-attempts the full sequence.

The cross-process / cross-session trail is the `[ct:<commitSha>]` marker
the transport prepends to the comment body. A future enhancement may
layer a transport-level `listComments` lookup on top of this marker to
extend the dedup guarantee beyond a single process; that is out of scope
for v1.9.0.

For tests, the memo can be reset via the exported
`__resetHookCacheForTests()` escape hatch. Production code should never
call it.

## See also

- `pm-tasks/pm-tasks-core/references/contract.md` — verb-level contract
- `pm-tasks/pm-tasks-core/references/audit-log-format.md` — audit entries every verb writes
- `pm-tasks/pm-tasks-core/references/crud-vocabulary.md` — the 7 canonical verbs
