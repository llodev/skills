<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-controller/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-controller/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-controller/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-controller

> Controllers HTTP em uma API TypeScript + DDD — rotas, guards, validação Zod, orquestração de use cases e mapeamento `Result` → HTTP, com a lista NEVER que mantém os controllers finos.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-controller?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-controller)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte da família `@llodev/ts-ddd`.

O que você ganha:

- **Um contrato de tradutor fino** — controllers validam na borda, injetam use cases e mapeiam `Result` → HTTP com `mapResultToHttp`; nenhuma lógica de negócio, nenhum condicional de domínio, nenhuma chamada a repositório dentro de um handler.
- **Regras de posicionamento de guards** — `@UseGuards(ApiKeyGuard)` por método em mutações, nunca no nível da classe, para que leituras públicas e escritas protegidas convivam no mesmo controller.
- **Uma camada de referência NestJS 11** — tokens DI por símbolo, `@Inject(SYMBOL)`, módulos `@Global()`, `ConfigModule.forRoot` validado por Zod, e o test bed `@nestjs/testing` + `supertest` realmente usado em produção.
- **Disciplina de response mapper** — enriquecimento de URLs assinadas, serialização de datas e variantes de união discriminada passam por um mapper dedicado em vez de vazar detalhes internos da entidade.
- **Uma lista `NEVER`** fundamentada em falhas reais: guards no nível da classe que retornam 401 em leituras públicas, `HttpException` lançado inline que bifurca o catálogo de códigos de erro, `new UseCase(...)` que quebra DI e testes.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/ts-ddd-controller

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-controller
```

Sem MCP, sem config, sem init — é uma skill de conhecimento puro. Após instalar, ela é ativada por prompts como os abaixo.

## Uso

| Exemplo de prompt                                   | O que o agente faz                                                                     |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `"add a POST /celebrations/:slug/publish endpoint"` | Gera um método de controller com `ApiKeyGuard`, `ZodValidationPipe`, `mapResultToHttp` |
| `"why is this write endpoint returning 401?"`       | Verifica o posicionamento do guard (classe vs método) contra a lista NEVER             |
| `"review this controller"`                          | Verifica vazamento de lógica de negócio, `new UseCase()`, `HttpException` bruto        |
| `"wire this controller's response for signed URLs"` | Roteia entidade → resposta por meio de um response mapper dedicado                     |

## Conteúdo

| Arquivo                                 | Conteúdo                                                                                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                              | Condições de disparo, layout de pastas, checklist inicial, regras principais e lista NEVER para controllers.                                             |
| `references/controller-pattern.md`      | Fundamentado no repositório: layout de pastas, `ZodValidationPipe`, semântica do `ApiKeyGuard`, `mapResultToHttp`, response mapper, estratégia de teste. |
| `references/nestjs.md`                  | Padrões do NestJS 11: tokens DI por símbolo, `@Inject(SYMBOL)`, módulos `@Global()`, `ConfigModule.forRoot` validado por Zod, test bed.                  |
| `examples/product.controller.nestjs.ts` | Espelho no estilo executável de um controller de produção, mostrando posicionamento de guard e mapeamento `Result` → HTTP.                               |

## Licença

MIT — veja [LICENSE](../../LICENSE).
