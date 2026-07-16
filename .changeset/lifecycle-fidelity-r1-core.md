---
"@llodev/pm-tasks-core": minor
---

Add optional create-time fields (`labels`, `priority`, `estimate`, `dueDate`) to `TaskCreateRequest` so adapters can map them through the typed transport at task creation (issue #47, Option A). All fields are optional and additive — no behavior change when omitted. Adds `references/lifecycle-fidelity.md` documenting the cross-adapter create → start → close plan-vs-actual principle consumed by adapter SKILLs (R2–R4).
