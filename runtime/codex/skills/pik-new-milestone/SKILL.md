---
name: pik-new-milestone
description: AI-PIKit native milestone starter for Codex. Use when the user invokes $pik-new-milestone or starts an AI Project Intelligence Kit milestone loop.
---

# AI-PIKit New Milestone

Treat all user text after `$pik-new-milestone` as `PIK_ARGS`.

## Required Flow

1. Run `{{PIK_CLI}} workflow run new-milestone --target "$PWD" "<PIK_ARGS>"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/new-milestone.md`.
4. Create or update the active milestone/phase record under `.planning/phases/`.
5. Link known specifications, QA, minutes, issues, code areas, risks, and open
   questions.
6. Suggest only `pik-*` commands to the user.

GSD is reference design only. Do not ask the user to invoke `$gsd-*` directly.
