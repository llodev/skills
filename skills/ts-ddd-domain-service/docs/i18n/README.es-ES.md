<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-domain-service/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-domain-service/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-domain-service/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-domain-service

> Servicios de dominio para lógica que abarca varias entidades — policies y calculators sin estado que devuelven `Result`, con las reglas de frontera que mantienen la I/O fuera de la capa pura de dominio.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-domain-service?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-domain-service)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte de la familia `@llodev/ts-ddd`.

Lo que obtienes:

- **Una tabla de decisión de ubicación** — Domain Service vs inline en el caso de uso vs Application Service vs método de entidad, resuelta por propiedad (ownership), necesidad de I/O y reutilización, para que la lógica caiga en la capa correcta desde el principio.
- **Reglas de pureza con dientes** — sin repositorio, sin `@nestjs/*`, sin `firebase-admin`, sin `Date.now()`/`Math.random()` dentro de un domain service; el no-determinismo se inyecta como parámetro, nunca se llama en línea.
- **Convenciones de nomenclatura y forma** — `*Policy`, `*Calculator`, `*Resolver`, `*Specification`, métodos estáticos por defecto, `Result.fail("DOMAIN_ERROR_CODE")` en fallo, `Result.combine` para agregar múltiples errores.
- **La salida hacia I/O documentada, no improvisada** — cuando una regla necesita repositorio o reintentos, nombra la ubicación exacta (`application/services/<name>.service.ts`, `@Injectable()`, tokens DI) en lugar de colar I/O en la capa de dominio.
- **Una lista `NEVER`** que cubre los fallos reales: duplicar lógica que ya existe en una entidad, ramificar sobre literales de cadena en lugar de miembros de enum, y reservar `execute` exclusivamente para `UseCase<IN, OUT>`.

## Instalación

```bash
# npm (con skillpm o el marketplace de Claude Code)
npm i @llodev/ts-ddd-domain-service

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-domain-service
```

Sin MCP, sin configuración, sin init — es una skill de conocimiento puro. Tras instalarla, se activa con prompts como los de abajo.

## Uso

| Ejemplo de prompt                                      | Qué hace el agente                                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `"add a rule that checks stock across two aggregates"` | Lo ubica como Domain Service (`*Calculator`), puro y determinista, devolviendo `Result`           |
| `"this permission check needs a repository lookup"`    | Lo redirige a un Application Service en `application/services/`, no a un Domain Service           |
| `"review this domain service for framework leakage"`   | Verifica fugas de `@nestjs/*`, `firebase-admin` o llamadas no deterministas contra la lista NEVER |
| `"where does this cross-entity rule belong?"`          | Recorre la tabla de decisión Domain Service vs Use Case vs Application Service                    |

## Contenido

| Archivo                                      | Contenido                                                                                                                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                                   | Condiciones de activación, checklist inicial, tabla de decisión de ubicación, reglas principales y lista NEVER.                                                                                   |
| `references/domain-service-pattern.md`       | Rutas de archivo, snippets canónicos `*Policy` y `*Calculator`, regla de enum para conjuntos cerrados, estrategia de pruebas, checklist de implementación y el contraste con application service. |
| `examples/permission-policy.service.ts`      | Un domain service estilo `*Policy`: una verificación booleana sin estado sobre múltiples objetos de dominio.                                                                                      |
| `examples/permission-policy.service.test.ts` | Cobertura de pruebas para la permission policy, ejercitando los caminos de permitir y denegar.                                                                                                    |
| `examples/stock-calculator.service.ts`       | Un domain service estilo `*Calculator`: un cálculo puro entre entidades que devuelve `Result`.                                                                                                    |

## Licencia

MIT — consulta [LICENSE](../../LICENSE).
