<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/study-abstract/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/study-abstract/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/study-abstract/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/study-abstract

> Transforme qualquer material de estudo em um resumo didático que o leitor consegue usar com a fonte fechada.

[![npm](https://img.shields.io/npm/v/@llodev/study-abstract?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/study-abstract)
[![Licença: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte da família `@llodev/study`.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/study-abstract

# Vercel CLI
npx skills add llodev/skills/skills/study-abstract
```

Sem MCP, sem config, sem init — é uma skill de conhecimento puro. Após instalar, ela é ativada por prompts como os abaixo.

## Uso

| Exemplo de prompt                    | O que o agente faz                                              |
| ------------------------------------ | --------------------------------------------------------------- |
| `"resume this lecture"`              | Escreve um resumo no idioma do pedido, com a fonte fechada      |
| `"abstract this folder of lectures"` | Um resumo por unidade, mais um índice curto                     |
| `"apply the errata"`                 | Mantém a frase da fonte e a correção como duas frases rotuladas |

## Conteúdo

| Arquivo                   | Conteúdo                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `SKILL.md`                | Fluxo, ordem das seções, regras de idioma e quando escrever um resumo ou um índice.           |
| `anti-patterns/prose.md`  | Falhas de prosa: siglas sem o nome completo, setas como verbo e reparos silenciosos da fonte. |
| `references/conflicts.md` | Conflitos empilhados e uma nota de correção que cobre um conjunto.                            |
| `references/sources.md`   | O que confiar em slides, digitalizações, notebooks, planilhas, código e mídia.                |
| `examples/index.md`       | Forma do índice de um conjunto: uma pergunta por unidade e um diagrama de sequência opcional. |

## Licença

MIT — veja [LICENSE](../../LICENSE).
