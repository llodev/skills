<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-query-cqrs/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-query-cqrs/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-query-cqrs/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-query-cqrs

> Queries do lado de leitura em CQRS — portas `*Query`, use cases de leitura `find-*`, projeções DTO, paginação/filtros e adapters Prisma/InMemory.

[![npm](https://img.shields.io/npm/v/@llodev/ts-query-cqrs?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-query-cqrs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte da família `@llodev/ts-ddd`.

O que você ganha:

- **Uma tabela de decisão Query vs Repository** — exibir uma lista, dashboards e leituras paginadas/filtradas passam por uma `Query` que retorna um DTO; carregar para mutar passa por `Repository.findById` retornando uma entidade de domínio.
- **Um contrato de método único** — `execute(input): Promise<Result<OutputDTO>>` é a única forma que uma interface `Query` expõe; nenhum import de ORM, nenhum tipo de driver de banco vaza para o core.
- **Mapeamento de linha para DTO, nunca de linha para entidade** — o adapter mapeia linhas do banco diretamente para o DTO de projeção; nunca chama `toDomain` nem reconstrói uma entidade de domínio.
- **Uma referência de adapter Prisma** — cláusulas `select` explícitas (nunca `findMany` puro), `$transaction` para contagem + dados atômicos em queries paginadas, e composição condicional de `WHERE` para filtros opcionais.
- **Uma lista `NEVER`** cobrindo os vazamentos reais de CQRS: retornar uma entidade de domínio de uma Query, estender/instanciar a classe de entidade a partir de um DTO, e rodar dois round-trips separados ao banco para dados + contagem.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/ts-query-cqrs

# Vercel CLI
npx skills add llodev/skills/skills/ts-query-cqrs
```

Sem MCP, sem config, sem init — é uma skill de conhecimento puro. Após instalar, ela é ativada por prompts como os abaixo.

## Uso

| Exemplo de prompt                                                | O que o agente faz                                                                                          |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `"add a paginated find-many-products query"`                     | Gera uma interface `Query` + adapter Prisma com `select` explícito, contagem atômica e `PaginatedResultDTO` |
| `"should loading before an update use a Query or a Repository?"` | Aplica a tabela de decisão Query vs Repository — aponta para `Repository.findById`                          |
| `"review this query adapter for over-fetching"`                  | Sinaliza um `findMany` puro sem cláusula `select`                                                           |
| `"write an in-memory mock for this query"`                       | Gera um adapter InMemory atrás da mesma interface `Query` para testes de use case                           |

## Conteúdo

| Arquivo                                       | Conteúdo                                                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                    | Condições de disparo, checklist inicial, tabela de decisão Query vs Repository, regras principais e lista NEVER. |
| `references/query-cqrs-pattern.md`            | Contrato do core, modelagem de DTO, mock em memória, checklist.                                                  |
| `references/prisma-adapter.md`                | Adapter específico do Prisma com `select`, `$transaction`, `WHERE` condicional.                                  |
| `examples/find-many-items.query.ts`           | Um exemplo de interface `Query` + adapter Prisma com paginação e filtros.                                        |
| `examples/in-memory-find-many-items.query.ts` | Um mock em memória da mesma interface `Query`, para testes de use case sem banco de dados.                       |

## Licença

MIT — veja [LICENSE](../../LICENSE).
