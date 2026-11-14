<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ui-art-direction/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ui-art-direction/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ui-art-direction/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ui-art-direction

> Faça a direção de arte de uma UI primeiro em modelos de imagem, depois construa em código e verifique contra o mockup.

[![npm](https://img.shields.io/npm/v/@llodev/ui-art-direction?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ui-art-direction)
[![Licença: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte da família `@llodev/ui`.

## Instalação

```bash
# npm (com skillpm ou marketplace do Claude Code)
npm i @llodev/ui-art-direction

# Vercel CLI
npx skills add llodev/skills/skills/ui-art-direction
```

Sem MCP, sem config, sem init. É uma skill de conhecimento com scripts auxiliares. Após instalar, ela é ativada por prompts como os abaixo.

## Requisitos

- Python 3.10 ou mais recente e Pillow, para todos os scripts auxiliares. Cada script responde a `python3 scripts/<name>.py --help`.
- Opcional: numpy, para o método SSIM em `python3 scripts/compare.py`. Sem ele, o script pontua os blocos pelo erro de luminância e o relatório informa isso.
- Opcional: ffmpeg no `PATH`, para `python3 scripts/frames.py`.
- Opcional: o SDK do provedor para o backend escolhido em `python3 scripts/generate.py`, com a chave de API no ambiente e o ID do modelo passado com `--model` ou `IMAGE_MODEL`. É o único script que usa a rede.

Nenhum modelo de imagem é obrigatório. Sem um, a skill funciona no modo assistido: ela escreve os prompts e diz qual arquivo anexar e qual arquivo salvar de volta. Ela pergunta antes de qualquer rodada paga com mais de quatro imagens, de qualquer vídeo e de qualquer loop de novas tentativas.

## Uso

| Exemplo de prompt                                                              | O que o agente faz                                                                                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `"build a distinctive operations dashboard, it must not look like a template"` | Escreve o brief, trava o layout, destila as referências em um cartão de DNA e então prepara de dois a quatro prompts de mockup |
| `"landing page for our new desk lamp, here are three reference photos"`        | Trava as seções, planeja um storyboard de rolagem com um quadro por seção e usa as fotos só para a identidade                  |
| `"give this app a new visual identity without breaking anything"`              | Inventaria rotas, componentes e funções, usa uma captura do app em execução como layout e reestiliza o tema                    |
| `"build this approved mockup and show me how close the result is"`             | Escreve a spec de build, constrói na stack do projeto e relata a fidelidade bloco a bloco em relação ao mockup                 |

## Conteúdo

| Arquivo                            | Conteúdo                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                         | Fases 0–7, as quatro regras, rotas, modos e a trava de custo, e quando ler cada arquivo.                            |
| `references/brief-and-layout.md`   | Fase 0: descoberta, o contrato do brief, `wire.json`, o render de esqueleto e a trava de layout.                    |
| `references/modes-and-models.md`   | Modos automático, nativo e assistido, o que procurar em um modelo, trava de custo, sidecar de procedência.          |
| `references/concept-and-dna.md`    | Fase 1: a frase-conceito, referências fora de UI, eixos de divergência, o cartão de DNA, regras de PI.              |
| `references/mockup-prompting.md`   | Fase 2: o contrato do prompt, arte versus UI, prancha de controle, storyboard, folha de estados, mobile.            |
| `references/converge.md`           | Fase 3: uma mudança por rodada, a rubrica de cinco critérios, o crítico cego, `lineage.md`, a trava.                |
| `references/motion.md`             | Fase 4: prompts de imagem para vídeo, quadros inicial e final, keyframes, a spec de movimento, movimento reduzido.  |
| `references/build-spec.md`         | Fase 5: tokens, componentes e estados, triagem de construtibilidade e o pipeline de assets.                         |
| `references/implementation.md`     | Fase 6: camadas, o brief de delegação, receitas, mobile e estados, acessibilidade.                                  |
| `references/fidelity-and-lock.md`  | Fase 7: captura determinística, o loop de comparação por blocos, ordem de correção, baseline, checklist de entrega. |
| `references/reskin.md`             | Rota de reskin: inventário, o app em execução como referência de layout, reestilização no nível do tema.            |
| `anti-patterns/generic-ai-look.md` | O visual genérico de IA em imagens e em código, e a checagem de distância.                                          |
| `anti-patterns/process.md`         | Erros de processo, de projetar em código primeiro a novas tentativas pagas sem confirmação.                         |
| `examples/brief.md`                | Um brief de Fase 0 para um dashboard de observabilidade fictício.                                                   |
| `examples/dna-card.md`             | Um cartão de DNA destilado de referências fora de UI.                                                               |
| `examples/lineage.md`              | Três rodadas com notas, incluindo uma versão rejeitada.                                                             |
| `examples/motion-spec.md`          | Um clipe lido como spec de movimento.                                                                               |
| `examples/storyboard.md`           | Um storyboard de rolagem de landing page, um quadro por seção.                                                      |
| `examples/wire.json`               | Uma trava de layout que é entrada válida para o script de wireframe.                                                |
| `scripts/wireframe.py`             | `wire.json` para um PNG de wireframe cinza com rótulos.                                                             |
| `scripts/board.py`                 | Folha de contato rotulada com as versões do mockup.                                                                 |
| `scripts/palette.py`               | Cores dominantes, papéis sugeridos, razões de contraste, uma amostra e variáveis CSS.                               |
| `scripts/compare.py`               | Mockup versus captura: nota por bloco, mapa de calor, piores blocos e um relatório JSON.                            |
| `scripts/frames.py`                | Keyframes uniformemente espaçados e uma folha de contato de um clipe de vídeo.                                      |
| `scripts/generate.py`              | Geração de imagem por um adaptador de provedor, com sidecar de procedência e sem modelo padrão.                     |
| `scripts/_common.py`               | Utilitários compartilhados pelos scripts. Todos os scripts precisam de Python 3.10+ e Pillow.                       |

## Limites conhecidos

- Execuções comportamentais cobrem as Fases 0–2 e a primeira entrega ao usuário. As Fases 3 a 7 (convergir, movimento, spec, build, verificar e travar) não foram executadas de ponta a ponta. Elas são cobertas por testes dos scripts e por duas leituras: agentes novos, cada um com apenas o `SKILL.md` e uma referência, consideraram cada uma executável, mas pouco especificada em alguns pontos. As lacunas da primeira leitura foram fechadas. A segunda, mais rígida, ainda encontrou lacunas menores (captura sem Playwright, limiares de aprovação, detalhes de mobile e de sites com várias seções, algumas inconsistências de nomes entre arquivos). No primeiro uso, esses pontos serão decisão sua. O formato da saída do crítico cego foi verificado; a precisão das notas dele e o relatório final de fidelidade não estão verificados até o primeiro uso real.
- As receitas de build são só para web. As Fases 0–5 funcionam para o design de um app nativo, mas a skill não constrói código mobile nativo.
- Não há script de geração de vídeo. A skill fornece o contrato do prompt, e você ou seu agente executam o modelo de vídeo.
- A skill não cita nenhum ID de modelo de imagem ou de vídeo. Confirme o ID atual na documentação do seu provedor.

## Licença

MIT — veja [LICENSE](../../LICENSE).
