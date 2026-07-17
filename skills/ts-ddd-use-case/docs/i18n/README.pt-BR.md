<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-use-case/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-use-case/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-use-case/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-use-case

> Use cases de aplicação — `UseCase<IN,OUT>`, `@Injectable()` + orquestração de portas de repositório, e `Result.ok`/`fail`/`combine` para tratamento de falhas esperadas.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-use-case?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-use-case)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte da família `@llodev/ts-ddd`.

O que você ganha:

- **Uma tabela de decisão de dependência** — create vs transição de estado vs mutação aninhada vs listar-por-filtro vs alocar valor único, cada um mapeado para a chamada de repositório exata e a forma de retorno.
- **A divisão `UseCase<IN, OUT>` vs Application Service** — um verbo IN→OUT limpo recebe um `*.usecase.ts`; um orquestrador reutilizável sem forma limpa (allocator, coordinator, resolver) recebe `application/services/<name>.service.ts` em vez disso.
- **Orquestração fail-early** — todo `await` é seguido de `if (X.isFailure) return X.withFail;`; use cases delegam invariantes para a entidade (`tryCreate`, `publish()`, `addSection()`) em vez de revalidar VOs eles mesmos.
- **Convenções de conexão DI** — `@Injectable()`, `@Inject(<TOKEN>)` contra a interface da porta (nunca a classe concreta Firestore/InMemory), e a disciplina de re-export via barrel.
- **Uma lista `NEVER`** cobrindo os modos de falha reais: lançar exceção para falhas esperadas em vez de retornar `Result.fail`, mapear para HTTP dentro de um use case, e atualizar um agregado sem carregá-lo primeiro.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/ts-ddd-use-case

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-use-case
```

Sem MCP, sem config, sem init — é uma skill de conhecimento puro. Após instalar, ela é ativada por prompts como os abaixo.

## Uso

| Exemplo de prompt                                       | O que o agente faz                                                                               |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `"create a PublishCelebration use case"`                | Gera `UseCase<IN, OUT>` com `findBySlug` → `entity.publish()` → `save`, fail-early em cada passo |
| `"this orchestrator doesn't have a clean IN→OUT shape"` | Redireciona para `application/services/<name>.service.ts` (o padrão `SlugAllocator`)             |
| `"review this use case for HTTP mapping"`               | Sinaliza qualquer lógica de status code e aponta para a camada de controller em vez disso        |
| `"write a use-case test with an in-memory repository"`  | Conecta `InMemoryCelebrationRepository` via o token DI, usando membros de enum nos fixtures      |

## Conteúdo

| Arquivo                                       | Conteúdo                                                                                                                                                                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                    | Condições de disparo, checklist inicial, tabela de decisão de dependência, regras principais, notas da Result API e lista NEVER.                                                                                  |
| `references/use-case-pattern.md`              | Layout real de arquivos, snippets canônicos de create/transição de estado/mutação aninhada/lista, a exceção `application/services/`, estratégia de teste, regras de fixture com enum, checklist de implementação. |
| `examples/create-greeting.usecase.example.ts` | Um create-use-case autocontido + repositório fake em memória + teste Jest usando membros de enum dos contracts.                                                                                                   |
| `examples/README.md`                          | Como o exemplo se relaciona com `SKILL.md`/`references/use-case-pattern.md`, e como adaptá-lo ao criar um novo bounded context.                                                                                   |

## Licença

MIT — veja [LICENSE](../../LICENSE).
