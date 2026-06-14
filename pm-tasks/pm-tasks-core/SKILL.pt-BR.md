---
name: pm-tasks-core
description: >-
  Core extraction + vocabulary for the @llodev/pm-tasks-* family. Use when
  working with any pm-tasks-<tool> adapter (Trello, Asana, etc.) — provides
  Phases 1–3 (identify input, extract structure, build the generic card) plus
  the canonical CRUD vocabulary (task.create, checklist.check, task.close,
  task.due-date.set, task.assignee.add, task.comment.add) consumed by adapters.
  Also defines autonomous-mode contract (sentinels, allowlist, scope, audit log)
  and the shared init UX. Triggered indirectly by any prompt that an adapter
  handles (e.g. "create Trello card", "publish plan to Asana", "[autonomous]
  create task"). Do NOT activate alone — it has no tool-specific formatting.
license: MIT
metadata:
  version: 1.1.1
  tags:
    - agent-skill
    - plan-to-tasks
    - pm-tools
  family: pm-tasks
  role: core
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
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/SKILL.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/SKILL.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/SKILL.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# pm-tasks-core

Núcleo compartilhado por todos os adapters `pm-tasks-<tool>`. Define as fases de extração, a estrutura do generic-card, o vocabulário CRUD, o contrato do modo autônomo, as regras de lookup de configuração e o formato do log de auditoria. Os adapters referenciam essa skill por caminho — não há mecanismo formal de dependência na especificação.

## Roteamento

Os adapters invocam essa skill ANTES de aplicar sua formatação específica de ferramenta. O ponteiro exato está documentado em [`references/contract.md`](references/contract.md).

## Fases

| Fase | Propósito                                                             | Referência                                                 |
| ---- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1    | Identificar a entrada (arquivo de plano vs paste inline vs implícito) | [`references/contract.md`](references/contract.md) § 1     |
| 2    | Extrair seções por intenção (goal, prereqs, tasks, done-when)         | [`references/contract.md`](references/contract.md) § 2     |
| 2.5  | Gate de anti-patterns                                                 | [`anti-patterns/core.md`](anti-patterns/core.md)           |
| 3    | Montar o generic card                                                 | [`references/generic-card.md`](references/generic-card.md) |

Os adapters então executam as Fases 4+ conforme seus próprios SKILL.md.

## Vocabulário CRUD (verbos que os adapters implementam)

Veja [`references/crud-vocabulary.md`](references/crud-vocabulary.md). Seis verbos, todos idempotentes (com regras de `clientToken` para casos não-naturais).

## Modo autônomo

Veja [`references/autonomous-mode.md`](references/autonomous-mode.md). Ativado apenas pelo sentinela `[autonomous]` / `--auto` / env `LLODEV_PM_TASKS_AUTONOMOUS=1`. Exige allowlist + scope + rate limit explícitos no config da ferramenta. Nunca inferido.

## Configuração

Ordem de lookup: `<git-root>/.<tool>.json` → `~/.config/llodev/pm-tasks/<tool>.json` → aborta. Secrets NUNCA em JSON (apenas env vars / keychain do SO).

## Log de auditoria

JSONL append-only em `~/.local/share/llodev/pm-tasks/<tool>/audit.log`. Schema em [`references/audit-log-format.md`](references/audit-log-format.md). Funciona também como índice de lookup para resolução de `<task-ref>`.

## Helper de init

Os adapters expõem `npx @llodev/pm-tasks-<tool> init`. UX compartilhada em [`references/init-ux.md`](references/init-ux.md). Biblioteca de implementação em `./scripts/init-lib.mjs`.

## Fallback standalone

Essa skill não é útil sem um adapter. Se ativada sozinha, oriente o usuário a instalar pelo menos um pacote `pm-tasks-<tool>`.
