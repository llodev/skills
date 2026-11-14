# arc-threat-model — design study

Status: sketch, 2026-11-13. Not a skill. Decides structure and seams only.

## 1. Responsibility

Runs a design-time threat model on a brief or a diagram. Draws the data flows and trust boundaries, applies STRIDE per element, inventories personal data and its flows under LGPD and GDPR, rates the threats, and maps each control to a design decision with an owner. Produces a threat table, a personal-data register, and a residual-risk register.

Non-goals (refuses):

- Code review, SAST, dependency scanning (`security-review`).
- Penetration testing or exploit writing.
- Legal advice. It flags each obligation as "confirm with the DPO or counsel".
- Certification checklists (SOC 2, ISO 27001) as a goal in themselves.
- Runtime breach handling (`engineering:incident-response`).

## 2. Triggers

1. "Threat model this architecture before we build it."
2. "Where are the trust boundaries in this design?"
3. "We store CPF and health data. What does LGPD require from the design?"
4. "Run STRIDE on our payment flow."
5. "Does this feature need a DPIA (RIPD under LGPD)?"

## 3. Core concepts

- **Trust boundary:** any point where data crosses privilege, ownership, or network zone. Threats live on boundaries, not inside boxes.
- **STRIDE per element:** apply only the categories that fit the element type (external entity: S, R; process: all six; data store: T, R, I, D; data flow: T, I, D). Verify the mapping against the SDL source.
- **Data class drives controls:** public, internal, confidential, personal, sensitive personal. A flow inherits the class of its most sensitive field.
- **Minimization is the cheapest control:** data not collected cannot leak, and needs no retention job.
- **Purpose and legal basis per personal-data flow:** a flow without both is a finding, not a note.
- **Control mapped to a decision:** a mitigation is real only as an ADR, a contract field, a config default, or a ticket with an owner.
- **Residual risk accepted by name:** an owner signs it, with a revisit trigger.
- **Abuse case:** the misuse version of a user story, used to find threats STRIDE misses in business logic.

## 4. Workflow

| #   | Input            | Action                                                                                                       | Output                        |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------- |
| 1   | Brief or diagram | Set scope, assets, actors, and assumptions                                                                   | Scope statement, asset list   |
| 2   | Scope            | Draw processes, stores, external entities, flows; mark trust boundaries                                      | DFD (Mermaid), boundary list  |
| 3   | DFD              | List personal-data elements: class, purpose, legal basis, retention, location, processors, transfers         | Personal-data register        |
| 4   | DFD, register    | STRIDE on every element and boundary-crossing flow; privacy threats on personal flows; abuse cases           | Threat table                  |
| 5   | Threat table     | Rate likelihood × impact on a 3 × 3 grid with one line of rationale                                          | Ranked threats                |
| 6   | Ranked threats   | Map each to a control and the decision that carries it (authz model, encryption, isolation, limits, logging) | Control map                   |
| 7   | Register         | Check DPIA trigger, data-subject-rights flows, breach-notice readiness, cross-border transfer                | Privacy obligations checklist |
| 8   | Everything open  | Record residual risks, owners, and revisit triggers                                                          | Residual-risk register, ADRs  |

Lightweight mode (default): steps 1, 2, 4, 6 in one pass. Full mode: all steps, when personal or sensitive data or money is in scope.

## 5. Actions and artifacts

- **DFD with trust boundaries** (Mermaid), one per critical flow.
- **Personal-data register:** element, class, purpose, legal basis, retention, location, processor.
- **Threat table:** id, element, STRIDE category, scenario, likelihood, impact, control, owner, status.
- **Control map:** control → decision or ticket → verification.
- **Privacy obligations checklist**, each line marked "confirm with the DPO".
- **Residual-risk register:** risk, owner, accepted on, revisit trigger.

## 6. Expert judgments to inject

- **Threat model at design time and again on every new trust boundary, data class, or processor.** Lightweight by default (heuristic: one diagram, about one hour). Exception: regulated or sensitive data needs full mode.
- **Authorization is server-side, per object, default deny; the tenant id comes from the token, never from the request.** Broken object-level authorization tops the OWASP API list (verify current ranking).
- **Sensitive personal data gets its own store or encryption key and the shortest retention.** Exception: a documented purpose that needs it joined.
- **Retention is a job, not a policy line.** "Keep forever" is a finding.
- **Logs are a personal-data store.** Redact at source; a log stream takes the class of its most sensitive field.
- **Rate design threats on a simple grid, not CVSS.** CVSS scores found vulnerabilities, not design threats.

Regulatory facts to verify before stating: GDPR breach notice to the authority within 72 hours (Art. 33) and DPIA (Art. 35); LGPD legal bases (Art. 7, sensitive data Art. 11), RIPD, and the ANPD incident-notice deadline (set by ANPD regulation). Mark each "verify".

## 7. Anti-patterns to watch

- Threat model written after build, for an audit.
- Threats listed with no control, owner, or status.
- Perimeter trust: "the internal network is safe".
- Collecting personal data "in case we need it".
- Encryption at rest offered as the answer to every threat.

## 8. Reference candidates

- `dfd-and-trust-boundaries.md` — notation, where boundaries hide (queues, admin tools, third parties, LLMs).
- `stride-catalog.md` — per-element prompts and common threats for web, API, async, and multi-tenant systems.
- `privacy-lgpd-gdpr.md` — register fields, legal bases, rights flows, DPIA/RIPD triggers, transfers; every article marked "verify".
- `controls-catalog.md` — threat → control → design decision that carries it.
- `risk-rating.md` — the 3 × 3 grid, acceptance rules.
- `anti-patterns/threat-model.md`.

## 9. Boundary

- **arc-decisions:** owns tenancy model and data residency (`data-and-consistency.md` § Multi-tenancy). This skill validates them and adds controls; it never re-decides the architecture style.
- **security-review:** code-level after build; the threat table tells it what to look for.
- **arc-api-contract:** carries scopes, rate limits, and enumeration-safe errors; this skill checks them.
- **arc-ai-system:** owns AI-specific controls; this skill runs STRIDE across the LLM boundary and cites its guardrail matrix (README, open question 4).
- **arc-observability:** designs the audit-log schema and security alerts that this skill requires.
- **database-schema-designer:** column-level encryption and constraints.
- **engineering:incident-response:** breach response at runtime.

## 10. Structure guess

SKILL.md plus 5 references and 1 anti-patterns file. The privacy reference is long and fact-heavy, so it is isolated to be dated and reviewed on its own.
