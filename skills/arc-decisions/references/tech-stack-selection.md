# Tech stack selection

## Principles

- **Team familiarity is a first-class criterion.** A stack the team ships well in shortens ramp-up, reduces incident time, and lowers hiring risk. It is the default. Deviate only when a stated requirement cannot be met with it.
- **A new technology must justify itself against a requirement,** with evidence: a benchmark on your own workload, a constraint from the domain, or a capability the known stack lacks. "It is faster" and "everyone uses it" are not justifications.
- **Prefer boring, well-supported tools for the core.** Novelty belongs in the product's differentiator, if anywhere.
- **Verify before you state.** Versions, licenses, limits, and prices change. Check the vendor's documentation when a fact matters to the decision.

## Criteria

Score the options against the criteria that matter for this project. Weight them by the project's constraints, since not every criterion matters to every project.

1. **Fit with hard requirements:** latency targets, CPU-bound work, real-time updates, offline use, SEO, concurrency model.
2. **Team capability:** current skills, learning cost, and the hiring market where the company operates.
3. **Ecosystem for generic needs:** mature libraries or managed services for authentication, payments, email, files, PDFs, scheduling, and whatever the generic subdomains need.
4. **Operational model:** managed options, deploy story, observability support, and cost at the expected scale, including the second year, not only day one.
5. **Longevity:** maintenance cadence, governance, license terms (copyleft or source-available licenses can impose obligations on a SaaS product), and lock-in.
6. **Security posture:** update cadence, tooling for known vulnerabilities, and secure defaults.
7. **Testability:** a good test runner, realistic local dependencies in containers, and fast feedback.

Record two or three options, the criteria that separated them, and the option you rejected and why. That record becomes the stack ADR.

## Front end and rendering, by business type

- **B2B and back-office** (forms, tables, approvals, admin panels): server-rendered pages often win. They reduce moving parts, keep the business logic on the server, and let one team deliver a whole feature. A single-page app adds an API contract, client-side state, and build complexity that the workflow may not need.
- **B2C and public products** (SEO matters, rich interaction, app-like experiences): combine server rendering or static generation for public pages with client-side interactivity where it pays for itself. Choose by SEO and interaction needs, not by fashion.
- **Admin and customer surfaces:** decide early whether they share one deployable and one authentication realm. Separating them later is expensive. Separating them early is cheap, with different route groups and roles, and a separate deploy if needed.

## Hosting, by stage

| Stage                             | Reasonable default                                               | Move on when                                                        |
| --------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------- |
| Validation and MVP                | A managed app platform (PaaS), or one VM with a managed database | Deploy frequency, scale, or compliance requires more control        |
| Several services with autoscaling | Containers on a managed orchestrator                             | The team can operate it and there are enough services to justify it |
| Spiky, event-driven, little state | Serverless functions                                             | Latency, cost, or local development friction becomes the problem    |
| Strict isolation or residency     | A dedicated cloud account or region per customer, or on-premises | A contract or a regulation requires it                              |

Avoid running Kubernetes before there are several services, a team that owns the platform, and a need that managed options cannot meet. Its operational cost is real and recurring.

## Who operates the stack

- Name who will operate the stack for the next twelve months. A stack with no operator is a risk, however good it looks on paper.
- Count the components. Each database, queue, cache, or runtime adds an operations surface. Keep the count low at the start.
