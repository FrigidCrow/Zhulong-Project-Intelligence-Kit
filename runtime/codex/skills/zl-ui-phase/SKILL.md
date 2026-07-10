---
name: zl-ui-phase
description: Zhulong native UI phase workflow for Codex covering UI scope, states, data contracts, code-map impact, and verification.
---

# Zhulong UI Phase

Treat all user text after `$zl-ui-phase` as `ZL_ARGS`.

## Required Flow

1. Run `{{ZL_CLI}} workflow run ui-phase --target "$PWD" "<ZL_ARGS>"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/ui-phase.md`.
4. Identify routes, components, states, API/data contracts, permissions,
   validation, accessibility, and verification needs.
5. Use Graphify/code-map context before risky UI edits.
6. Suggest only `zl-*` commands to the user.

GSD is reference design only. Do not ask the user to invoke `$gsd-*` directly.
