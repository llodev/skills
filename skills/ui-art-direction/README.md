<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ui-art-direction/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ui-art-direction/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ui-art-direction/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ui-art-direction

> Art-direct a UI in image models first, then build it in code and verify it against the mockup.

[![npm](https://img.shields.io/npm/v/@llodev/ui-art-direction?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ui-art-direction)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Part of the `@llodev/ui` family.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/ui-art-direction

# Vercel CLI
npx skills add llodev/skills/skills/ui-art-direction
```

No MCP, no config, no init. It is a knowledge skill with helper scripts. Once installed, it activates on prompts like the ones below.

## Requirements

- Python 3.10 or newer and Pillow, for every helper script. Each script answers `python3 scripts/<name>.py --help`.
- Optional: numpy, for the SSIM method in `python3 scripts/compare.py`. Without it the script scores tiles by luminance error and the report says so.
- Optional: ffmpeg on the `PATH`, for `python3 scripts/frames.py`.
- Optional: the provider SDK for the backend you choose in `python3 scripts/generate.py`, with the API key in the environment and the model ID passed with `--model` or `IMAGE_MODEL`. It is the only script that uses the network.

No image model is required. Without one, the skill works in assisted mode: it writes the prompts and tells you which file to attach and which file to save back. It asks before any paid round of more than four images, any video, and any retry loop.

## Use

| Prompt example                                                                 | What the agent does                                                                                                   |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `"build a distinctive operations dashboard, it must not look like a template"` | Writes the brief, locks the layout, distills references into a DNA card, then prepares two to four mockup prompts     |
| `"landing page for our new desk lamp, here are three reference photos"`        | Locks the sections, plans a scroll storyboard with one frame per section, and uses the photos for identity only       |
| `"give this app a new visual identity without breaking anything"`              | Inventories routes, components, and functions, uses a screenshot of the running app as the layout, restyles the theme |
| `"build this approved mockup and show me how close the result is"`             | Writes the build spec, builds in the project's stack, and reports fidelity tile by tile against the mockup            |

## Contents

| File                               | Content                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `SKILL.md`                         | Phases 0–7, the four rules, routes, modes and the cost gate, and when to read each file.                                       |
| `references/brief-and-layout.md`   | Phase 0: discovery, the brief contract, `wire.json`, the skeleton render, and the layout lock.                                 |
| `references/modes-and-models.md`   | Automatic, native, and assisted modes, what to look for in a model, cost gate, provenance sidecar.                             |
| `references/concept-and-dna.md`    | Phase 1: the concept line, references outside UI, divergence axes, the DNA card, IP rules.                                     |
| `references/mockup-prompting.md`   | Phase 2: the prompt contract, art plate versus UI, control plate, storyboard, state sheet, mobile.                             |
| `references/converge.md`           | Phase 3: one change per round, the five-criterion rubric, the blind critic, `lineage.md`, the lock.                            |
| `references/motion.md`             | Phase 4: image-to-video prompts, start and end frames, keyframes, the motion spec, reduced motion.                             |
| `references/build-spec.md`         | Phase 5: tokens, components and states, buildability triage, and the asset pipeline.                                           |
| `references/implementation.md`     | Phase 6: layers, the delegation brief, recipes, mobile and states, accessibility.                                              |
| `references/capture-and-checks.md` | Capturing and measuring a render: deterministic capture, a no-Playwright fallback, contrast, accessibility, zoom, performance. |
| `references/fidelity-and-lock.md`  | Phase 7: deterministic capture, the tile compare loop, fix order, baseline, delivery checklist.                                |
| `references/reskin.md`             | Reskin route: inventory, the running app as layout reference, theme-level restyle.                                             |
| `anti-patterns/generic-ai-look.md` | The generic AI look in images and in code, and the distance check.                                                             |
| `anti-patterns/process.md`         | Process mistakes, from designing in code first to unconfirmed paid retries.                                                    |
| `examples/brief.md`                | A Phase 0 brief for a fictional observability dashboard.                                                                       |
| `examples/dna-card.md`             | A DNA card distilled from references outside UI.                                                                               |
| `examples/lineage.md`              | Three rounds with scores, including a rejected version.                                                                        |
| `examples/motion-spec.md`          | A clip read into a motion spec.                                                                                                |
| `examples/storyboard.md`           | A landing-page scroll storyboard, one frame per section.                                                                       |
| `examples/wire.json`               | A layout lock that is valid input for the wireframe script.                                                                    |
| `scripts/wireframe.py`             | `wire.json` to a gray labeled wireframe PNG.                                                                                   |
| `scripts/board.py`                 | Labeled contact sheet of mockup versions.                                                                                      |
| `scripts/palette.py`               | Dominant colors, suggested roles, contrast ratios, a swatch, and CSS variables.                                                |
| `scripts/compare.py`               | Mockup versus screenshot: per-tile scores, heat map, worst tiles, and a JSON report.                                           |
| `scripts/frames.py`                | Evenly spaced keyframes and a contact sheet from a video clip.                                                                 |
| `scripts/generate.py`              | Image generation through a provider adapter, with a provenance sidecar and no default model.                                   |
| `scripts/_common.py`               | Shared helpers for the scripts. All scripts need Python 3.10+ and Pillow.                                                      |

## Known limits

- Behavioral runs cover Phases 0–2 and the first hand-off to the user. Phases 3 to 7 (converge, motion, spec, build, verify and lock) were not run end to end. They are covered by script tests and by two read-throughs: fresh agents, each given only `SKILL.md` and one reference, judged each of them executable but under-specified in places. The gaps from the first pass were closed. The second, stricter pass still found smaller ones (a capture fallback without Playwright, pass thresholds, mobile and multi-section site details, a few naming inconsistencies between files). Expect to make those calls yourself on first use. The blind critic's output format was checked; the accuracy of its scores and the final fidelity report are unverified until first real use.
- Build recipes are web-only. Phases 0–5 work for a native app design, but the skill does not build native mobile code.
- There is no video generation script. The skill gives the prompt contract, and you or your agent run the video model.
- The skill names no image or video model ID. Confirm the current ID in your provider's docs.

## License

MIT — see [LICENSE](LICENSE).
