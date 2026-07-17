# Examples — ts-ddd-use-case

Self-contained TypeScript files that mirror the conventions enforced by `SKILL.md` and `references/use-case-pattern.md`. They do not depend on the real `apps/api` codebase — the imports are illustrative, all collaborators are inlined so the file type-checks in isolation when copy-pasted into a TS playground with the listed package names stubbed.

| File                                 | Purpose                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `create-greeting.usecase.example.ts` | Canonical create-use-case + a fake in-memory repository + a Jest test using enum members from contracts. |

Use these as templates when scaffolding a new BC: rename `Greeting` → `<YourAggregate>`, swap the enum, point the imports at your real contracts package + repository port.
