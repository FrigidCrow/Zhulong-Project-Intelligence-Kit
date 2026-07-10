---
name: zl-complete-milestone
description: Zhulong native milestone completion workflow for Codex with verification, evidence, state update, archive, and follow-up handling.
---

# Zhulong Complete Milestone

Treat all user text after `$zl-complete-milestone` as `ZL_ARGS`.

## Required Flow

1. Run `{{ZL_CLI}} workflow run complete-milestone --target "$PWD" "<ZL_ARGS>"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/complete-milestone.md`.
4. Confirm verification, evidence, requirement trace, code impact, risks, and
   follow-ups are coherent.
5. Update `.planning/STATE.md` and the active milestone/phase record.
6. Suggest only `zl-*` commands to the user.

GSD is reference design only. Do not ask the user to invoke `$gsd-*` directly.
