---
"@llodev/pm-tasks-trello": patch
---

Read Trello MCP write results out of their response envelope

The live `atlassian-trello-mcp` server returns every write result wrapped in a
named envelope — `create_card` → `{ summary, card: { id, url, … } }`,
`trello_add_comment` → `{ summary, comment: { … } }`,
`trello_create_checklist` → `{ summary, checklist: { … } }`,
`trello_create_check_item` → `{ summary, checkItem: { … } }` — but the transport
read a flat `resp.id`. Every one of those calls therefore returned
`MCP_ERROR: Trello MCP returned unexpected response shape` **after the write had
already succeeded**, leaving orphan cards, comments and checklists on the board
and an audit trail that recorded `ok: false` with no id. Found by the first live
dogfood of `trello.task.batch-create-with-checklists`: the batch reported
`created: 0, failed: 3` while really creating cards.

The transport now unwraps the envelope and still accepts a bare resource, so a
caller that unwraps on its own keeps working. The unit-test stubs were returning
hand-written flat objects — the mock-validates-itself trap that hid this from
569 green tests — and now carry the verbatim shapes captured from the live run.

Also corrects the `dueDate` doc comment in `batch.ts`: `create_card.due` is a
full ISO 8601 date-time and rejects the documented date-only `YYYY-MM-DD`.
