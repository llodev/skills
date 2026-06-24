# Agent-agnostic lint rule

## Intent

The pm-tasks family must work with any coding agent or IDE. SKILL.md body content (the prose users and agents read) must NOT assume a specific framework, orchestration mode, or vendor agent. Frontmatter metadata may declare compatibility with specific agents; vendor product references for MCP servers are also allowed. This document defines the rule that enforces the boundary.

## What is banned (in body content)

Banned patterns — exact strings, case-sensitivity noted per row.

| Pattern          | Reason                                        | Notes                                           |
| ---------------- | --------------------------------------------- | ----------------------------------------------- |
| `superpowers`    | Specific orchestration framework              | case-insensitive                                |
| `sdd`            | Specific orchestration framework abbreviation | case-insensitive, word-boundary-anchored        |
| `Claude Code`    | Specific agent product name                   | case-sensitive (allow generic `claude` in URLs) |
| `Claude-only`    | Agent-specific assumption                     | case-sensitive                                  |
| `Claude assumes` | Agent-specific narrative                      | case-sensitive                                  |

## What is allowed (explicit exemptions)

The patterns below are NOT treated as violations even when their substring would otherwise match a banned entry. The script suppresses a hit when any allowlist regex matches the same line.

| Exemption                                          | Where                                                      | Why                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------- |
| `claude-code`                                      | `compatibility.agents` array in SKILL.md frontmatter       | Metadata tag identifying agent support, not body prose                 |
| `claude.ai` (any vendor product mention)           | Body content of pm-tasks-asana SKILL.md and references     | Vendor product name for the official Asana MCP server                  |
| `claude-ai-asana-mcp`                              | Body content of pm-tasks-asana SKILL.md and references     | npm package name for the Asana MCP integration                         |
| `MCP setup — Claude Code`                          | Section header in pm-tasks-trello/references/mcp-config.md | Multi-agent setup guide section listing CLI commands per agent product |
| `Claude Code does NOT interpolate`                 | CLI behavior note in MCP-config docs                       | Concrete vendor-CLI behavior contributors must know                    |
| `Claude Code marketplace`                          | pm-tasks-core/references/contract.md                       | Vendor product reference for the skillpm cascade                       |
| Other MCP server package names containing `claude` | Body content, in MCP-config or operations contexts         | Vendor naming, not framework coupling                                  |

Frontmatter (everything between the opening `---\n` and the closing `\n---\n` on the file's first lines) is always exempt — that's where compatibility tags live.

## Scope

The rule applies to:

- `pm-tasks/pm-tasks-*/SKILL.md` (body content; frontmatter exempt per above)
- `pm-tasks/pm-tasks-*/references/**/*.md`
- `pm-tasks/pm-tasks-*/anti-patterns/**/*.md`

The rule does NOT apply to:

- Top-level `README.md` (general project docs may mention any agent)
- `docs/**` (free-form docs, plan files, etc.)
- `.superpowers/**` (workflow scratchspace)
- Source code files (`.ts`, `.js`, `.json`)
- This file itself (which obviously contains the banned patterns by necessity — the script self-exempts any path ending in `/agent-agnostic-lint.md`)

## Implementation

The rule is implemented as `scripts/checks/agent-agnostic-lint.mjs`, runnable via:

```bash
node scripts/checks/agent-agnostic-lint.mjs
```

Exit codes:

- `0` — no violations
- `1` — one or more violations (each printed as `<path>:<line>  <pattern>  → <snippet>`)
- `2` — unexpected runtime error (stack printed to stderr)

The script is plain Node ESM with zero external dependencies. Three editable constants control its behavior, all near the top of the file:

- `BANNED` — list of `{ name, regex }` entries; add a new banned pattern by appending an entry
- `ALLOWLIST` — list of regexes that suppress a hit when matched on the same line; add a focused regex here for a legitimate vendor mention rather than relaxing a banned pattern
- The file-discovery walk (`findMatchingFiles`) hard-codes the scope above; widen by editing the loop

### Extending the allowlist

When a contributor adds a legitimate vendor mention (e.g. a new MCP server whose name contains `claude`), the preferred fix is a NARROW allowlist entry — never broaden an existing pattern. Example:

```js
const ALLOWLIST = [
  // ...existing entries...
  /my-new-claude-vendor-package/, // npm package for X MCP server
];
```

The comment beside each entry MUST explain why the exemption exists; future contributors should be able to audit the allowlist in one read.

### Wiring into `make validate`

The script is intentionally NOT yet invoked by `make validate`. Phase 6 of the v1.9.0 release task wires it in, after the SKILL.md updates in Phase 5 have settled and the allowlist is stable. To wire it manually for local checks until then:

```bash
node scripts/checks/agent-agnostic-lint.mjs
```

Once the Phase 6 wiring lands, the `validate` pnpm script will invoke this check alongside `validate-frontmatter`, `validate-schemas`, and `validate-links`.
