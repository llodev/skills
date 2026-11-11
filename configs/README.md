# configs

Tool configuration shared by more than one package. A config only one package uses stays next to that package's `package.json`, where the tool looks for it.

| Path                                                             | Used by                                                                                    | What it holds                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| [`typescript/tsconfig.base.json`](typescript/tsconfig.base.json) | the root `tsconfig.json` and every package `tsconfig.json` under `skills/` and `packages/` | ES2022 target, NodeNext modules, `strict`, declarations and source maps |

Root-level tool files stay at the root because the tools only look there: `tsconfig.json` (the `tsc -b` solution), `eslint.config.js`, `vitest.config.ts`, `.prettierrc.json`, `.prettierignore`, `lefthook.yml`. The `size-limit` budgets live in the root `package.json`.

When you add a config here, list it in this table and point every consumer at it in the same change.
