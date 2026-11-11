<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/study-abstract/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/study-abstract/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/study-abstract/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/study-abstract

> Turn any study material into a didactic abstract the reader can use with the source closed.

[![npm](https://img.shields.io/npm/v/@llodev/study-abstract?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/study-abstract)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js >= 24](https://img.shields.io/badge/node-%3E%3D24-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Part of the `@llodev/study` family.

## Install

```bash
# npm (with skillpm or Claude Code marketplace)
npm i @llodev/study-abstract

# Vercel CLI
npx skills add llodev/skills/skills/study-abstract
```

No MCP, no config, no init — it's a pure knowledge skill. Once installed it activates on prompts like the ones below.

## Use

| Prompt example                       | What the agent does                                                   |
| ------------------------------------ | --------------------------------------------------------------------- |
| `"resume this lecture"`              | Writes one abstract in the language of the request, source closed     |
| `"abstract this folder of lectures"` | One abstract per unit, plus a short index                             |
| `"apply the errata"`                 | Keeps the source sentence and the correction as two labeled sentences |

## Contents

| File                      | Content                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `SKILL.md`                | Workflow, section order, language rules, and when to write one abstract or an index. |
| `anti-patterns/prose.md`  | Prose failures: bare acronyms, arrows as verbs, and silent repairs of the source.    |
| `references/conflicts.md` | Stacked conflicts, and a correction note that covers a set.                          |
| `references/sources.md`   | What to trust in slides, scans, notebooks, spreadsheets, code, and media.            |
| `examples/index.md`       | Index shape for a set: one question per unit, and an optional sequence diagram.      |

## License

MIT — see [LICENSE](./LICENSE).
