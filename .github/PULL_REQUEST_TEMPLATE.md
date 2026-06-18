## Summary

<one-paragraph description of what this PR does and why>

## Version bumps

| Package                    | Before | After | Reason                            |
| -------------------------- | ------ | ----- | --------------------------------- |
| `@llodev/pm-tasks-core`    | x.y.z  | x.y.z | unchanged / patch / minor / major |
| `@llodev/pm-tasks-asana`   | x.y.z  | x.y.z | unchanged / patch / minor / major |
| `@llodev/pm-tasks-trello`  | x.y.z  | x.y.z | unchanged / patch / minor / major |
| `@llodev/pm-tasks-testkit` | x.y.z  | x.y.z | unchanged / patch / minor / major |
| `@llodev/pm-tasks` (meta)  | x.y.z  | x.y.z | unchanged                         |

## Test plan

- [ ] `pnpm validate` green
- [ ] `pnpm test` green
- [ ] `pnpm run typecheck` green (if TS code changed)
- [ ] Tarball snapshot updated if `files` field changed
- [ ] Tested manually: <describe>

## Skill-judge note

(Only fill if any `SKILL.md` was touched.) See `CONTRIBUTING.md` § SKILL.md edits & the skill-judge gate.

- Score delta vs baseline: Δ = <value>
- Action taken: ratchet / bypass with `SKIP_SKILL_JUDGE_GATE=1` / no action needed (no SKILL.md change)
- Justification: <one-liner>

## Out of scope

<what this PR explicitly does NOT change>

## Related

- Roadmap row: <e.g., §2.3 H1>
- Trello card: <link or N/A>
