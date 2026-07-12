# zl-ui-phase

Purpose: define UI behavior, states, data dependencies, conditional Taste
design authority, and verification before frontend implementation.

Reference design: `$gsd-ui-phase`

Required flow:

1. Read the context packet, active phase, `project.manifest.yml`, dependency
   manifest, design/spec documents, existing tokens/components/screens, and
   code-map context for the UI surface.
2. Read `core/design/taste-adapter.md`. Classify the surface as `preserve`,
   `evolve`, `create`, or `system`, honoring explicit user and manifest
   overrides. If low confidence would materially change the result, ask one
   design-direction question.
3. Write a `Frontend Design Decision` using the adapter schema, including
   evidence, preserved contracts, allowed changes, Design Read, dials, and
   verification expectations. Write it to the active phase when one exists;
   otherwise include it in the UI workflow/context record before execution.
4. Identify routes, components, data contracts, empty/loading/error states,
   permissions, validation rules, and accessibility requirements.
5. Use Graphify/code-map data to find related components, shared state,
   API clients, and tests before edits.
6. Define responsive, theme, reduced-motion, contrast, screenshot, and manual
   verification needs appropriate to the selected mode.
7. Write UI decisions and affected surfaces to the active phase record.

Outputs:

- UI scope, state checklist, and Frontend Design Decision.
- Impact surface list.
- Next command recommendation: `zl-plan-phase` or `zl-execute-phase`.
