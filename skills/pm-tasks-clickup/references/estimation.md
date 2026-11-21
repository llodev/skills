# ClickUp estimation

How `task.estimate.set` works in `@llodev/pm-tasks-clickup`. Estimation records **effort**, never a calendar deadline. All verbs return the core result envelope; see [`../../pm-tasks-core/references/contract.md`](../../pm-tasks-core/references/contract.md).

## Pass the config yourself

The core runtime passes the request through and does **not** read `.clickup.json` for you. The request is `{ taskId, input, config }`, and `config` must be the `estimation` block of `.clickup.json` (in TypeScript, cast it to core's `EstimationConfig`: the ClickUp block carries `clickupTarget` instead of `jiraTarget`).

```ts
const { estimation } = JSON.parse(await readFile(".clickup.json", "utf8"));
await runtime.taskEstimateSet({ taskId, input: 2, config: estimation as EstimationConfig });
```

On/off, checked before anything else:

- `.clickup.json` has no `estimation` block, or it says `enabled: false`, or the request `config` says `enabled: false` → `NOT_APPLICABLE`, `reason: "estimation_disabled"`.
- Estimation on but no request `config` → `INVALID_REQUEST`, `reason: "estimation_config_required"`.

## Strategies

| Strategy         | Input                                                                                     | Native `time_estimate`            | `est:` tag (example)         |
| ---------------- | ----------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------- |
| `story_points`   | number (points snap to `scale` when set; `init` writes one)                               | never                             | `3` → `est:3`                |
| `fibonacci`      | number (points snap to `scale` when set; `init` writes one)                               | never                             | `5` → `est:5`                |
| `planning_poker` | number (points snap to `scale` when set; `init` writes one)                               | never                             | `8` → `est:8`                |
| `affinity`       | number (points snap to `scale` when set; `init` writes none)                              | never                             | `3` → `est:3`                |
| `t_shirt`        | a key of `sizeMap`                                                                        | never                             | `M` → `est:m`                |
| `three_point`    | `{ optimistic, likely, pessimistic }` (PERT value snaps to `scale` when set, else rounds) | never                             | → `est:o-1-m-2-p-4`          |
| `ideal_hours`    | number                                                                                    | hours × 60 minutes                | `2` → `est:2-ideal-hours`    |
| `ideal_days`     | number                                                                                    | days × `hoursPerDay` × 60 minutes | `1.5` → `est:1-5-ideal-days` |

The tag records the value as given. For point strategies, `normalized.points` (snapped to `scale` when one is set) comes back in the result, but the adapter writes no native points field: ClickUp's native estimate is a duration. An input of the wrong kind for the strategy is `INVALID_REQUEST`, `reason: "invalid_estimate"`.

## `clickupTarget`

| `clickupTarget` | Writes                                                                             |
| --------------- | ---------------------------------------------------------------------------------- |
| `time`          | `time_estimate` for `ideal_hours` / `ideal_days`, on leaf tasks only, plus the tag |
| `none`          | the tag only                                                                       |

`init` proposes `time` for the time strategies (the user may pick `none`) and writes `none` for every other strategy. `time` with a point strategy is harmless (only the tag is written) but the doctor's C-CLK-4 warns about it. Switching from `time` to `none` stops future native writes; it does not clear an estimate already on a task.

## Leaf-only native estimate

`time_estimate` is written only when the task has no subtasks (`subtasks_count === 0` on a plain `clickup_get_task`). A task with subtasks gets the tag only, and the result says `fieldWritten: null`.

Why: ClickUp keeps a parent's own `time_estimate` when children are added (the API field does not roll up), while spaces with time-estimate roll-up show the parent's own estimate plus its children's in views. Writing both double counts.

Consequences:

- In Phase 5, create the subtasks **before** estimating, or the parent is still a leaf and receives a native estimate.
- A leaf estimated earlier keeps its estimate after it gains children. Remove it in the ClickUp UI if the roll-up view double counts.

## The `est:<slug>` tag

`slug` = the readable value lowercased, every run of characters outside `[a-z0-9]` turned into one `-`, leading and trailing `-` removed. A value with no letter or digit is `invalid_estimate`.

Write sequence (each step only when needed):

1. Read the task once: tags, `subtasks_count`, `space.id`, current `time_estimate`.
2. Native estimate (time target, time strategy, leaf, value differs) → `clickup_update_task {task_id, time_estimate: "<whole minutes>"}`.
3. Every other `est:*` tag → `clickup_remove_tag_from_task` (ClickUp matches tag names case-insensitively).
4. Tag missing → `clickup_create_space_tag {space_id, name}` (returns `created: false` when the tag already exists in the space; ClickUp lowercases the name), then `clickup_add_tag_to_task {task_id, tag_name}`.

Exactly one `est:*` tag remains. Re-running with the same input writes nothing. `fieldWritten` is `"time_estimate"` whenever the native estimate applies, even when it already matched and no write was needed.

## `hoursPerDay`

Hours in one ideal day for `ideal_days`. Default **6** (core's focused day). Must be a number from 1 to 24, else `INVALID_REQUEST`, `reason: "invalid_hours_per_day"`. Minutes are rounded to a whole minute and must be at least 1 (`invalid_estimate` for zero or a negative input).

## Partial failure

When a step fails after an earlier step wrote something, the result names what landed:

```json
{
  "ok": false,
  "code": "MCP_ERROR",
  "details": {
    "message": "<server message>",
    "verb": "task.estimate.set",
    "partial": true,
    "applied": ["time_estimate", "tag_remove", "tag_create"],
    "failedStep": "tag_add"
  }
}
```

Steps are `time_estimate`, `tag_remove`, `tag_create`, `tag_add`, in that order; `tag_create` always runs right before `tag_add`, so a failed `tag_add` always lists `tag_create` in `applied`. `AUTH_ERROR` and `RATE_LIMITED` keep their code (still with `partial: true`) so you know to reconnect or wait. A failure before any write is the plain classified failure, without `partial`. Recovery: re-run the same call; it is idempotent and completes only what is missing.

## `.clickup.json` estimation block

```jsonc
{
  "estimation": {
    "enabled": true, // written by init; false (or no block) → NOT_APPLICABLE
    "strategy": "ideal_hours", // one of the strategies above
    "clickupTarget": "time", // "time" | "none"
    "hoursPerDay": 6, // optional, 1–24, used by ideal_days
    "scale": [1, 2, 3, 5, 8, 13], // optional; init writes it for story_points, fibonacci, planning_poker
    "sizeMap": { "XS": 1, "S": 2, "M": 3, "L": 5, "XL": 8 }, // t_shirt only
  },
}
```

## Errors

| Code / `reason`                                  | When                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| `NOT_APPLICABLE` / `estimation_disabled`         | No `estimation` block, or `enabled: false` (config or request)              |
| `INVALID_REQUEST` / `estimation_config_required` | Estimation on, request without `config`                                     |
| `INVALID_REQUEST` / `invalid_hours_per_day`      | `hoursPerDay` outside 1–24 or not a number                                  |
| `INVALID_REQUEST` / `invalid_estimate`           | Input does not fit the strategy, rounds to zero minutes, or has no tag slug |
| `INVALID_REQUEST` / `id_required`                | Blank `taskId`                                                              |
| `MCP_ERROR` with `partial: true`                 | A step failed after an earlier write (above)                                |
