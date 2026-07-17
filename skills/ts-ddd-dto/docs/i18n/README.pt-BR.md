<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-dto/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-dto/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-dto/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-dto

> DTOs & contracts — schemas Zod 4 pareados com tipos `z.infer`, closed sets baseados em enum, e projeções de entrada/saída/leitura.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-dto?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-dto)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte da família `@llodev/ts-ddd`.

O que você ganha:

- **Uma fonte única de verdade para o formato de wire** — DTOs vivem em um pacote de contracts por bounded context, consumido tanto pela API quanto pelo web; nenhum dos dois redefine tipos de wire localmente.
- **Tipagem schema-first** — o schema Zod é declarado primeiro e o tipo TS é derivado via `z.infer`; interfaces escritas à mão que espelham um schema são um NEVER.
- **O padrão enum → tuple → type → predicate** — todo closed set é um `XxxEnum` baseado em string, com `z.literal(EnumName.X)` para branches de união discriminada e `z.nativeEnum(EnumName)` para validadores de conjunto completo.
- **Uma taxonomia de DTO que previne vazamento** — `CreateXxxDTO`/`UpdateXxxDTO`/`XxxFiltersDTO` (entrada) nunca são reutilizados como `XxxResponseDTO` (saída); projeções de leitura CQRS têm forma própria.
- **Uma lista `NEVER`** para os modos de falha reais: literais de string em vez de membros de enum, lógica de transformação dentro do arquivo DTO, e totais de paginação embutidos dentro do array `data`.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/ts-ddd-dto

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-dto
```

Sem MCP, sem config, sem init — é uma skill de conhecimento puro. Após instalar, ela é ativada por prompts como os abaixo.

## Uso

| Exemplo de prompt                                      | O que o agente faz                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `"add a status field to the product DTO"`              | Verifica se o valor é um closed set → adiciona/reutiliza um `XxxEnum`, conecta `z.nativeEnum`          |
| `"create a CreateProductDTO and a ProductResponseDTO"` | Gera schemas Zod + tipos `z.infer` separados para os formatos de entrada de escrita e saída de leitura |
| `"this DTO needs a paginated list"`                    | Adiciona uma projeção no formato `PaginatedResultDTO` com `data`/`meta` mantidos separados             |
| `"review these contracts for leaked wire types"`       | Verifica redefinições fora de `libs/contracts/<bc>` e literais de string brutos para enums             |

## Conteúdo

| Arquivo                     | Conteúdo                                                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                  | Condições de disparo, layout do pacote de contracts, taxonomia de DTO, padrão de enum obrigatório, regras principais e lista NEVER.                  |
| `references/dto-pattern.md` | Layout do pacote de contracts, padrão enum → tuple → type → predicate, snippets de schema/DTO, convenções de nomenclatura, checklist de verificação. |
| `examples/product.dto.ts`   | Um exemplo de DTO autocontido mostrando campos de entrada, saída e closed set baseados em enum.                                                      |

## Licença

MIT — veja [LICENSE](../../LICENSE).
