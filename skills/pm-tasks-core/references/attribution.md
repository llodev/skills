# Runtime attribution

Opt-in mechanism that stamps agent identity on `task.create` and `task.comment.add` operations. Disabled by default.

## Design rationale

**Why opt-in:** Attribution adds noise to every card and comment. Users who don't need it shouldn't pay for it — neither in visual clutter nor in token cost. Default-off preserves backwards compatibility: configs without an `attribution` block are valid and unchanged.

**Why locale-aware:** `commentPrefix` and `descriptionFooter` strings live in `pm-tasks-core/i18n` and follow the same `loadStrings(locale)` flow used by the rest of the init UX. Adapters never hardcode attribution text — they call `getAttribution()` which resolves locale, agent name, and mode in one call.

## Opt-in policy

Add an `attribution` block to `config.json` (`.trello.json`, `.asana.json`, etc.):

```jsonc
{
  "attribution": {
    "enabled": true, // default: false — must be explicitly set
    "includeAgentName": true, // default: true — append agent model name to prefix
    "autonomousOnly": false, // default: false — when true, suppress in interactive mode
  },
}
```

Field semantics:

| Field              | Default | Semantics                                                                                                                                                    |
| ------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `enabled`          | `false` | Master switch. If absent or `false`, no attribution strings are injected.                                                                                    |
| `includeAgentName` | `true`  | Appends `(claude-opus)` or equivalent to the prefix/footer strings.                                                                                          |
| `autonomousOnly`   | `false` | When `true`, strings are injected only in autonomous mode (`[autonomous]` sentinel present). Useful for supervised runs where human attribution is implicit. |

Backwards-compat: configs without an `attribution` block behave identically to `{ "attribution": { "enabled": false } }`.

## How adapters use it

Call `getAttribution({ locale, tool, agent, autonomous, config })` from `@llodev/pm-tasks-core/init-lib`.

Return shape:

```ts
{
  commentPrefix: string | null,       // prepend to task.comment.add text
  autonomousCommentPrefix: string | null, // used instead of commentPrefix in autonomous mode
  descriptionFooter: string | null    // append to task.create description body
}
```

Apply at write time:

- `task.comment.add` → prepend `commentPrefix` (or `autonomousCommentPrefix` if `[autonomous]` sentinel detected).
- `task.create` → append `descriptionFooter` to the `description`/`notes` field.

If `getAttribution()` returns `null` strings (attribution disabled), skip injection entirely — do not append empty strings.

## Worked examples

```js
// Normal interactive mode, attribution enabled
const attr = getAttribution({
  locale: "en",
  tool: "trello",
  agent: "claude-opus",
  autonomous: false,
  config: { attribution: { enabled: true, includeAgentName: true, autonomousOnly: false } },
});
// attr.commentPrefix       → "🤖 claude-opus — "
// attr.descriptionFooter   → "\n\n---\n_Created by claude-opus via pm-tasks._"

// Autonomous mode — prefix switches automatically
const attrAuto = getAttribution({ ...opts, autonomous: true });
// attrAuto.autonomousCommentPrefix → "🤖 [auto] claude-opus — "

// Attribution disabled (default)
const attrOff = getAttribution({ ...opts, config: {} });
// attrOff.commentPrefix       → null  (no injection)
// attrOff.descriptionFooter   → null

// autonomousOnly: true, interactive run → suppress
const attrAutoOnly = getAttribution({
  ...opts,
  autonomous: false,
  config: { attribution: { enabled: true, autonomousOnly: true } },
});
// attrAutoOnly.commentPrefix → null
```

## Cross-references

- [`contract.md`](contract.md) — parent reference; defines the result envelope and CRUD verb contract.
- [`crud-vocabulary.md`](crud-vocabulary.md) — verb semantics for `task.create` and `task.comment.add`.
- [`autonomous-mode.md`](autonomous-mode.md) — autonomous mode activation, allowlist gate, and per-task lifecycle.
