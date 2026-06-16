---
name: pm-tasks-asana
description: >-
  Asana adapter for the @llodev/pm-tasks-* family. Use when the user mentions
  Asana, asks to "create Asana task", "publish to Asana", "post to Asana",
  "publish", "add comment in Asana", or uses --publish-asana; OR for CRUD on
  existing tasks (check subtask, close task, change due-date, assign person,
  comment); OR when invoked autonomously by another agent with [autonomous] /
  --auto sentinel. Asana hierarchy: workspace > project > section > parent task
  > subtasks (one level), with custom fields and multi-assignee support. Modes:
  paste-ready (no MCP needed), MCP publish (via claude.ai Asana MCP), autonomous
  (write-through with allowlist). Implements 6 CRUD verbs (task.create,
  checklist.check, task.close, task.due-date.set, task.assignee.add,
  task.comment.add) from pm-tasks/pm-tasks-core/references/contract.md. Requires
  @llodev/pm-tasks-core installed.
license: MIT
metadata:
  version: 1.1.2
  tags:
    - agent-skill
    - asana
    - plan-to-tasks
    - pm-tools
  family: pm-tasks
  role: adapter
  tool: asana
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/SKILL.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/SKILL.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-asana/SKILL.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# pm-tasks-asana

Adapter para Asana dentro da família `@llodev/pm-tasks-*`. Use as fases de extração da skill núcleo, depois aplique a formatação do Asana e opcionalmente publique/opere via o servidor MCP `claude.ai Asana`.

## Roteamento

| Modo        | Gatilho                                                                                        | Caminho                                                                 |
| ----------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Paste-only  | "formatar como task do Asana" sem intenção de MCP                                              | Fase 3 (core) → Fase 4 (essa skill, só formato) → emite blocos de paste |
| MCP publish | "publish to Asana", "create on Asana", "--publish-asana"                                       | Fase 3 → Fase 4 → Fase 5 (publish via MCP)                              |
| Autônomo    | `[autonomous]` ou `--auto` no prompt OU `LLODEV_PM_TASKS_AUTONOMOUS=1`                         | Fase 3 → Fase 4 → Fase 5b (write-through, sem preview)                  |
| Ops CRUD    | "marcar subtask N da task X", "fechar task Y", "atribuir Alice à task Z", "comentar na task X" | Fase 6 (operações, dispatch direto do verbo)                            |

## Modelo do Asana

Tasks do Asana têm:

- **Nome** (título, ≤80 chars para a board view).
- **Descrição** (rich text; prefira rótulos `**Section**` em negrito — headings `##` renderizam de forma inconsistente).
- **Subtasks** — um nível de profundidade. Custom fields e assignee NÃO propagam automaticamente do parent; o adapter os define explicitamente conforme `subtaskDefaults.inheritParentFields` em `.asana.json`.
- **Sections** — agrupam tasks dentro de um project.
- **Custom fields** — por project; a API sempre usa option GIDs, nunca display names.
- **Multi-assignee** — o Asana permite múltiplos followers; o assignee primário é um campo único. Use `task.assignee.add` para adicionar followers.

## Fase 4 — Formatação do Asana

Aplique o generic card do core [`../pm-tasks-core/references/generic-card.md`](../pm-tasks-core/references/generic-card.md). Depois mapeie para o Asana:

- Título → `name` da task.
- Seções do generic card → rótulos `**Section**` em negrito dentro de `description` (não `##`).
- "Implementation Checklist" + "Verification Checklist" → subtasks (achate qualquer bullet aninhado; o Asana suporta apenas um nível).
- Labels → opções de custom field (resolvidas via `customFields[]` do `.asana.json`).
- Due date → `due_on` (YYYY-MM-DD).
- Assignee → GID de `assignee` resolvido a partir de `members[]` do `.asana.json` ou `me` no momento do publish.

## Fase 5 — MCP publish

**Pré-requisitos:** servidor MCP do Asana (`claude.ai Asana`) conectado no seu agente. O MCP lida com OAuth; o adapter nunca vê tokens. As etapas de configuração diferem por agente — registre o mesmo endpoint MCP do Asana que seu agente suporta:

- **Claude Code**: `claude mcp add asana -s project -- npx -y claude-ai-asana-mcp` (ou siga o setup da Anthropic para o conector hosted `claude.ai Asana`).
- **Cursor / Windsurf / Cline / Roo Code**: adicione uma entrada no JSON de settings MCP daquele agente apontando para o mesmo comando `claude-ai-asana-mcp` (envelope idêntico ao exemplo do Trello em `pm-tasks-trello/references/mcp-config.md`).
- **Codex**: entrada TOML em `[mcp_servers.asana]` no `~/.codex/config.toml`.
- **Outros agentes capazes de MCP**: consulte a doc de MCP do agente; o comando do servidor e o fluxo OAuth são constantes.

Ordem estrita: 5.1 lê `.asana.json` (arquivo inteiro) → 5.2.5 resolve assignee + custom fields + mapa de fields por subtask → 5.2 preview & aprovação → 5.3 publish via MCP → 5.4 tratamento de erro.

Sequência do MCP publish:

1. **Task pai** — `create_tasks` com `name`, `notes` (descrição), `projects: [projectGid]`, `memberships: [{ project, section }]`, `assignee` (GID resolvido), `due_on`, `custom_fields` (string JSON de `{fieldGid: optionGid}`).
2. **Subtasks** — `create_tasks` por subtask com `parent: parentGid`, `name`, `assignee` (herdado ou por subtask), `custom_fields` conforme `subtaskDefaults.inheritParentFields`.
3. **Tags** (opcional) — `addTag` por GID de tag.
4. **Confirmação** — lista parent + subtasks com permalinks.

### Atribuição (opt-in)

Antes de chamar a MCP-call de criação, leia `config.attribution`. Se `enabled === true`, prefixe o comentário com o `commentPrefix` retornado por `getAttribution()` e anexe o `descriptionFooter` ao final do `description`. Em modo autônomo (`[autonomous]` sentinel), o `commentPrefix` automaticamente se torna o `autonomousCommentPrefix`. Veja `references/attribution.md` no pm-tasks-core (adicionado em v1.2.0; arquivo criado na Task 1.5).

## Fase 5b — Autônomo

Pule 5.2 preview & aprovação. Aplique o contrato de modo autônomo de [`../pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md). Entradas no log de auditoria conforme [`../pm-tasks-core/references/audit-log-format.md`](../pm-tasks-core/references/audit-log-format.md).

Scope autônomo específico do Asana: `autonomous.scope.projects[]` + `autonomous.scope.sections[]` devem incluir os GIDs alvo. Qualquer escrita em custom field precisa estar em `autonomous.allow` (`task.create` cobre o set de campos no momento da criação; mudanças contínuas em campos estão fora do escopo de v1.x).

## Fase 6 — Operações CRUD (tasks existentes)

Para verbos diferentes de `task.create`, vá direto para a operação. Mapeamento verbo → tool MCP:

| Verbo do core       | Tool MCP do Asana              | Notas                                                                          |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `task.create`       | `create_tasks`                 | parent + subtasks conforme Fase 5                                              |
| `checklist.check`   | `update_tasks`                 | para subtasks: `completed: true`; emula checklist via modelo de subtask        |
| `task.close`        | `update_tasks`                 | `completed: true` no parent                                                    |
| `task.due-date.set` | `update_tasks`                 | `due_on: "YYYY-MM-DD"`                                                         |
| `task.assignee.add` | `update_tasks` + `addFollower` | assignee primário substitui; adicionais viram followers                        |
| `task.comment.add`  | `add_comment` (story)          | adiciona uma comment story na task; aplica prefixo de atribuição se habilitado |

Resolução de `<task-ref>`: aceita permalinks do Asana (`https://app.asana.com/0/<project>/<task>`), GIDs nus, ou aliases de `taskAliases[]` em `.asana.json`.

## Envelope de resultado

Todo verbo retorna a shape do contrato core (veja [`../pm-tasks-core/references/contract.md`](../pm-tasks-core/references/contract.md) §Result envelope):

```json
{
  "ok": true,
  "verb": "task.create",
  "tool": "asana",
  "ref": { "id": "<gid>", "url": "https://app.asana.com/0/<project>/<gid>", "alias": "<optional>" },
  "details": {
    /* específico do Asana (veja tabela abaixo) */
  }
}
```

`details` específicos do Asana por verbo:

| Verbo               | Campos de `details`                                                      |
| ------------------- | ------------------------------------------------------------------------ |
| `task.create`       | `{ parentGid, subtaskGids[], projectGid, sectionGid?, customFields[]? }` |
| `checklist.check`   | `{ subtaskGid, completed: true }`                                        |
| `task.close`        | `{ parentGid, completed: true }`                                         |
| `task.due-date.set` | `{ taskGid, due_on }`                                                    |
| `task.assignee.add` | `{ taskGid, assignee, followers[]? }` (split entre primário e follower)  |
| `task.comment.add`  | `{ taskGid, storyGid }`                                                  |

Em caso de falha: `{ ok: false, verb, tool, error: { code, message, retriable } }`. Códigos comuns: `FORBIDDEN_VERB`, `OUT_OF_SCOPE`, `NOT_FOUND`, `RATE_LIMITED`, `PARTIAL_CREATE` (subtask falhou no meio do create — veja [`../pm-tasks-core/references/contract.md`](../pm-tasks-core/references/contract.md) §Partial-create recovery).

## Anti-patterns

Veja [`anti-patterns/asana.md`](anti-patterns/asana.md) — paste health, regras de custom field, requisitos de GID, tratamento de partial-create.

## Fallback standalone

Se `@llodev/pm-tasks-core` não estiver instalado: peça ao usuário a entrada mínima (título + nomes das subtasks) e produza um corpo de task do Asana pronto para colar usando apenas esse conteúdo. A qualidade é degradada — sem inferência de scope/audience/fidelity. Imprima: _"Install `@llodev/pm-tasks-core` for the full flow."_

## Config

Ordem de lookup: `<git-root>/.asana.json` → `~/.config/llodev/pm-tasks/asana.json` → aborta com instruções de init. Schema: [`schemas/config.json`](schemas/config.json). Secrets NUNCA em JSON — o MCP do Asana cuida do OAuth; o `init` usa apenas a env var `LLODEV_PM_TASKS_ASANA_PAT`.

## Init

```
npx @llodev/pm-tasks-asana init
```

Veja [`../pm-tasks-core/references/init-ux.md`](../pm-tasks-core/references/init-ux.md) para o fluxo compartilhado. O init do Asana lê workspaces / projects / sections / custom fields via a REST API do Asana usando um Personal Access Token (env `LLODEV_PM_TASKS_ASANA_PAT`).
