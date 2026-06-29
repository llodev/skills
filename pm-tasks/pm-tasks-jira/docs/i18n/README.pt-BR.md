<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-jira/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-jira/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-jira/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-jira

> Adapter para Jira da família `@llodev/pm-tasks-*` — transforma planos de implementação em issues + sub-tasks no Jira e opera via paste, MCP publish ou autonomous write-through, com estimativa de esforço agnóstica de estratégia.

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-jira?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/pm-tasks-jira)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

O que você ganha:

- **Output paste-ready** — o agente renderiza um generic card; você cola no Jira manualmente.
- **MCP publish** via Atlassian Remote MCP (OAuth, Streamable-HTTP — sem tokens no JSON). Issue parent + sub-tasks + labels, tudo num batch só.
- **Operações CRUD** em issues existentes: `checklist.check`, `task.move`, `task.close`, `task.comment.add`, `task.due-date.set`, `task.assignee.add`, `task.parent.set`, `task.estimate.set`.
- **Estimativa de esforço, nunca prazos** — agnóstica de estratégia (story points, fibonacci, planning poker, t-shirt, affinity, three-point/PERT, dias/horas ideais), escrita no seu campo de Story Points ou no time tracking.
- **Autonomous mode** — sentinela `[autonomous]` / `--auto` para write-through sob allowlist + scope + rate limits. Loops multi-task espelham o estado para o Jira em tempo real.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/pm-tasks-core @llodev/pm-tasks-jira

# Vercel CLI (instale o core manualmente também)
npx skills add llodev/skills/pm-tasks/pm-tasks-core
npx skills add llodev/skills/pm-tasks/pm-tasks-jira
```

## Setup do MCP

O Jira usa o **Atlassian Remote MCP** sobre o endpoint Streamable-HTTP `https://mcp.atlassian.com/v1/mcp`. O MCP cuida do OAuth — o adapter nunca vê tokens.

Para qualquer agente compatível com MCP (Claude Code, Cursor, Codex, Windsurf, Cline, Roo Code):

- **Claude Code**: `claude mcp add atlassian -s project -- npx -y @anthropic-ai/mcp-server-atlassian` (ou siga o guia de setup do Remote MCP da Atlassian para o seu site), depois aprove o fluxo OAuth no navegador.
- **Cursor / Windsurf / Cline / Roo Code**: adicione uma entrada de MCP nas configurações do agente apontando para `https://mcp.atlassian.com/v1/mcp`.
- **Codex**: adicione uma entrada `[mcp_servers.atlassian]` em `~/.codex/config.toml`.

No Claude Code, verifique com `claude mcp list` — `atlassian` deve aparecer como autenticado.

> [!NOTE]
> O endpoint SSE legado (`/events`) foi descontinuado em 2026-06-30 — use o endpoint Streamable-HTTP acima.

## Setup da config

O script `init` enumera seu site Atlassian, project, issue types e campo de Story Points, e então escreve um `.jira.json`. Rode de dentro de uma sessão de agente que já tenha o Atlassian MCP conectado, ou standalone com um API token. Para o caminho standalone, crie um token em https://id.atlassian.com/manage-profile/security/api-tokens, depois:

```bash
export ATLASSIAN_API_TOKEN=...
export ATLASSIAN_EMAIL=you@example.com
export ATLASSIAN_SITE=your-team.atlassian.net
npx @llodev/pm-tasks-jira init
```

Siga os prompts. Escolha onde a config deve ficar:

- **local** → `./.jira.json` (recomendado para configs com escopo de projeto, pode ser commitado).
- **global** → um default da plataforma, customizável. Defaults:
  - macOS / Linux (XDG): `$XDG_CONFIG_HOME/llodev/pm-tasks/jira.json`, com fallback para `~/.config/llodev/pm-tasks/jira.json`.
  - Windows: `%APPDATA%\llodev\pm-tasks\jira.json`.
  - Sobrescreva em qualquer OS com `LLODEV_PM_TASKS_CONFIG_HOME=/your/path` — o arquivo vai parar em `$LLODEV_PM_TASKS_CONFIG_HOME/jira.json`.

O `.jira.json` gerado captura seus issue types (id + nome), os statuses do board (alvos de move/close, com category) e os campos válidos por tipo — assim o agente nunca escreve um campo não suportado.

O prompt de `init` imprime o caminho absoluto onde vai escrever, então você sempre vê exatamente para onde o arquivo vai. Rode health checks do workspace a qualquer momento com:

```bash
npx @llodev/pm-tasks-jira init --doctor
```

> [!IMPORTANT]
> O API token é usado **somente** pelo `init` para descobrir os metadados do seu project. O MCP em si usa OAuth — nunca coloque tokens no JSON.

## Uso

| Prompt example                                                 | O que o agente faz                                                         |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `"publish this plan as Jira issues"`                           | Phase 5 publish — parent + sub-tasks + labels num batch só                 |
| `"check subtask 3 on KAN-42"`                                  | Phase 6 CRUD — `checklist.check` na sub-task                               |
| `"close KAN-42"`                                               | Phase 6 CRUD — `task.close` (transition resolvida por categoria de status) |
| `"set the estimate on KAN-42 to 5 points"`                     | Phase 6 CRUD — `task.estimate.set` (esforço → Story Points + label `est:`) |
| `"set the parent of KAN-43 to KAN-12"`                         | Phase 6 CRUD — `task.parent.set`                                           |
| `"[autonomous] create jira issues from plan @docs/plans/X.md"` | Phase 5b autonomous (requer `autonomous.enabled: true`)                    |

## Notas específicas do Jira

> [!NOTE]
> **Transitions são resolvidas por categoria de status** (`new` / `indeterminate` / `done`), não por nome — então `task.move` / `task.close` funcionam igual em qualquer idioma do workspace (ex.: pt-BR `"Tarefa"` / `"Concluído"`).

> [!NOTE]
> **Itens de checklist viram Sub-tasks** — um nível só, cada um criado sob o seu issue parent. Uma issue key parent é obrigatória.

> [!WARNING]
> **`task.sprint.set` NÃO é suportado** — o Atlassian MCP não expõe nenhuma API de agile/sprint, então o core factory retorna `UNSUPPORTED_VERB`. Planejamento de sprint e capacity estão no roadmap para v1.12.0.

- **A estimativa registra esforço, nunca um prazo de calendário.** Story Points precisam de um campo no board — o `init` detecta automaticamente (`customfield_10016` por default); se estiver ausente, `task.estimate.set` retorna `INVALID_REQUEST` com uma dica para habilitá-lo. O original legível por humanos é preservado como um label `est:` idempotente.
- **Due dates numa sub-task** retornam `NOT_APPLICABLE` — sub-tasks de Jira team-managed não carregam due date próprio.
- **Issue types são lidos da config** (`issueTypes{}`, nomes locale-specific) — nunca hard-coded. Veja [`anti-patterns/jira.md`](../../anti-patterns/jira.md).

## Documentação

- [`SKILL.md`](../../SKILL.md) — roteamento de phases + vocabulário CRUD.
- [`schemas/config.json`](../../schemas/config.json) — JSON Schema do `.jira.json`.
- [`references/operations.md`](../../references/operations.md) — mapeamento verbo → ferramenta MCP.
- [`references/estimation.md`](../../references/estimation.md) — estratégias de estimativa + preservação de label.
- [`anti-patterns/jira.md`](../../anti-patterns/jira.md) — pegadinhas recorrentes.
- [`../pm-tasks-core/references/autonomous-mode.md`](../../../pm-tasks-core/references/autonomous-mode.md) — contrato do autonomous mode.

## Licença

MIT — veja [LICENSE](../../LICENSE).
