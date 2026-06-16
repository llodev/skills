# @llodev/skills — Roadmap

Data: 2026-06-15. Baseline: branch `main` no commit `cb2c01b` (v1.1 já mergeada
via squash). Doc forward-looking, complementa os trackings em
[`tracking/`](tracking/). Cada item tem **status real** (entregue / parcial /
pendente) e **prioridade**.

**Plano P0 ativo:** [`plans/2026-06-15-pm-tasks-v1.2-v1.4-repo-quality.md`](plans/2026-06-15-pm-tasks-v1.2-v1.4-repo-quality.md) — Phase C runtime attribution + CI hardening + contract conformance + custom-verbs API + DX foundation. Sem tools novos até concluir.

> [!NOTE]
> "Pendente" aqui significa "não implementado". "Parcial" significa que parte
> existe mas tem gap aberto. Itens marcados como resolvidos foram removidos do
> backlog mesmo que apareçam como TODO em trackings antigos.

---

## 1. Limpeza dos trackings — o que já foi resolvido

Itens listados como TODO em trackings antigos que **já estão feitos** e devem
ser ignorados de agora em diante:

| Origem                   | Item                                                                  | Status real                         | Onde foi resolvido                                                                                              |
| ------------------------ | --------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| v1.0.1 § Próximo 1       | Skill-judge baseline + quality gate pré-release                       | ✅ entregue                         | `scripts/skill-judge-baseline.json` + `skill-judge-check.mjs` + `pre-release-check.sh` + Makefile `pre-release` |
| v1.0.1 § Próximo 2 A     | i18n config + init (locale picker, 3 locales no schema)               | ✅ entregue                         | `pm-tasks-core/i18n/{en-US,pt-BR,es-ES}.json` + `init-lib` `loadStrings/interpolate`                            |
| v1.0.1 § Próximo 2 B     | Docs localizadas (SKILL.md, README.md em pt-BR/es-ES)                 | ✅ entregue                         | Cada pacote tem `SKILL.<locale>.md` + `README.<locale>.md` + `package.json files`                               |
| v1.0.0 § proposals       | Tactical fixes (task.close/dueComplete, UI-as-truth, URL/MCP gotchas) | ✅ entregue (Phase 4 do plano v1.1) | Commits da branch v1.1                                                                                          |
| v1.1 código review       | Autonomous mode stateful em multi-task loops                          | ✅ documentado                      | `pm-tasks-core/references/autonomous-mode.md` § "Continuous operation"                                          |
| v1.1 código review       | Frontmatter stale `1.1.0` em SKILL.md localizadas                     | ✅ corrigido                        | Commit `048e78b`                                                                                                |
| v1.1 código review       | `errInvalidConfig` não usado + `Config written` hardcoded EN          | ✅ corrigido                        | Commit `048e78b`                                                                                                |
| v1.0.0 § proposals       | Convenção `<basename>.<lang-code>.md`                                 | ✅ adotada                          | Doc + uso real em todos os 3 pacotes ativos                                                                     |
| v1.1 § Próximos          | Push v1.1 + PR → main + CI publica 3 pacotes                          | ✅ entregue                         | Branch v1.1 mergeada via squash; tags + releases publicadas pelo Changesets action                              |
| v1.0.0 § Deferred 5.3    | Migrar workflow `~/.claude/skills/plan-to-task-cards/` pros pacotes   | ✅ entregue                         | Workflow diário já consome `@llodev/pm-tasks-*` em produção                                                     |
| v1.0.0 § Deferred 3.13   | Asana dogfood em workspace limpo                                      | ✅ entregue                         | Validado em sessão real                                                                                         |
| v1.1 § Próximos 2.2      | Spot-check pt-BR/es-ES com revisão humana                             | ✅ entregue                         | Validado pelo dono do repo                                                                                      |
| v1.1 review nice-to-have | `promptYesNo` cross-locale tolerance — comentário explicativo         | ✅ entregue                         | `pm-tasks-core/scripts/init-lib.mjs` § promptYesNo                                                              |

---

## 2. Backlog real (depois da limpeza)

### 2.1 Pendências carregadas dos trackings

| #   | Item                                                                                                                                | Origem               | Tamanho              | Bloqueia release?                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------------- | -------------------- | ------------------------------------------ |
| A   | **Phase C — runtime locale-aware attribution** (`commentPrefix`, `autonomousCommentPrefix`, `descriptionFooter` no adapter runtime) | v1.0.0 + v1.1 review | M (refactor adapter) | Não, mas é a feature mais visível pendente |
| D   | Testes para `registerI18nRoot` / `loadStrings` adapter-scoped + `promptLocale` invalid path                                         | v1.1 review          | S                    | Não                                        |
| E   | Validador de path-correctness em `.md` localizados (`references/contract.pt-BR.md` etc.)                                            | v1.1 review          | S                    | Não                                        |
| F   | Documentar `NOISE_BAND` no skill-judge gate (atualmente "diff silencioso vs test name")                                             | v1.1 review          | XS                   | Não                                        |

> [!NOTE]
> Itens B, C, G, H removidos — todos resolvidos (B/C/G) ou virados acompanhamento
> manual fora-de-roadmap (H, `skills.sh` indexação é cron externo do índice).

### 2.2 Itens de polish entregues durante esta revisão

- ✅ Comentário explicativo da tolerância cross-locale do `promptYesNo` adicionado.
- ✅ Revisão humana das traduções pt-BR/es-ES feita pelo dono do repo.

---

## 3. Gaps de engenharia (código / processo)

Identificados varrendo o repositório atual. Cada um inclui **por que importa**
no contexto pm-tasks + agent skills.

### 3.1 Testes e qualidade

| #   | Gap                                                                                                                               | Por quê                                                                                                                           | Esforço |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------- |
| E1  | **Sem teste E2E** consumindo um pacote publicado (tarball local via `pnpm pack` + `npx`). Hoje só temos unit tests do `init-lib`. | Bug do v1.0.1 (bin entry / shebang) escapou porque `node scripts/init.mjs` rodava local mas `npx @llodev/pm-tasks-asana` falhava. | M       |
| E2  | **Sem golden master** do skill-judge baseline. Score só vive no `baseline.json`; sem snapshot do rubric input.                    | Score muda silenciosamente se rubric da skill `skill-judge` mudar — perdemos a explicação do "porque 85".                         | S       |
| E3  | **Sem contract conformance test** que prove adapter ↔ `contract.md`. `contract-check.mjs` existe mas é frouxo.                    | Quando um novo verbo for adicionado ao core, adapters podem ficar desatualizados sem alarme.                                      | S       |
| E4  | **Sem coverage gate** (Istanbul / c8).                                                                                            | Não conseguimos exigir cobertura mínima no PR.                                                                                    | S       |
| E5  | **Sem mutation testing**.                                                                                                         | Testes do `init-lib` podem estar fracos sem perceber.                                                                             | M       |
| E6  | **Sem snapshot test do tarball** (`pnpm pack` + listar arquivos).                                                                 | Já tivemos o bug do `files` field excluindo i18n; snapshot teria detectado.                                                       | S       |

### 3.2 TypeScript / DX

| #   | Gap                                                                                                                   | Por quê                                                                                                                            | Esforço |
| --- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------- |
| T1  | Repo é 100% `.mjs` (decisão registrada). Sem `.d.ts` shipped → consumidores TS não tem tipos do `init-lib` exportado. | Adapters de terceiros (Jira, Linear quando chegarem) ganhariam tipo `loadStrings(scope, locale): Promise<Record<string, string>>`. | M       |
| T2  | Sem JSDoc `@type` mínimo em `init-lib.mjs`.                                                                           | Mesmo sem TS, JSDoc dá autocomplete e contrato implícito.                                                                          | S       |

### 3.3 Release engineering

| #   | Gap                                                                                                       | Por quê                                                                                   | Esforço |
| --- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------- |
| R1  | **CI `release` não roda `validate` nem `contract-check` antes de publicar**. Só roda `changesets/action`. | Bug que passou pelo lefthook (rodando local) pode publicar quebrado. Validate é só na PR. | XS      |
| R2  | **Sem CHANGELOG.md auto-publicado nos pacotes** — confiamos no GitHub Releases gerado por Changesets.     | npm consumer não vê changelog ao instalar.                                                | S       |
| R3  | **Sem npm provenance** (`--provenance`). Em 2026 já é tabela.                                             | Sinal de supply-chain.                                                                    | XS      |
| R4  | **Sem canary publish** (versão `0.0.0-pr-<n>`) para testar tarball antes do release definitivo.           | Ainda dependemos de `pnpm pack` manual.                                                   | M       |
| R5  | **Sem package-size budget** (bundlephobia / size-limit).                                                  | Skills são markdown + JSON, mas tarballs cresceram >50kB com i18n; sem teto explícito.    | S       |
| R6  | **Sem dependabot / renovate.json**. `ajv` `^8.17.1` pode envelhecer silenciosamente.                      | Supply-chain hygiene.                                                                     | XS      |

### 3.4 Repository hygiene

| #   | Gap                                                                                     | Por quê                                                                         | Esforço |
| --- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------- |
| H1  | Sem `CONTRIBUTING.md`.                                                                  | Repo é público no llodev; sem guia, contribuição externa fica adivinhação.      | S       |
| H2  | Sem `SECURITY.md`.                                                                      | npm registry exige um canal de reporte.                                         | XS      |
| H3  | Sem `CODE_OF_CONDUCT.md`.                                                               | Padrão GitHub community-files.                                                  | XS      |
| H4  | Sem issue / PR templates (`.github/ISSUE_TEMPLATE/`).                                   | Acelera triage; útil quando scaffolds virarem adapters reais.                   | S       |
| H5  | Sem `CODEOWNERS`.                                                                       | Sem auto-assign de review por pacote.                                           | XS      |
| H6  | `marketplace.json` não está versionado no roadmap (existe via Claude Code marketplace). | Sem teste que prove paridade entre `marketplace.json` e pacotes npm publicados. | S       |

### 3.5 Observabilidade / debugging

| #   | Gap                                                                                                                         | Por quê                                                                          | Esforço |
| --- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------- |
| O1  | **Audit log existe mas sem rotação automatizada inteligente** (`pm-tasks-core/scripts/rotate-audit.sh` é shell rudimentar). | Em uso real, audit cresce rápido; rotation precisa ser idempotente + size-aware. | S       |
| O2  | **Sem telemetria opt-in**. Não sabemos quais verbos são mais usados, quais adapters falham mais.                            | Bloqueia decisão de roadmap baseada em dados.                                    | M       |
| O3  | **Sem comando `pm-tasks doctor`** (verifica config válido, MCP acessível, allowlist OK, audit gravável).                    | Hoje o user descobre que MCP está offline só quando tenta publicar.              | S       |

---

## 4. Gaps de Project Management (features novas)

Recortadas do contexto real de uso (engenheiros + agências usando pm-tasks
todo dia). Priorizadas por dor observada.

### 4.1 Features de alto valor PM

| #   | Feature                                          | Descrição                                                                                             | Tools que suportam                   | Esforço |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------ | ------- |
| F1  | **Sync reverso (read-back)**                     | Pull cards do tool → atualiza o plano local (estado, datas, comentários). Bidirecional.               | Todos                                | L       |
| F2  | **Sprint / iteration support**                   | `task.sprint.set` como 7º verbo. Jira / Linear / ClickUp têm sprints nativos.                         | Jira, Linear, ClickUp, Monday        | M       |
| F3  | **Parent/child hierarchy (epic → story → task)** | Hoje só temos checklist items (1 nível). Asana suporta nativo; Jira/Linear têm epics.                 | Jira, Linear, Asana, ClickUp         | M       |
| F4  | **Cross-tool migration**                         | `pm-tasks-migrate from=trello to=linear` mapeia cards via core vocabulary.                            | Todos os que implementam os 6 verbos | L       |
| F5  | **Time tracking**                                | `task.time.log(hours, comment)` 8º verbo. Jira / Linear / ClickUp / Todoist têm time-tracking nativo. | Jira, ClickUp, Linear, Todoist       | M       |
| F6  | **Dependency graph** (blocks/blocked-by)         | `task.blocks.add(otherTaskId)`. Jira, Linear, Monday suportam.                                        | Jira, Linear, Monday                 | M       |
| F7  | **Story points / estimation**                    | `task.estimate.set(points)`. Linear / Jira nativos.                                                   | Jira, Linear, ClickUp                | S       |
| F8  | **Card templates**                               | Pré-define um card-archetype (ex.: "bug report") com checklist + labels + custom fields.              | Todos                                | S       |
| F9  | **Multi-board orchestration**                    | Plano único distribuído em múltiplos boards/projetos (ex.: backend → board A, frontend → board B).    | Todos                                | M       |
| F10 | **WIP limits enforcement**                       | Bloqueia `task.create` se coluna destino estourou WIP.                                                | Trello, Jira, Linear                 | S       |
| F11 | **Standup notes verb**                           | `task.standup.post(channel)` resume estado dos cards do agente nas últimas 24h.                       | Todos                                | M       |
| F12 | **Velocity / burndown reporter**                 | Read-only analytics agregando audit log + tool API.                                                   | Todos                                | M       |

### 4.2 Boas práticas de programação que viraram features

| #   | Item                                                                                                                                                  | Por quê                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| P1  | **`@llodev/pm-tasks-testkit`** — pacote separado com fakes para os 6 verbos, útil pra plugins testarem sem MCP real.                                  | Hoje cada adapter precisa reinventar mocks.                         |
| P2  | **`@llodev/pm-tasks-cli`** — CLI standalone que consome adapters via `import()` dinâmico. Útil pra uso fora de IDE/agent context.                     | Hoje o único entrypoint é via skill activation.                     |
| P3  | **Custom-verbs extension API** — permitir adapters declararem verbos próprios (ex.: `card.cover-image.set` exclusivo Trello) sem alterar core.        | Hoje verbos não-canônicos forçam o adapter a violar contract-check. |
| P4  | **Plugin SDK + contract.test.mjs reuso** — exportar do core uma suite de testes que adapters terceiros podem rodar com `npx pm-tasks-contract-tests`. | Eleva qualidade do ecossistema sem precisar de PR no monorepo.      |

---

## 5. Skills `pm-tasks-*` faltando (ranked por mercado)

Hoje temos 3 ativos (core, asana, trello) + 7 scaffolds. Ranking de
implementação por **share de mercado de teams reais usando PM tools** (2025–26):

| #      | Skill                   | Justificativa de mercado                                                                                                                                | MCP status                                                           | Esforço                                               | Prioridade |
| ------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------- | ---------- |
| **S1** | **`pm-tasks-jira`**     | Líder absoluto em dev/agile (~40% do mercado dev). Atlassian é default em qualquer empresa >100 devs. Cobre o maior TAM da família por larga margem.    | Atlassian Remote MCP GA + Atlassian Rovo MCP, ambos production-ready | L (custom fields, projects, JQL, workflows estaduais) | 🔴 P0      |
| **S2** | **`pm-tasks-linear`**   | Premium dev market. Mindshare desproporcional ao share (startups, scale-ups, open-source). Modelo opinativo (cycle = sprint nativo) facilita o adapter. | Linear MCP oficial GA                                                | M (cycles, triage, priorities, sub-issues)            | 🔴 P0      |
| **S3** | **`pm-tasks-clickup`**  | Fastest-growing PM tool, especialmente forte em agências/SMB e times híbridos (dev + marketing).                                                        | ClickUp MCP community em maturação                                   | M (lists, statuses custom, custom fields ricos)       | 🟠 P1      |
| **S4** | **`pm-tasks-notion`**   | Maior install base, PM via databases. Cobre mercado que NÃO compra Jira (founders, criadores, micro-times).                                             | Notion MCP oficial GA                                                | M (databases relacionais, propriedades dinâmicas)     | 🟠 P1      |
| **S5** | **`pm-tasks-monday`**   | Forte em enterprise não-dev (operação, marketing, RH). TAM enterprise grande.                                                                           | Monday MCP em desenvolvimento                                        | M (boards, items, columns custom)                     | 🟡 P2      |
| **S6** | **`pm-tasks-todoist`**  | Maior base consumidor (~30M). Útil pra freelancer / solo dev / 1-2 pessoas. MCP trivial de fazer (API simples).                                         | Todoist MCP community estável                                        | S (tasks, projects, labels — modelo simples)          | 🟡 P2      |
| **S7** | **`pm-tasks-bitrix24`** | Niche geográfico (LATAM, Eastern Europe, SMB com CRM integrado). Penetração relevante no Brasil.                                                        | Sem MCP oficial; API REST bem documentada                            | M (REST puro, sem MCP, precisa cliente próprio)       | 🟢 P3      |

### 5.1 Skills `pm-tasks-*` adicionais a considerar (fora dos scaffolds atuais)

| #   | Skill                          | Justificativa                                                                                                                                 | Prioridade                      |
| --- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| S8  | **`pm-tasks-github-projects`** | GitHub Projects (v2) é PM nativo do GitHub; integração direta com PRs/issues. MCP oficial (`github-mcp-server`) já cobre. Audiência dev pura. | 🟠 P1 (alto valor, baixo custo) |
| S9  | **`pm-tasks-height`**          | Modern PM com AI nativo; cresce no mesmo segmento de Linear.                                                                                  | 🟢 P3                           |
| S10 | **`pm-tasks-basecamp`**        | Legado-mas-vivo; SMB stable.                                                                                                                  | 🟢 P3                           |
| S11 | **`pm-tasks-airtable`**        | Não é PM puro mas usado como tal por many teams; databases flexíveis.                                                                         | 🟢 P3                           |
| S12 | **`pm-tasks-wrike`**           | Enterprise (Citrix-owned); footprint grande mas pouco mindshare.                                                                              | ⚪ P4                           |
| S13 | **`pm-tasks-smartsheet`**      | Enterprise (PMI), TAM grande mas overlap com Monday.                                                                                          | ⚪ P4                           |

---

## 6. Roadmap priorizado (lista única ordenada)

Ordem de execução proposta. Critério: **valor × dor × custo-de-retrofit**.

> [!IMPORTANT]
> **Princípio guia (2026-06-15):** **qualidade / testes / foundation antes de
> qualquer novo adapter de PM tool.** Custo de retrofit cresce linearmente com
> o número de adapters publicados. Hoje só temos 2 (asana + trello), janela
> ideal pra lock-in arquitetural. Jira / Linear / ClickUp ficam reservados pra
> P1 e só entram depois que P0 estiver fechado.
>
> Plano de execução do P0: **[`plans/2026-06-15-pm-tasks-v1.2-v1.4-repo-quality.md`](plans/2026-06-15-pm-tasks-v1.2-v1.4-repo-quality.md)**.

### 🔴 P0 — Foundation & Quality (v1.2 → v1.4)

Sem novos adapters. 5 releases planejadas (3 minor + 2 patch). Mantém v1.x —
nenhuma das mudanças é breaking.

1. **v1.2.0 — Phase C: runtime attribution** [§2.1 A]
   - `commentPrefix` / `autonomousCommentPrefix` / `descriptionFooter` opt-in, locale-aware.
   - Fecha a feature mais visível pendente, deferida explicitamente em v1.1.
2. **v1.2.1 — CI release hardening** [§3.3 R1 + §3.1 E6 + §3.3 R3]
   - Workflow `release.yml` ganha steps de `validate` + `contract-check` + skill-judge + tarball snapshot. Publish com `--provenance`.
   - Blast radius enorme, esforço XS-S. Patch.
3. **v1.3.0 — Contract conformance + custom-verbs API** [§3.1 E3 + §4.2 P3]
   - `manifest.json` por adapter + namespace pra verbos custom (`<tool>.*`).
   - **A entrega mais crítica do plano** — retrofit em 4+ adapters depois custa 4× mais.
4. **v1.3.1 — Test gaps + docs polish** [§2.1 D + E + F + §3.1 E2]
   - `registerI18nRoot` / `loadStrings` adapter-scoped tests, `promptLocale` invalid path, validador de path-correctness em `.md` localizados, `NOISE_BAND` documentado inline, golden master do rubric skill-judge.
5. **v1.4.0 — DX foundation** [§3.2 T1 + §3.1 E1 + §3.3 R4 + §4.2 P1]
   - `.d.ts` handcrafted shippado pelo core + adapters, JSDoc fallback nos `.mjs`.
   - E2E canary test (`pnpm pack` + `npx <pkg>` em sandbox limpo) em todo PR.
   - `@llodev/pm-tasks-testkit` publicado (fakes pros 6 verbos canônicos).

### 🟠 P1 — Primeiros adapters novos (v1.5)

6. **`pm-tasks-jira`** [§5 S1] — maior TAM da família.
7. **`pm-tasks-linear`** [§5 S2] — premium dev; cycle alinhado com nosso vocabulário.
8. **F2 — Sprint / iteration support** (7º verbo `task.sprint.set`) [§4.1]
   - Habilita Jira / Linear / ClickUp natural-fit.
9. **F3 — Parent/child hierarchy** (epic → story → task) [§4.1]
   - Necessário pra Jira (epics) e Linear (sub-issues).

### 🟡 P2 — Expansão (v1.6 → v1.7)

10. **`pm-tasks-clickup`** [§5 S3]
11. **`pm-tasks-notion`** [§5 S4]
12. **`pm-tasks-github-projects`** [§5 S8]
13. **F5 — Time tracking** (8º verbo) [§4.1]
14. **F7 — Story points / estimation** [§4.1]
15. **F1 — Sync reverso (read-back)** [§4.1]
    - Bidirecional é grande mudança arquitetural; entrega depois de termos 4–5 adapters maduros.

### 🟢 P3 — Cauda longa (v1.8+)

16. **`pm-tasks-monday`** [§5 S5]
17. **`pm-tasks-todoist`** [§5 S6]
18. **`pm-tasks-bitrix24`** [§5 S7]
19. **`pm-tasks-height` / `pm-tasks-basecamp` / `pm-tasks-airtable`** [§5 S9–S11]
20. **F4 — Cross-tool migration** [§4.1] — viável depois de ≥4 adapters.
21. **F6 — Dependency graph** [§4.1]
22. **F8 — Card templates** [§4.1]
23. **F10 — WIP limits enforcement** [§4.1]
24. **F11 — Standup notes verb** [§4.1]
25. **F12 — Velocity / burndown reporter** [§4.1]
26. **`@llodev/pm-tasks-cli`** [§4.2 P2]

### ⚪ P4 — Backlog distante

27. **`pm-tasks-wrike` / `pm-tasks-smartsheet`** [§5 S12–S13]
28. **Telemetria opt-in** [§3.5 O2]
29. **Multi-board orchestration** [§4.1 F9]
30. **Mutation testing** [§3.1 E5]

### Polish contínuo (qualquer release)

- §3.3 R2/R5/R6: CHANGELOG por pacote, size budget, dependabot.
- §3.4 H1-H6: community files (CONTRIBUTING, SECURITY, CoC, templates, CODEOWNERS, marketplace parity).
- §3.5 O1/O3: audit rotation inteligente + `pm-tasks doctor`.
- §4.2 P4: plugin SDK + contract.test.mjs reuso externo.

---

## 7. Riscos e dependências externas

| Risco                                                                                                | Mitigação                                                                                                                              |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| MCP de uma ferramenta sai do ar / muda contrato                                                      | Cada adapter precisa de teste de smoke contra MCP em CI (com secrets em env, não no PR).                                               |
| Phase C (runtime attribution) interage com Phase A (locale config) — refactor pode quebrar v1.1 i18n | TDD obrigatório; `getAttribution()` deve consumir `loadStrings(scope, locale)` sem hardcode. Plano P0 §Phase 1 detalha.                |
| Contract conformance test (v1.3.0) precisa entrar **antes** do primeiro adapter novo                 | Posicionado como v1.3.0 no plano P0 — Jira/Linear (P1) só começam depois. Bypass intencional bloqueia release com mensagem específica. |
| Tarball size explode com 6+ adapters localizados em N idiomas                                        | Tarball snapshot test (v1.2.1) detecta inflate; size-limit (R5) entra como gate em P3.                                                 |
| TypeScript `.d.ts` handcrafted sai de sync com `.mjs` source                                         | `types-check.mjs` no `validate` script roda `tsc --noEmit` contra os `.d.ts` em cada PR.                                               |

---

## 8. Histórico das versões

**Released:**

- v1.0.0 (2026-06-13) — primeira release pública dos 4 pacotes; scaffolds reservam namespaces.
- v1.0.1–v1.0.3 (2026-06-14) — hotfixes de bin entry / publishConfig / files field.
- v1.1.x (2026-06-14) — skill-judge gate + i18n init + docs localizadas (pt-BR/es-ES) + autonomous mode stateful doc + tactical fixes Phase 4.

**Planejado (P0 — plano em [`plans/2026-06-15-pm-tasks-v1.2-v1.4-repo-quality.md`](plans/2026-06-15-pm-tasks-v1.2-v1.4-repo-quality.md)):**

- v1.2.0 — Phase C runtime attribution (commentPrefix / autonomousCommentPrefix / descriptionFooter + i18n).
- v1.2.1 — CI release hardening (validate + contract-check + skill-judge + tarball snapshot + npm provenance).
- v1.3.0 — Contract conformance test + custom-verbs extension API (`manifest.json`, namespace `<tool>.*`).
- v1.3.1 — Test gaps + docs polish (i18n adapter-scoped tests + path-correctness validator + `NOISE_BAND` doc + golden master skill-judge).
- v1.4.0 — DX foundation (TypeScript `.d.ts` + E2E canary + `@llodev/pm-tasks-testkit`).

**Planejado (P1):**

- v1.5.x — `pm-tasks-jira` + `pm-tasks-linear` + verbos `task.sprint.set` + parent/child hierarchy.

---

> [!TIP]
> Quando um item desta lista for entregue, mova-o para o tracking da versão
> correspondente e marque ✅ em §1 deste doc.
