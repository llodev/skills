# arc-observability — design study

Status: sketch, 2026-11-13. Not a skill. Decides structure and seams only.

## 1. Responsibility

Turns the brief's critical user journeys into a telemetry plan: SLIs and SLOs per journey, error-budget policy, burn-rate alerts, signals per component, log schema, trace design, dashboards per audience, and a telemetry cost budget.

Non-goals (refuses):

- Choosing an observability vendor by price or feature list from memory.
- Reliability patterns: timeouts, retries, circuit breakers, load shedding (`arc-decisions`, `reliability-and-observability.md`).
- Incident runbooks and on-call process (`engineering:incident-response`). It stops at "each page links a runbook stub".
- Line-by-line instrumentation code.
- Product or business analytics dashboards (`bi-dashboard`).

## 2. Triggers

1. "Define SLOs for our checkout."
2. "Our alerts page us all night for nothing. Redesign alerting."
3. "What should we log, and in which format?"
4. "Design tracing across our API and the queue workers."
5. "Our telemetry bill is too high. What do we cut?"

## 3. Core concepts

- **Critical user journey:** the unit of an SLO. Measure what the user sees at the edge, not CPU.
- **SLI as a ratio:** good events over valid events, with exclusions written down before the first incident.
- **Error-budget policy:** what the team does when the budget is spent. An SLO without a policy is decoration.
- **Multi-window, multi-burn-rate alert:** page on fast burn, ticket on slow burn. Replaces static thresholds.
- **Signal set by component type:** RED for request-driven services, USE for resources, queue depth and oldest-message age for async work.
- **Cardinality budget:** every label multiplies series. User and request ids belong in traces and logs, never in metric labels.
- **Context propagation through async:** trace context travels in message headers; without it every queue hop breaks the trace.
- **Wide structured event:** one structured record per unit of work, with correlation ids, beats many free-text lines.

## 4. Workflow

| #   | Input                                  | Action                                                                                     | Output                   |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------ |
| 1   | Brief (users, flows), day-one baseline | Pick the critical journeys (heuristic: 3 to 5) and an owner for each                       | Journey list             |
| 2   | Journeys                               | Define good and valid events and the measurement point (edge, client, synthetic probe)     | SLI spec                 |
| 3   | SLI spec, current baseline             | Set target, window, and budget policy per journey                                          | SLO table, budget policy |
| 4   | SLO table                              | Define burn-rate pairs, page or ticket routing, runbook stub per page                      | Alert policy             |
| 5   | Component list from the brief          | Assign RED, USE, or queue signals per component; add DLQ and saturation signals            | Signal matrix            |
| 6   | Components, data classes               | Write the log schema (fields, levels, redaction) and the span plan with propagation points | Log schema, trace design |
| 7   | All of the above                       | One dashboard per audience: journey and SLO overview, service RED, on-call drill-down      | Dashboard inventory      |
| 8   | Volumes                                | Set the cardinality budget, sampling rules, retention tiers, log-level policy              | Telemetry cost budget    |

## 5. Actions and artifacts

- **SLO table:** journey, SLI, measurement point, target, window, owner.
- **Error-budget policy:** thresholds and the action each triggers.
- **Alert policy:** alert, long and short windows, burn rate, severity, route, runbook stub.
- **Signal matrix:** component × signals.
- **Log schema:** field table (name, type, required, class, example) in JSON.
- **Trace design:** span list, attributes, propagation points, sampling rule.
- **Telemetry cost budget:** series per service, sampling rates, retention per tier.

## 6. Expert judgments to inject

- **Set the SLO from user expectation and measured performance, not from nines.** Heuristic: start just below current measured performance so the budget is real. Exception: a contractual SLA, where the internal SLO is stricter than the SLA.
- **Page on symptoms only.** Causes (CPU, memory) go to tickets and dashboards. Exception: saturation that leads to hard failure soon, such as a disk filling within hours.
- **Burn-rate pairs on a 30-day window** (heuristic, from the Google SRE Workbook; verify the numbers): page at 14.4× over 1 hour with a 5-minute short window, page at 6× over 6 hours, ticket at 1× over 3 days.
- **OpenTelemetry SDK and semantic conventions for names.** Verify which conventions are marked stable before fixing names.
- **Tail sampling keeps every error and slow trace.** Heuristic head rate for healthy high-volume traffic: 1% to 10%. Production logs at INFO; DEBUG sampled or switched on per request.
- **No personal data in metric labels or span names; redact at source.**

## 7. Anti-patterns to watch

- Dashboard first: dozens of charts and no SLO.
- Paging on causes, or on every metric.
- Free-text logs with no correlation id.
- Unbounded label cardinality (`user_id` as a label).
- A 100% SLO.

## 8. Reference candidates

- `slo-and-error-budgets.md` — SLI patterns per journey type, targets, windows, budget policies.
- `alerting.md` — burn-rate math, routing, paging hygiene.
- `signals-catalog.md` — RED, USE, golden signals, async and batch signals, AI signals hand-off.
- `log-schema.md` — field set, levels, redaction, audit-log variant.
- `trace-design.md` — span boundaries, attributes, propagation through queues and jobs.
- `telemetry-cost.md` — cardinality, sampling, retention tiers.
- `anti-patterns/observability.md`.

## 9. Boundary

- **arc-decisions:** `reliability-and-observability.md` keeps § Day-one baseline (OpenTelemetry and structured logs from the first deploy) and the reliability patterns. Its § Service level objectives overlaps this skill and should shrink to "name SLOs for the critical journeys" plus a pointer (README, open question 1).
- **engineering:incident-response:** what happens after an alert fires.
- **engineering:deploy-checklist:** release verification reads the SLO dashboards.
- **bi-dashboard:** business charts, not operational telemetry.
- **arc-threat-model:** states what must be audited and each field's data class; this skill designs the schema.
- **arc-ai-system:** lists AI signals; this skill turns them into SLOs and alerts.
- **arc-migration:** consumes cutover metrics (shadow diff rate, canary budget burn).

## 10. Structure guess

SKILL.md plus 6 references and 1 anti-patterns file. Alerting math and the log schema are lookup material; SKILL.md holds the journey-first workflow and defaults. It is the member closest to being a reference of `arc-decisions` instead (README, open question 5).
