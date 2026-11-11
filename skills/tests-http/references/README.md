# References

| File                   | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `project-discovery.md` | Config priority, repo discovery, when to ask user, IDE rules |
| `common.md`            | Shared `.http` conventions                                   |
| `nestjs.md`            | NestJS mapping (no fixed paths)                              |
| `drf.md`               | DRF mapping (no fixed paths)                                 |

## Adding a new adapter

1. Copy structure from `nestjs.md` or `drf.md`.
2. Document: read order (source of truth), `@base_url` / auth variables, section order, mapping table, bootstrap + final section templates, framework checklist.
3. Add a row to the framework table in `SKILL.md`.
4. Add `examples/<framework>-minimal.http` if a skeleton helps.
5. Register trigger keywords in `SKILL.md` description.
