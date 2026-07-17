<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-domain-service/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-domain-service/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-domain-service/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-domain-service

> Domain services para lógica que atravessa entidades — policies e calculators sem estado retornando `Result`, com as regras de fronteira que mantêm I/O fora da camada pura de domínio.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-domain-service?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-domain-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte da família `@llodev/ts-ddd`.

O que você ganha:

- **Uma tabela de decisão de posicionamento** — Domain Service vs inline no use case vs Application Service vs método de entidade, resolvida por posse (ownership), necessidade de I/O e reuso, para que a lógica caia na camada certa de primeira.
- **Regras de pureza com dentes** — nenhum repositório, nenhum `@nestjs/*`, nenhum `firebase-admin`, nenhum `Date.now()`/`Math.random()` dentro de um domain service; não-determinismo é injetado como parâmetro, nunca chamado inline.
- **Convenções de nomenclatura e forma** — `*Policy`, `*Calculator`, `*Resolver`, `*Specification`, métodos estáticos por padrão, `Result.fail("DOMAIN_ERROR_CODE")` em falha, `Result.combine` para agregação de múltiplos erros.
- **A saída para I/O documentada, não improvisada** — quando uma regra precisa de repositório ou retries, ela nomeia a casa exata (`application/services/<name>.service.ts`, `@Injectable()`, tokens DI) em vez de contrabandear I/O para a camada de domínio.
- **Uma lista `NEVER`** cobrindo os modos de falha reais: duplicar lógica que já existe em uma entidade, ramificar sobre literais de string em vez de membros de enum, e reservar `execute` exclusivamente para `UseCase<IN, OUT>`.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/ts-ddd-domain-service

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-domain-service
```

Sem MCP, sem config, sem init — é uma skill de conhecimento puro. Após instalar, ela é ativada por prompts como os abaixo.

## Uso

| Exemplo de prompt                                      | O que o agente faz                                                                                       |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `"add a rule that checks stock across two aggregates"` | Posiciona como Domain Service (`*Calculator`), puro e determinístico, retornando `Result`                |
| `"this permission check needs a repository lookup"`    | Redireciona para um Application Service em `application/services/`, não um Domain Service                |
| `"review this domain service for framework leakage"`   | Verifica vazamento de `@nestjs/*`, `firebase-admin` ou chamadas não determinísticas contra a lista NEVER |
| `"where does this cross-entity rule belong?"`          | Percorre a tabela de decisão Domain Service vs Use Case vs Application Service                           |

## Conteúdo

| Arquivo                                      | Conteúdo                                                                                                                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                   | Condições de disparo, checklist inicial, tabela de decisão de posicionamento, regras principais e lista NEVER.                                                                            |
| `references/domain-service-pattern.md`       | Caminhos de arquivo, snippets canônicos `*Policy` e `*Calculator`, regra de enum para closed sets, estratégia de teste, checklist de implementação e o contraste com application service. |
| `examples/permission-policy.service.ts`      | Um domain service estilo `*Policy`: uma verificação booleana sem estado sobre múltiplos objetos de domínio.                                                                               |
| `examples/permission-policy.service.test.ts` | Cobertura de teste para a permission policy, exercitando os caminhos de permitir e negar.                                                                                                 |
| `examples/stock-calculator.service.ts`       | Um domain service estilo `*Calculator`: um cálculo puro entre entidades retornando `Result`.                                                                                              |

## Licença

MIT — veja [LICENSE](../../LICENSE).
