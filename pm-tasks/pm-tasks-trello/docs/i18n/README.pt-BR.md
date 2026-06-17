<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-trello

> Adapter para Trello da família `@llodev/pm-tasks-*` — transforma planos de implementação em cards do Trello e opera via paste, MCP publish ou autonomous write-through.

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-trello?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/pm-tasks-trello)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

O que você ganha:

- **Output paste-ready** — o agente renderiza um generic card; você cola no Trello manualmente.
- **MCP publish** via `atlassian-trello-mcp`. Card + checklists nomeadas + labels + atribuição de members num batch só.
- **Operações CRUD** em cards existentes: `checklist.check`, `task.close`, `task.comment.add`, `task.due-date.set`, `task.assignee.add`.
- **Autonomous mode** — sentinela `[autonomous]` / `--auto` para write-through sob allowlist + scope + rate limits. Loops multi-task espelham o estado para o Trello em tempo real.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-trello

# Vercel CLI (instale o core manualmente também)
npx skills add llodev/skills/pm-tasks/pm-tasks-core
npx skills add llodev/skills/pm-tasks/pm-tasks-trello
```

## Setup do MCP

Claude Code:

```bash
claude mcp add trello -s project -- npx -y atlassian-trello-mcp
```

Aprove via `/mcp` no chat. Exporte as env vars no seu shell:

```bash
export TRELLO_API_KEY=...
export TRELLO_TOKEN=...
```

Cursor / Windsurf / Codex / outros agentes: veja [`references/mcp-config.md`](../../references/mcp-config.md).

## Setup da config

```bash
npx @llodev/pm-tasks-trello init
```

Siga os prompts. Escolha onde a config deve ficar:

- **local** → `./.trello.json` (recomendado para configs com escopo de projeto, pode ser commitado).
- **global** → um default da plataforma, customizável. Defaults:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/trello.json`, com fallback para `~/.config/llodev/pm-tasks/trello.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\trello.json`.
  - Sobrescreva em qualquer OS com `LLODEV_PM_TASKS_CONFIG_HOME=/your/path` — o arquivo vai parar em `$LLODEV_PM_TASKS_CONFIG_HOME/trello.json`.

O prompt de `init` imprime o caminho absoluto onde vai escrever, então você sempre vê exatamente para onde o arquivo vai.

> [!IMPORTANT]
> Secrets ficam em env vars ou no keychain do SO — **nunca** neste JSON. O script `init` lê `TRELLO_API_KEY` + `TRELLO_TOKEN` do seu shell, não do arquivo de config.

## Uso

| Prompt example                                                    | O que o agente faz                                                            |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `"publish this plan as Trello cards"`                             | Phase 5 publish — card + checklists + labels + member num batch só            |
| `"check item 3 on task X in Trello"`                              | Phase 6 CRUD — `checklist.check` no item da checklist                         |
| `"close card Y"`                                                  | Phase 6 CRUD — `task.close` (`dueComplete: true` + move para a list de close) |
| `"comment on card X: shipped"`                                    | Phase 6 CRUD — `task.comment.add`                                             |
| `"[autonomous] create task in trello from plan @docs/plans/X.md"` | Phase 5b autonomous (requer `autonomous.enabled: true`)                       |

## Notas específicas do Trello

> [!NOTE]
> **`task.close` PRECISA setar `dueComplete: true`** além de mover o card para a list de close — a UI do Trello mostra o strikethrough da due-date só quando `dueComplete` está setado.

> [!WARNING]
> **`create_card` ignora `idMembers` silenciosamente** — sempre faça um follow-up com `trello_add_member_to_card` por ID de member. O adapter faz isso pra você.

- **`add_member_to_card`** às vezes reporta um erro falso mesmo em caso de sucesso — o adapter refaz o fetch do card e checa `members[]` para confirmar.
- **Descrições do Trello não renderizam tabelas** — o adapter as achata em bullets automaticamente (veja [`references/format.md`](../../references/format.md)).

## Documentação

- [`SKILL.md`](../../SKILL.md) — roteamento de phases + vocabulário CRUD.
- [`references/format.md`](../../references/format.md) — convenções de formatação do Trello.
- [`references/publish.md`](../../references/publish.md) — sequência de MCP publish.
- [`references/operations.md`](../../references/operations.md) — verbos CRUD → mapeamento de ferramenta MCP.
- [`references/mcp-config.md`](../../references/mcp-config.md) — setup de MCP específico por agente.
- [`references/autonomous.md`](../../references/autonomous.md) — overlay autonomous do Trello (padrão de ciclo de vida do card).
- [`anti-patterns/tools.md`](../../anti-patterns/tools.md) — pegadinhas recorrentes.

## Licença

MIT — veja [LICENSE](../../LICENSE).
