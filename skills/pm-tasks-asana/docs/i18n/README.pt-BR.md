<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-asana/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-asana/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/pm-tasks-asana/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-asana

> Adapter para Asana da família `@llodev/pm-tasks-*` — transforma planos de implementação em parent tasks + subtasks no Asana e opera via paste, MCP publish ou autonomous write-through.

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-asana?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/pm-tasks-asana)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

O que você ganha:

- **Output paste-ready** — o agente renderiza um generic card; você cola no Asana manualmente.
- **MCP publish** via servidor MCP `claude.ai Asana` (OAuth, sem PATs no JSON). Parent task + subtasks flat + custom fields + placement em section, tudo num batch só.
- **Operações CRUD** em tasks existentes: `checklist.check`, `task.close`, `task.comment.add`, `task.due-date.set`, `task.assignee.add`.
- **Autonomous mode** — sentinela `[autonomous]` / `--auto` para write-through sob allowlist + scope + rate limits. Loops multi-task espelham o estado para o Asana em tempo real.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-asana

# Vercel CLI (instale o core manualmente também)
npx skills add llodev/skills/skills/pm-tasks-core
npx skills add llodev/skills/skills/pm-tasks-asana
```

## Setup do MCP

O Asana usa OAuth via o MCP `claude.ai Asana`. Se você já conectou sua conta do Asana nas configurações do Cursor ou Claude Code, está pronto.

Para qualquer agente compatível com MCP (Claude Code, Cursor, Codex, Windsurf, Cline, Roo Code):

1. Abra as configurações de MCP do agente.
2. Habilite / registre `claude.ai Asana` (ou o MCP de Asana equivalente do seu agente).
3. Aprove o fluxo OAuth no navegador.

No Claude Code, verifique com `claude mcp list` — `claude.ai Asana` deve aparecer como autenticado.

## Setup da config

O script `init` roda **fora** do MCP, então precisa de um Personal Access Token para enumerar seus workspaces / projects / sections / custom fields. Gere um em https://app.asana.com/0/my-apps, depois:

```bash
export LLODEV_PM_TASKS_ASANA_PAT=...
npx @llodev/pm-tasks-asana init
```

Siga os prompts. Escolha onde a config deve ficar:

- **local** → `./.asana.json` (recomendado para configs com escopo de projeto, pode ser commitado).
- **global** → um default da plataforma, customizável. Defaults:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/asana.json`, com fallback para `~/.config/llodev/pm-tasks/asana.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\asana.json`.
  - Sobrescreva em qualquer OS com `LLODEV_PM_TASKS_CONFIG_HOME=/your/path` — o arquivo vai parar em `$LLODEV_PM_TASKS_CONFIG_HOME/asana.json`.

O prompt de `init` imprime o caminho absoluto onde vai escrever, então você sempre vê exatamente para onde o arquivo vai.

> [!IMPORTANT]
> O PAT é usado **somente** pelo `init`. O MCP em si usa OAuth — nunca coloque tokens no JSON.

## Uso

| Prompt example                                                   | O que o agente faz                                                           |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `"publish this plan as Asana tasks"`                             | Phase 5 publish — parent + subtasks + custom fields num batch só             |
| `"check subtask 3 on task X in Asana"`                           | Phase 6 CRUD — `checklist.check` na subtask                                  |
| `"close task Y"`                                                 | Phase 6 CRUD — `task.close` (move para a section de close + marca completed) |
| `"comment on task X: shipped"`                                   | Phase 6 CRUD — `task.comment.add`                                            |
| `"[autonomous] create task in asana from plan @docs/plans/X.md"` | Phase 5b autonomous (requer `autonomous.enabled: true`)                      |

## Notas específicas do Asana

> [!NOTE]
> **Subtasks têm um nível só** — o adapter achata checklists aninhadas em uma única camada de subtask.

> [!WARNING]
> **Custom fields NÃO são herdados por default** — liste os IDs de field em `subtaskDefaults.inheritParentFields` para que o adapter copie do parent para as subtasks no momento do create.

- **Assignee é um campo único** — use `task.assignee.add` para adicionar followers; o assignee primário é substituído em caso de conflito.
- **O `get_task` do MCP não retorna activity stories** — o activity feed da UI do Asana é a fonte de verdade para auditorias de atribuição. Veja [`anti-patterns/asana.md`](../../anti-patterns/asana.md).

## Documentação

- [`SKILL.md`](../../SKILL.md) — roteamento de phases + vocabulário CRUD.
- [`schemas/config.json`](../../schemas/config.json) — JSON Schema do `.asana.json`.
- [`anti-patterns/asana.md`](../../anti-patterns/asana.md) — pegadinhas recorrentes.
- [`../pm-tasks-core/references/autonomous-mode.md`](../../../pm-tasks-core/references/autonomous-mode.md) — contrato do autonomous mode.

## Licença

MIT — veja [LICENSE](../../LICENSE).
