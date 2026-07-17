<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-value-object/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-value-object/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-value-object/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-value-object

> Value objects — `ValueObject` + `Result`, VOs de closed set e compostos, `tryCreate`/`create`, e disciplina de normalizar-antes-de-validar.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-value-object?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-value-object)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte da família `@llodev/ts-ddd`.

O que você ganha:

- **Um checklist de reuso primeiro** — antes de criar um novo VO, verifica se uma base `Text`/`Number` configurável já cobre o caso via `ValueObjectConfig` (`minLength`/`maxLength`, `minValue`/`maxValue`).
- **O padrão de VO de closed set (obrigatório)** — todo closed set de valores permitidos é um TS enum baseado em string, com `Object.values` derivando a tupla do catálogo; nunca uma tupla de string bruta `as const`, nunca uma comparação de literal de string no call site.
- **Regras de visibilidade de construtor** — `private` para VOs folha, `protected` para VOs projetados para extensão (estilo `Text`, `Id`), com o raciocínio para cada caso.
- **Tratamento de VOs compostos** — VOs em forma de objeto (como `ImageRef`) coletam erros em um array e retornam `Result.fail(errors)` em vez de lançar exceção no primeiro campo inválido.
- **Uma lista `NEVER`** cobrindo as arestas afiadas: validar antes de normalizar, o duplo guard `typeof + isNaN` em VOs numéricos, auto-importar um VO compartilhado via alias do pacote em vez do barrel relativo `../base`.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/ts-ddd-value-object

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-value-object
```

Sem MCP, sem config, sem init — é uma skill de conhecimento puro. Após instalar, ela é ativada por prompts como os abaixo.

## Uso

| Exemplo de prompt                                     | O que o agente faz                                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `"create a PaletteKey value object"`                  | Gera um VO de closed set baseado em enum com `tryCreate`/`create`, `Object.values` e um type guard |
| `"do I need a new VO for this bounded string field?"` | Verifica reuso contra `Text.tryCreate(v, { minLength, maxLength })` antes de criar uma nova classe |
| `"review this VO for validate-before-normalize bugs"` | Sinaliza validação que roda antes de trim/lowercase/strip de acentos na normalização               |
| `"add a composite ImageRef-style VO"`                 | Gera um VO que coleta erros de campo em um array e retorna `Result.fail(errors)`                   |

## Conteúdo

| Arquivo                                      | Conteúdo                                                                                                                                                                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SKILL.md`                                   | Condições de disparo, onde os VOs vivem, checklist inicial, tabela de visibilidade de construtor, padrão de closed set, regras principais e lista NEVER.                                                                       |
| `references/vo-pattern.md`                   | Caminhos reais de arquivo, código anotado para cada tipo de VO (simples, paramétrico, numérico, forma canônica, closed-set/enum, composto, ID com `required()`), regras de import por escopo, checklist de cobertura de teste. |
| `examples/palette-key.vo.ts`                 | Um VO de closed set baseado em enum, demonstrando o padrão obrigatório de closed set.                                                                                                                                          |
| `examples/palette-key.vo.test.ts`            | Cobertura de teste para o VO palette-key, incluindo casos de valor inválido e normalização.                                                                                                                                    |
| `examples/celebration-slot-index.vo.ts`      | Um VO numérico local a um BC, demonstrando a API dupla `tryCreate`/`create` e overrides de config.                                                                                                                             |
| `examples/celebration-slot-index.vo.test.ts` | Cobertura de teste para o VO numérico local a um BC, incluindo casos de limite e override de config.                                                                                                                           |
| `examples/slug.vo.ts`                        | Um VO escalar normalizador (trim/lowercase/strip de acentos antes de validar).                                                                                                                                                 |

## Licença

MIT — veja [LICENSE](../../LICENSE).
