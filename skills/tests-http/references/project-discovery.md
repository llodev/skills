# Project discovery and overrides

The skill is **repo-agnostic**. Never assume monorepo layout, `apps/api/`, or paths from another project. Discover structure in the **current workspace** or use explicit project configuration.

---

## Configuration sources (priority)

Apply the **first** source that resolves the item. Later sources fill gaps only.

| Priority | Source                  | What it supplies                                                                                                                                     |
| -------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | **User message**        | Handler name, `.http` path, framework, `base_url`, credentials                                                                                       |
| 2        | **Project config file** | Stable paths and conventions (see below)                                                                                                             |
| 3        | **IDE / agent rules**   | root agent guides (`CLAUDE` and `AGENTS` markdown), `.cursor/rules/*.mdc`, `RULE.md` — sections mentioning `http-tests`, `.http`, API base URL, auth |
| 4        | **Discovery**           | Search repo for handlers, existing `.http` files, deps, env samples                                                                                  |
| 5        | **Ask the user**        | When framework, `base_url`, auth, or canonical example location is still unclear                                                                     |

**NEVER** copy paths from this skill's examples into a project without verifying they exist.

---

## Optional project config file

Teams may add **one** of these at repo root (or path given by user):

- `.http-tests.yaml` (preferred)
- `.http-tests.json`
- `docs/http-tests.md` (markdown with a `## http-tests` section)

Minimal schema:

```yaml
framework: nestjs | drf # optional if auto-detectable

http:
  base_url: http://localhost:3000
  health_path: /health # optional sanity check
  api_prefix: "" # e.g. /api or /one/api/<module>

paths:
  http_glob: "**/*.http" # where .http files live
  handler: # one or more globs — first match wins
    nestjs: "**/*.controller.ts"
    drf: "**/views/*.py"

auth:
  type: bearer | api_key | session | none
  signin_url: http://localhost:8000/auth/signin # DRF-style
  header: Authorization # or x-api-key
  env_var: API_WRITE_KEY # for {{$dotenv ...}}
  seed_username: "" # only if documented in repo
  seed_password: ""

canonical_http: [] # list of .http files to mirror style
sources: # project-specific read order hints
  error_codes: ""
  contracts: ""
  seeds: ""
```

If the file exists, **read it entirely** before discovery. If a key is missing, fall back to discovery — do not invent values.

---

## Discovery procedure

Run when config or rules do not fully specify the task:

1. **Existing `.http` files** — `glob **/*.http`. Prefer files near the handler or named like the resource (`templates.http`, `cis.http`). Use the best match as **style canonical** (section order, variables, auth block).
2. **Handler file** — user path, or search:
   - NestJS: `*Controller.ts`, `@Controller(`, `@nestjs/common`
   - DRF: `ViewSet`, `APIView`, `rest_framework`, `views.py`
3. **Framework deps** — `package.json` (`@nestjs/core`), `pyproject.toml` / `requirements` (`django`, `djangorestframework`).
4. **URL / auth hints** — `main.ts` / `bootstrap`, Django `urls.py`, `.env.example`, README, docker-compose ports.
5. **Related source** (framework reference lists _what_ to read, not _where_):
   - NestJS: follow imports from controller (schemas, use cases, guards, error catalog).
   - DRF: view module, router `urls.py`, `filterset_class`, serializers, model.

Document discovered paths in a short comment at the top of a **new** `.http` file (source file path only — no monorepo assumptions).

---

## When to ask the user

Ask **before** writing if any of these are unknown and not in config/rules:

- Which framework adapter (`nestjs` vs `drf`) in a polyglot or unfamiliar repo.
- Where new `.http` files should live (no sibling examples, no `paths.http_glob` in config).
- `base_url` and auth (no `.env.example`, no existing `.http`, no rule file).
- Which handler to cover (multiple controllers/views match the name).

Keep questions concrete: offer 2–3 discovered options, not open-ended "where is everything?"

---

## IDE rule snippet (for a root agent guide or .cursor/rules)

Teams can paste:

```markdown
## http-tests

- Framework: nestjs
- .http glob: test/http/**/*.http
- base_url: http://localhost:3001
- Auth: x-api-key via env API_WRITE_KEY; reads public
- Canonical: test/http/orders.http
- Error codes: src/shared/http/error-codes.ts
```

The agent must treat this as **binding for that repo** over generic skill defaults.
