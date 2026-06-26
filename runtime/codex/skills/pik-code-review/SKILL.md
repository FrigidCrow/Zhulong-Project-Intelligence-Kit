---
name: pik-code-review
description: AI-PIKit native code review command for Codex. Use when the user invokes $pik-code-review or asks AI Project Intelligence Kit to review changes against specification evidence, code-map impact, source verification, tests, risks, and evidence.
---

# AI-PIKit Code Review

This is the Codex runtime entrypoint for `$pik-code-review`.

## Invocation

- Treat all user text after `$pik-code-review` as `PIK_ARGS`.
- Preserve `$pik-code-review` in user-facing notes.
- Treat GSD commands such as `$gsd-code-review` as reference design only.
- When suggesting next commands to the user, suggest `pik-*` commands, never
  `$gsd-*` commands.

## Required Flow

1. Resolve the project root from the current working directory.
2. Run the deterministic AI-PIKit preflight:

```bash
{{PIK_CLI}} workflow run code-review --target "$PWD" "<PIK_ARGS>"
```

3. Read the generated review context packet and handoff under
   `.planning/context/`.
4. Review against specification evidence, source files, code-map impact,
   dependency direction, security, regression risk, and test coverage.
   Use `pik-docs-query --rag` only when the configured document RAG backend is
   approved for the project documents being reviewed.
5. Follow `core/workflows/code-review.md` as the AI-PIKit native workflow contract.
6. Lead with findings by severity. Cite files, source evidence, and tests.
7. If graph artifacts changed, inspect `pik-graph-diff` before accepting the
   new impact surface.
8. Record durable evidence if the review closes or reopens meaningful work. Use
   `--writeback`, `--issue`, or `--phase` when a backend record exists.

## Fallback

GSD is reference design only. Perform the review inline using the AI-PIKit packet and
the normal code-review stance: bugs and regressions first, summary second.
