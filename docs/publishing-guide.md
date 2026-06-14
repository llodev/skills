# Agent Skills Publishing Guide

> **Language**: this guide is maintained in English (canonical). Translations
> follow the convention `<basename>.<lang-code>.md` — e.g., `publishing-guide.pt-BR.md`,
> `publishing-guide.es.md`. The same applies to other docs and to `SKILL.md` files
> within published skills (`SKILL.pt-BR.md`, `README.es.md`, etc.).

> Generic, tool-agnostic reference. The patterns here apply to any Agent Skill repo — not specific to this monorepo's layout.

Reference guide for authoring and publishing **Agent Skills** — portable packages of instructions/context that extend the behavior of AI agents (Claude Code, Cursor, Copilot, Codex, Gemini CLI, Windsurf, Cline, Roo Code, etc.).

---

## 1. What is a Skill (in 30 seconds)

A skill is, at minimum, **a folder with a `SKILL.md` file**. `SKILL.md` is a markdown file with **YAML frontmatter** that the agent reads to decide _when_ to activate the skill and _how_ to execute the task.

The format is an **open standard** published by Anthropic at `agentskills.io` (Dec/2025), supported by 40+ agents. Vercel maintains `skills.sh` as the public directory/leaderboard; SkillsMP indexes via GitHub (~350k skills in 2026); skillpm and skills-npm bring the model to the npm registry.

There are **three distribution channels** working today — you can use one, two, or all three for the same skill:

| Channel                            | How to install                                           | When to use                                                                       |
| ---------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Git + skills.sh** (Vercel)       | `npx skills add owner/repo`                              | Default. No submission flow; appears on skills.sh via install telemetry.          |
| **npm + skillpm/skills-npm**       | `npx skillpm install <pkg>` or bundle via `node_modules` | When the skill ships with an SDK/lib; gets semver, lockfile, audit, npm registry. |
| **Claude Code plugin marketplace** | `/plugin marketplace add <repo>`                         | When you want to bundle skills + hooks + MCP + agents together.                   |

---

## 2. Anatomy of a Skill

### 2.1 Minimal layout

```
my-skill/
└── SKILL.md
```

### 2.2 Recommended layout (a "real" skill)

```
my-skill/
├── SKILL.md           # required — frontmatter + main instructions
├── README.md          # human documentation (not read by the agent)
├── LICENSE            # MIT or Apache-2.0 (see section 5)
├── package.json       # optional — only if publishing via npm/skillpm
├── scripts/           # optional — executable helpers (bash, node, python)
├── references/        # optional — long docs, checklists, templates loaded on demand
├── assets/            # optional — static templates, sample configs, diagrams
└── examples/          # optional — input/output pairs
```

**Why separate?** `SKILL.md` enters the agent's context every time the skill is considered. Long/conditional content lives in `references/` and is only loaded when an instruction in `SKILL.md` says so — direct token savings.

### 2.3 `SKILL.md` frontmatter

**Required:**

```yaml
---
name: my-skill # kebab-case, unique within your scope
description: Does X for Y projects. Use when the user asks for X or mentions Y.
---
```

- `name` — kebab-case identifier (lowercase + hyphens).
- `description` — **explains what it does AND when to use it**. This is the string the agent reads to decide whether to activate the skill. Start with the verb, mention triggers.

**Optional (part of the portable spec):**

```yaml
license: MIT
compatibility:
  agents: ["claude-code", "cursor", "codex"]
metadata:
  version: 1.2.0 # semver — not required by the spec, but a strong convention
  tags: ["typescript", "ddd"]
allowed-tools: ["Read", "Edit", "Bash"] # experimental, support varies per agent
```

### 2.4 `SKILL.md` body

A structure that works well:

```markdown
# Skill Name

One line about the goal.

## When to use

- Trigger 1
- Trigger 2
- Do NOT use when...

## Step by step

1. ...
2. ...

## Examples

- Input: ... → Output: ...

## References

- See references/<file>.md for case X
```

---

## 3. Conventions

| Item                    | Standard                                                                  |
| ----------------------- | ------------------------------------------------------------------------- |
| Skill name (and folder) | `kebab-case`, no prefix (`auth-flow` OK, not `agent-skill-auth-flow`)     |
| Versioning              | **semver** (`1.0.0`) in git tags and/or `package.json`/`metadata.version` |
| Main branch             | `main`                                                                    |
| Git repository          | 1 repo per skill, public on GitHub (required for `skills.sh` to index)    |
| Human README            | yes, separate from `SKILL.md` (that one is for the agent, not for humans) |
| Changelog               | `CHANGELOG.md` in "Keep a Changelog" — optional but recommended           |
| CI                      | GitHub Actions linting `SKILL.md` (valid frontmatter, broken links)       |

---

## 5. License

The ecosystem has converged on two options:

- **MIT** — used by `skillpm` and most community skills. More permissive. **Recommended** if you want maximum adoption.
- **Apache-2.0** — used by Anthropic's official open-source skills. Has an explicit patent clause — recommended if the skill contains anything potentially patentable.

**Avoid:** GPL/AGPL — friction for commercial use, low adoption in the skill ecosystem.

Place a `LICENSE` at the root of the skill **and** the `license: MIT` (or `Apache-2.0`) field in the `SKILL.md` frontmatter.

---

## 6. Step by step: from zero to published

### 6.1 Prerequisites

```bash
# nothing needs to be installed globally — everything runs via npx
node --version    # >= 18
git --version
gh --version      # GitHub CLI, optional but helpful
```

### 6.2 Scaffold the skill

Inside this workspace:

```bash
cd ~/Workspace/skills
npx skills init my-skill
cd my-skill
```

This creates `my-skill/SKILL.md` from the Vercel template.

### 6.3 Edit `SKILL.md`

Fill in the frontmatter (`name`, `description`) and the body. Keep `SKILL.md` lean — move details to `references/`.

### 6.4 Add extra files as needed

```bash
mkdir scripts references assets examples
touch README.md LICENSE CHANGELOG.md
```

### 6.5 Initialize the git repository

```bash
git init -b main
git add .
git commit -m "feat: initial commit"

# Create the repo on GitHub (requires gh CLI logged in)
gh repo create llodev/my-skill --public --source=. --remote=origin --push
```

### 6.6 Publish (pick one or more channels)

#### Channel A — Git + skills.sh (default, simplest)

There is no "publish" command. The public repo just needs to exist. From that moment on, anyone can install via:

```bash
npx skills add llodev/my-skill
```

`skills.sh` picks up the repo via install telemetry. To make it appear sooner, run the first install yourself in any project.

#### Channel B — npm via skillpm (semver, lockfile)

Add a `package.json` at the root of the skill:

```json
{
  "name": "@llodev/my-skill",
  "version": "0.1.0",
  "description": "Does X for Y projects.",
  "license": "MIT",
  "files": ["SKILL.md", "scripts", "references", "assets"],
  "repository": "github:llodev/my-skill",
  "keywords": ["agent-skill", "claude-code", "cursor"]
}
```

Publish:

```bash
npm login
npm publish --access public
```

Users install with:

```bash
npx skillpm install @llodev/my-skill
# or, with skills-npm (antfu): add it to package.json and run
npx skills-npm
```

#### Channel C — Claude Code plugin marketplace

To bundle the skill as a plugin (alongside hooks/MCP/agents if you want), create `.claude-plugin/marketplace.json` in an aggregator "marketplace" repo:

```json
{
  "name": "llodev",
  "owner": { "name": "llodev", "email": "lloliveira.dev@gmail.com" },
  "plugins": [
    {
      "name": "my-skill",
      "source": "github:llodev/my-skill",
      "description": "Does X for Y projects.",
      "version": "0.1.0"
    }
  ]
}
```

Users add it with:

```
/plugin marketplace add llodev/skills
/plugin install my-skill
```

### 6.7 Subsequent releases

```bash
# bump version (updates package.json AND metadata.version in SKILL.md)
npm version patch     # or minor/major

git push --follow-tags
npm publish           # if using channel B

# create GitHub Release with notes
gh release create v0.1.1 --generate-notes
```

To automate the cycle (AI-generated changelog + npm publish + GitHub release), use Vercel's own `autoship` skill:

```bash
npx skills add vercel-labs/autoship
```

---

## 7. Useful `skills` CLI commands

```bash
npx skills init [name]              # scaffold a new skill
npx skills add <owner/repo>         # install a skill into the current agent
npx skills use <source>             # use without installing
npx skills list                     # list installed skills (alias: ls)
npx skills find [term]              # interactive search or by keyword
npx skills remove [name]            # remove
npx skills check                    # check for available updates
npx skills update [name]            # update to the latest version
```

---

## 8. Quality & validation

Before making a skill public, run:

1. **Frontmatter lint** — `name` unique, `description` clear with triggers.
2. **Test in at least 2 different agents** (Claude Code + Cursor, for example).
3. **Description passes the "1%" test** — does the agent decide to activate with a probability ≥1% on relevant prompts? If not, rewrite.
4. **`SKILL.md` size** — if it exceeds ~200 lines, move detail to `references/`.
5. **No PII, no secrets** — `git secrets` or `trufflehog` in CI.

Use the `skill-judge` skill (already installed in this agent) to audit:

```
/skill-judge my-skill/SKILL.md
```

---

## 9. Discovery and marketing

- **skills.sh** — official Vercel leaderboard. Install telemetry drives ranking.
- **agentskills.io** — registry for the open Anthropic spec.
- **SkillsMP** — GitHub crawler. Indexes any public `SKILL.md`.
- **Claude Plugins directory** (`claude-plugins.dev`, `claudemarketplaces.com`) — if publishing via marketplace.
- **`package.json` keywords / GitHub topics** — `agent-skill`, `claude-code`, `cursor`, `mcp` help discovery.

---

## 10. References

- [Vercel — Agent Skills docs](https://vercel.com/docs/agent-resources/skills)
- [Vercel — Creating, Installing, Sharing skills (KB)](https://vercel.com/kb/guide/agent-skills-creating-installing-and-sharing-reusable-agent-context)
- [vercel-labs/skills (CLI source)](https://github.com/vercel-labs/skills)
- [Anthropic — Agent Skills (engineering)](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [anthropics/skills (official reference + spec)](https://github.com/anthropics/skills)
- [agentskills.io (open spec)](https://agentskills.io/home)
- [Claude Code — Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [skillpm — npm-native package manager](https://github.com/sbroenne/skillpm)
- [antfu/skills-npm — install via npm](https://github.com/antfu/skills-npm)
- [skills (CLI on npm)](https://www.npmjs.com/package/skills)
