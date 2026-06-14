<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/pm-tasks/pm-tasks-core/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/pm-tasks-core

> Skill base + vocabulário CRUD + contrato de autonomous mode compartilhados por todo adapter `@llodev/pm-tasks-<tool>`.

[![npm](https://img.shields.io/npm/v/@llodev/pm-tasks-core?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/pm-tasks-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Este pacote é a fundação compartilhada. **Instale junto com pelo menos um adapter** — sozinho ele não tem formatação específica de ferramenta e não vai ativar.

## Instalação

```bash
npm i @llodev/pm-tasks-core @llodev/pm-tasks-trello
# ou
npx skills add llodev/skills/pm-tasks/pm-tasks-core llodev/skills/pm-tasks/pm-tasks-trello
```

O bundle do marketplace do Claude Code instala a cascata automaticamente — veja o [README raiz do repo](https://github.com/llodev/skills#install).

## O que tem dentro

- **Phases 1–3** do pipeline de extração (plano de entrada → seções estruturadas → generic card canônico) — o mesmo shape que todo adapter consome.
- **6 verbos CRUD** que todo adapter implementa: `task.create`, `checklist.check`, `task.close`, `task.due-date.set`, `task.assignee.add`, `task.comment.add`.
- **Contrato de autonomous mode**: sentinelas de ativação (`[autonomous]` / `--auto`), gate de allowlist, guardrails de escopo, formato do audit log, expectativas de loop contínuo em runs multi-task.
- **Biblioteca compartilhada de init UX** (`@llodev/pm-tasks-core/init-lib`) consumida pelo script `init` de cada adapter — strings de i18n, `promptLocale`, `loadStrings`, resolver de diretório de config sensível à plataforma.
- **Referências** em [`references/`](./references/): `contract.md`, `crud-vocabulary.md`, `autonomous-mode.md`, `generic-card.md`, `audit-log-format.md`, `init-ux.md`.

## Opcional — rotacionar o audit log do autonomous mode

Quando você habilita `autonomous` em um adapter, toda chamada write-through escreve uma linha JSONL em `~/.local/share/llodev/pm-tasks/<tool>/audit.log`. O `rotate-audit.sh` que vem junto mantém o log pequeno.

```cron
# Diariamente às 04:00, mantém 90 dias de audit log para Trello + Asana
0 4 * * * /path/to/pm-tasks-core/scripts/rotate-audit.sh trello
0 4 * * * /path/to/pm-tasks-core/scripts/rotate-audit.sh asana
```

> [!TIP]
> O audit log é a fonte de verdade do agente para "o que aconteceu nesta sessão autonomous". Sua ferramenta de PM (board do Trello/Asana) é o audit log **humano** — mantenha os dois em sincronia. Veja [`references/autonomous-mode.md`](./references/autonomous-mode.md) § _Continuous operation across multi-task loops_.

## Licença

MIT — veja [LICENSE](./LICENSE).
