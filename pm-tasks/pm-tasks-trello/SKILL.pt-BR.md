---
name: pm-tasks-trello
description: >-
  Trello adapter for the @llodev/pm-tasks-* family. Use when the user mentions
  Trello, asks to "create card", "publish to Trello", "post to Trello",
  "publish", or uses --publish; OR for CRUD on existing cards (check checklist
  item, close card, change due-date, add member, comment); OR when invoked
  autonomously by another agent with [autonomous] / --auto sentinel. Modes:
  paste-ready (no MCP needed), MCP publish (via atlassian-trello-mcp),
  autonomous (write-through with allowlist). Implements 6 CRUD verbs
  (task.create, checklist.check, task.close, task.due-date.set,
  task.assignee.add, task.comment.add) from
  pm-tasks/pm-tasks-core/references/contract.md. Requires @llodev/pm-tasks-core
  installed.
license: MIT
metadata:
  version: 1.1.2
  tags:
    - agent-skill
    - trello
    - plan-to-tasks
    - pm-tools
  family: pm-tasks
  role: adapter
  tool: trello
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
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/SKILL.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/SKILL.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-trello/SKILL.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# pm-tasks-trello

Adapter para Trello dentro da família `@llodev/pm-tasks-*`. Use as fases de extração da skill núcleo, depois aplique a formatação do Trello e opcionalmente publique/opere via o servidor MCP `atlassian-trello-mcp`.

## Roteamento

| Modo        | Gatilho                                                                                      | Caminho                                                                 |
| ----------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Paste-only  | "formatar como card do Trello" sem intenção de MCP                                           | Fase 3 (core) → Fase 4 (essa skill, só formato) → emite blocos de paste |
| MCP publish | "publish to Trello", "create on Trello", "--publish"                                         | Fase 3 → Fase 4 → Fase 5 (publish via MCP)                              |
| Autônomo    | `[autonomous]` ou `--auto` no prompt OU `LLODEV_PM_TASKS_AUTONOMOUS=1`                       | Fase 3 → Fase 4 → Fase 5b (write-through, sem preview)                  |
| Ops CRUD    | "marcar item N na task X", "fechar card Y", "adicionar Alice à task Z", "comentar na task X" | Fase 6 (operações, dispatch direto do verbo)                            |

## Fase 4 — Formatação do Trello

**OBRIGATÓRIO — LEIA O ARQUIVO INTEIRO** [`references/format.md`](references/format.md) antes de produzir qualquer saída específica do Trello. Depois aplique [`anti-patterns/tools.md`](anti-patterns/tools.md) § Trello.

## Fase 5 — MCP publish

**Pré-requisitos:** `atlassian-trello-mcp` configurado (veja [`references/mcp-config.md`](references/mcp-config.md)). Env vars `TRELLO_API_KEY` + `TRELLO_TOKEN` no shell.

Ordem estrita: 5.1 config discovery → 5.2.5 resolve labels/member → 5.2 preview & aprovação → 5.3 publish via MCP → 5.4 tratamento de erro.

Sequência completa em [`references/publish.md`](references/publish.md).

## Fase 5b — Autônomo

Pule 5.2 preview & aprovação. Aplique o contrato de modo autônomo de [`pm-tasks/pm-tasks-core/references/autonomous-mode.md`](../pm-tasks-core/references/autonomous-mode.md). Overlay específico da ferramenta em [`references/autonomous.md`](references/autonomous.md). Entradas no log de auditoria conforme [`pm-tasks/pm-tasks-core/references/audit-log-format.md`](../pm-tasks-core/references/audit-log-format.md).

## Fase 6 — Operações CRUD (cards existentes)

Para verbos diferentes de `task.create`, vá direto para a operação. **OBRIGATÓRIO — LEIA O ARQUIVO INTEIRO** [`references/operations.md`](references/operations.md) que lista o mapeamento verbo → tool MCP e a resolução de `<task-ref>` para URLs/IDs do Trello.

## Fallback standalone

Se `@llodev/pm-tasks-core` não estiver instalado: peça ao usuário a entrada mínima (título + itens da checklist) e produza um card do Trello pronto para colar usando apenas esse conteúdo. A qualidade é degradada — sem inferência de scope/audience/fidelity. Imprima: _"Install `@llodev/pm-tasks-core` for the full flow."_

## Config

Ordem de lookup: `<git-root>/.trello.json` → `~/.config/llodev/pm-tasks/trello.json` → aborta com instruções de init. Schema: [`schemas/config.json`](schemas/config.json). Secrets NUNCA em JSON — apenas env vars / keychain.

## Init

```
npx @llodev/pm-tasks-trello init
```

Veja [`pm-tasks/pm-tasks-core/references/init-ux.md`](../pm-tasks-core/references/init-ux.md) para o fluxo compartilhado.
