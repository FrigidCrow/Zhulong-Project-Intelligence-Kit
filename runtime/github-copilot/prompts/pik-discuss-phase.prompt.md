---
name: pik-discuss-phase
description: AI-PIKit native discussion and decision workflow.
argument-hint: decision topic
agent: agent
---

Run AI Project Intelligence Kit discussion for the current workspace.

1. Run `{{PIK_CLI}} workflow run discuss-phase --target . "<decision topic>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Follow `core/workflows/discuss-phase.md`.
4. Present options, tradeoffs, impacted files/modules, verification cost, and
   decision risk.
5. Write accepted decisions and rejected alternatives to the active record.
6. Suggest only `/pik-*` commands. GSD is reference design only.
