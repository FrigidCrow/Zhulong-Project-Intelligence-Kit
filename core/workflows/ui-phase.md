# pik-ui-phase

Purpose: define UI behavior, states, data dependencies, and verification before
frontend implementation.

Reference design: `$gsd-ui-phase`

Required flow:

1. Read the context packet, active phase, design/spec documents, and code-map
   context for the UI surface.
2. Identify routes, components, data contracts, empty/loading/error states,
   permissions, validation rules, and accessibility requirements.
3. Use Graphify/code-map data to find related components, shared state,
   API clients, and tests before edits.
4. Define screenshot/manual verification needs when applicable.
5. Write UI decisions and affected surfaces to the active phase record.

Outputs:

- UI scope and state checklist.
- Impact surface list.
- Next command recommendation: `pik-plan-phase` or `pik-execute-phase`.

