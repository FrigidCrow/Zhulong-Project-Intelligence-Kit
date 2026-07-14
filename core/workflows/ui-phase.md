# zl-ui-phase

Purpose: define UI behavior, states, data dependencies, conditional Taste
design authority, and verification before frontend implementation.

Reference design: `$gsd-ui-phase`

Required flow:

1. Follow `core/workflows/authorization.md`. UI output is a draft until its
   structured decisions are resolved; a next-command recommendation alone
   never authorizes implementation.
2. Read the context packet, active phase, `project.manifest.yml`, dependency
   manifest, design/spec documents, existing tokens/components/screens, and
   code-map context for the UI surface.
3. Read `core/design/taste-adapter.md`. Verify the generated `preserve`,
   `evolve`, `create`, or `system` routing decision against explicit user,
   manifest, brand, and screen evidence. Do not silently replace it. If its
   recorded low confidence would materially change the result, ask the one
   generated design-direction question.
4. Complete the generated `Frontend Design Decision` using the adapter schema, including
   evidence, preserved contracts, allowed changes, Design Read, dials, and
   verification expectations. Write it to the active phase when one exists;
   otherwise include it in the UI workflow/context record before execution.
5. Record confirmed items, assumptions, contradictions, open questions, and any
   material decision requirement with `zl workflow decisions`.
6. Identify routes, components, data contracts, empty/loading/error states,
   permissions, validation rules, and accessibility requirements.
7. Use Graphify/code-map data to find related components, shared state,
   API clients, and tests before edits.
8. Define responsive, theme, reduced-motion, contrast, screenshot, and manual
   verification needs appropriate to the selected mode.
9. Write UI decisions and affected surfaces to the active phase record.

Outputs:

- UI scope, state checklist, and Frontend Design Decision.
- Impact surface list.
- Next command recommendation only: `zl-plan-phase` or `zl-execute-phase`.
