---
name: pik-new-milestone
description: AI-PIKit native milestone starter for Claude Code.
---

# AI-PIKit New Milestone

Use this when the user invokes `/pik-new-milestone`.

1. Run `{{PIK_CLI}} workflow run new-milestone --target . "$ARGUMENTS"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/new-milestone.md`.
4. Create or update the active milestone/phase record.
5. Suggest only `/pik-*` commands.

GSD is reference design only; do not route the user to `/gsd-*`.
