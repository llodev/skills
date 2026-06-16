<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# llodev/skills

> Colección de [Agent Skills](https://agentskills.io) creadas por [@lloliveiradev](https://github.com/lloliveiradev) para Claude Code, Cursor, Codex, Windsurf y cualquier agente que hable la spec abierta de Skills. Las skills son paquetes de instrucciones y scripts que extienden las capacidades de los agentes en workflows de desarrollo, documentación, planificación y profesionales.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
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

Consulta la [guía de publicación](docs/publishing-guide.md) para ver cómo se conectan los tres canales.

## Catálogo

### `pm-tasks-*` — adaptadores de Project Management

Convierten planes de implementación en tareas de PM (Trello, Asana, …) y las operan vía paste, MCP publish o write-through autónomo.

| Paquete                     | Estado      | Fuente                                                     | npm                             | Vercel CLI                                              |
| --------------------------- | ----------- | ---------------------------------------------------------- | ------------------------------- | ------------------------------------------------------- |
| `@llodev/pm-tasks` _(meta)_ | ✅ v3.0.0   | [pm-tasks/pm-tasks/](pm-tasks/pm-tasks/)                   | `npm i @llodev/pm-tasks`        | —                                                       |
| `@llodev/pm-tasks-core`     | ✅ v1.3.0   | [pm-tasks/pm-tasks-core/](pm-tasks/pm-tasks-core/)         | `npm i @llodev/pm-tasks-core`   | `npx skills add llodev/skills/pm-tasks/pm-tasks-core`   |
| `@llodev/pm-tasks-asana`    | ✅ v1.3.0   | [pm-tasks/pm-tasks-asana/](pm-tasks/pm-tasks-asana/)       | `npm i @llodev/pm-tasks-asana`  | `npx skills add llodev/skills/pm-tasks/pm-tasks-asana`  |
| `@llodev/pm-tasks-trello`   | ✅ v1.3.0   | [pm-tasks/pm-tasks-trello/](pm-tasks/pm-tasks-trello/)     | `npm i @llodev/pm-tasks-trello` | `npx skills add llodev/skills/pm-tasks/pm-tasks-trello` |
| `pm-tasks-jira`             | 🔒 scaffold | [pm-tasks/pm-tasks-jira/](pm-tasks/pm-tasks-jira/)         | —                               | —                                                       |
| `pm-tasks-linear`           | 🔒 scaffold | [pm-tasks/pm-tasks-linear/](pm-tasks/pm-tasks-linear/)     | —                               | —                                                       |
| `pm-tasks-notion`           | 🔒 scaffold | [pm-tasks/pm-tasks-notion/](pm-tasks/pm-tasks-notion/)     | —                               | —                                                       |
| `pm-tasks-clickup`          | 🔒 scaffold | [pm-tasks/pm-tasks-clickup/](pm-tasks/pm-tasks-clickup/)   | —                               | —                                                       |
| `pm-tasks-monday`           | 🔒 scaffold | [pm-tasks/pm-tasks-monday/](pm-tasks/pm-tasks-monday/)     | —                               | —                                                       |
| `pm-tasks-bitrix24`         | 🔒 scaffold | [pm-tasks/pm-tasks-bitrix24/](pm-tasks/pm-tasks-bitrix24/) | —                               | —                                                       |
| `pm-tasks-todoist`          | 🔒 scaffold | [pm-tasks/pm-tasks-todoist/](pm-tasks/pm-tasks-todoist/)   | —                               | —                                                       |

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

Las releases siguen el workflow [Changesets](https://github.com/changesets/changesets) — registra la intención con `make changeset`, aplica con `make release-version`, publica con `make release-publish`. Consulta [`.changeset/README.md`](.changeset/README.md) para el paso a paso.

## Roadmap

Foco actual: consolidar la base del `pm-tasks-*` antes de lanzar nuevos adaptadores. Detalle completo con prioridades y justificación en [`docs/roadmap.md`](docs/roadmap.md).

**Próximos lanzamientos — base del `pm-tasks-*` (`v1.3.1` → `v1.4.0`):**

- `v1.3.1` (patch) — cerrar brechas de tests: tests i18n adapter-scoped, validador de rutas localizadas, documentación inline de `NOISE_BAND`, golden master del skill-judge.
- `v1.4.0` (minor) — base de DX: `.d.ts` artesanales para los exports de `init-lib`, canary E2E (PR ejecuta `pnpm pack` + `npx <pkg>` en un sandbox limpio), `@llodev/pm-tasks-testkit` (fakes en memoria para los 6 verbos canónicos).

**Tras la base — primera expansión de adapters (`v1.5.x`):**

- `pm-tasks-jira` — Atlassian Remote MCP. Mayor cuota de mercado dev/agile.
- `pm-tasks-linear` — Linear MCP. Gran presencia en el ecosistema dev; `Cycle` se alinea de forma nativa con nuestro modelo de verbos.
- 7.º verbo canónico `task.sprint.set` (necesario para Jira / Linear / ClickUp).
- Jerarquía parent/child (epic → story → task) para Jira / Linear / Asana.

**Mediano plazo (`v1.6+`):**

- Más adaptadores: `pm-tasks-clickup`, `pm-tasks-notion`, `pm-tasks-github-projects`, `pm-tasks-monday`, `pm-tasks-todoist`, `pm-tasks-bitrix24`.
- Más verbos: `task.time.log`, `task.estimate.set`, grafo de dependencias (`task.blocks.add`).
- Sincronización bidireccional (read-back desde la herramienta PM → plan).

**Familias futuras:**

- **`ts-ddd-*`** — bloques de Domain-Driven Design para codebases TypeScript (entidades, value objects, use cases, repositorios, controllers).

## Docs

- [Guía de publicación](docs/publishing-guide.md) — cómo se conectan los tres canales de distribución.
- [Workflow Changesets](.changeset/README.md) — registrar → versionar → publicar.
- Los deep dives de cada familia viven en el `SKILL.md` y `references/` de cada miembro.

## Licencia

MIT — consulta [LICENSE](LICENSE).
