---
name: zl-execute-phase
description: Zhulong phase execution grounded in project state, document evidence, code-map impact, tests, and evidence writeback.
argument-hint: phase or change request
agent: agent
---

Run Zhulong Project Intelligence Kit phase execution for the current workspace.

Use the text typed after `/zl-execute-phase` as the execution request.

1. Run `{{ZL_CLI}} workflow run execute-phase --target . "<execution request>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Confirm active phase, issue, debug, and plan records before editing.
4. Verify relevant specification evidence with local docs or configured RAG.
5. Verify likely impact with code-map artifacts before editing. Refresh the graph
   with `{{ZL_CLI}} graph build --target . --run` only when direct graph
   execution is approved.
6. Implement the smallest coherent change using the existing project style.
7. Run focused tests and required build, lint, typecheck, API, or manual checks.
8. If structural impact changed and direct graph execution is approved, run
   `{{ZL_CLI}} graph build --target . --run` and `{{ZL_CLI}} graph diff
   --target . --details`.
9. Record durable evidence with `{{ZL_CLI}} evidence record --target .
   "<summary>" --command "<command>" --result "<result>" --writeback
   <active-record>`.
10. Follow `core/workflows/execute-phase.md` and execute inline with the same
    gates.

Keep the user-facing command name `zl-execute-phase`. When suggesting next
commands to the user, suggest `/zl-*` commands, never `/gsd-*` commands.
