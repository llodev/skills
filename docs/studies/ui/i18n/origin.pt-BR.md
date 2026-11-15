---
name: image-first-ui-design
description: Use para criar ou remodelar telas, dashboards e sites com design fora do padrão: referência visual → mockup por IA de imagem → iteração → vídeo → código fiel e funcional.
---

# Design por imagem: da referência ao código

Esta skill conduz um fluxo em que a criatividade acontece **fora do código**. Pedir direto a um agente de código "faça um site bonito" produz layouts genéricos, porque ele cria limitado pelo que já sabe implementar. Aqui a exploração visual é feita em modelos de geração de imagem (onde a IA é livre), depois em vídeo (para descobrir o movimento), e só no fim o design aprovado é convertido em código real, funcional e fiel.

O princípio que organiza tudo:

> **Divergir em imagem, convergir em código.** Primeiro explore muitas direções visuais baratas (imagens), escolha uma, dê vida a ela (vídeo) e só então construa. Nunca peça ao código para inventar o visual.

E a regra que impede o resultado de virar só uma imagem bonita:

> **A função é fixa; a forma é livre.** O layout (o que a tela precisa ter e onde) é definido antes e não muda durante a exploração. A referência só empresta identidade visual: cor, luz, textura, materiais, formas, atmosfera.

## Mapa das ações

Cada ação pode ser usada sozinha, conforme o momento do trabalho. Execute só as que o pedido precisa.

| Ação | Quando usar | Entrada | Saída |
|---|---|---|---|
| **A0. Brief e trava de layout** | Sempre que for criar ou remodelar uma tela | Pedido, app existente (se houver) | `brief.md`, wireframe do layout |
| **A1. Garimpar e destilar referências** | Falta direção visual ou o usuário trouxe imagens soltas | Tema, imagens, links | `refs/` + cartão de DNA visual |
| **A2. Fundir conceito + layout** | Gerar mockups da tela | DNA visual, refs, wireframe | `mockups/v1/*.png` |
| **A3. Iterar e recombinar** | Os primeiros mockups ainda não convencem | Versões anteriores | `mockups/vN/`, `lineage.md`, versão aprovada |
| **A4. Animar a imagem** | O design tem atmosfera/movimento que precisa ser descoberto | Mockup aprovado | `video/*.mp4`, especificação de movimento |
| **A5. Extrair a especificação** | Antes de codar, a partir do aprovado | Mockup (+ vídeo) | `spec/` com tokens, componentes, assets, movimento |
| **A6. Construir em código** | Implementar a tela | Spec + mockup + vídeo + projeto | Código funcional + comparação de fidelidade |
| **A7. Remodelar um app existente** | O app já existe e precisa de uma nova pele | Screenshot atual + conceito | Novo visual sem quebrar funcionalidades |

Fluxo completo típico: **A0 → A1 → A2 → A3 → (A4) → A5 → A6**. Para remodelar: **A0 → A7** (que reaproveita A1–A6).

## Antes de começar: capacidades e modos

Descubra o que você tem à disposição e escolha o modo:

- **Modo automático** — há chave de API de um modelo de imagem no ambiente (`GEMINI_API_KEY`, `OPENAI_API_KEY` ou o gateway do projeto). Use o script `forge.py` (anexo) ou o SDK do projeto para gerar as imagens.
- **Modo assistido** — não há acesso a modelo de imagem/vídeo. Você prepara tudo (prompts prontos, imagens de referência organizadas, wireframe) e pede ao usuário para rodar no app dele (Gemini, ChatGPT, Midjourney, Krea, etc.) e anexar os resultados. Diga exatamente qual arquivo anexar em cada passo.
- **Escolha de modelos**: para imagem, prefira modelos que aceitam **várias imagens de referência** e renderizam texto bem (famílias Nano Banana/Gemini Image, GPT Image, Seedream, Flux Kontext). Para vídeo, modelos *image-to-video* (Seedance, Wan, Kling, Veo, Runway). Os IDs mudam com frequência: confirme o ID atual na documentação do provedor e passe por `--model`/`IMAGE_MODEL`, nunca deixe fixo no código do produto.
- **Custos**: geração de imagem e vídeo é paga. Gere em lotes pequenos (2–4 por rodada) e confirme com o usuário antes de rodadas grandes ou vídeos longos.

Organize os artefatos sempre assim (dentro do projeto, ex.: `design/<slug>/`):

```
design/<slug>/
  brief.md            ← A0
  layout/wire.json    ← A0 (fonte do wireframe)  · layout/wire.png
  refs/               ← A1 (imagens originais, com origem anotada em refs/SOURCES.md)
  dna.md              ← A1 (cartão de DNA visual)
  prompts/            ← A2/A3/A4 (cada prompt usado, versionado)
  mockups/v1 … vN/    ← A2/A3 (imagens + .json com modelo, refs e prompt)
  lineage.md          ← A3 (o que mudou em cada versão e por quê)
  video/              ← A4
  spec/               ← A5 (tokens.json, tokens.css, components.md, assets.md, motion.md)
  qa/                 ← A6 (comparações mockup × implementação)
```

---

## A0. Brief e trava de layout

Objetivo: fixar **o que a tela faz** antes de pensar em como ela parece.

1. Levante o propósito da tela, o usuário, as ações principais e o conteúdo real (dados, textos, estados). Se o app já existe, rode-o ou leia o código para listar as funcionalidades que **não podem sumir**.
2. Defina as regiões do layout e o que vai em cada uma (ex.: navegação, área principal, painel lateral, barra de entrada, cards de KPI). Inclua proporção da tela alvo (desktop 16:9/16:10, mobile 9:19.5).
3. Escreva `layout/wire.json` e gere o wireframe cinza (`forge.py wireframe`). Caixas neutras, sem estilo: o modelo de imagem deve copiar o **arranjo**, não a aparência.
4. Escreva `brief.md` com: propósito, público, conteúdo real (textos de exemplo que vão aparecer no mockup), restrições técnicas (stack, design system existente a respeitar ou não), plataformas e critérios de aceite.

Se o usuário já tem um design system obrigatório (cores/tipos de marca), registre isso: a exploração passa a variar só atmosfera, ilustração, materiais e composição, respeitando as cores de marca.

## A1. Garimpar e destilar referências

Objetivo: encontrar um **conceito visual de fora do universo de UI** e traduzi-lo em atributos utilizáveis.

1. Busque referências onde a criatividade não é de interface: ilustração, arte digital, fotografia, arquitetura, cinema, renders 3D, pôsteres, objetos (Pinterest, Behance, ArtStation, Dribbble só como complemento). Uma ilustração aleatória costuma render designs mais originais que outro dashboard.
2. Separe 3–8 candidatas em `refs/` e anote a origem de cada uma em `refs/SOURCES.md` (link, autor quando conhecido).
3. Para cada referência escolhida, preencha o **cartão de DNA visual** em `dna.md`:

```
## <nome curto do conceito>  (refs/arquivo.jpg)
Paleta: fundo, superfícies, 1–2 acentos (hex aproximados)       ← use `forge.py palette`
Luz: de onde vem, dura/suave, brilho/glow, contraste
Materiais e texturas: vidro, metal, papel, grão, ruído, linhas finas
Formas e motivos: órbitas, grades, curvas, ângulos, partículas, gráficos técnicos
Composição: centro de massa, simetria, densidade, respiro
Tipografia sugerida: humor (técnica/editorial/geométrica), peso, caixa
Movimento implícito: o que "pediria" para se mexer (fumaça, órbita, pulso)
Riscos: legibilidade, contraste, excesso de ruído, elementos protegidos (personagens, marcas)
```

4. Combine com o usuário qual conceito (ou par de conceitos) seguir. Nunca use personagens, logotipos ou obras identificáveis como elemento do produto: a referência empresta **atributos**, não a obra.

## A2. Fundir conceito + layout (gerar mockups)

Objetivo: gerar telas que tenham **o layout do wireframe** com **a identidade do conceito**.

Entradas para o modelo: imagem(ns) do conceito + wireframe + prompt. Escreva o prompt em inglês (os modelos seguem melhor) e o conteúdo de interface no idioma do produto.

Modelo de prompt (salve em `prompts/v1.md`):

```
You are designing a high-fidelity UI screenshot for a real, usable product.

LAYOUT (must follow exactly — image 2 is the wireframe):
- <região 1: o que contém>
- <região 2: o que contém>
- Aspect ratio <16:9>, flat screen capture, no device frame, no perspective, no hands.

VISUAL IDENTITY (borrow from image 1, do not copy its subject):
- Palette: <fundo>, <superfícies>, accents <acento>
- Lighting/materials: <ex.: soft volumetric glow, frosted glass panels, thin gold hairlines>
- Motifs: <ex.: orbital rings and data constellations around the central visualization>
- Mood: <2–4 adjetivos>

CONTENT (render this exact text, crisp and legible):
- Title: "<...>"   Nav items: "<...>", "<...>"   Sample data: <...>

QUALITY BAR: production-grade product design, consistent spacing, readable typography
(min ~12px equivalent), realistic UI components (buttons, inputs, lists), no lorem ipsum,
no gibberish text, no watermark.
```

Execução (modo automático):

```bash
python forge.py wireframe design/<slug>/layout/wire.json --out design/<slug>/layout/wire.png
python forge.py generate --provider gemini --prompt design/<slug>/prompts/v1.md \
  --ref design/<slug>/refs/conceito.jpg --ref design/<slug>/layout/wire.png \
  --aspect 16:9 --n 3 --out design/<slug>/mockups/v1/mock.png
```

Regras:
- Gere 2–4 variações por rodada; cada saída fica com um `.json` ao lado (modelo, refs, prompt) para rastreabilidade.
- Verifique cada imagem antes de mostrar: o layout foi respeitado? O texto é legível e correto? Há algo que seria impossível ou caro de construir?
- Mostre as opções ao usuário num quadro único (`forge.py board`) e peça a escolha.

## A3. Iterar e recombinar

Objetivo: convergir para uma imagem final que o usuário aprove, de forma controlada.

1. **Uma mudança principal por rodada**: paleta, OU iluminação, OU densidade, OU um componente. Mudanças demais de uma vez impedem saber o que melhorou.
2. **Edite a partir da melhor versão** (passe a imagem anterior como referência e descreva só a alteração: "keep everything, change only…"). Isso preserva o que já funciona.
3. **Recombine conceitos**: junte o DNA de duas versões ou duas referências ("layout and panels from image 1, lighting and central visual from image 2").
4. Registre cada rodada em `lineage.md`:

```
## v3  ← de v2   (mockups/v3/mock-2.png)
Mudança: luz dourada mais quente; órbitas viram rota com pontos de dados
Por quê: v2 estava frio e o centro competia com o painel de chat
Nota (1–5): identidade 4 · layout 5 · legibilidade 3 · construibilidade 4 · originalidade 5
```

5. Rubrica de aprovação (todas ≥ 4 para seguir):
   - **Identidade**: reconhece-se o conceito escolhido.
   - **Fidelidade ao layout**: todas as regiões e funções do A0 estão lá.
   - **Legibilidade**: texto e dados legíveis; contraste suficiente.
   - **Construibilidade**: dá para implementar com o stack e o orçamento (o que é arte vs. componente está claro).
   - **Originalidade**: não parece um template comum.
6. Pare quando a rubrica passar ou após ~5 rodadas sem ganho; nesse caso volte ao A1 com outro conceito.
7. Marque a versão aprovada (`mockups/APPROVED.png` + linha no `lineage.md`).

## A4. Animar a imagem (image-to-video)

Objetivo: descobrir **como o design se move** antes de codar, de forma criativa e barata.

Prompt para o modelo de vídeo (5–10 s, câmera parada, ideal em loop):

```
Animate this UI screenshot as a live product screen. Locked-off camera, no zoom, no pan,
no cuts. Keep all UI text, panels and layout perfectly still and legible.
Motion only in: <ex.: the central black hole slowly rotates; gold particles drift along the
orbital rings; data points pulse softly one after another; a light sweep crosses the
timeline every 3 seconds>. Subtle, elegant, seamless loop. Duration <8> seconds.
```

Revise o vídeo e anote em `spec/motion.md`:
- O que se move, com que velocidade e ritmo (ex.: órbita 1 volta / 40 s; pulso 1,2 s ease-in-out; varredura a cada 3 s).
- O que **deve** continuar parado (texto, controles) — se o modelo deformou a interface, descarte essa parte e use só o movimento da camada de arte.
- Microinterações sugeridas (hover, foco, entrada de mensagem) mesmo que o vídeo não as mostre.

O vídeo aprovado é **referência de movimento** e, quando fizer sentido, **asset** (fundo em loop da camada de arte).

## A5. Extrair a especificação de design

Objetivo: transformar a imagem e o vídeo aprovados num pacote que um agente de código consegue executar sem adivinhar.

1. **Tokens de cor**: rode `forge.py palette mockups/APPROVED.png --out spec/tokens.json` e revise os papéis sugeridos (background, surface, foreground, muted-foreground, accent). Ajuste à mão quando a heurística errar, valide contraste (texto ≥ 4,5:1, texto grande e ícones ≥ 3:1) e gere a versão do design system do projeto (variáveis CSS, tema Tailwind/shadcn, tema MUI…).
2. **Tipografia**: identifique a família mais próxima disponível (Google Fonts ou a do projeto), pesos, tamanhos, caixa, espaçamento entre letras.
3. **Forma e profundidade**: raios, bordas (espessura, opacidade), sombras, blur de vidro (`backdrop-filter`), gradientes, ruído/grão.
4. **Inventário de componentes** (`spec/components.md`): cada elemento da tela com o componente correspondente (existente no projeto ou novo), estados (hover, foco, ativo, desabilitado, vazio, carregando) e dados reais que ele exibe.
5. **Assets** (`spec/assets.md`): separe o que é **arte** (ilustração central, fundo, texturas — vira imagem/vídeo/WebGL) do que é **interface** (vira componente). Gere ou recorte a arte limpa sem UI por cima (peça ao modelo de imagem "the same artwork without any UI, clean background plate") e exporte em WebP/AVIF; vídeo em MP4/WebM curto e leve.
6. **Movimento** (`spec/motion.md`): durações, easing, loops, gatilhos; respeite `prefers-reduced-motion`.

Saída mínima do A5: `tokens.json`, `tokens.css` (ou tema), `components.md`, `assets.md`, `motion.md`.

## A6. Construir em código

Objetivo: implementar uma tela **funcional** que fique visualmente fiel ao aprovado.

Estratégia em camadas (de trás para frente):
1. **Camada de arte**: fundo e ilustração como imagem/vídeo otimizados, ou canvas/WebGL (Three.js, shaders) quando o movimento precisa reagir a dados ou interação. Nunca reconstrua uma ilustração complexa em CSS.
2. **Camada de interface**: componentes reais do projeto (ou do design system adotado) estilizados com os tokens do A5. Texto é texto (não imagem), botões são botões, dados vêm da fonte real.
3. **Camada de movimento**: CSS (`@keyframes`, transições) para o simples; Framer Motion/Motion One/GSAP para coreografias; tudo com `prefers-reduced-motion`.

Ao delegar para um agente de código (ou fazer você mesmo), entregue este pacote e este pedido:

```
Implemente a tela <nome> no projeto <stack>.
Referências: design/<slug>/mockups/APPROVED.png (visual), design/<slug>/video/approved.mp4 (movimento).
Especificação: design/<slug>/spec/ (tokens, componentes, assets, movimento).
Regras:
- Funcionalidade do brief.md acima de tudo; nada de dados falsos em produção.
- Use os componentes e o design system do projeto; tokens via variáveis/tema, sem hex soltos.
- Arte = assets da pasta spec/assets; interface = componentes reais.
- Responsivo (desktop e mobile), acessível (contraste, foco, teclado), prefers-reduced-motion.
- Ao terminar, gere screenshot no mesmo tamanho do mockup para a comparação de fidelidade.
```

Receitas úteis:
- **Vidro fosco**: `background: color-mix(in oklab, var(--surface) 55%, transparent); backdrop-filter: blur(18px) saturate(140%); border: 1px solid color-mix(in oklab, var(--foreground) 12%, transparent);`
- **Linhas finas luminosas**: borda de 1px com `box-shadow: 0 0 12px color-mix(in oklab, var(--accent) 35%, transparent)`.
- **Fundo em vídeo**: `<video autoplay muted loop playsinline poster="plate.webp">` atrás da interface, com `object-fit: cover`, pausado quando a aba está oculta e substituído pelo pôster em `prefers-reduced-motion`.
- **Grão/ruído**: SVG `feTurbulence` em sobreposição com opacidade 3–6%.

**Loop de fidelidade** (repita até ficar bom):
1. Rode o app, tire screenshot no mesmo tamanho do mockup (Playwright/Chrome headless).
2. `forge.py compare mockups/APPROVED.png qa/screenshot.png --out qa/compare-01.png`.
3. Liste as diferenças por ordem de impacto (layout > cor/luz > tipografia > detalhes) e corrija.
4. A similaridade de pixels é só um indicador; o critério final é visual e funcional. Diferenças intencionais (texto real, dados reais, acessibilidade) são aceitas e registradas.

## A7. Remodelar um app existente

Objetivo: dar um visual novo a uma tela que já funciona, sem quebrá-la.

1. Rode o app e capture screenshots das telas-alvo; liste componentes, rotas e estados existentes (A0).
2. Use o **screenshot atual como referência de layout** (no lugar do wireframe) e o conceito como referência de identidade no A2. No prompt, diga: "keep the exact information architecture and components of image 2; restyle only".
3. Itere (A3) e extraia a especificação (A5) mapeando cada elemento novo para o componente **que já existe** no código.
4. Implemente como mudança de tema e estilo: tokens, variantes de componentes, camada de arte. Evite reescrever lógica. Faça em ramificação/PR separado e mantenha testes passando.
5. Compare antes × depois × mockup e confirme que todas as funcionalidades listadas no A0 continuam lá.

---

## Regras gerais

- **Função antes de forma**: nenhum mockup aprovado pode perder função do brief.
- **Rastreabilidade**: todo arquivo gerado tem o prompt, o modelo e as referências registrados.
- **Propriedade intelectual**: referências servem de inspiração; não reproduza personagens, logotipos, marcas ou obras identificáveis no produto. Registre as fontes em `refs/SOURCES.md` e prefira arte final gerada ou licenciada.
- **Honestidade com o usuário**: mostre as imagens reais geradas (inclusive as ruins) e diga o que não foi possível construir com fidelidade.
- **Custos**: avise antes de rodadas grandes de imagem ou de vídeo.
- **Acessibilidade**: o visual ousado não dispensa contraste, foco visível, alternativas a movimento e texto real.

## Checklist de entrega

- [ ] `brief.md` e wireframe definidos antes da exploração.
- [ ] Referências com origem anotada e cartão de DNA visual.
- [ ] Mockups versionados com prompt/modelo/refs; `lineage.md` explica cada passo.
- [ ] Versão aprovada pelo usuário passou na rubrica (todas as notas ≥ 4).
- [ ] (Se A4) vídeo aprovado e `motion.md` escrito.
- [ ] `spec/` completa: tokens revisados com contraste validado, componentes, assets, movimento.
- [ ] Implementação funcional com dados reais, responsiva e acessível.
- [ ] Comparação de fidelidade registrada em `qa/`, com diferenças intencionais explicadas.

---

## Anexo: `forge.py`

Salve como `forge.py` (na raiz do trabalho ou em `scripts/`). Requer `pillow`; para gerar imagens, `google-genai` (provedor `gemini`) ou `openai` (provedor `openai`).

```
pip install pillow google-genai openai
python forge.py wireframe layout/wire.json --out layout/wire.png
python forge.py generate --provider gemini --prompt prompts/v1.md --ref refs/a.jpg --ref layout/wire.png --n 3 --out mockups/v1/mock.png
python forge.py board mockups/v1/mock-1.png mockups/v1/mock-2.png mockups/v1/mock-3.png --out mockups/v1/board.png
python forge.py palette mockups/APPROVED.png --out spec/tokens.json --swatch spec/palette.png
python forge.py compare mockups/APPROVED.png qa/screenshot.png --out qa/compare-01.png
```

Formato do `wire.json` (posições e tamanhos em % do quadro):

```json
{"size": [1600, 1000], "boxes": [
  {"x": 0, "y": 0, "w": 18, "h": 100, "label": "sidebar: navegação + histórico"},
  {"x": 18, "y": 0, "w": 82, "h": 10, "label": "topo: título da conversa"},
  {"x": 18, "y": 10, "w": 82, "h": 72, "label": "área principal: mensagens"},
  {"x": 18, "y": 82, "w": 82, "h": 18, "label": "campo de prompt + enviar"}
]}
```

```python
#!/usr/bin/env python3
"""forge.py — utilitários do fluxo "design por imagem".

Subcomandos:
  generate  gera um mockup a partir de prompt + imagens de referência (Gemini ou OpenAI)
  board     monta um quadro comparativo de versões (v1..vN) com rótulos
  palette   extrai a paleta dominante de uma imagem e sugere tokens de cor (JSON + CSS)
  wireframe desenha um wireframe cinza (caixas rotuladas) a partir de um JSON — usado como referência de layout
  compare   coloca mockup aprovado e screenshot da implementação lado a lado (+ mapa de diferença)

Dependências: pillow (todos); google-genai (generate --provider gemini); openai (generate --provider openai).
Chaves: GEMINI_API_KEY / OPENAI_API_KEY no ambiente. Modelo: --model ou IMAGE_MODEL.
"""
from __future__ import annotations

import argparse
import base64
import colorsys
import io
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageOps

DEFAULT_MODELS = {"gemini": "gemini-3.1-flash-image", "openai": "gpt-image-2"}
OPENAI_SIZES = {"16:9": "1536x1024", "3:2": "1536x1024", "1:1": "1024x1024", "9:16": "1024x1536", "2:3": "1024x1536"}


# ---------------------------------------------------------------- generate
def generate(args: argparse.Namespace) -> None:
    prompt = Path(args.prompt).read_text(encoding="utf-8") if Path(args.prompt).is_file() else args.prompt
    refs = [Path(p) for p in args.ref]
    for p in refs:
        if not p.is_file():
            sys.exit(f"referência não encontrada: {p}")
    model = args.model or os.environ.get("IMAGE_MODEL") or DEFAULT_MODELS[args.provider]
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    images: list[bytes] = []
    if args.provider == "gemini":
        from google import genai
        from google.genai import types

        client = genai.Client()  # lê GEMINI_API_KEY
        contents: list = [prompt] + [Image.open(p) for p in refs]
        for _ in range(args.n):
            resp = client.models.generate_content(
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(aspect_ratio=args.aspect),
                ),
            )
            for part in resp.candidates[0].content.parts:
                if getattr(part, "inline_data", None) and part.inline_data.data:
                    images.append(part.inline_data.data)
    else:
        from openai import OpenAI

        client = OpenAI()  # lê OPENAI_API_KEY
        files = [open(p, "rb") for p in refs]
        try:
            kwargs = dict(model=model, prompt=prompt, n=args.n, size=OPENAI_SIZES.get(args.aspect, "1536x1024"))
            resp = client.images.edit(image=files, **kwargs) if files else client.images.generate(**kwargs)
        finally:
            for f in files:
                f.close()
        images = [base64.b64decode(d.b64_json) for d in resp.data if d.b64_json]

    if not images:
        sys.exit("o modelo não devolveu imagem (veja bloqueios de segurança ou o texto da resposta)")
    written = []
    for i, data in enumerate(images):
        target = out if len(images) == 1 else out.with_name(f"{out.stem}-{i + 1}{out.suffix}")
        Image.open(io.BytesIO(data)).save(target)
        written.append(str(target))
    log = out.with_suffix(".json")
    log.write_text(json.dumps({"model": model, "provider": args.provider, "aspect": args.aspect,
                               "refs": [str(p) for p in refs], "prompt": prompt, "outputs": written},
                              ensure_ascii=False, indent=2), encoding="utf-8")
    print("\n".join(written))


# ---------------------------------------------------------------- board
def _font(size: int):
    for name in ("Inter-SemiBold.ttf", "DejaVuSans-Bold.ttf", "Arial Bold.ttf", "Helvetica.ttc"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def board(args: argparse.Namespace) -> None:
    paths = [Path(p) for p in args.images]
    labels = args.labels.split(",") if args.labels else [f"v{i + 1}" for i in range(len(paths))]
    cols = args.cols or min(len(paths), 3)
    w = args.width
    thumbs = []
    for p in paths:
        im = Image.open(p).convert("RGB")
        thumbs.append(im.resize((w, round(im.height * w / im.width))))
    h = max(t.height for t in thumbs)
    pad, label_h = 24, 44
    rows = (len(thumbs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + pad) + pad, rows * (h + label_h + pad) + pad), "#111214")
    draw, font = ImageDraw.Draw(sheet), _font(22)
    for i, (t, label) in enumerate(zip(thumbs, labels)):
        x = pad + (i % cols) * (w + pad)
        y = pad + (i // cols) * (h + label_h + pad)
        draw.text((x, y), label.strip(), fill="#E6E6E6", font=font)
        sheet.paste(t, (x, y + label_h))
    sheet.save(args.out)
    print(args.out)


# ---------------------------------------------------------------- palette
def _hex(rgb) -> str:
    return "#{:02X}{:02X}{:02X}".format(*rgb)


def _lum(rgb) -> float:
    def ch(c):
        c = c / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b) -> float:
    la, lb = sorted((_lum(a), _lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def palette(args: argparse.Namespace) -> None:
    im = Image.open(args.image).convert("RGB")
    im.thumbnail((800, 800))
    # octree preserva cores raras e extremas (texto claro, brilhos de destaque) melhor que median cut
    q = im.quantize(colors=args.colors, method=Image.Quantize.FASTOCTREE)
    pal = q.getpalette()
    counts = sorted(q.getcolors(), reverse=True)
    total = sum(c for c, _ in counts)
    swatches = []
    for count, idx in counts:
        rgb = tuple(pal[idx * 3: idx * 3 + 3])
        h, l, s = colorsys.rgb_to_hls(*(c / 255 for c in rgb))
        swatches.append({"hex": _hex(rgb), "rgb": rgb, "share": round(count / total, 4),
                         "lightness": round(l, 3), "saturation": round(s, 3), "hue": round(h * 360)})

    # papéis sugeridos (o humano/agente revisa): fundo = mais frequente; texto = maior contraste com o fundo;
    # superfície = vizinho de luminância do fundo; destaque = ver abaixo.
    bg = swatches[0]
    visible = [s for s in swatches if s["share"] >= 0.001]  # ignora ruído de compressão
    ink = max(visible, key=lambda s: contrast(s["rgb"], bg["rgb"]))
    def chroma(sw):
        return (max(sw["rgb"]) - min(sw["rgb"])) / 255

    # destaque = cor mais "colorida" (croma), legível sobre o fundo e distinta do texto
    accent_pool = [s for s in visible if s is not ink and s["share"] < 0.25
                   and chroma(s) >= 0.15 and contrast(s["rgb"], bg["rgb"]) >= 3]
    accent = max(accent_pool, key=chroma) if accent_pool else ink
    notes = [] if accent_pool else ["sem cor de destaque distinta: a imagem é quase monocromática; "
                                    "o destaque foi igualado ao texto — escolha manualmente se precisar"]
    rest = [s for s in visible if s not in (bg, ink, accent)]
    surface = min(rest, key=lambda s: abs(s["lightness"] - bg["lightness"]) + (0 if s["lightness"] != bg["lightness"] else 1), default=bg)
    muted = min(rest, key=lambda s: abs(contrast(s["rgb"], bg["rgb"]) - 4.6), default=ink)
    roles = {"background": bg["hex"], "surface": surface["hex"], "foreground": ink["hex"],
             "muted-foreground": muted["hex"], "accent": accent["hex"]}
    checks = {
        "foreground/background": round(contrast(ink["rgb"], bg["rgb"]), 2),
        "muted/background": round(contrast(muted["rgb"], bg["rgb"]), 2),
        "accent/background": round(contrast(accent["rgb"], bg["rgb"]), 2),
    }
    result = {"source": str(args.image), "swatches": swatches, "roles": roles, "contrast": checks, "notes": notes}
    css = ":root {\n" + "".join(f"  --{k}: {v};\n" for k, v in roles.items()) + "}\n"
    if args.out:
        Path(args.out).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        Path(args.out).with_suffix(".css").write_text(css, encoding="utf-8")
    print(json.dumps({"roles": roles, "contrast": checks, "notes": notes}, ensure_ascii=False, indent=2))
    if args.swatch:
        shown = [s for s in swatches if s["share"] >= 0.001][:16]
        sw = Image.new("RGB", (80 * len(shown), 120), "white")
        d, font = ImageDraw.Draw(sw), _font(12)
        for i, s in enumerate(shown):
            d.rectangle([i * 80, 0, i * 80 + 79, 90], fill=s["hex"])
            d.text((i * 80 + 4, 96), s["hex"], fill="black", font=font)
        sw.save(args.swatch)


# ---------------------------------------------------------------- wireframe
def wireframe(args: argparse.Namespace) -> None:
    """JSON: {"size": [1600, 1000], "boxes": [{"x": 0, "y": 0, "w": 18, "h": 100, "label": "sidebar"}, ...]}
    x, y, w, h em % do quadro. Caixas sem cor, só estrutura: o modelo de imagem copia o arranjo, não o estilo."""
    spec = json.loads(Path(args.spec).read_text(encoding="utf-8"))
    W, H = spec.get("size", [1600, 1000])
    im = Image.new("RGB", (W, H), "#F2F2F0")
    d, font = ImageDraw.Draw(im), _font(max(14, W // 70))
    for b in spec["boxes"]:
        x0, y0 = b["x"] * W / 100, b["y"] * H / 100
        x1, y1 = x0 + b["w"] * W / 100, y0 + b["h"] * H / 100
        d.rounded_rectangle([x0 + 6, y0 + 6, x1 - 6, y1 - 6], radius=14, fill="#DCDCD8", outline="#A9A9A4", width=3)
        if b.get("label"):
            lines, line = [], ""
            for word in b["label"].split():  # quebra o rótulo para caber na caixa
                trial = f"{line} {word}".strip()
                if line and d.textlength(trial, font=font) > (x1 - x0) - 44:
                    lines.append(line)
                    line = word
                else:
                    line = trial
            lines.append(line)
            d.multiline_text((x0 + 22, y0 + 18), "\n".join(lines), fill="#5C5C58", font=font, spacing=6)
    im.save(args.out)
    print(args.out)


# ---------------------------------------------------------------- compare
def compare(args: argparse.Namespace) -> None:
    ref = Image.open(args.reference).convert("RGB")
    impl = Image.open(args.implementation).convert("RGB")
    impl = ImageOps.fit(impl, ref.size)  # mesmo enquadramento para comparar
    diff = ImageChops.difference(ref, impl)
    heat = ImageOps.autocontrast(diff.convert("L")).convert("RGB")
    score = 1 - sum(ImageOps.grayscale(diff).histogram()[i] * i for i in range(256)) / (255 * ref.width * ref.height)
    w, h = ref.size
    out = Image.new("RGB", (w * 3 + 48, h + 60), "#111214")
    d, font = ImageDraw.Draw(out), _font(22)
    for i, (im, label) in enumerate([(ref, "mockup aprovado"), (impl, "implementação"), (heat, "diferença")]):
        out.paste(im, (12 + i * (w + 12), 48))
        d.text((12 + i * (w + 12), 12), label, fill="#E6E6E6", font=font)
    out.save(args.out)
    print(json.dumps({"out": args.out, "pixel_similarity": round(score, 4)}))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("generate")
    g.add_argument("--provider", choices=["gemini", "openai"], default="gemini")
    g.add_argument("--model")
    g.add_argument("--prompt", required=True, help="texto ou caminho de um .md/.txt")
    g.add_argument("--ref", action="append", default=[], help="imagem de referência (repita a flag)")
    g.add_argument("--aspect", default="16:9")
    g.add_argument("--n", type=int, default=1)
    g.add_argument("--out", required=True)
    g.set_defaults(func=generate)

    b = sub.add_parser("board")
    b.add_argument("images", nargs="+")
    b.add_argument("--labels")
    b.add_argument("--cols", type=int)
    b.add_argument("--width", type=int, default=640)
    b.add_argument("--out", required=True)
    b.set_defaults(func=board)

    p = sub.add_parser("palette")
    p.add_argument("image")
    p.add_argument("--colors", type=int, default=24)
    p.add_argument("--out")
    p.add_argument("--swatch")
    p.set_defaults(func=palette)

    wf = sub.add_parser("wireframe")
    wf.add_argument("spec")
    wf.add_argument("--out", required=True)
    wf.set_defaults(func=wireframe)

    c = sub.add_parser("compare")
    c.add_argument("reference")
    c.add_argument("implementation")
    c.add_argument("--out", required=True)
    c.set_defaults(func=compare)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
```
