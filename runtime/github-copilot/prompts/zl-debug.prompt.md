---
name: zl-debug
description: Zhulong debugging workflow with spec evidence, code-map impact, verification, and evidence writeback.
argument-hint: bug description
agent: agent
---

Run Zhulong Project Intelligence Kit debugging for the current workspace.

Use the text typed after `/zl-debug` as the bug description.

1. Run `{{ZL_CLI}} workflow run debug --target . "<bug description>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Establish expected behavior from `.planning/STATE.md`, relevant issue/debug
   records, source, tests, and the user request.
4. Query `.planning/knowledge/` or local documents only when relevant sources
   exist. Use `{{ZL_CLI}} docs query --target . --rag "<question>"` only when
   `rag_backend` is not `none` and the backend is approved.
5. Use `{{ZL_CLI}} graph status --target .` and `{{ZL_CLI}} graph query
   --target . "<symbol>"` before risky edits.
6. Follow `core/workflows/debug.md` and execute the debug workflow inline.
7. Verify with focused tests or source checks, then run `{{ZL_CLI}} evidence
   record --target . "<summary>" --command "<command>" --result "<result>"
   --writeback <active-record>`.

Keep the user-facing command name `zl-debug`; GSD is reference design only.
When suggesting next commands to the user, suggest `/zl-*` commands, never
`/gsd-*` commands.
