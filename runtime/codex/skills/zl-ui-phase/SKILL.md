---
name: zl-ui-phase
description: Zhulong native UI phase workflow for Codex covering UI scope, conditional Taste design routing, states, data contracts, code-map impact, and verification.
---

# Zhulong UI Phase

Treat all user text after `$zl-ui-phase` as `ZL_ARGS`.

## Required Flow

1. Run `{{ZL_CLI}} workflow run ui-phase --target "$PWD" "<ZL_ARGS>"`. For an
   explicit user override, pass `--design-strategy <mode>` and/or
   `--taste <enabled|disabled>`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/ui-phase.md`.
4. Read `{{ZL_KIT_ROOT}}/core/design/taste-adapter.md`, the project manifest,
   dependency manifest, design evidence, tokens, components, and existing
   screens. Verify the generated `preserve`, `evolve`, `create`, or `system`
   decision against that evidence; do not replace it silently.
5. Complete the generated `Frontend Design Decision` before implementation. In `preserve`,
   do not add fonts, palettes, radius systems, component/icon libraries, or
   motion dependencies without explicit approval. Taste is bundled; do not ask
   the user to install `design-taste-frontend` separately.
6. Identify routes, components, states, API/data contracts, permissions,
   validation, accessibility, and verification needs.
7. Use Graphify/code-map context before risky UI edits.
8. Suggest only `zl-*` commands to the user.

GSD is reference design only. Do not ask the user to invoke `$gsd-*` directly.
