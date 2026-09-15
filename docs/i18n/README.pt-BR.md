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
npx skills add llodev/skills/skills/pm-tasks-trello
```

Veja o [guia de publicação](../../docs/publishing-guide.md) para entender como os três canais se conectam.

## Catálogo

### `pm-tasks-*` — adapters de Project Management

Transformam planos de implementação em tasks de PM e operam essas tasks via paste, MCP publish ou write-through autônomo. Cinco pacotes estão publicados — o `pm-tasks-core` compartilhado mais os adapters de Trello, Asana, Jira e Linear. Mais `@llodev/pm-tasks-testkit` — fakes em memória para os 7 verbos base, para testar skills customizadas.

**Runtime headless (subpath `/adapter`):** importe `createAdapter` de qualquer adapter publicado para acionar os verbos canônicos a partir dos seus próprios scripts/agents, sem invocar a skill:

```ts
import { createAdapter } from "@llodev/pm-tasks-trello/adapter";

const adapter = await createAdapter({ configPath: ".trello.json", mcp });
const r = await adapter.taskMove({ taskId: "card-1", targetListOrSectionId: "wip-list" });
if (!r.ok) throw new Error(`task.move falhou: ${r.code}`);
```

`mcp: (toolName, args) => Promise<unknown>` é um callback fornecido pelo chamador que faz proxy para as tools `mcp__*` do runtime do agent. Mesma forma para `@llodev/pm-tasks-asana/adapter`. Contrato completo em [publishing-guide § 11 — Headless runtime](../../docs/publishing-guide.md#11-headless-runtime-pm-tasks-v19) e nos SKILL.md por adapter.

| Pacote                      | Status      | Fonte                                                          | npm                                 | Vercel CLI                                            |
| --------------------------- | ----------- | -------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------- |
| `@llodev/pm-tasks` _(meta)_ | ✅ v3.1.1   | [packages/pm-tasks/](../../packages/pm-tasks/)                 | `npm i @llodev/pm-tasks`            | —                                                     |
| `@llodev/pm-tasks-core`     | ✅ v1.16.0  | [skills/pm-tasks-core/](../../skills/pm-tasks-core/)           | `npm i @llodev/pm-tasks-core`       | `npx skills add llodev/skills/skills/pm-tasks-core`   |
| `@llodev/pm-tasks-asana`    | ✅ v1.11.0  | [skills/pm-tasks-asana/](../../skills/pm-tasks-asana/)         | `npm i @llodev/pm-tasks-asana`      | `npx skills add llodev/skills/skills/pm-tasks-asana`  |
| `@llodev/pm-tasks-trello`   | ✅ v1.11.0  | [skills/pm-tasks-trello/](../../skills/pm-tasks-trello/)       | `npm i @llodev/pm-tasks-trello`     | `npx skills add llodev/skills/skills/pm-tasks-trello` |
| `@llodev/pm-tasks-testkit`  | ✅ v0.2.0   | [packages/pm-tasks-testkit/](../../packages/pm-tasks-testkit/) | `npm i -D @llodev/pm-tasks-testkit` | —                                                     |
| `@llodev/pm-tasks-jira`     | ✅ v1.3.0   | [skills/pm-tasks-jira/](../../skills/pm-tasks-jira/)           | `npm i @llodev/pm-tasks-jira`       | `npx skills add llodev/skills/skills/pm-tasks-jira`   |
| `@llodev/pm-tasks-linear`   | ✅ v1.2.0   | [skills/pm-tasks-linear/](../../skills/pm-tasks-linear/)       | `npm i @llodev/pm-tasks-linear`     | `npx skills add llodev/skills/skills/pm-tasks-linear` |
| `pm-tasks-notion`           | 🔒 scaffold | [skills/pm-tasks-notion/](../../skills/pm-tasks-notion/)       | —                                   | —                                                     |
| `pm-tasks-clickup`          | 🔒 scaffold | [skills/pm-tasks-clickup/](../../skills/pm-tasks-clickup/)     | —                                   | —                                                     |
| `pm-tasks-monday`           | 🔒 scaffold | [skills/pm-tasks-monday/](../../skills/pm-tasks-monday/)       | —                                   | —                                                     |
| `pm-tasks-bitrix24`         | 🔒 scaffold | [skills/pm-tasks-bitrix24/](../../skills/pm-tasks-bitrix24/)   | —                                   | —                                                     |
| `pm-tasks-todoist`          | 🔒 scaffold | [skills/pm-tasks-todoist/](../../skills/pm-tasks-todoist/)     | —                                   | —                                                     |

> [!NOTE]
> Skills marcadas como `scaffold` são namespaces reservados com um `SKILL.md` placeholder. A descrição delas instrui os agentes a NÃO ativar até um adapter real chegar. Restam 5 scaffolds: notion, clickup, monday, bitrix24, todoist.

> [!NOTE]
> O `@llodev/pm-tasks` (meta) é versionado de forma independente da família via `onlyUpdatePeerDependentsWhenOutOfRange`. A família está em `v1.x`; o meta saltou para `v3.0.0` antes do desacoplamento (atualmente `v3.1.1`) e vai permanecer em `v3.x` até a família chegar em `v2.0.0`.

**Cobertura de verbos.** O vocabulário canônico tem 7 verbos base mais 3 opcionais; cada adapter declara o que suporta no `manifest.json`, e o runtime retorna `UNSUPPORTED_VERB` para o que ficar de fora. Adapters também podem declarar verbos customizados com namespace.

| Adapter    | 7 base | `task.parent.set` | `task.estimate.set` | `task.sprint.set` | Customizado                                |
| ---------- | ------ | ----------------- | ------------------- | ----------------- | ------------------------------------------ |
| **linear** | ✅     | ✅                | ✅                  | ✅                | —                                          |
| **jira**   | ✅     | ✅                | ✅                  | —                 | —                                          |
| **trello** | ✅     | —                 | —                   | —                 | `trello.task.batch-create-with-checklists` |
| **asana**  | ✅     | —                 | —                   | —                 | —                                          |

### `@llodev/ts-ddd` — skills de design DDD para TypeScript

Skills puras de **conhecimento** para construir um codebase TypeScript + DDD — sem MCP, sem config, sem init. Elas ativam pelo prompt e injetam decisões de especialista (validação baseada em `Result`, transições de estado via `cloneWith`, closed sets baseados em enum, pares de adapter Firestore/InMemory) para cada camada arquitetural, mais uma companheira CQRS de leitura.

| Pacote                          | Status    | Fonte                                                                | npm                                   | Vercel CLI                                                  |
| ------------------------------- | --------- | -------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| `@llodev/ts-ddd` _(meta)_       | ✅ v0.1.0 | [packages/ts-ddd/](../../packages/ts-ddd/)                           | `npm i @llodev/ts-ddd`                | —                                                           |
| `@llodev/ts-ddd-entity`         | ✅ v0.1.0 | [skills/ts-ddd-entity/](../../skills/ts-ddd-entity/)                 | `npm i @llodev/ts-ddd-entity`         | `npx skills add llodev/skills/skills/ts-ddd-entity`         |
| `@llodev/ts-ddd-value-object`   | ✅ v0.1.0 | [skills/ts-ddd-value-object/](../../skills/ts-ddd-value-object/)     | `npm i @llodev/ts-ddd-value-object`   | `npx skills add llodev/skills/skills/ts-ddd-value-object`   |
| `@llodev/ts-ddd-dto`            | ✅ v0.1.0 | [skills/ts-ddd-dto/](../../skills/ts-ddd-dto/)                       | `npm i @llodev/ts-ddd-dto`            | `npx skills add llodev/skills/skills/ts-ddd-dto`            |
| `@llodev/ts-ddd-use-case`       | ✅ v0.1.0 | [skills/ts-ddd-use-case/](../../skills/ts-ddd-use-case/)             | `npm i @llodev/ts-ddd-use-case`       | `npx skills add llodev/skills/skills/ts-ddd-use-case`       |
| `@llodev/ts-ddd-repository`     | ✅ v0.1.0 | [skills/ts-ddd-repository/](../../skills/ts-ddd-repository/)         | `npm i @llodev/ts-ddd-repository`     | `npx skills add llodev/skills/skills/ts-ddd-repository`     |
| `@llodev/ts-ddd-controller`     | ✅ v0.1.0 | [skills/ts-ddd-controller/](../../skills/ts-ddd-controller/)         | `npm i @llodev/ts-ddd-controller`     | `npx skills add llodev/skills/skills/ts-ddd-controller`     |
| `@llodev/ts-ddd-domain-service` | ✅ v0.1.0 | [skills/ts-ddd-domain-service/](../../skills/ts-ddd-domain-service/) | `npm i @llodev/ts-ddd-domain-service` | `npx skills add llodev/skills/skills/ts-ddd-domain-service` |
| `@llodev/ts-query-cqrs`         | ✅ v0.1.0 | [skills/ts-query-cqrs/](../../skills/ts-query-cqrs/)                 | `npm i @llodev/ts-query-cqrs`         | `npx skills add llodev/skills/skills/ts-query-cqrs`         |

> [!NOTE]
> `ts-query-cqrs` é a companheira do lado de leitura — cobre `*Query` ports e read use cases `find-*` que ficam separados do par de escrita `ts-ddd-repository`/`ts-ddd-use-case`. Instale `@llodev/ts-ddd` para trazer as 8 skills de uma vez.

## Compatibilidade de agentes

Toda skill publicada declara quais agentes ela suporta no campo `compatibility.agents` do frontmatter. A matriz atual:

> **Claude Code** · **Cursor** · **Codex** · **Windsurf** · **Cline** · **Roo Code** (Gemini CLI parcial via camada de tradução)

## Layout do repositório

As skills ficam achatadas em `skills/` (um diretório por skill, a convenção que
os indexadores de skills esperam); a família é indicada pelo prefixo `pm-tasks-`
no nome e pelo campo `metadata.family` de cada skill, não pelo aninhamento de
diretórios. Pacotes que não são skills (meta-pacote, testkit) ficam em `packages/`.

```
.
├── skills/                    Todas as skills — achatadas, um diretório cada
│   ├── pm-tasks-core/         Extração compartilhada + vocabulário CRUD (family: pm-tasks)
│   ├── pm-tasks-asana/        Adapter Asana (parent + subtasks, custom fields, sections)
│   ├── pm-tasks-trello/       Adapter Trello (boards, lists, labels, members)
│   ├── pm-tasks-jira/         Adapter Jira (epics, estimativas, transições)
│   ├── pm-tasks-linear/       Adapter Linear (cycles, labels, campos temporais nativos)
│   ├── pm-tasks-<member>/     Scaffolds reservados (Notion, ClickUp, Monday, Bitrix24, Todoist)
│   ├── django-schema-design/  Design de schema: estratégia de PK, índices, constraints, migrations
│   ├── ts-ddd-entity/         Entidades de domínio: Entity base, Result.combine, transições cloneWith
│   ├── ts-ddd-value-object/   Value objects: VOs closed-set + compostos, tryCreate/create
│   ├── ts-ddd-dto/            DTOs & contracts: schemas Zod 4, tipos z.infer, enums closed-set
│   ├── ts-ddd-use-case/       Use cases de aplicação: UseCase<IN,OUT>, orquestração via repo-port
│   ├── ts-ddd-repository/     Repository ports + adapters: par Firestore/InMemory, DI token
│   ├── ts-ddd-controller/     Controllers HTTP: rotas, guards, validação Zod, Result→HTTP
│   ├── ts-ddd-domain-service/ Domain services: policies/calculadoras stateless retornando Result
│   └── ts-query-cqrs/         CQRS de leitura: *Query ports, read use cases find-*, projeções
├── packages/                  Pacotes de workspace que não são skills (sem SKILL.md)
│   ├── pm-tasks/              Meta-pacote — instala toda a família pm-tasks
│   ├── pm-tasks-testkit/      Fakes em memória para os verbos CRUD canônicos
│   └── ts-ddd/                Meta-pacote — instala toda a família ts-ddd
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

Os 5 pacotes `pm-tasks` lançados compartilham o conjunto canônico de verbos e a semântica do Lifecycle Fidelity; um 6º adapter é orientado por demanda, não agendado. A prioridade atual é **conformidade de transporte**: o primeiro dogfood ao vivo do Trello encontrou um bug de formato de resposta que 569 testes unitários verdes não pegaram, e o mesmo padrão de mock escrito à mão ainda cobre Asana, Jira e Linear. Detalhes com prioridades e justificativas em [`docs/roadmap.md`](../../docs/roadmap.md).

**Releases recentes:**

- **core `v1.16.0` · trello `v1.11.0`** — **recalibração de esforço**: todos os tiers cortados ~35%, empate resolvido para o tier **menor** e a conversão esforço→calendário agora fixada (dia focado de 6 h; prazo em `ceil(horas_realistas / 6)` dias úteis). Remove um segundo buffer não documentado que se somava aos 20% já embutidos na fórmula.
- **asana `v1.11.0`** — **duração roll-up só em tasks folha**: o novo flag `customFields[].rollsUpFromSubtasks` impede que um pai duplique a soma das subtasks que o Asana já calcula.
- **trello `v1.10.1`** — **unwrap do envelope MCP** (hotfix): o MCP real do Trello envelopa todo resultado de escrita (`{ summary, card: { … } }`), mas o transporte lia um `resp.id` plano — então as escritas reportavam falha _depois_ de terem sido efetivadas, deixando cards órfãos. Stubs substituídos por formatos capturados de uma execução real.
- **trello `v1.10.0`** — **F13 batch create**: `trello.task.batch-create-with-checklists` — cards em paralelo limitado com criação de checklists em duas fases, ~10× mais rápido em planos grandes.
- **U1 narration-language** (core `v1.15.0` → trello `1.9.0` · asana `1.10.0` · jira `1.3.0` · linear `1.2.0`) — o check `C-LANG-1` no doctor mais o contrato de que a narração escrita pelo agent segue o `locale` do workspace, enquanto o conteúdo da task continua seguindo o plano.
- **meta `v3.1.1`** — instala a família completa de cinco pacotes.

**Próximos passos (proposta, ver roadmap §3):**

- **Conformidade de transporte para asana / jira / linear** — capturar os formatos de resposta reais do MCP, substituir os stubs escritos à mão por eles e adicionar um smoke ao vivo por adapter. O Trello provou que a falha é silenciosa e destrutiva.
- **Aplicar `autonomous.allow` em runtime** — hoje o `init` escreve a allowlist e o doctor valida o formato, mas nenhum código publicado a consulta; o caminho headless `/adapter` a ignora por completo.

**Sem agenda — orientado por demanda:**

- Pool de adapters: `pm-tasks-github-projects` (S8 — alto valor, baixo custo) · `clickup` · `notion` · `monday` · `todoist` · `bitrix24`.
- Verbos aditivos, cada um junto do adapter que primeiro precisar dele: `task.time.log` (11º) · `task.blocks.add` (12º) · `task.wip-limit.check` (13º). O conjunto base + opcionais está completo em 10.
- Biblioteca/SDK: `@llodev/pm-tasks-cli` sobre o subpath headless `/adapter` · plugin SDK (`npx pm-tasks-contract-tests`) · sync bidirecional, após ≥4 adapters comprovados em uso real.

**Outras famílias:**

- `django-*` — `django-schema-design` (`v0.2.0`) lançada: estratégia de PK (incremental / UUIDv4 / UUIDv7 com trade-offs de localidade de inserção), índices, constraints, migrations seguras. `django-model-design` (camada de model) é o próximo natural.
- `ts-ddd-*` — 8 skills lançadas na `v0.1.0`, uma por camada arquitetural mais a companheira de leitura `ts-query-cqrs`. Instale todas juntas com `@llodev/ts-ddd` (meta).

## Docs

- [Guia de publicação](../../docs/publishing-guide.md) — como os três canais de distribuição se conectam.
- [Workflow Changesets](../../.changeset/README.md) — registrar → versionar → publicar.
- Os deep dives de cada família vivem no `SKILL.md` e em `references/` do respectivo membro.

## Licença

MIT — veja [LICENSE](../../LICENSE).
