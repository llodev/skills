<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-repository/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-repository/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-repository/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-repository

> Portas de repositório + adapters — par Firestore/InMemory, `toFirestore`/`fromFirestore`, token DI e testes de contrato.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-repository?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-repository)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte da família `@llodev/ts-ddd`.

O que você ganha:

- **Uma tabela de decisão Repository vs Query** — carregar para mutar passa por um Repository que retorna uma entidade de domínio; ler para exibir passa por uma interface Query separada que retorna um DTO. Nunca misturados na mesma interface.
- **O padrão de adapter lado a lado** — um adapter Firestore e um adapter InMemory atrás da mesma porta + símbolo de token DI, para que testes de use case substituam o in-memory sem stubs `jest.fn()`.
- **Disciplina de mapeamento** — `toFirestore`/`fromFirestore` vivem em arquivos de mapper dedicados, nunca inline em um método de operação; `firebase-admin/firestore.Timestamp` nunca vaza para além do mapper até o domínio (apenas `Date`).
- **Regras de fronteira de agregado** — uma única porta possui as escritas de todo o agregado; `save()` aceita uma entidade totalmente construída e já validada, e nunca aplica patch em campos parciais.
- **Uma lista `NEVER`** cobrindo armadilhas reais do Firestore: ler `snap.data()` sem verificar `snap.exists`, compartilhar referências de entidade entre round-trips em vez de `toSnapshot()`/`tryCreate(structuredClone(...))`, e conectar um adapter via `useClass` sem o símbolo de token.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/ts-ddd-repository

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-repository
```

Sem MCP, sem config, sem init — é uma skill de conhecimento puro. Após instalar, ela é ativada por prompts como os abaixo.

## Uso

| Exemplo de prompt                                         | O que o agente faz                                                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `"add a ProductRepository port with findBySlug and save"` | Gera a interface da porta, símbolo de token DI e o par de adapters InMemory + Firestore                            |
| `"why does this list method leak Firestore Timestamp?"`   | Aponta para a regra de fronteira do mapper — converta `Timestamp` ↔ `Date` dentro de `toFirestore`/`fromFirestore` |
| `"should this be a Repository or a Query?"`               | Aplica a tabela de decisão Repository vs Query (CQRS)                                                              |
| `"review this adapter for aggregate-boundary violations"` | Verifica que `save()` toca apenas um agregado e recebe uma entidade totalmente validada                            |

## Conteúdo

| Arquivo                                    | Conteúdo                                                                                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                 | Condições de disparo, layout de arquivos, tabela Repository vs Query, regras principais e lista NEVER.                                                    |
| `references/repository-pattern.md`         | Forma da porta, token DI, adapter InMemory, estratégia de teste de adapter duplo, regra de enums em fixtures, checklist.                                  |
| `references/firestore-adapter.md`          | Fundamentos do Firebase Admin SDK, subcoleções, conversões de `Timestamp`, harness de teste fake-DB, helpers de mapper, ressalvas de escrita de agregado. |
| `examples/product.repository.ts`           | Uma interface de porta de repositório com métodos nomeados por intenção e um símbolo de token DI.                                                         |
| `examples/in-memory-product.repository.ts` | A contraparte do adapter InMemory, usada diretamente em testes de use case via o mesmo token DI.                                                          |

## Licença

MIT — veja [LICENSE](../../LICENSE).
