---
name: pm-tasks-jira
description: >-
  Jira adapter for the @llodev/pm-tasks-* family. Use when the user mentions
  Jira or Atlassian, asks to "create a Jira issue", "publish to Jira", "post to
  Jira", "transition a ticket", "add a comment in Jira", or uses --publish-jira;
  OR for CRUD on existing issues (check sub-task, close issue, change due-date,
  assign person, comment); OR when invoked autonomously by another agent with
  [autonomous] / --auto sentinel. Jira hierarchy: site > project > epic > story /
  task > sub-task, with issue types, estimation fields, and Atlassian account
  assignment. Modes: paste-ready (no MCP needed), MCP publish (via Atlassian MCP
  Streamable-HTTP), autonomous (write-through with allowlist). Implements 9 CRUD
  verbs (task.create, task.move, checklist.check, task.close, task.due-date.set,
  task.assignee.add, task.comment.add, task.parent.set, task.estimate.set) from
  pm-tasks/pm-tasks-core/references/contract.md. Requires @llodev/pm-tasks-core
  installed.
license: MIT
metadata:
  version: 1.0.0
  tags:
    - agent-skill
    - jira
    - plan-to-tasks
    - pm-tools
  family: pm-tasks
  role: adapter
  tool: jira
compatibility:
  agents:
    - claude-code
    - cursor
    - codex
    - windsurf
    - cline
    - roo-code
---

<!-- Full SKILL.md content: Phase 5 -->
