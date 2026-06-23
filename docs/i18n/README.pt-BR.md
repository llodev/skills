<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# llodev/skills

> Coleção de [Agent Skills](https://agentskills.io) criadas por [@lloliveiradev](https://github.com/lloliveiradev) para Claude Code, Cursor, Codex, Windsurf e qualquer agente que fale a spec aberta de Skills. As skills são pacotes de instruções e scripts que extendem as capacidades de agentes em workflows de desenvolvimento, documentação, planejamento e profissionais.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-FE5196?logo=conventionalcommits&logoColor=white)](https://www.conventionalcommits.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Cada skill deste repositório é distribuída como **pacote npm**, **plugin do Claude Code** e **entrada `skills add` da Vercel**. Escolha o canal que o seu agente fala — as skills são idênticas nos três.

## Instalação

Escolha o canal que combina com o seu agente.

**Claude Code (ou qualquer agente que suporte o marketplace):**

```bash
/plugin marketplace add llodev/skills
/plugin install pm-tasks-core pm-tasks-trello pm-tasks-asana
```

**npm (skillpm, skills-npm ou bundling em `node_modules`):**

```bash
npm i @llodev/pm-tasks    # meta — instala a família toda via peerDeps
```

**Vercel `skills add`:**

```bash
npx skills add llodev/skills/pm-tasks/pm-tasks-trello
```

Veja o [guia de publicação](../../docs/publishing-guide.md) para entender como os três canais se conectam.

## Catálogo

### `pm-tasks-*` — adapters de Project Management

Transformam planos de implementação em tasks de PM (Trello, Asana, …) e operam essas tasks via paste, MCP publish ou write-through autônomo. Mais `@llodev/pm-tasks-testkit` — fakes em memória para os 7 verbos canônicos, para testar skills customizadas.

**Novo na v1.9 — runtime headless (subpath `/adapter`):** importe `createAdapter` de qualquer adapter para acionar os 7 verbos canônicos a partir dos seus próprios scripts/agents, sem invocar a skill:

```ts
import { createAdapter } from "@llodev/pm-tasks-trello/adapter";

const adapter = await createAdapter({ configPath: ".trello.json", mcp });
const r = await adapter.taskMove({ taskId: "card-1", targetListOrSectionId: "wip-list" });
if (!r.ok) throw new Error(`task.move falhou: ${r.code}`);
```

`mcp: (toolName, args) => Promise<unknown>` é um callback fornecido pelo chamador que faz proxy para as tools `mcp__*` do runtime do agent. Mesma forma para `@llodev/pm-tasks-asana/adapter`. Contrato completo em [pm-tasks-core/references/runtime.md](../../pm-tasks/pm-tasks-core/references/) e nos SKILL.md por adapter.

| Pacote                      | Status      | Fonte                                                            | npm                                 | Vercel CLI                                              |
| --------------------------- | ----------- | ---------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------- |
| `@llodev/pm-tasks` _(meta)_ | ✅ v3.0.0   | [pm-tasks/pm-tasks/](../../pm-tasks/pm-tasks/)                   | `npm i @llodev/pm-tasks`            | —                                                       |
| `@llodev/pm-tasks-core`     | ✅ v1.4.0   | [pm-tasks/pm-tasks-core/](../../pm-tasks/pm-tasks-core/)         | `npm i @llodev/pm-tasks-core`       | `npx skills add llodev/skills/pm-tasks/pm-tasks-core`   |
| `@llodev/pm-tasks-asana`    | ✅ v1.4.0   | [pm-tasks/pm-tasks-asana/](../../pm-tasks/pm-tasks-asana/)       | `npm i @llodev/pm-tasks-asana`      | `npx skills add llodev/skills/pm-tasks/pm-tasks-asana`  |
| `@llodev/pm-tasks-trello`   | ✅ v1.4.0   | [pm-tasks/pm-tasks-trello/](../../pm-tasks/pm-tasks-trello/)     | `npm i @llodev/pm-tasks-trello`     | `npx skills add llodev/skills/pm-tasks/pm-tasks-trello` |
| `@llodev/pm-tasks-testkit`  | ✅ v0.1.0   | [pm-tasks/pm-tasks-testkit/](../../pm-tasks/pm-tasks-testkit/)   | `npm i -D @llodev/pm-tasks-testkit` | —                                                       |
| `pm-tasks-jira`             | 🔒 scaffold | [pm-tasks/pm-tasks-jira/](../../pm-tasks/pm-tasks-jira/)         | —                                   | —                                                       |
| `pm-tasks-linear`           | 🔒 scaffold | [pm-tasks/pm-tasks-linear/](../../pm-tasks/pm-tasks-linear/)     | —                                   | —                                                       |
| `pm-tasks-notion`           | 🔒 scaffold | [pm-tasks/pm-tasks-notion/](../../pm-tasks/pm-tasks-notion/)     | —                                   | —                                                       |
| `pm-tasks-clickup`          | 🔒 scaffold | [pm-tasks/pm-tasks-clickup/](../../pm-tasks/pm-tasks-clickup/)   | —                                   | —                                                       |
| `pm-tasks-monday`           | 🔒 scaffold | [pm-tasks/pm-tasks-monday/](../../pm-tasks/pm-tasks-monday/)     | —                                   | —                                                       |
| `pm-tasks-bitrix24`         | 🔒 scaffold | [pm-tasks/pm-tasks-bitrix24/](../../pm-tasks/pm-tasks-bitrix24/) | —                                   | —                                                       |
| `pm-tasks-todoist`          | 🔒 scaffold | [pm-tasks/pm-tasks-todoist/](../../pm-tasks/pm-tasks-todoist/)   | —                                   | —                                                       |

> [!NOTE]
> Skills marcadas como `scaffold` são namespaces reservados com um `SKILL.md` placeholder. A descrição delas instrui os agentes a NÃO ativar até um adapter real chegar.

> [!NOTE]
> O `@llodev/pm-tasks` (meta) é versionado de forma independente da família via `onlyUpdatePeerDependentsWhenOutOfRange`. A família está em `v1.x`; o meta saltou para `v3.0.0` antes do desacoplamento e vai permanecer em `v3.x` até a família chegar em `v2.0.0`.

## Compatibilidade de agentes

Toda skill publicada declara quais agentes ela suporta no campo `compatibility.agents` do frontmatter. A matriz atual:

> **Claude Code** · **Cursor** · **Codex** · **Windsurf** · **Cline** · **Roo Code** (Gemini CLI parcial via camada de tradução)

## Layout do repositório

```
.
├── pm-tasks/                  Pasta da família — um diretório por membro da família
│   ├── pm-tasks-core/         Extração compartilhada + vocabulário CRUD
│   ├── pm-tasks-asana/        Adapter Asana (parent + subtasks, custom fields, sections)
│   ├── pm-tasks-trello/       Adapter Trello (boards, lists, labels, members)
│   └── pm-tasks-<member>/     Scaffolds reservados (Jira, Linear, Notion, …)
├── scripts/                   Validadores, checks de contrato, gate de baseline do skill-judge
├── docs/                      publishing-guide.md + roadmap.md (gitignored: plans/)
└── .changeset/                Registros de intenção de release (workflow Changesets)
```

## Desenvolvimento local

```bash
make hooks       # uma vez — instala o lefthook (prettier nos staged, gitleaks, Conventional Commits)
make validate    # checks de frontmatter + schema + links + paridade de locale
make help        # lista completa de targets
```

> [!TIP]
> O `Makefile` é o ponto de entrada canônico — mais curto do que decorar os nomes dos scripts pnpm e o único que é exigido pelo lefthook no commit.

Releases seguem o workflow [Changesets](https://github.com/changesets/changesets) — registre a intenção com `make changeset`, aplique com `make release-version`, publique com `make release-publish`. Veja o [`.changeset/README.md`](../../.changeset/README.md) para o passo a passo.

## Roadmap

Foco atual: consolidar a fundação do `pm-tasks-*` antes de lançar novos adapters. Detalhes com prioridades e justificativas em [`docs/roadmap.md`](../../docs/roadmap.md).

**Releases recentes (`v1.6.0` → `v1.8.0`):**

- `v1.6.0` (minor) — **Public hardening**: entregou `CONTRIBUTING.md` · `SECURITY.md` · `CODE_OF_CONDUCT.md` · `.github/ISSUE_TEMPLATE/` + template de PR · `CODEOWNERS` · teste de paridade do `marketplace.json` · workflow CodeQL · Dependabot.
- `v1.7.0` (minor) — **Quality gates**: entregou golden master do rubric do skill-judge · gate de coverage (c8) wired no `pnpm validate` · budget de tamanho de pacote (`size-limit`).
- `v1.8.0` (minor) — **Observability v1**: entregou rotação inteligente do `audit.log` (tamanho + idade + multi-tool, atômica, idempotente) · CLI `pm-tasks-core-doctor` (valida config + allowlist autônoma + audit writability) · flags `--doctor` nos adapters.

**O que vem a seguir:**

- Decisão pendente — expansão de adapters (`pm-tasks-jira`) vs SDD hooks (F14 + F15). Veja [docs/roadmap.md](../../docs/roadmap.md).

**Após o trio de qualidade — expansão de adapters (`v1.9.0+`):**

- `pm-tasks-jira` (S1) — Atlassian Remote MCP. Maior share de mercado dev/agile.
- `pm-tasks-linear` (S2) — Linear MCP. Mindshare premium; `Cycle` se alinha nativamente com nosso modelo de verbos.
- `pm-tasks-github-projects` (S8) — `github-mcp-server`, PM nativo no GitHub; alto valor, baixo custo.
- `pm-tasks-clickup` (S3) · `pm-tasks-notion` (S4) · `pm-tasks-monday` (S5) · `pm-tasks-todoist` (S6) · `pm-tasks-bitrix24` (S7).

**Durante a onda de adapters — novos verbos canônicos (minors aditivos):**

- 8º `task.sprint.set` · 9º `task.parent.set` (Jira/Linear) · 10º `task.time.log` · 11º `task.estimate.set` · 12º `task.blocks.add` · 13º `task.wip-limit.check`.

**Médio prazo — biblioteca/SDK e reverse sync:**

- F14 — runtime adapter como library (modo headless para callers sem skill).
- F15 — ponte entre `superpowers:subagent-driven-development` e o modo autonomous do pm-tasks.
- F1 — sync bidirecional (read-back PM tool → plano) após ≥4 adapters.

**Famílias futuras:**

- **`ts-ddd-*`** — blocos de Domain-Driven Design para codebases TypeScript (entidades, value objects, use cases, repositórios, controllers).

## Docs

- [Guia de publicação](../../docs/publishing-guide.md) — como os três canais de distribuição se conectam.
- [Workflow Changesets](../../.changeset/README.md) — registrar → versionar → publicar.
- Os deep dives de cada família vivem no `SKILL.md` e em `references/` do respectivo membro.

## Licença

MIT — veja [LICENSE](../../LICENSE).
