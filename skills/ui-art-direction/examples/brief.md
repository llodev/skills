# Example: Phase 0 brief

> Example of Phase 0 in [`SKILL.md`](../SKILL.md), following [`brief-and-layout.md`](../references/brief-and-layout.md). The platform, company, people, and data are fictional. The same product runs through every dashboard example in `examples/`.

This is `design/service-overview/brief.md`. It is written before the concept, the references, or any prompt; Phase 1 only appends the `Concept:` line at the end. Nothing else in it says what the screen looks like.

## Purpose

Parallax is the observability platform Kestrel Pay's engineers use for their payment services. The Service Overview is the screen the on-call engineer keeps open all shift. It answers three questions in under five seconds: which service is unhealthy, what changed, and how much error budget is left. The on-call assistant answers questions that cut across panels ("what changed before payments-gateway errors rose?") and proposes actions. The engineer confirms every action; the assistant never runs one on its own.

## User

A rotation of eight engineers, one primary and one secondary on call each week. In office hours the primary watches the screen at a desk on a 27-inch monitor at 1920 × 1080, in glances between other work. After a page at night, they open it on a 1440 × 900 laptop. One of them is red-green color-blind. The secondary acknowledges incidents from a phone.

## Real content

The mockups render this text. No lorem ipsum, no invented placeholder words.

- **Top bar:** "Parallax", environment "production · staging", time range "Last 1 h", search "Service, trace ID, or incident", clock "14:32 UTC".
- **Services** (12 rows; these four always visible in the mockup):

  | Service          | Health   | p95 latency | Error rate | Budget left |
  | ---------------- | -------- | ----------- | ---------- | ----------- |
  | payments-gateway | Failing  | 840 ms      | 6.1%       | 12%         |
  | checkout-api     | Degraded | 410 ms      | 1.4%       | 48%         |
  | ledger-writer    | Healthy  | 95 ms       | 0.02%      | 91%         |
  | fraud-scoring    | Healthy  | 180 ms      | 0.1%       | 77%         |

- **Service map:** 12 services as nodes, their dependencies as lines, the payments-gateway to card-network edge marked failing.
- **Incidents:** "INC-2291 · Sev 2 · Elevated 5xx on payments-gateway · 25 min · A. Mensah"; "INC-2288 · Sev 3 · Slow refunds export · 2 h · J. Ortiz".
- **Error budgets:** SLO "99.9% successful payments, 30 days"; budget left 12%; burn rate "14× (last 1 h)".
- **On-call assistant thread:**
  - Engineer: "What changed before payments-gateway errors rose at 14:05?"
  - Assistant: "Deploy 4f2c1a of payments-gateway reached 20% of pods at 14:03. Errors on those pods are 6.1%; the other pods are at 0.3%."
  - Proposed actions: "Roll back deploy 4f2c1a", "Add this to INC-2291".
- **Empty and error messages:** "No open incidents."; "Metrics delayed: last update 2 min ago."

## Regions

Seven regions, in reading order. Percentages are of the 1920 × 1080 frame. `layout/wire.json` ([`wire.json`](wire.json) in this folder) has one box per region, in this order, each labeled with the region's name and contents.

| Region                | Share and place                 | What it holds                                                                 |
| --------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| Top bar               | full width, top 7%              | Parallax logo, environment, time range, search, UTC clock                     |
| Services              | left 24%, full height below bar | 12 rows: service, health word and shape, p95 latency, error rate, budget left |
| Service map (primary) | center 50%, upper 56%           | services as nodes, dependencies as lines, the failing edge                    |
| Incidents             | center left 25%, lower 37%      | ID, severity, title, age, owner, acknowledge                                  |
| Error budgets         | center right 25%, lower 37%     | SLO, budget left, burn rate                                                   |
| On-call assistant     | right 26%, upper 78%            | conversation thread, proposed actions with confirmation                       |
| Prompt input          | right 26%, lower 15%            | question field and send button                                                |

The service map is the primary region: the eye lands there first.

## Functions that cannot disappear

1. Switch environment, set the time range, search by service, trace ID, or incident. (Top bar)
2. Sort services by error rate or budget left. (Services)
3. Select a service to highlight its dependencies on the map. (Services, Service map)
4. Health is readable without color: every state has a word and a shape. (Services, Service map)
5. Open and acknowledge an incident; see its owner. (Incidents)
6. Read budget left and burn rate for every SLO. (Error budgets)
7. Ask the assistant a question; run a proposed action only after a confirmation step. (On-call assistant, Prompt input)
8. Live updates every 15 seconds without moving the row the engineer is reading. (Services, Incidents)

## Target viewports

- Primary: 1920 × 1080 desktop (16:9). The mockups are generated at this aspect, and the lock is drawn at this size.
- Secondary: 1440 × 900 laptop (16:10) for the engineer paged at night.
- Mobile: 390 × 844, incidents and the assistant only. Derived in a separate pass from the approved desktop, never generated first.

## Constraints

- Stack: the existing React app with its component library. New components are allowed; a new dependency needs a reason in `spec/components.md`.
- Design system: none is mandatory. The Parallax logo and its one brand color (#2f6fd6) stay in the top bar; exploration varies everything else.
- Accessibility: WCAG 2.2 AA. Health states never rely on red against green.
- Performance: the screen stays open for hours; the art layer must cost under 2% CPU at rest and fall back to a still image.
- Charts are out of scope here. Chart form, titles, and highlights inside the panels follow the charting guidance; this pack decides the identity around them.

## Acceptance

- Every function above works on live data at 1920 × 1080 and at 1440 × 900.
- All 12 services and the two newest incidents are visible without scrolling at 1920 × 1080.
- Body text at least 14 px at 1920 × 1080. Text contrast at least 4.5:1; icons and large text at least 3:1.
- Keyboard reaches every control, focus is visible, and reduced motion is respected.
- An on-call engineer would call it calm while things are healthy and impossible to misread when they are not. (The user's adjectives were "calm, alert"; they judge the result, they do not choose the look.)
- The approved mockup scores at least 4 on all five rubric criteria from a blind critic, and the user chose it.

Concept: A dashboard that feels like an observatory at night.

---

The brief ends at Acceptance, plus the `Concept:` line Phase 1 appended for the blind critic. Beside it, Phase 0 renders the lock (and, since the brief names a mobile viewport, the mobile wireframe) and starts `STATUS.md`:

```bash
python3 scripts/wireframe.py design/service-overview/layout/wire.json --out design/service-overview/layout/wire.png
python3 scripts/wireframe.py design/service-overview/layout/wire-mobile.json --out design/service-overview/layout/wire-mobile.png
```

Regions, their order, and their proportions do not change during exploration. A mockup that moves the assistant to the left, or merges error budgets into the services list, fails layout fidelity, however good it looks.

`design/service-overview/STATUS.md` at the end of Phase 0:

```
Phase: 0 - Brief and layout lock
Mode: native
Approved: none
Next step: Phase 1, save candidate references in design/service-overview/refs/ with design/service-overview/refs/SOURCES.md and write three concept lines at the top of design/service-overview/dna.md for the user to pick
Open decisions: whether the mobile pass keeps the service map
```
