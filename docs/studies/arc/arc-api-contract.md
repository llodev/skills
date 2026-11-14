# arc-api-contract — design study

Status: sketch, 2026-11-13. Not a skill. Decides structure and seams only.

## 1. Responsibility

Designs an API contract before code exists: audience and style, resource model, operations, conventions, error model, idempotency and concurrency, versioning and deprecation policy. Produces an OpenAPI skeleton and a short conventions sheet that the implementation must follow.

Non-goals (refuses):

- Deciding sync versus async integration between contexts (`arc-decisions`, `integration-and-async.md`).
- Controller, DTO, or handler code (`ts-ddd-controller`, `ts-ddd-dto`).
- Test suites from implemented routes (`tests-http`).
- Documenting an API after it is built for a front-end team (`backend-to-frontend-handoff-docs`).
- Choosing authentication products. It declares security schemes and scopes in the contract; `arc-threat-model` decides which controls are required.

## 2. Triggers

1. "Design the REST API for our invoicing module before we write it."
2. "How should we version this public API?"
3. "Cursor or offset pagination for this listing endpoint?"
4. "Define one error format for all our services."
5. "Make POST /payments safe to retry." (also: "review this OpenAPI spec")

## 3. Core concepts

- **Contract first:** the OpenAPI document is the source; code and tests follow, and the spec diff is the review artifact.
- **Resource versus action:** model nouns with standard methods; a custom action is allowed only for a state transition that is not CRUD, named once as a verb.
- **Compatibility rule:** adding is safe; removing, renaming, or tightening is breaking. Clients must ignore unknown fields (tolerant reader).
- **Versioning policy:** decide how a breaking change ships and how long the old one lives. The policy matters more than the syntax.
- **Cursor pagination:** an opaque cursor over a stable sort key. Offset only for small, bounded, jump-to-page lists.
- **Error model:** one machine-readable shape (Problem Details, RFC 9457) with stable `type` codes the client can branch on.
- **Idempotency key:** a client-generated key on non-idempotent writes; the server stores key, request fingerprint, and response, and replays the response.
- **Optimistic concurrency:** `ETag` plus `If-Match` on updates, so two writers cannot silently overwrite each other.

## 4. Workflow

| #   | Input                         | Action                                                                                             | Output                      |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | Brief, list of consumers      | Classify the audience (public, partner, internal, own front end); choose the style                 | Audience and style decision |
| 2   | Bounded contexts, aggregates  | Map aggregates to resources; define ids, relations, nesting, lifecycle states                      | Resource table              |
| 3   | Use cases                     | Map to operations; mark idempotency, scope, success code; long work → `202` plus a status resource | Operation table             |
| 4   | Resource and operation tables | Fix naming, casing, dates, money, ids, pagination, filtering, sorting, field selection             | Conventions sheet           |
| 5   | Operations                    | Define problem types, status mapping, validation error shape                                       | Error catalog               |
| 6   | Audience                      | Set compatibility rules, version scheme, deprecation and sunset steps, changelog                   | Evolution policy (one page) |
| 7   | All of the above              | Write the skeleton: paths, components, security schemes, examples, lint rules                      | OpenAPI skeleton            |
| 8   | Skeleton                      | Check against the breaking-change checklist and anti-patterns; record policies                     | Findings, ADRs              |

Review mode: steps 4 to 8 only, against an existing spec.

## 5. Actions and artifacts

- **Resource table:** resource, id format, owner context, parent, states.
- **Operation table:** method, path, idempotent?, scope, success code, problem types.
- **Conventions sheet:** the rules from step 4, one line each, with one example.
- **Error catalog:** `type`, title, status, when raised, client action.
- **Evolution policy:** what counts as breaking, version scheme, deprecation window, how consumers are told.
- **OpenAPI skeleton:** OpenAPI 3.x (pin the minor in the file; verify the current one), with shared components for errors and pagination.
- **Breaking-change checklist:** run on every spec diff.

## 6. Expert judgments to inject

- **REST and JSON for external APIs.** Exceptions: gRPC for internal calls with strict latency or streaming; GraphQL for many heterogeneous clients, only with query cost limits.
- **Cursor pagination by default.** Heuristic: default page size 20 to 50, hard maximum 100 to 200. Exception: small bounded collections or a real jump-to-page need.
- **Version only on a breaking change.** Public: one major in the path (`/v1`). Internal: evolve additively with no version. Exception: date-based versions with per-account pinning when there are many external integrators.
- **Idempotency key required on every POST that moves money or triggers side effects.** Heuristic retention: 24 hours to 7 days, sized by the client retry window. Same key with a different body is a conflict, not a replay.
- **Deprecate in four steps:** announce, signal (`Deprecation` and `Sunset` headers; verify the current RFC numbers), measure usage, remove. Heuristic window: 6 to 12 months public, one release cycle internal. Never remove with traffic still present.
- **Do not leak existence.** Return `404` rather than `403` for objects outside the caller's tenant (seam with `arc-threat-model`).

## 7. Anti-patterns to watch

- RPC over HTTP: every call is `POST /doSomething`.
- Database schema exposed as the API: table equals resource, sequential ids, internal columns.
- A breaking change shipped as a minor release.
- `200 OK` with `{ "success": false }`.
- A chatty API: one screen needs N+1 calls.

## 8. Reference candidates

- `resource-modeling.md` — aggregates to resources, nesting limits, custom actions, long-running operations.
- `conventions.md` — naming, types (dates, money, ids), pagination, filtering, sorting.
- `errors.md` — Problem Details shape, status mapping, validation errors, error catalog template.
- `idempotency-and-concurrency.md` — key storage, fingerprints, replay rules, ETags.
- `versioning-and-deprecation.md` — compatibility rules, schemes and their trade-offs, sunset steps.
- `openapi-skeleton.md` — annotated skeleton and lint rule set.
- `anti-patterns/api.md`.

## 9. Boundary

- **arc-decisions:** decides that a public contract exists and flags it as irreversible; owns sync versus async. Its `integration-and-async.md` § Delivery and idempotency covers consumer-side idempotency for messages, which stays there; HTTP idempotency keys live here. § Event contracts is contested (README, open question 3).
- **backend-to-frontend-handoff-docs:** after implementation; this skill is before.
- **tests-http:** builds `.http` suites from implemented handlers; it can reuse the skeleton's examples.
- **ts-ddd-controller, ts-ddd-dto:** implement the contract in code.
- **engineering:documentation:** prose docs around the API, not the contract.
- **arc-threat-model:** validates scopes, rate limits, and enumeration safety declared here.
- **arc-migration:** a breaking change during a migration follows this skill's deprecation policy.

## 10. Structure guess

SKILL.md plus 6 references and 1 anti-patterns file. Conventions and the skeleton are lookup material read on demand; SKILL.md holds the workflow, defaults, and review mode.
