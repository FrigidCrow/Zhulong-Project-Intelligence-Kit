---
name: pik-new-milestone
description: AI-PIKit native milestone starter.
argument-hint: milestone goal
agent: agent
---

Run AI Project Intelligence Kit milestone setup for the current workspace.

1. Run `{{PIK_CLI}} workflow run new-milestone --target . "<milestone goal>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Follow `core/workflows/new-milestone.md`.
4. Create or update the active milestone/phase record under `.planning/phases/`.
5. Suggest only `/pik-*` commands. GSD is reference design only.
