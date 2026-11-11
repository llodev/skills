# NestJS — HTTP Test Mapping

Framework-specific **rules** only. All paths, `base_url`, ports, and canonical `.http` files come from [`project-discovery.md`](project-discovery.md) (config, IDE rules, or repo search).

---

## What to read (order — locate files per project)

1. **Controller** under test — `@Controller(prefix)`, each HTTP method decorator, `@HttpCode`, guards (`@UseGuards`), body/param pipes (`ZodValidationPipe`, custom pipes), `@Query`.
2. **Validation schemas** referenced by the controller (often a contracts package or `schemas/` / `dtos/` near the BC).
3. **Application layer** the controller calls — note each `Result.fail("CODE")` or equivalent domain error.
4. **Error catalog** — project file mapping business codes → HTTP status (search for `error-codes`, `mapResultToHttp`, or `HttpExceptionFilter` usage).
5. **Response mapper** — if responses are enriched (signed URLs, DTO mapping).
6. **Auth guard** for mutations — header name, env var, 401/503 semantics.
7. **Seeds / fixtures / docs** — stable slugs or IDs safe to reference in variables.

Skip steps the controller does not use. **Never invent** routes, codes, or schemas.

---

## Variables block (adapt per project)

```http
@base_url = <from config, .env.example, or existing .http>
@write_key = {{$dotenv <ENV_VAR>}}    # omit if project uses different auth
@published_slug = <from seed or docs>
@missing_slug = does-not-exist
@malformed_slug = NotAKebabCase
```

Use the API prefix the app actually mounts (may or may not include `/api`). Copy variable names from sibling `.http` files when they exist.

---

## Section order

```
1. VARIABLES + AUTH SANITY (health or lightweight public GET if project has one)
2. READ — list, detail, query params
3. WRITE — mutations (guarded routes)
4. NEGATIVE PATHS — 404, 409/422, 400 validation, 401/403 auth, 503 if applicable
N. METHOD / HEADER ERRORS — OPTIONS, HEAD, unrouted methods
```

---

## Mapping table (controller → tests)

| In code                                             | Generate                                                      |
| --------------------------------------------------- | ------------------------------------------------------------- |
| `@Get()` no guard                                   | list happy + each `@Query`                                    |
| `@Get(":id")` + format pipe                         | happy + 404 + 400 malformed                                   |
| `@Post()` + auth guard                              | happy (`@HttpCode`) + 401 + 400 validation                    |
| `@Put` / `@Patch` / `@Delete`                       | happy + 404 + validation errors                               |
| Custom action routes (`:id/publish`, sub-resources) | happy + 404 + state conflict (409) when applicable            |
| Each `@Query`                                       | valid + empty + out-of-enum when closed set                   |
| Each validated body                                 | happy + missing required + invalid enum/regex/min             |
| `discriminatedUnion` / tagged body                  | unknown discriminator + wrong shape for valid tag             |
| `@Param` with pipe                                  | happy + 404 + 400 malformed                                   |
| `@Param` without pipe                               | happy + 404                                                   |
| Domain error codes this route can emit              | one negative per code (status from project catalog)           |
| Auth guard on route                                 | missing header + invalid credential → 401 (or project status) |
| Method not exposed                                  | optional case documenting 404/405                             |

Do not generate error codes the invoked use case cannot return.

---

## Section 1 template (adjust paths and auth)

```http
### 1. VARIABLES + AUTH SANITY
### <Document auth model from guard/README/config>

### 1.1 <Health or sanity endpoint>
GET {{base_url}}<health_path>
```

---

## Section N template

```http
### N.1 OPTIONS on list (sanity / CORS)
OPTIONS {{base_url}}/<resource>

### N.2 HEAD on list
HEAD {{base_url}}/<resource>
```

---

## Auth guard negatives (when project uses API key or similar)

- Mutation without required header → `(expect 401)` unless project documents otherwise.
- Invalid credential → `(expect 401)`.
- Optional: env disables writes → document `(expect 503)` only if the codebase defines that contract.

Error envelope shape: read from project's HTTP error mapper; document in comments.

---

## NestJS checklist (add to common checklist)

- [ ] Sanity/bootstrap request matches project config.
- [ ] Every HTTP method on the controller has happy path.
- [ ] Each `@Query` covered.
- [ ] Each body validation pipe: happy + representative 400 cases.
- [ ] Each param pipe: happy + 404 + malformed if applicable.
- [ ] Applicable domain error codes have negative cases.
- [ ] Each guarded mutation: auth failure cases.
- [ ] Non-default `@HttpCode` noted on happy paths.
