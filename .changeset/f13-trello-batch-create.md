---
"@llodev/pm-tasks-trello": minor
---

feat(trello): F13 batch card+checklist creation

Adds the custom namespaced verb `trello.task.batch-create-with-checklists`:
create many cards each with their checklists in bounded parallel (~10× faster
on large plans). Cards route through the audited canonical task.create path;
checklists are created two-phase (cap 8) to respect Trello's rate limit. The
agent-driven publish sequence (references/publish.md) is parallelized to match.
No pm-tasks-core change. Skill-judge re-scored at 84 (Δ+1 vs 83) for the new
`trello.task.batch-create-with-checklists` verb-doc subsection — within the
mature-adapter noise band, matching the precedent set by the sibling U1
narration-language additions. Baseline ratcheted to 1.10.0.
