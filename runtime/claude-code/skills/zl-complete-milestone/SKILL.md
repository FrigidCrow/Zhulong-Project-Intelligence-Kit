---
name: zl-complete-milestone
description: Zhulong native milestone completion workflow for Claude Code.
---

# Zhulong Complete Milestone

Use this when the user invokes `/zl-complete-milestone`.

1. Run `{{ZL_CLI}} workflow run complete-milestone --target . "$ARGUMENTS"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/complete-milestone.md`.
4. Confirm verification, evidence, requirement trace, code impact, risks, and
   follow-ups are coherent.
5. Update `.planning/STATE.md` and the active milestone/phase record.
6. Suggest only `/zl-*` commands.

GSD is reference design only; do not route the user to `/gsd-*`.
