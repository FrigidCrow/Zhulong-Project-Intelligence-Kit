---
name: zl-code-review
description: Zhulong code review focused on spec drift, code-map impact, behavioral risk, tests, and evidence.
argument-hint: review scope
agent: agent
---

Run a Zhulong grounded code review for the current workspace.

Use the text typed after `/zl-code-review` as the review scope.

1. Run `{{ZL_CLI}} workflow run code-review --target . "<review scope>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Inspect the diff and affected source files directly.
4. Check whether behavior claims match specification, QA, minutes, design, API,
   DB, or test documents.
5. Use `{{ZL_CLI}} graph status --target .` and `{{ZL_CLI}} graph query
   --target . "<changed symbol or module>"` for impact checks.
6. Lead with findings ordered by severity. Include file and line references.
7. Call out missing tests, missing evidence, stale graph data, or unresolved
   specification ambiguity.
8. Record durable review evidence with `{{ZL_CLI}} evidence record --target .
   ... --writeback <active-record>` when useful.

Keep the user-facing command name `zl-code-review`. When suggesting next
commands to the user, suggest `/zl-*` commands, never `/gsd-*` commands.
