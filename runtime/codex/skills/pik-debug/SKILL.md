---
name: pik-debug
description: AI-PIKit native debug command for Codex. Use when the user invokes $pik-debug or asks to debug a defect through AI Project Intelligence Kit with project state, specification evidence, code-map context, verification, and evidence writeback.
---

# AI-PIKit Debug

This is the Codex runtime entrypoint for `$pik-debug`.

## Invocation

- Treat all user text after `$pik-debug` as `PIK_ARGS`.
- Preserve `$pik-debug` in user-facing notes.
- Treat GSD commands such as `$gsd-debug` as reference design only.
- When suggesting next commands to the user, suggest `pik-*` commands, never
  `$gsd-*` commands.

## Required Flow

1. Resolve the project root from the current working directory.
2. Run the deterministic AI-PIKit preflight:

```bash
{{PIK_CLI}} workflow run debug --target "$PWD" "<PIK_ARGS>"
```

3. Read the generated `.planning/context/*debug*.md` packet and matching
   `.planning/context/handoffs/*debug*-HANDOFF.md`.
4. Check specification context before business-rule claims:
   `.planning/knowledge/`, `pik-docs-query`, `pik-docs-query --rag`, or the
   configured document RAG.
5. Check code-map context before risky edits:
   `pik-graph-status`, `pik-graph-query`, `.planning/graphs/`, and source reads.
6. Follow `core/workflows/debug.md` as the AI-PIKit native workflow contract.
7. Implement only after the root cause and impact surface are clear.
8. Verify with focused tests, source checks, logs, or manual reproduction.
9. If structural relationships changed and direct graph refresh is approved,
   run `pik-graph-build --run` and inspect `pik-graph-diff`.
10. Record durable evidence with `pik-evidence-record` when the work is non-trivial.
    Use `--writeback`, `--debug`, or `--issue` to append the evidence summary
    to the active backend record when one exists.

## Fallback

GSD is reference design only. Continue inline using the same AI-PIKit packet:
diagnose, plan, implement, verify, and write evidence. Keep `$gsd-*` out of
user-facing invocation instructions.
