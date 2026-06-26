---
name: pik-discuss-phase
description: AI-PIKit native decision discussion workflow for Codex with evidence, alternatives, risks, and phase writeback.
---

# AI-PIKit Discuss Phase

Treat all user text after `$pik-discuss-phase` as `PIK_ARGS`.

## Required Flow

1. Run `{{PIK_CLI}} workflow run discuss-phase --target "$PWD" "<PIK_ARGS>"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/discuss-phase.md`.
4. Present options with tradeoffs, impacted files/modules, verification cost,
   and decision risk.
5. Write accepted decisions and rejected alternatives back to the active record.
6. Suggest only `pik-*` commands to the user.

GSD is reference design only. Do not ask the user to invoke `$gsd-*` directly.
