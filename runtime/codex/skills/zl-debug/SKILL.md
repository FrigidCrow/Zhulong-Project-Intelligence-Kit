---
name: zl-debug
description: Zhulong native debug command for Codex. Use when the user invokes $zl-debug or asks to debug a defect through Zhulong Project Intelligence Kit with project state, task/source evidence, optional documents, code-map context, verification, and evidence writeback.
---

# Zhulong Debug

This is the Codex runtime entrypoint for `$zl-debug`.

## Invocation

- Treat all user text after `$zl-debug` as `ZL_ARGS`.
- Preserve `$zl-debug` in user-facing notes.
- Treat GSD commands such as `$gsd-debug` as reference design only.
- When suggesting next commands to the user, suggest `zl-*` commands, never
  `$gsd-*` commands.

## Required Flow

1. Resolve the project root from the current working directory.
2. Run the deterministic Zhulong preflight:

```bash
{{ZL_CLI}} workflow run debug --target "$PWD" "<ZL_ARGS>"
```

3. Read the generated `.planning/context/*debug*.md` packet and matching
   `.planning/context/handoffs/*debug*-HANDOFF.md`.
4. Establish expected behavior from the request, active records, source, and
   tests. Query `.planning/knowledge/` or local documents only when relevant
   sources exist; use RAG only when `rag_backend` is not `none` and approved.
5. Check code-map context before risky edits:
   `zl-graph-status`, `zl-graph-query`, `.planning/graphs/`, and source reads.
6. Follow `core/workflows/debug.md` as the Zhulong native workflow contract.
7. Implement only after the root cause and impact surface are clear.
8. Verify with focused tests, source checks, logs, or manual reproduction.
9. If structural relationships changed and direct graph refresh is approved,
   run `zl-graph-build --run` and inspect `zl-graph-diff`.
10. Record durable evidence with `zl-evidence-record` when the work is non-trivial.
    Use `--writeback`, `--debug`, or `--issue` to append the evidence summary
    to the active backend record when one exists.

## Fallback

GSD is reference design only. Continue inline using the same Zhulong packet:
diagnose, plan, implement, verify, and write evidence. Keep `$gsd-*` out of
user-facing invocation instructions.
