---
name: pik-ui-phase
description: AI-PIKit native UI phase workflow for Claude Code.
---

# AI-PIKit UI Phase

Use this when the user invokes `/pik-ui-phase`.

1. Run `{{PIK_CLI}} workflow run ui-phase --target . "$ARGUMENTS"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/ui-phase.md`.
4. Identify UI scope, states, data contracts, permissions, validation,
   accessibility, and verification needs.
5. Use Graphify/code-map context before risky UI edits.
6. Suggest only `/pik-*` commands.

GSD is reference design only; do not route the user to `/gsd-*`.
