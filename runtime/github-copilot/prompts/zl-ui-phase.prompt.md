---
name: zl-ui-phase
description: Zhulong native UI phase workflow.
argument-hint: UI scope
agent: agent
---

Run Zhulong Project Intelligence Kit UI phase for the current workspace.

1. Run `{{ZL_CLI}} workflow run ui-phase --target . "<UI scope>"`. For an
   explicit user override, pass `--design-strategy <mode>` and/or
   `--taste <enabled|disabled>`.
2. Read the generated `.planning/context/` packet and handoff.
3. Follow `core/workflows/ui-phase.md`.
4. Read `{{ZL_KIT_ROOT}}/core/design/taste-adapter.md`, project/dependency
   manifests, design evidence, tokens, components, and existing screens.
   Verify the generated `preserve`, `evolve`, `create`, or `system` decision
   against that evidence; do not replace it silently.
5. Complete the generated `Frontend Design Decision` before implementation. In `preserve`,
   do not introduce a new visual system or UI/motion dependency without
   approval. Taste is bundled and needs no separate installation.
6. Identify routes, components, states, contracts, permissions, validation,
   accessibility, and verification needs.
7. Use Graphify/code-map context before risky UI edits.
8. Suggest only `/zl-*` commands. GSD is reference design only.
