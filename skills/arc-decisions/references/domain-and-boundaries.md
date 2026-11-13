# Domain and boundaries

Read this before you split anything. Boundaries drawn from database tables or from the org chart age badly. Boundaries drawn from business rules tend to hold.

## Subdomains

Classify each area of the business before investing in it:

| Type       | What it is                                                                                    | How to treat it                                                     |
| ---------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Core       | The reason the product wins; rules competitors do not have                                    | Model carefully; put the best engineers here; expect it to change   |
| Supporting | Needed by the product but not differentiating: reporting, onboarding, vertical-specific rules | Build it simply, as a module                                        |
| Generic    | Solved problems: authentication, payments, email, file storage, PDF generation, tax lookup    | Buy or use a managed service, and wrap it behind your own interface |

Most early effort belongs in the core subdomain. If the team spends weeks on a generic problem, challenge the decision to build it.

## Bounded contexts

A bounded context is a boundary inside which one model and one vocabulary hold. The same word can mean different things on each side of it:

- "Customer" in billing: a legal entity with a tax ID and a payment method.
- "Customer" in support: a person with open tickets and a contact history.

To find the contexts:

1. List the nouns and verbs of the core flows.
2. Group the rules that must change together. Rules that change together belong together.
3. Name each group with the business's word, not a technical one.
4. Write a short glossary per context. A term that has two definitions marks a boundary.
5. Draw the relationships: which context calls which, and which one owns the data.

Relationship types worth naming on the context map:

- **Customer/supplier:** one context serves another, and the consumer can ask for what it needs.
- **Conformist:** the consumer adopts the provider's model as it is.
- **Anti-corruption layer:** the consumer translates a foreign model so that it does not leak into its own code.
- **Shared kernel:** shared code or model. Use sparingly, because it couples both sides.

## Aggregates and transaction boundaries

- An aggregate is the set of objects that must stay consistent with each other within one transaction. Keep it small.
- Refer to other aggregates by identifier, not by object reference.
- One command changes one aggregate. If it must change two, ask whether the second change can be eventual. If it cannot, the flow needs either a different boundary or a saga (see [`integration-and-async.md`](integration-and-async.md)).

## Signs that the boundaries are wrong

- A "service" has no rule of its own. It only saves and reads one table.
- Two services must be deployed together to ship one feature.
- Changing one field requires a change in three repositories.
- Two teams must agree on a database column before they can ship.

## Modular monolith first

Until use proves the boundaries, express them as modules inside one deployable. Each module gets its own package, a public interface, and its own tables. [`architecture-style.md`](architecture-style.md) explains how to enforce the boundaries. Moving a module boundary inside one codebase is cheap. Moving a physical service boundary is not.
