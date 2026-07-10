---
name: zl-ui-phase
description: Zhulong native UI phase workflow for Claude Code.
---

# Zhulong UI Phase

Use this when the user invokes `/zl-ui-phase`.

1. Run `{{ZL_CLI}} workflow run ui-phase --target . "$ARGUMENTS"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/ui-phase.md`.
4. Identify UI scope, states, data contracts, permissions, validation,
   accessibility, and verification needs.
5. Use Graphify/code-map context before risky UI edits.
6. Suggest only `/zl-*` commands.

GSD is reference design only; do not route the user to `/gsd-*`.
