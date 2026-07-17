<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-entity/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-entity/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-entity/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-entity

> Entidades de domínio — base `Entity`, `create`/`tryCreate` com `Result.combine`, normalização via VO e transições de estado via `cloneWith`.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-entity?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-entity)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte da família `@llodev/ts-ddd`.

O que você ganha:

- **Uma API dupla de criação, resolvida** — `tryCreate(props): Result<T>` é a canônica; `create(props): T` é um wrapper fino que delega para `tryCreate` + `throwIfFailed()`. Nunca o contrário.
- **A Enum Rule (HARD)** — todo campo de closed set (status/kind/layout/provider/palette) é um TS enum baseado em string com um type guard; compare com o membro do enum, nunca com um literal de string.
- **Comportamento da classe base que você precisa conhecer** — como o construtor de `Entity` auto-gera/normaliza `id`, `createdAt`/`updatedAt`/`deletedAt`, e por que `cloneWith` faz deep-clone das props com `structuredClone` antes de mesclar.
- **Orientação de transição de estado** — `cloneWith(overrides)` para troca-e-revalidação imutável vs mutar `_field` + `this.touch()` para entidades que possuem uma coleção mutável, com os critérios para escolher entre elas.
- **Uma lista `NEVER`** cobrindo as armadilhas reais: armazenar input de VO não normalizado, setters públicos, pular a validação de elementos de array, e importar do alias legado `@ddd/shared`.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/ts-ddd-entity

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-entity
```

Sem MCP, sem config, sem init — é uma skill de conhecimento puro. Após instalar, ela é ativada por prompts como os abaixo.

## Uso

| Exemplo de prompt                                 | O que o agente faz                                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `"create a Product entity with a status field"`   | Gera `tryCreate`/`create`, um status baseado em enum e getters tipados sobre `Entity<Type, Props>` |
| `"add a publish() transition to Celebration"`     | Adiciona um método de domínio nomeado que muta `_field` + chama `this.touch()`                     |
| `"review this entity for raw string comparisons"` | Sinaliza comparações no estilo `=== "published"` contra a Enum Rule (HARD)                         |
| `"validate an array of nested Section entities"`  | Percorre e valida elemento a elemento via `Result.combine` ou um acumulador manual `errors[]`      |

## Conteúdo

| Arquivo                           | Conteúdo                                                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SKILL.md`                        | Condições de disparo, checklist inicial, Enum Rule (HARD), comportamento da classe base, regras principais e lista NEVER.                                                                        |
| `references/entity-pattern.md`    | Caminhos reais, snippet canônico de `tryCreate`, validação baseada em enum, padrão de array/entidade aninhada, `cloneWith` vs mutação de coleção mutável, layout de teste, tabela de armadilhas. |
| `examples/product.entity.ts`      | Uma entidade de referência autocontida com um campo de status baseado em enum, demonstrando `tryCreate`/`create`.                                                                                |
| `examples/product.entity.test.ts` | Cobertura de teste para a entidade de referência, incluindo casos de enum inválido e validação aninhada.                                                                                         |

## Licença

MIT — veja [LICENSE](../../LICENSE).
