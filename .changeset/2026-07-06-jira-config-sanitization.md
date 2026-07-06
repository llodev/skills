---
"@llodev/pm-tasks-jira": patch
---

fix(pm-tasks-jira): sanitize network-derived metadata before persisting the init config

The `init` flow assembles the local `.jira.json` from Atlassian REST responses
(project keys, issue-type names, status/field ids, member display names) and
writes it to disk. `runFlow` now passes the assembled config through
`sanitizePersistedConfig`, which rejects any string carrying an ASCII control
character or exceeding a length bound before it reaches the filesystem — so a
malformed or hostile instance can't write corrupt data into a file downstream
tooling reads. Rebuilding the config from guard-checked primitives also severs
the network→file data flow flagged by CodeQL (`js/http-to-file-access`).

No behavior change for well-formed Jira metadata.
