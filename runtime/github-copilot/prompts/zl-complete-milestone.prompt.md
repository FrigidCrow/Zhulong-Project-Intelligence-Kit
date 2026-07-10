---
name: zl-complete-milestone
description: Zhulong native milestone completion workflow.
argument-hint: milestone name
agent: agent
---

Run Zhulong Project Intelligence Kit milestone completion for the current workspace.

1. Run `{{ZL_CLI}} workflow run complete-milestone --target . "<milestone name>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Follow `core/workflows/complete-milestone.md`.
4. Confirm verification, evidence, requirement trace, code impact, risks, and
   follow-ups are coherent.
5. Update `.planning/STATE.md` and the active milestone/phase record.
6. Suggest only `/zl-*` commands. GSD is reference design only.
