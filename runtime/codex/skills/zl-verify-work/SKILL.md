---
name: zl-verify-work
description: Zhulong public work verification command for Codex. Use when the user invokes $zl-verify-work or asks Zhulong Project Intelligence Kit to verify completed work with specification evidence, code-map checks, test/build/manual validation, risk notes, rollback, and evidence writeback.
---

# Zhulong Verify Work

This is the Codex runtime entrypoint for `$zl-verify-work`.

## Invocation

- Treat all user text after `$zl-verify-work` as `ZL_ARGS`.
- Preserve `$zl-verify-work` in user-facing notes.
- Treat GSD commands such as `$gsd-verify-work` as reference design only.
- When suggesting next commands to the user, suggest `zl-*` commands, never
  `$gsd-*` commands.

## Required Flow

1. Resolve the project root from the current working directory.
2. Run the deterministic Zhulong preflight:

```bash
{{ZL_CLI}} workflow run verify-work --target "$PWD" "<ZL_ARGS>"
```

3. Read the generated verification context packet and handoff under
   `.planning/context/`.
4. Confirm the claimed change against source files, specification evidence,
   code-map impact, tests, build checks, logs, or manual checks.
   Use `zl-docs-query --rag` only when the configured document RAG backend is
   approved for the project documents being verified.
5. Follow `core/workflows/verify-work.md` as the Zhulong native workflow contract.
6. If structural relationships changed and direct graph refresh is approved,
   run `zl-graph-build --run` and inspect `zl-graph-diff`.
7. Record durable evidence with `zl-evidence-record`, including remaining
   risk and rollback notes. Use `--writeback`, `--issue`, `--debug`, or
   `--phase` when a backend record exists.
8. Clearly state what was verified, what was not verified, and what remains
   risky.

## Fallback

GSD is reference design only. Verify inline using the Zhulong packet and write
evidence under `.planning/evidence/`.
