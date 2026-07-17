<!-- readme-selector:start -->
<p align="center">
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-controller/README.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/usa.svg" width="30" alt="English"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-controller/docs/i18n/README.pt-BR.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/brazil.svg" width="30" alt="Português"></a>&nbsp;&nbsp;
  <a href="https://github.com/llodev/skills/blob/main/skills/ts-ddd-controller/docs/i18n/README.es-ES.md"><img src="https://raw.githubusercontent.com/lloliveiradev/public-assets/main/images/spain.svg" width="30" alt="Español"></a>
</p>
<!-- readme-selector:end -->

# @llodev/ts-ddd-controller

> Controladores HTTP en una API TypeScript + DDD — rutas, guards, validación con Zod, orquestación de casos de uso y mapeo `Result` → HTTP, con la lista NEVER que mantiene los controladores delgados.

[![npm](https://img.shields.io/npm/v/@llodev/ts-ddd-controller?label=npm&color=cb3837&logo=npm)](https://www.npmjs.com/package/@llodev/ts-ddd-controller)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
[![Node.js >= 20](https://img.shields.io/badge/node-%3E%3D20-43853d?logo=node.js&logoColor=white)](https://nodejs.org)
[![Agent Skills spec](https://img.shields.io/badge/Agent_Skills-spec-7c5cff)](https://agentskills.io)

Parte de la familia `@llodev/ts-ddd`.

Lo que obtienes:

- **Un contrato de traductor delgado** — los controladores validan en el borde, inyectan casos de uso y mapean `Result` → HTTP con `mapResultToHttp`; sin lógica de negocio, sin condicionales de dominio, sin llamadas a repositorio dentro de un handler.
- **Reglas de ubicación de guards** — `@UseGuards(ApiKeyGuard)` por método en mutaciones, nunca a nivel de clase, para que lecturas públicas y escrituras protegidas convivan en el mismo controlador.
- **Una capa de referencia de NestJS 11** — tokens DI por símbolo, `@Inject(SYMBOL)`, módulos `@Global()`, `ConfigModule.forRoot` validado con Zod, y el test bed `@nestjs/testing` + `supertest` realmente usado en producción.
- **Disciplina de response mapper** — el enriquecimiento de URLs firmadas, la serialización de fechas y las variantes de unión discriminada pasan por un mapper dedicado en lugar de filtrar detalles internos de la entidad.
- **Una lista `NEVER`** basada en fallos reales: guards a nivel de clase que devuelven 401 en lecturas públicas, `HttpException` lanzado inline que bifurca el catálogo de códigos de error, `new UseCase(...)` que rompe DI y las pruebas.

## Instalación

```bash
# npm (con skillpm o el marketplace de Claude Code)
npm i @llodev/ts-ddd-controller

# Vercel CLI
npx skills add llodev/skills/skills/ts-ddd-controller
```

Sin MCP, sin configuración, sin init — es una skill de conocimiento puro. Tras instalarla, se activa con prompts como los de abajo.

## Uso

| Ejemplo de prompt                                   | Qué hace el agente                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `"add a POST /celebrations/:slug/publish endpoint"` | Genera un método de controlador con `ApiKeyGuard`, `ZodValidationPipe`, `mapResultToHttp` |
| `"why is this write endpoint returning 401?"`       | Verifica la ubicación del guard (clase vs método) contra la lista NEVER                   |
| `"review this controller"`                          | Verifica fuga de lógica de negocio, `new UseCase()`, `HttpException` sin envolver         |
| `"wire this controller's response for signed URLs"` | Enruta entidad → respuesta a través de un response mapper dedicado                        |

## Contenido

| Archivo                                 | Contenido                                                                                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`                              | Condiciones de activación, estructura de carpetas, checklist inicial, reglas principales y lista NEVER para controladores.                                    |
| `references/controller-pattern.md`      | Basado en el repositorio: estructura de carpetas, `ZodValidationPipe`, semántica de `ApiKeyGuard`, `mapResultToHttp`, response mapper, estrategia de pruebas. |
| `references/nestjs.md`                  | Patrones de NestJS 11: tokens DI por símbolo, `@Inject(SYMBOL)`, módulos `@Global()`, `ConfigModule.forRoot` validado con Zod, test bed.                      |
| `examples/product.controller.nestjs.ts` | Espejo en estilo ejecutable de un controlador de producción, mostrando la ubicación de guards y el mapeo `Result` → HTTP.                                     |

## Licencia

MIT — consulta [LICENSE](../../LICENSE).
