---
name: pik-complete-milestone
description: AI-PIKit native milestone completion workflow for Codex with verification, evidence, state update, archive, and follow-up handling.
---

# AI-PIKit Complete Milestone

Treat all user text after `$pik-complete-milestone` as `PIK_ARGS`.

## Required Flow

1. Run `{{PIK_CLI}} workflow run complete-milestone --target "$PWD" "<PIK_ARGS>"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/complete-milestone.md`.
4. Confirm verification, evidence, requirement trace, code impact, risks, and
   follow-ups are coherent.
5. Update `.planning/STATE.md` and the active milestone/phase record.
6. Suggest only `pik-*` commands to the user.

GSD is reference design only. Do not ask the user to invoke `$gsd-*` directly.
