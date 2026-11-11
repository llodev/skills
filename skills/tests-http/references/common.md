# HTTP Test Suite — Shared Conventions

Applies to **all** frameworks. Framework-specific mapping lives in `references/nestjs.md` and `references/drf.md`. Paths and URLs are resolved via `references/project-discovery.md` — not hardcoded here.

---

## Source of truth — always the code (in the project being edited)

Before writing **any** line in a `.http` file:

1. Resolve project context (`project-discovery.md`).
2. Read the handler and related sources in the order listed in the active framework reference — using **discovered or configured paths**.
3. **Never invent** routes, query params, filter names, error codes, or body fields that are not in code.

When syncing, open the best existing `.http` in the project (same module or resource) to match formatting.

---

## File header (always)

```http
### =============================================================
### <Resource> (<short description>) — full coverage HTTP test suite
### Covers every route/action, query/filter, body validation rule and error
### path exposed by <source-file-path>.
### =============================================================

### Variables
@base_url = <see framework reference>
```

Add framework-specific variables (`@access_token`, `@write_key`, slugs, UUIDs) per the active reference. **Never** hard-code real database IDs — use `# @name` chained variables or deterministic seed placeholders.

---

## Section numbering

Organize with numbered sections and `### ===…===` headers. Sub-sections use `### -------------------------------------------` and labels `X.A.1`, `X.A.2`.

**Always include:**

1. **Bootstrap** — auth sanity or health (framework-specific; see reference).
2. **Read / list / detail** — happy paths for every exposed GET surface.
3. **Write / mutations** — only when the API exposes them.
4. **Negative paths** — 400/401/404/409/422/503 as applicable.
5. **Method / header errors** — OPTIONS, HEAD, bogus method, missing auth (final section).

Skip sections whose feature does not exist in the handler. Do not deliver only a skeleton — expand using the framework mapping tables.

---

## Formatting rules

1. **Case title**: `### <number> <short description>`. Add `(expect 4XX)` or `(expect 4XX CODE)` on error cases. Document non-default success statuses `(201)`, `(204)` on happy paths.
2. **Variables**: `{{var_name}}` in snake_case. Chain with `# @name` on the response that defines the variable.
3. **Comments**: English only in the `.http` file (technical prose). User conversation may be any language.
4. **No emojis**. No real production UUIDs/IPs — use obvious placeholders (`does-not-exist`, `00000000-0000-0000-0000-000000000000`, `not-a-uuid`).
5. **JSON bodies**: 2-space indent, pure JSON. For discriminated unions, comment which variant the body tests.
6. **Error bodies**: Document expected shape in comments; REST Client/httpYac do not auto-assert — `(expect …)` is the contract for the developer running the request.

---

## Syncing an existing `.http` file

Do **not** wipe the file. Preserve correct cases and:

1. Mental diff: current cases × cases required by mapping rules.
2. Move orphan cases into the correct section.
3. Fix params/fields that diverge from current code.
4. Add missing cases; remove cases for removed features.
5. Renumber consecutively within each section.
6. Ensure `# @name` appears before first use of chained variables.

If behavior is surprising but real (e.g. filter silently ignored), keep the test and document actual behavior in a section comment.

---

## Final checklist (all frameworks)

- [ ] Bootstrap section + final method/auth errors section present.
- [ ] Every exposed route/action has at least one happy-path case.
- [ ] Every query/filter/body validation surface has valid + invalid coverage per framework rules.
- [ ] Every applicable auth guard has missing/bad credential cases.
- [ ] Chained variables — no hard-coded DB IDs.
- [ ] Consecutive numbering (`X.Y.Z`).
- [ ] `(expect 4XX …)` on all error cases with correct code when known.
- [ ] No emoji; English comments; placeholders only.

Strike items that genuinely do not apply — confirm omission, do not skip by mistake.

---

## Editor compatibility

- **REST Client** (VS Code): supports `{{$dotenv VAR}}` for env vars.
- **httpYac**: same variable syntax; verify dotenv support in project config.
- **IntelliJ HTTP Client**: may need `@write_key = dev-key` with a comment if dotenv is unsupported.

Document fallback in a one-line comment when replacing `{{$dotenv …}}`.
