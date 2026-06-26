---
name: pik-complete-milestone
description: AI-PIKit native milestone completion workflow.
argument-hint: milestone name
agent: agent
---

Run AI Project Intelligence Kit milestone completion for the current workspace.

1. Run `{{PIK_CLI}} workflow run complete-milestone --target . "<milestone name>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Follow `core/workflows/complete-milestone.md`.
4. Confirm verification, evidence, requirement trace, code impact, risks, and
   follow-ups are coherent.
5. Update `.planning/STATE.md` and the active milestone/phase record.
6. Suggest only `/pik-*` commands. GSD is reference design only.
