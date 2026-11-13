# Delivery and proof of concept

## The walking skeleton comes first

Before any feature, deploy an empty application through the real chain, to the real target environment. The goal is not features. The goal is proof that the chain works:

- [ ] The repository builds from a clean checkout.
- [ ] CI runs lint, type checks, unit tests, and the build on every change.
- [ ] The artifact (a container image or a bundle) is built once and promoted to each environment.
- [ ] Staging deploys from the main branch. Production requires an explicit approval.
- [ ] The database is provisioned and reachable from the app, and migrations run in the pipeline.
- [ ] Secrets come from the platform's secret store, not from the repository or a shared file.
- [ ] Authentication works end to end, even with a placeholder user.
- [ ] Logs, traces, and error reports reach the chosen backend.
- [ ] The health check gates traffic, and a failed deploy does not take the service down.
- [ ] A rollback to the previous version has been run once, on purpose.
- [ ] A backup has been restored once.

When every item is checked, the chain can be trusted. Feature work then starts on proven ground, instead of discovering infrastructure problems in the middle of a sprint.

## Environments

- **Local:** dependencies run in containers, for example with Docker Compose, so a new engineer can run the app in minutes.
- **Staging:** production-like, with its own database and secrets. Test migrations here first.
- **Production:** its own database, secrets, and access policy. Nobody uses production data in local development. Use anonymized or synthetic data.

## Minimum pipeline

- **On each pull request:** lint, type check, unit tests, build, and integration tests against containerized dependencies when they exist.
- **On merge to the main branch:** build the artifact once, deploy it to staging, run migrations, and run smoke tests.
- **To production:** promote the same artifact. A manual approval is reasonable for an MVP. Automate it when the test coverage and the rollback confidence justify it.

## Migrations in the pipeline

Run migrations as a separate, gated step before the new version receives traffic. Follow the expand-and-contract policy in [`data-and-consistency.md`](data-and-consistency.md), so that the previous application version still works against the new schema. Without that policy, a rollback after a migration is impossible.

## Feature flags

For an MVP, a configuration value is enough. Adopt a feature-flag service when you need per-tenant rollouts, experiments, or kill switches that change without a deploy.

## Infrastructure as code

Start with the platform's console or CLI, and write down what you did. Adopt Terraform, Pulumi, or a similar tool when:

- More than one environment must match.
- The environment must be recreated, for disaster recovery, a new region, or a new customer account.
- An auditor or a customer requires reproducibility.

## Cost guardrails

- Set budget alerts on the cloud account from the first day.
- Tag resources by environment, and by product or tenant when possible, so that cost can be attributed.
- Review the largest cost lines before each release that adds a managed service.

## Hand-off to feature work

The PoC is done when the checklist is green and its decisions are recorded in ADRs, such as "Deployment platform" and "Database provisioning". Feature work starts from that baseline.
