---
name: pik-plan-phase
description: AI-PIKit native phase planning command for Codex. Use when the user invokes $pik-plan-phase or asks AI Project Intelligence Kit to plan work with specification evidence, code-map context, verification expectations, and evidence writeback.
---

# AI-PIKit Plan Phase

This is the Codex runtime entrypoint for `$pik-plan-phase`.

## Invocation

- Treat all user text after `$pik-plan-phase` as `PIK_ARGS`.
- Preserve `$pik-plan-phase` in user-facing notes.
- Treat GSD commands such as `$gsd-plan-phase` as reference design only.
- When suggesting next commands to the user, suggest `pik-*` commands, never
  `$gsd-*` commands.

## Required Flow

1. Resolve the project root from the current working directory.
2. Run the deterministic AI-PIKit preflight:

```bash
{{PIK_CLI}} workflow run plan-phase --target "$PWD" "<PIK_ARGS>"
```

3. Read the generated plan context packet and handoff under
   `.planning/context/`.
4. Confirm specification context for requirements, scope, acceptance criteria,
   terminology, API, DB, screen, QA, and test assumptions.
   Use `pik-docs-query` for local normalized text and `pik-docs-query --rag`
   when the configured document RAG backend is approved.
5. Check code-map context for likely impacted entry points, modules, coupling,
   and risky areas.
6. Follow `core/workflows/plan-phase.md` as the AI-PIKit native workflow contract.
7. Produce a plan that names evidence, impact surface, verification commands,
   risks, rollback strategy, and follow-ups.
8. Record durable evidence or planning decisions when the phase plan materially
   changes project direction. Use `--writeback` or `--phase` when a phase
   record exists.

## Fallback

GSD is reference design only. Continue inline using the AI-PIKit packet and write the
plan into the relevant `.planning/phases/` or issue record.
