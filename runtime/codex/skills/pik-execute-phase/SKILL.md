---
name: pik-execute-phase
description: AI-PIKit public phase execution command for Codex. Use when the user invokes $pik-execute-phase or asks AI Project Intelligence Kit to execute planned work with project state, specification evidence, code-map impact checks, verification, and evidence writeback.
---

# AI-PIKit Execute Phase

This is the Codex runtime entrypoint for `$pik-execute-phase`.

## Invocation

- Treat all user text after `$pik-execute-phase` as `PIK_ARGS`.
- Preserve `$pik-execute-phase` in user-facing notes.
- Treat GSD commands such as `$gsd-execute-phase` as reference design only.
- When suggesting next commands to the user, suggest `pik-*` commands, never
  `$gsd-*` commands.

## Required Flow

1. Resolve the project root from the current working directory.
2. Run the deterministic AI-PIKit preflight:

```bash
{{PIK_CLI}} workflow run execute-phase --target "$PWD" "<PIK_ARGS>"
```

3. Read the generated execute context packet and handoff under
   `.planning/context/`.
4. Confirm specification evidence before implementing business behavior. Use
   `pik-docs-query` for local normalized text and `pik-docs-query --rag` when
   the configured document RAG backend is approved.
5. Check code-map status/query output before editing risky or shared modules.
6. Follow `core/workflows/execute-phase.md` as the AI-PIKit native workflow contract.
7. Implement in small, verifiable steps.
8. Run the verification commands appropriate to the change.
9. If structural relationships changed and direct graph refresh is approved,
   run `pik-graph-build --run` and inspect `pik-graph-diff`.
10. Record durable evidence with `pik-evidence-record`, including command output
   summaries, source evidence, risk, rollback, and follow-ups. Use
   `--writeback` or `--phase` when a phase record exists.

## Fallback

GSD is reference design only. Continue inline using the AI-PIKit packet. Keep the AI-PIKit
flow intact: evidence first, impact check, plan, edit, verify, write back.
