<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ui-art-direction/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ui-art-direction/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ui-art-direction/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ui-art-direction

> Haz la dirección de arte de una UI primero en modelos de imagen, luego constrúyela en código y verifícala contra el mockup.

[![npm](https://img.shields.io/npm/v/@llodev/ui-art-direction?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ui-art-direction)
[![Licencia: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte de la familia `@llodev/ui`.

## Instalación

```bash
# npm (con skillpm o el marketplace de Claude Code)
npm i @llodev/ui-art-direction

# Vercel CLI
npx skills add llodev/skills/skills/ui-art-direction
```

Sin MCP, sin configuración, sin init. Es una skill de conocimiento con scripts auxiliares. Tras instalarla, se activa con prompts como los de abajo.

## Requisitos

- Python 3.10 o más reciente y Pillow, para todos los scripts auxiliares. Cada script responde a `python3 scripts/<name>.py --help`.
- Opcional: numpy, para el método SSIM en `python3 scripts/compare.py`. Sin él, el script puntúa los bloques por el error de luminancia y el informe lo indica.
- Opcional: ffmpeg en el `PATH`, para `python3 scripts/frames.py`.
- Opcional: el SDK del proveedor para el backend que elijas en `python3 scripts/generate.py`, con la clave de API en el entorno y el ID del modelo pasado con `--model` o `IMAGE_MODEL`. Es el único script que usa la red.

No se requiere ningún modelo de imagen. Sin uno, la skill funciona en modo asistido: escribe los prompts y te dice qué archivo adjuntar y qué archivo guardar de vuelta. Pregunta antes de cualquier ronda de pago de más de cuatro imágenes, de cualquier video y de cualquier bucle de reintentos.

## Uso

| Ejemplo de prompt                                                              | Qué hace el agente                                                                                                                |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `"build a distinctive operations dashboard, it must not look like a template"` | Escribe el brief, fija el layout, destila las referencias en una tarjeta de ADN y luego prepara de dos a cuatro prompts de mockup |
| `"landing page for our new desk lamp, here are three reference photos"`        | Fija las secciones, planifica un storyboard de scroll con un cuadro por sección y usa las fotos solo para la identidad            |
| `"give this app a new visual identity without breaking anything"`              | Inventaría rutas, componentes y funciones, usa una captura de la app en ejecución como layout y reestiliza el tema                |
| `"build this approved mockup and show me how close the result is"`             | Escribe la spec de build, construye en el stack del proyecto e informa la fidelidad bloque a bloque frente al mockup              |

## Contenido

| Archivo                            | Contenido                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                         | Fases 0–7, las cuatro reglas, rutas, modos y el control de costo, y cuándo leer cada archivo.                              |
| `references/brief-and-layout.md`   | Fase 0: descubrimiento, el contrato del brief, `wire.json`, el render de esqueleto y el bloqueo de layout.                 |
| `references/modes-and-models.md`   | Modos automático, nativo y asistido, qué buscar en un modelo, control de costo, sidecar de procedencia.                    |
| `references/concept-and-dna.md`    | Fase 1: la frase concepto, referencias fuera de UI, ejes de divergencia, la tarjeta de ADN, reglas de PI.                  |
| `references/mockup-prompting.md`   | Fase 2: el contrato del prompt, arte frente a UI, lámina de control, storyboard, hoja de estados, mobile.                  |
| `references/converge.md`           | Fase 3: un cambio por ronda, la rúbrica de cinco criterios, el crítico ciego, `lineage.md`, el bloqueo.                    |
| `references/motion.md`             | Fase 4: prompts de imagen a video, cuadros inicial y final, keyframes, la spec de movimiento, movimiento reducido.         |
| `references/build-spec.md`         | Fase 5: tokens, componentes y estados, triaje de construibilidad y el pipeline de assets.                                  |
| `references/implementation.md`     | Fase 6: capas, el brief de delegación, recetas, mobile y estados, accesibilidad.                                           |
| `references/capture-and-checks.md` | Capturar y medir un render: captura determinista, alternativa sin Playwright, contraste, accesibilidad, zoom, rendimiento. |
| `references/fidelity-and-lock.md`  | Fase 7: captura determinista, el bucle de comparación por bloques, orden de corrección, baseline, checklist de entrega.    |
| `references/reskin.md`             | Ruta de reskin: inventario, la app en ejecución como referencia de layout, reestilizado a nivel de tema.                   |
| `anti-patterns/generic-ai-look.md` | El aspecto genérico de IA en imágenes y en código, y la comprobación de distancia.                                         |
| `anti-patterns/process.md`         | Errores de proceso, desde diseñar en código primero hasta reintentos de pago sin confirmar.                                |
| `examples/brief.md`                | Un brief de Fase 0 para un dashboard de observabilidad ficticio.                                                           |
| `examples/dna-card.md`             | Una tarjeta de ADN destilada de referencias fuera de UI.                                                                   |
| `examples/lineage.md`              | Tres rondas con puntuaciones, incluida una versión rechazada.                                                              |
| `examples/motion-spec.md`          | Un clip leído como spec de movimiento.                                                                                     |
| `examples/storyboard.md`           | Un storyboard de scroll de landing page, un cuadro por sección.                                                            |
| `examples/wire.json`               | Un bloqueo de layout que es una entrada válida para el script de wireframe.                                                |
| `scripts/wireframe.py`             | `wire.json` a un PNG de wireframe gris con etiquetas.                                                                      |
| `scripts/board.py`                 | Hoja de contactos etiquetada con las versiones del mockup.                                                                 |
| `scripts/palette.py`               | Colores dominantes, roles sugeridos, ratios de contraste, una muestra y variables CSS.                                     |
| `scripts/compare.py`               | Mockup frente a captura: puntuación por bloque, mapa de calor, peores bloques y un informe JSON.                           |
| `scripts/frames.py`                | Keyframes espaciados uniformemente y una hoja de contactos de un clip de video.                                            |
| `scripts/generate.py`              | Generación de imágenes mediante un adaptador de proveedor, con sidecar de procedencia y sin modelo por defecto.            |
| `scripts/_common.py`               | Utilidades compartidas por los scripts. Todos los scripts necesitan Python 3.10+ y Pillow.                                 |

## Límites conocidos

- Las ejecuciones de comportamiento cubren las Fases 0–2 y la primera entrega al usuario. Las Fases 3 a 7 (converger, movimiento, spec, build, verificar y bloquear) no se ejecutaron de punta a punta. Las cubren las pruebas de los scripts y tres lecturas: agentes nuevos, cada uno con la skill y una referencia, juzgaron cada una ejecutable pero poco especificada en algunos puntos. Tras cada lectura se corrigieron las lagunas y las contradicciones entre archivos; la última aún encontró ambigüedades pequeñas (umbrales, detalles de mobile y de sitios con varias secciones, rutas sin Playwright), y las correcciones de contradicciones posteriores no se volvieron a leer. En el primer uso, esas decisiones serán tuyas. Se verificó el formato de la salida del crítico ciego; la precisión de sus notas y el informe final de fidelidad no están verificados hasta el primer uso real.
- Las recetas de build son solo para web. Las Fases 0–5 sirven para el diseño de una app nativa, pero la skill no construye código mobile nativo.
- No hay script de generación de video. La skill da el contrato del prompt, y tú o tu agente ejecutan el modelo de video.
- La skill no nombra ningún ID de modelo de imagen o de video. Confirma el ID actual en la documentación de tu proveedor.

## Licencia

MIT — consulta [LICENSE](../../LICENSE).
