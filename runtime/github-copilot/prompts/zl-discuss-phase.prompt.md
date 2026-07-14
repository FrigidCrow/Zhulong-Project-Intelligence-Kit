---
name: zl-discuss-phase
description: Zhulong native discussion and decision workflow.
argument-hint: decision topic
agent: agent
---

Run Zhulong Project Intelligence Kit discussion for the current workspace.

1. Run `{{ZL_CLI}} workflow run discuss-phase --target . "<decision topic>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Follow `core/workflows/discuss-phase.md`.
4. Present options, tradeoffs, impacted files/modules, verification cost, and
   decision risk.
5. Write a decision as accepted only with an explicit user response or a
   matching Goal grant for that routine in-scope choice; otherwise keep it
   proposed or open.
6. Suggest only `/zl-*` commands. GSD is reference design only.
