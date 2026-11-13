# Example: intake to architecture brief

> Example of the workflow in [`SKILL.md`](../SKILL.md). The product is fictional.

## The request

> I want to build a booking app for physiotherapy clinics. Two developers, one knows Node and the other knows React. We have ten weeks until a pilot. What architecture should we use?

## Intake (step 1)

The request is clear, but three answers change the recommendation, so the agent asks only these:

1. **Tenancy:** Is each clinic a separate customer, with its own data and users?
2. **Sensitive data:** Do the records include anything health-related? (Health data is sensitive personal data under LGPD, so it decides how strict access control and retention must be.)
3. **Operations:** Who gets paged when production breaks? If the answer is nobody, the hosting must be managed end to end.

The user answers: each clinic is a tenant; patient records are health-related; nobody is on call, and they want as little infrastructure as possible.

The agent records two assumptions instead of asking more questions: an expected volume of about 2,000 appointments a day at the end of year one, and no integration with external calendars in the pilot.

**Stage:** MVP. Two pilot clinics in ten weeks, built by two developers.

## Scope brief (step 1)

- **Problem:** clinics lose appointments and double-book practitioners because schedules live in spreadsheets and phone calls.
- **Users:** receptionists (book, reschedule), physiotherapists (see their day), patients (confirm by message).
- **Core flows:** book an appointment; reschedule or cancel; check a patient in; send a reminder.
- **MVP cut:**
  - _Must have:_ the four core flows, one login per staff member, tenant isolation.
  - _Later:_ online self-booking, insurance billing, calendar sync.
  - _Never (for now):_ multi-branch reporting, marketplace listings.
- **Success metrics:** appointments booked per clinic per week (leading); double bookings reported per 100 appointments (guardrail, must be zero).
- **Riskiest assumption:** clinics will move off spreadsheets within the pilot. Test it with two clinics before building self-booking.

## Decisions (steps 2 to 8, at MVP depth)

Steps 2 to 6 are covered here at MVP depth. Step 9 is skipped because AI is not in scope.

| Decision        | Choice                                         | Reason                                                                          | Alternatives rejected                                                                  | Revisit trigger                                                                                                 |
| --------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Architecture    | Modular monolith, three modules                | Two developers, unproven boundaries, one transaction for booking                | One service per module; serverless functions                                           | Two or more teams block each other's deploys for four weeks in a row ([ADR-0001](adr-0001-modular-monolith.md)) |
| Database        | PostgreSQL                                     | Constraints enforce the no-double-booking rule                                  | A document store, which has no cross-document constraints for slots                    | Measured read load beyond one replica                                                                           |
| Tenancy         | Shared schema, `tenant_id`, row-level security | Cheapest isolation that fits the pilot                                          | Schema per tenant; database per tenant (for now)                                       | A customer contract requires its own database                                                                   |
| Background work | Postgres-backed job queue for reminders        | Reminders are enqueued in the same transaction as the booking; no broker to run | A managed broker or an event stream, which adds infrastructure the team cannot run yet | Reminder volume or fan-out outgrows the job table                                                               |
| Stack           | Keep Node and React                            | Both developers already ship in them; no requirement contradicts it             | Rewriting in another stack                                                             | A requirement that the known stack cannot meet                                                                  |
| Hosting         | Managed app platform plus managed PostgreSQL   | Nobody is on call; the platform handles deploys and backups                     | A self-managed VM and Kubernetes                                                       | Compliance or cost requires more control                                                                        |
| Telemetry       | OpenTelemetry from the first deploy            | No incident should happen before traces exist                                   | Adding telemetry after launch                                                          | Not expected to change                                                                                          |

## First steps (step 8)

The first milestone is a walking skeleton, not a feature. Before any booking screen:

1. Deploy an empty app through CI to staging, with a managed database.
2. Run a migration in the pipeline and connect the app to the database.
3. Log in with a placeholder user.
4. Confirm that logs and traces reach the backend.
5. Roll back to the previous version once, on purpose.
6. Restore a backup once.

Only then start the booking flow. Each decision above becomes an ADR, starting with [ADR-0001](adr-0001-modular-monolith.md).
