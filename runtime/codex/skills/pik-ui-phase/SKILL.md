---
name: pik-ui-phase
description: AI-PIKit native UI phase workflow for Codex covering UI scope, states, data contracts, code-map impact, and verification.
---

# AI-PIKit UI Phase

Treat all user text after `$pik-ui-phase` as `PIK_ARGS`.

## Required Flow

1. Run `{{PIK_CLI}} workflow run ui-phase --target "$PWD" "<PIK_ARGS>"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/ui-phase.md`.
4. Identify routes, components, states, API/data contracts, permissions,
   validation, accessibility, and verification needs.
5. Use Graphify/code-map context before risky UI edits.
6. Suggest only `pik-*` commands to the user.

GSD is reference design only. Do not ask the user to invoke `$gsd-*` directly.
