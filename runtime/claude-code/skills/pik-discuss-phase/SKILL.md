---
name: pik-discuss-phase
description: AI-PIKit native discussion and decision workflow for Claude Code.
---

# AI-PIKit Discuss Phase

Use this when the user invokes `/pik-discuss-phase`.

1. Run `{{PIK_CLI}} workflow run discuss-phase --target . "$ARGUMENTS"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/discuss-phase.md`.
4. Present options, tradeoffs, impacted files/modules, verification cost, and
   decision risk.
5. Write accepted decisions and rejected alternatives to the active record.
6. Suggest only `/pik-*` commands.

GSD is reference design only; do not route the user to `/gsd-*`.
