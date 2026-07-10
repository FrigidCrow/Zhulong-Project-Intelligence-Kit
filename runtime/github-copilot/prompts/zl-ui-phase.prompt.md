---
name: zl-ui-phase
description: Zhulong native UI phase workflow.
argument-hint: UI scope
agent: agent
---

Run Zhulong Project Intelligence Kit UI phase for the current workspace.

1. Run `{{ZL_CLI}} workflow run ui-phase --target . "<UI scope>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Follow `core/workflows/ui-phase.md`.
4. Identify routes, components, states, contracts, permissions, validation,
   accessibility, and verification needs.
5. Use Graphify/code-map context before risky UI edits.
6. Suggest only `/zl-*` commands. GSD is reference design only.
