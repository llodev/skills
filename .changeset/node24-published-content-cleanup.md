---
"@llodev/pm-tasks-core": minor
"@llodev/pm-tasks-asana": minor
"@llodev/pm-tasks-trello": minor
"@llodev/pm-tasks-jira": minor
"@llodev/pm-tasks-linear": minor
"@llodev/pm-tasks-testkit": minor
"@llodev/django-schema-design": minor
"@llodev/ts-ddd-controller": minor
"@llodev/ts-ddd-domain-service": minor
"@llodev/ts-ddd-dto": minor
"@llodev/ts-ddd-entity": minor
"@llodev/ts-ddd-repository": minor
"@llodev/ts-ddd-use-case": minor
"@llodev/ts-ddd-value-object": minor
"@llodev/ts-query-cqrs": minor
---

Node 24 floor and self-contained published content.

- `engines.node` is now `>=24` for every package (Node 20 reached end of life; the toolchain and CI already run on 24).
- Published skill content no longer points at files that only exist in this repository: the broken lifecycle design link in pm-tasks-core is gone, the internal lint contract moved out of `references/` into the repo docs, and internal roadmap codes and version promises were removed from pm-tasks-jira.
- The ts-ddd family and ts-query-cqrs read as general TypeScript + DDD guidance: no "this repo" wording, origin-project paths or aliases; example layouts, aliases and the sample `Celebration` domain are labelled as examples to adapt, and stack-specific advice (NestJS, Firestore, Prisma) is framed conditionally.
