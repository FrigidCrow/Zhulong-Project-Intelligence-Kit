---
name: pik-verify-work
description: AI-PIKit public work verification command for Codex. Use when the user invokes $pik-verify-work or asks AI Project Intelligence Kit to verify completed work with specification evidence, code-map checks, test/build/manual validation, risk notes, rollback, and evidence writeback.
---

# AI-PIKit Verify Work

This is the Codex runtime entrypoint for `$pik-verify-work`.

## Invocation

- Treat all user text after `$pik-verify-work` as `PIK_ARGS`.
- Preserve `$pik-verify-work` in user-facing notes.
- Treat GSD commands such as `$gsd-verify-work` as reference design only.
- When suggesting next commands to the user, suggest `pik-*` commands, never
  `$gsd-*` commands.

## Required Flow

1. Resolve the project root from the current working directory.
2. Run the deterministic AI-PIKit preflight:

```bash
{{PIK_CLI}} workflow run verify-work --target "$PWD" "<PIK_ARGS>"
```

3. Read the generated verification context packet and handoff under
   `.planning/context/`.
4. Confirm the claimed change against source files, specification evidence,
   code-map impact, tests, build checks, logs, or manual checks.
   Use `pik-docs-query --rag` only when the configured document RAG backend is
   approved for the project documents being verified.
5. Follow `core/workflows/verify-work.md` as the AI-PIKit native workflow contract.
6. If structural relationships changed and direct graph refresh is approved,
   run `pik-graph-build --run` and inspect `pik-graph-diff`.
7. Record durable evidence with `pik-evidence-record`, including remaining
   risk and rollback notes. Use `--writeback`, `--issue`, `--debug`, or
   `--phase` when a backend record exists.
8. Clearly state what was verified, what was not verified, and what remains
   risky.

## Fallback

GSD is reference design only. Verify inline using the AI-PIKit packet and write
evidence under `.planning/evidence/`.
