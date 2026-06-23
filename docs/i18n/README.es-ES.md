<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# llodev/skills

> Colección de [Agent Skills](https://agentskills.io) creadas por [@lloliveiradev](https://github.com/lloliveiradev) para Claude Code, Cursor, Codex, Windsurf y cualquier agente que hable la spec abierta de Skills. Las skills son paquetes de instrucciones y scripts que extienden las capacidades de los agentes en workflows de desarrollo, documentación, planificación y profesionales.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-FE5196?logo=conventionalcommits&logoColor=white)](https://www.conventionalcommits.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Cada skill de este repositorio se distribuye como **paquete npm**, **plugin de Claude Code** y **entrada `skills add` de Vercel**. Elige el canal que hable tu agente — las skills son idénticas en los tres.

## Instalación

Elige el canal que encaje con tu agente.

**Claude Code (o cualquier agente que soporte el marketplace):**

```bash
/plugin marketplace add llodev/skills
/plugin install pm-tasks-core pm-tasks-trello pm-tasks-asana
```

**npm (skillpm, skills-npm o bundling en `node_modules`):**

```bash
npm i @llodev/pm-tasks    # meta — instala toda la familia vía peerDeps
```

**Vercel `skills add`:**

```bash
npx skills add llodev/skills/pm-tasks/pm-tasks-trello
```

Consulta la [guía de publicación](../../docs/publishing-guide.md) para ver cómo se conectan los tres canales.

## Catálogo

### `pm-tasks-*` — adaptadores de Project Management

Convierten planes de implementación en tareas de PM (Trello, Asana, …) y las operan vía paste, MCP publish o write-through autónomo. Además `@llodev/pm-tasks-testkit` — fakes en memoria para los 7 verbos canónicos, para probar skills personalizadas.

**Nuevo en v1.9 — runtime headless (subpath `/adapter`):** importa `createAdapter` desde cualquier adapter para ejecutar los 7 verbos canónicos desde tus propios scripts/agents, sin invocar la skill:

```ts
import { createAdapter } from "@llodev/pm-tasks-trello/adapter";

const adapter = await createAdapter({ configPath: ".trello.json", mcp });
const r = await adapter.taskMove({ taskId: "card-1", targetListOrSectionId: "wip-list" });
if (!r.ok) throw new Error(`task.move falló: ${r.code}`);
```

`mcp: (toolName, args) => Promise<unknown>` es un callback proporcionado por el llamador que hace proxy a las tools `mcp__*` del runtime del agent. Misma forma para `@llodev/pm-tasks-asana/adapter`. Contrato completo en [pm-tasks-core/references/runtime.md](../../pm-tasks/pm-tasks-core/references/) y en los SKILL.md por adapter.

| Paquete                     | Estado      | Fuente                                                           | npm                                 | Vercel CLI                                              |
| --------------------------- | ----------- | ---------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------- |
| `@llodev/pm-tasks` _(meta)_ | ✅ v3.0.0   | [pm-tasks/pm-tasks/](../../pm-tasks/pm-tasks/)                   | `npm i @llodev/pm-tasks`            | —                                                       |
| `@llodev/pm-tasks-core`     | ✅ v1.4.0   | [pm-tasks/pm-tasks-core/](../../pm-tasks/pm-tasks-core/)         | `npm i @llodev/pm-tasks-core`       | `npx skills add llodev/skills/pm-tasks/pm-tasks-core`   |
| `@llodev/pm-tasks-asana`    | ✅ v1.4.0   | [pm-tasks/pm-tasks-asana/](../../pm-tasks/pm-tasks-asana/)       | `npm i @llodev/pm-tasks-asana`      | `npx skills add llodev/skills/pm-tasks/pm-tasks-asana`  |
| `@llodev/pm-tasks-trello`   | ✅ v1.4.0   | [pm-tasks/pm-tasks-trello/](../../pm-tasks/pm-tasks-trello/)     | `npm i @llodev/pm-tasks-trello`     | `npx skills add llodev/skills/pm-tasks/pm-tasks-trello` |
| `@llodev/pm-tasks-testkit`  | ✅ v0.1.0   | [pm-tasks/pm-tasks-testkit/](../../pm-tasks/pm-tasks-testkit/)   | `npm i -D @llodev/pm-tasks-testkit` | —                                                       |
| `pm-tasks-jira`             | 🔒 scaffold | [pm-tasks/pm-tasks-jira/](../../pm-tasks/pm-tasks-jira/)         | —                                   | —                                                       |
| `pm-tasks-linear`           | 🔒 scaffold | [pm-tasks/pm-tasks-linear/](../../pm-tasks/pm-tasks-linear/)     | —                                   | —                                                       |
| `pm-tasks-notion`           | 🔒 scaffold | [pm-tasks/pm-tasks-notion/](../../pm-tasks/pm-tasks-notion/)     | —                                   | —                                                       |
| `pm-tasks-clickup`          | 🔒 scaffold | [pm-tasks/pm-tasks-clickup/](../../pm-tasks/pm-tasks-clickup/)   | —                                   | —                                                       |
| `pm-tasks-monday`           | 🔒 scaffold | [pm-tasks/pm-tasks-monday/](../../pm-tasks/pm-tasks-monday/)     | —                                   | —                                                       |
| `pm-tasks-bitrix24`         | 🔒 scaffold | [pm-tasks/pm-tasks-bitrix24/](../../pm-tasks/pm-tasks-bitrix24/) | —                                   | —                                                       |
| `pm-tasks-todoist`          | 🔒 scaffold | [pm-tasks/pm-tasks-todoist/](../../pm-tasks/pm-tasks-todoist/)   | —                                   | —                                                       |

> [!NOTE]
> Las skills marcadas como `scaffold` son namespaces reservados con un `SKILL.md` placeholder. Su descripción instruye a los agentes a NO activarse hasta que llegue un adaptador real.

> [!NOTE]
> `@llodev/pm-tasks` (meta) se versiona de forma independiente de la familia mediante `onlyUpdatePeerDependentsWhenOutOfRange`. La familia está en `v1.x`; el meta saltó a `v3.0.0` antes del desacoplamiento y permanecerá en `v3.x` hasta que la familia alcance `v2.0.0`.

## Compatibilidad de agentes

Cada skill publicada declara qué agentes soporta en el campo `compatibility.agents` de su frontmatter. La matriz actual:

> **Claude Code** · **Cursor** · **Codex** · **Windsurf** · **Cline** · **Roo Code** (Gemini CLI parcial vía capa de traducción)

## Layout del repositorio

```
.
├── pm-tasks/                  Carpeta de la familia — un directorio por miembro de la familia
│   ├── pm-tasks-core/         Extracción compartida + vocabulario CRUD
│   ├── pm-tasks-asana/        Adaptador Asana (parent + subtasks, custom fields, sections)
│   ├── pm-tasks-trello/       Adaptador Trello (boards, lists, labels, members)
│   └── pm-tasks-<member>/     Scaffolds reservados (Jira, Linear, Notion, …)
├── scripts/                   Validadores, checks de contrato, gate de baseline de skill-judge
├── docs/                      publishing-guide.md + roadmap.md (gitignored: plans/)
└── .changeset/                Registros de intención de release (workflow Changesets)
```

## Desarrollo local

```bash
make hooks       # una vez — instala lefthook (prettier sobre staged, gitleaks, Conventional Commits)
make validate    # checks de frontmatter + schema + links + paridad de locale
make help        # lista completa de targets
```

> [!TIP]
> El `Makefile` es el punto de entrada canónico — más corto que recordar los nombres de scripts de pnpm y el único exigido por lefthook en el commit.

Las releases siguen el workflow [Changesets](https://github.com/changesets/changesets) — registra la intención con `make changeset`, aplica con `make release-version`, publica con `make release-publish`. Consulta [`.changeset/README.md`](../../.changeset/README.md) para el paso a paso.

## Roadmap

Foco actual: consolidar la base del `pm-tasks-*` antes de lanzar nuevos adaptadores. Detalle completo con prioridades y justificación en [`docs/roadmap.md`](../../docs/roadmap.md).

**Lanzamientos recientes (`v1.6.0` → `v1.8.0`):**

- `v1.6.0` (minor) — **Public hardening**: entregado `CONTRIBUTING.md` · `SECURITY.md` · `CODE_OF_CONDUCT.md` · `.github/ISSUE_TEMPLATE/` + plantilla de PR · `CODEOWNERS` · test de paridad de `marketplace.json` · workflow CodeQL · Dependabot.
- `v1.7.0` (minor) — **Quality gates**: entregado golden master del rubric del skill-judge · gate de cobertura (c8) conectado a `pnpm validate` · presupuesto de tamaño de paquete (`size-limit`).
- `v1.8.0` (minor) — **Observability v1**: entregada rotación inteligente del `audit.log` (tamaño + edad + multi-tool, atómica, idempotente) · CLI `pm-tasks-core-doctor` (valida config + allowlist autónoma + audit writability) · flags `--doctor` en los adaptadores.

**Qué sigue:**

- Decisión pendiente — expansión de adaptadores (`pm-tasks-jira`) vs SDD hooks (F14 + F15). Ver [docs/roadmap.md](../../docs/roadmap.md).

**Tras el trío de calidad — expansión de adaptadores (`v1.9.0+`):**

- `pm-tasks-jira` (S1) — Atlassian Remote MCP. Mayor cuota de mercado dev/agile.
- `pm-tasks-linear` (S2) — Linear MCP. Gran presencia en el ecosistema dev; `Cycle` se alinea de forma nativa con nuestro modelo de verbos.
- `pm-tasks-github-projects` (S8) — `github-mcp-server`, PM nativo en GitHub; alto valor, bajo coste.
- `pm-tasks-clickup` (S3) · `pm-tasks-notion` (S4) · `pm-tasks-monday` (S5) · `pm-tasks-todoist` (S6) · `pm-tasks-bitrix24` (S7).

**Durante la ola de adaptadores — nuevos verbos canónicos (minors aditivos):**

- 8.º `task.sprint.set` · 9.º `task.parent.set` (Jira/Linear) · 10.º `task.time.log` · 11.º `task.estimate.set` · 12.º `task.blocks.add` · 13.º `task.wip-limit.check`.

**Mediano plazo — biblioteca/SDK y reverse sync:**

- F14 — runtime adapter como library (modo headless para callers sin skill).
- F15 — puente entre `superpowers:subagent-driven-development` y el modo autonomous de pm-tasks.
- F1 — sincronización bidireccional (read-back desde la herramienta PM → plan) tras ≥4 adaptadores.

**Familias futuras:**

- **`ts-ddd-*`** — bloques de Domain-Driven Design para codebases TypeScript (entidades, value objects, use cases, repositorios, controllers).

## Docs

- [Guía de publicación](../../docs/publishing-guide.md) — cómo se conectan los tres canales de distribución.
- [Workflow Changesets](../../.changeset/README.md) — registrar → versionar → publicar.
- Los deep dives de cada familia viven en el `SKILL.md` y `references/` de cada miembro.

## Licencia

MIT — consulta [LICENSE](../../LICENSE).
