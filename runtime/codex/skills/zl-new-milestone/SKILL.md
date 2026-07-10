---
name: zl-new-milestone
description: Zhulong native milestone starter for Codex. Use when the user invokes $zl-new-milestone or starts a Zhulong Project Intelligence Kit milestone loop.
---

# Zhulong New Milestone

Treat all user text after `$zl-new-milestone` as `ZL_ARGS`.

## Required Flow

1. Run `{{ZL_CLI}} workflow run new-milestone --target "$PWD" "<ZL_ARGS>"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/new-milestone.md`.
4. Create or update the active milestone/phase record under `.planning/phases/`.
5. Link known requirements, issues, source areas, tests, risks, open questions,
   and optional project documents when present.
6. Suggest only `zl-*` commands to the user.

GSD is reference design only. Do not ask the user to invoke `$gsd-*` directly.
