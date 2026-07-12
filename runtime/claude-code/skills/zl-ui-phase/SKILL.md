---
name: zl-ui-phase
description: Zhulong native UI phase workflow for Claude Code with conditional Taste design routing.
---

# Zhulong UI Phase

Use this when the user invokes `/zl-ui-phase`.

1. Run `{{ZL_CLI}} workflow run ui-phase --target . "$ARGUMENTS"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/ui-phase.md`.
4. Read `{{ZL_KIT_ROOT}}/core/design/taste-adapter.md`, the project and
   dependency manifests, design evidence, tokens, components, and screens.
   Classify the surface as `preserve`, `evolve`, `create`, or `system`.
5. Record a `Frontend Design Decision` before implementation. In `preserve`,
   do not introduce new visual systems or UI/motion dependencies without
   approval. Taste is bundled; do not request a separate Taste installation.
6. Identify UI scope, states, data contracts, permissions, validation,
   accessibility, and verification needs.
7. Use Graphify/code-map context before risky UI edits.
8. Suggest only `/zl-*` commands.

GSD is reference design only; do not route the user to `/gsd-*`.
