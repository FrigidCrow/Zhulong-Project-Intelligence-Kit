---
name: zl-code-review
description: Zhulong native code review command for Codex. Use when the user invokes $zl-code-review or asks Zhulong Project Intelligence Kit to review changes against task/source evidence, optional documents, code-map impact, tests, risks, and evidence.
---

# Zhulong Code Review

This is the Codex runtime entrypoint for `$zl-code-review`.

## Invocation

- Treat all user text after `$zl-code-review` as `ZL_ARGS`.
- Preserve `$zl-code-review` in user-facing notes.
- Treat GSD commands such as `$gsd-code-review` as reference design only.
- When suggesting next commands to the user, suggest `zl-*` commands, never
  `$gsd-*` commands.

## Required Flow

1. Resolve the project root from the current working directory.
2. Run the deterministic Zhulong preflight:

```bash
{{ZL_CLI}} workflow run code-review --target "$PWD" "<ZL_ARGS>"
```

3. Read the generated review context packet and handoff under
   `.planning/context/`.
4. Review against the request, active records, source files, code-map impact,
   dependency direction, security, regression risk, and test coverage. Query
   optional documents when present; use `zl-docs-query --rag` only when
   `rag_backend` is not `none` and the backend is approved.
5. Follow `core/workflows/code-review.md` as the Zhulong native workflow contract.
6. Lead with findings by severity. Cite files, source evidence, and tests.
7. If graph artifacts changed, inspect `zl-graph-diff` before accepting the
   new impact surface.
8. Record durable evidence if the review closes or reopens meaningful work. Use
   `--writeback`, `--issue`, or `--phase` when a backend record exists.

## Fallback

GSD is reference design only. Perform the review inline using the Zhulong packet and
the normal code-review stance: bugs and regressions first, summary second.
