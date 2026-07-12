# zl-plan-phase

Purpose: create an implementation plan grounded in requirements, code impact,
verification expectations, and rollback notes.

Reference design: `$gsd-plan-phase`

Required flow:

1. Read active phase/issue records and the generated context packet.
2. Confirm requirements through the request, active records, source and tests.
   Use `.planning/knowledge/`, local docs, or approved RAG only when available.
3. Confirm code impact through `.planning/graphs/`, `zl-graph-query`, and
   direct source reads.
4. For frontend work, carry the `Frontend Design Decision` from `$zl-ui-phase`
   into the plan. Name preserved contracts, allowed visual changes, Taste
   authority, dependency limits, and visual verification. If it is missing,
   route back to `$zl-ui-phase` rather than inventing a design mode.
5. Break work into ordered steps with dependencies and verification after each
   risky step.
6. Identify files likely to change, tests to run, migration/data risks, and
   rollback strategy.
7. Write the plan back to the active phase record.

Outputs:

- Implementation plan.
- Impact surface.
- Verification checklist.
- Next command recommendation: `zl-execute-phase`.
