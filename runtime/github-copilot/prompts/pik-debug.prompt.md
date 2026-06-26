---
name: pik-debug
description: AI-PIKit debugging workflow with spec evidence, code-map impact, verification, and evidence writeback.
argument-hint: bug description
agent: agent
---

Run AI Project Intelligence Kit debugging for the current workspace.

Use the text typed after `/pik-debug` as the bug description.

1. Run `{{PIK_CLI}} workflow run debug --target . "<bug description>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Check `.planning/STATE.md`, relevant issue/debug records, and specification
   evidence under `.planning/knowledge/` plus source docs such as `docs/`,
   `documents/`, or `仕様書/`.
4. Use `{{PIK_CLI}} docs query --target . "<keywords>"` for local document
   lookup. Use `{{PIK_CLI}} docs query --target . --rag "<question>"` only when
   the configured RAG backend is approved for the documents in scope.
5. Use `{{PIK_CLI}} graph status --target .` and `{{PIK_CLI}} graph query
   --target . "<symbol>"` before risky edits.
6. Follow `core/workflows/debug.md` and execute the debug workflow inline.
7. Verify with focused tests or source checks, then run `{{PIK_CLI}} evidence
   record --target . "<summary>" --command "<command>" --result "<result>"
   --writeback <active-record>`.

Keep the user-facing command name `pik-debug`; GSD is reference design only.
When suggesting next commands to the user, suggest `/pik-*` commands, never
`/gsd-*` commands.
