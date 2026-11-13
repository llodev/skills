# Intake and scope

Read this at the start of any project request. It produces the brief that every later decision depends on.

## Intake questions

Ask only the questions whose answers change the next decision. Group them, and do not dump the full list at once.

**Stage**

- What exists today: an idea, a prototype, a live product, or a system to rebuild?
- Are there users now? Are they paying? How many, and how often do they come back?

**Users and load**

- Who are the users (staff, businesses, consumers), and how many at 3 and at 12 months?
- Is traffic steady or spiky? Is there a predictable peak, such as month end, a campaign, or an enrollment period?
- Do users need offline use, real-time updates, or low latency in a specific region?

**Business model**

- Is it B2B, B2C, or an internal tool? B2B usually means several customer organizations, so the tenancy model must be decided early.

**Constraints**

- Deadline for the first usable version.
- Ceiling for the monthly infrastructure budget.
- Regulation and data residency: LGPD, GDPR, HIPAA, PCI DSS, or sector rules.
- Availability expectation: is an hour of downtime a nuisance, or a breach of contract?
- Integrations that are mandatory: payments, ERP, CRM, government APIs, identity provider.

**Team**

- How many engineers, and which stacks do they ship in today?
- Who runs production: deploys, on-call, database operations? If nobody does, the architecture must need almost no operations.
- Hiring plans for the next six to twelve months.

**Existing assets**

- Existing code, database, cloud account, vendor contracts, design system.

**Domain-critical rules**

- Where does correctness matter most: money, stock, bookings, quotas, legal records?

## Handling gaps

- An unknown answer becomes an **assumption**, with a default and a way to check it. Write it in the Context section. Do not block on it.
- If the user wants a recommendation before answering, give a provisional one, label it as such, and list the answers that would change it.

## Structure the idea

Turn the idea into a one-page brief before you choose any technology:

1. **Problem:** the situation that hurts, in one or two sentences, from the user's point of view.
2. **Users:** who feels the problem, and what they do today instead.
3. **Core flows:** three to five things a user must be able to do from start to finish. Everything else is secondary.
4. **MVP cut:** three lists. _Must have_ contains only what the core flows need. _Later_ contains what is valuable but not needed to learn. _Never_ contains what is out of scope for this product.
5. **Success metrics:** one leading metric (for example, bookings completed per week) and one guardrail (for example, support tickets per booking must not rise).
6. **Assumptions:** the beliefs the product depends on, each with the cheapest way to test it. Test the riskiest one first.

## Scope pruning

- A feature that is not part of a core flow is not in the MVP. Ask what the first user would lose without it.
- "Login, admin panel, notifications, reports, roles" is five features before the first user. Each one needs a reason to exist on day one, and most do not have one.
- Admin and back-office work is real work. Decide early whether it is part of the MVP or a manual process (a spreadsheet or support tooling) for the first months.
- Prefer the feature that lets the team learn something over the feature that makes the product look complete.

## Stage and depth

Use the stage to decide how deep to go. The table in [`SKILL.md`](../SKILL.md) maps stages to steps. A validation-stage project with a clear idea needs the brief, a stack decision, and a walking skeleton. It does not need a context map or a resilience plan yet.
