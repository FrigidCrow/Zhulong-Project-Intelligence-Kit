---
name: zl-execute-phase
description: Zhulong public phase execution command for Codex. Use when the user invokes $zl-execute-phase or asks Zhulong Project Intelligence Kit to execute planned work with project state, task/source evidence, optional documents, code-map impact checks, verification, and evidence writeback.
---

# Zhulong Execute Phase

This is the Codex runtime entrypoint for `$zl-execute-phase`.

## Invocation

- Treat all user text after `$zl-execute-phase` as `ZL_ARGS`.
- Preserve `$zl-execute-phase` in user-facing notes.
- Treat GSD commands such as `$gsd-execute-phase` as reference design only.
- When suggesting next commands to the user, suggest `zl-*` commands, never
  `$gsd-*` commands.

## Required Flow

1. Resolve the project root from the current working directory.
2. Run the deterministic Zhulong preflight:

```bash
{{ZL_CLI}} workflow run execute-phase --target "$PWD" "<ZL_ARGS>"
```

3. Read the generated execute context packet and handoff under
   `.planning/context/`.
4. Confirm expected behavior from the plan, active records, source, and tests.
   Query local documents only when relevant sources exist; use
   `zl-docs-query --rag` only when `rag_backend` is not `none` and the backend
   is approved.
5. Check code-map status/query output before editing risky or shared modules.
6. Follow `core/workflows/execute-phase.md` as the Zhulong native workflow contract.
7. Implement in small, verifiable steps.
8. Run the verification commands appropriate to the change.
9. If structural relationships changed and direct graph refresh is approved,
   run `zl-graph-build --run` and inspect `zl-graph-diff`.
10. Record durable evidence with `zl-evidence-record`, including command output
   summaries, source evidence, risk, rollback, and follow-ups. Use
   `--writeback` or `--phase` when a phase record exists.

## Fallback

GSD is reference design only. Continue inline using the Zhulong packet. Keep the Zhulong
flow intact: evidence first, impact check, plan, edit, verify, write back.
