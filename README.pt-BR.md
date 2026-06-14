<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# llodev/skills

> Monorepo de [Agent Skills](https://agentskills.io) para Claude Code, Cursor, Codex, Windsurf e qualquer agente que fale a spec aberta de Skills.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
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

Veja o [guia de publicação](docs/publishing-guide.md) para entender como os três canais se conectam.

## Catálogo

### `pm-tasks-*` — adapters de Project Management

Transformam planos de implementação em tasks de PM (Trello, Asana, …) e operam essas tasks via paste, MCP publish ou write-through autônomo.

| Pacote                      | Status      | Fonte                                                      | npm                             | Vercel CLI                                              |
| --------------------------- | ----------- | ---------------------------------------------------------- | ------------------------------- | ------------------------------------------------------- |
| `@llodev/pm-tasks` _(meta)_ | ✅ v1.1.2   | [pm-tasks/pm-tasks/](pm-tasks/pm-tasks/)                   | `npm i @llodev/pm-tasks`        | —                                                       |
| `@llodev/pm-tasks-core`     | ✅ v1.1.1   | [pm-tasks/pm-tasks-core/](pm-tasks/pm-tasks-core/)         | `npm i @llodev/pm-tasks-core`   | `npx skills add llodev/skills/pm-tasks/pm-tasks-core`   |
| `@llodev/pm-tasks-asana`    | ✅ v1.1.2   | [pm-tasks/pm-tasks-asana/](pm-tasks/pm-tasks-asana/)       | `npm i @llodev/pm-tasks-asana`  | `npx skills add llodev/skills/pm-tasks/pm-tasks-asana`  |
| `@llodev/pm-tasks-trello`   | ✅ v1.1.2   | [pm-tasks/pm-tasks-trello/](pm-tasks/pm-tasks-trello/)     | `npm i @llodev/pm-tasks-trello` | `npx skills add llodev/skills/pm-tasks/pm-tasks-trello` |
| `pm-tasks-jira`             | 🔒 scaffold | [pm-tasks/pm-tasks-jira/](pm-tasks/pm-tasks-jira/)         | —                               | —                                                       |
| `pm-tasks-linear`           | 🔒 scaffold | [pm-tasks/pm-tasks-linear/](pm-tasks/pm-tasks-linear/)     | —                               | —                                                       |
| `pm-tasks-notion`           | 🔒 scaffold | [pm-tasks/pm-tasks-notion/](pm-tasks/pm-tasks-notion/)     | —                               | —                                                       |
| `pm-tasks-clickup`          | 🔒 scaffold | [pm-tasks/pm-tasks-clickup/](pm-tasks/pm-tasks-clickup/)   | —                               | —                                                       |
| `pm-tasks-monday`           | 🔒 scaffold | [pm-tasks/pm-tasks-monday/](pm-tasks/pm-tasks-monday/)     | —                               | —                                                       |
| `pm-tasks-bitrix24`         | 🔒 scaffold | [pm-tasks/pm-tasks-bitrix24/](pm-tasks/pm-tasks-bitrix24/) | —                               | —                                                       |
| `pm-tasks-todoist`          | 🔒 scaffold | [pm-tasks/pm-tasks-todoist/](pm-tasks/pm-tasks-todoist/)   | —                               | —                                                       |

> [!NOTE]
> Skills marcadas como `scaffold` são namespaces reservados com um `SKILL.md` placeholder. A descrição delas instrui os agentes a NÃO ativar até um adapter real chegar.

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
├── docs/                      publishing-guide.md (gitignored: plans/, tracking/)
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

Releases seguem o workflow [Changesets](https://github.com/changesets/changesets) — registre a intenção com `make changeset`, aplique com `make release-version`, publique com `make release-publish`. Veja o [`.changeset/README.md`](.changeset/README.md) para o passo a passo.

## Roadmap

Famílias futuras vão seguir o mesmo layout aninhado `<family>/<family>-<member>/`:

- **`ts-ddd-*`** — blocos de Domain-Driven Design para codebases TypeScript (entidades, value objects, use cases, repositórios, controllers).
- Promover os scaffolds `pm-tasks-*` para adapters reais conforme servidores MCP de cada ferramenta forem chegando.

## Docs

- [Guia de publicação](docs/publishing-guide.md) — como os três canais de distribuição se conectam.
- [Workflow Changesets](.changeset/README.md) — registrar → versionar → publicar.
- Os deep dives de cada família vivem no `SKILL.md` e em `references/` do respectivo membro.

## Licença

MIT — veja [LICENSE](LICENSE).
