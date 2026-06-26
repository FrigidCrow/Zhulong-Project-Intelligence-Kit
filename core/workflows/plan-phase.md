# pik-plan-phase

Purpose: create an implementation plan grounded in requirements, code impact,
verification expectations, and rollback notes.

Reference design: `$gsd-plan-phase`

Required flow:

1. Read active phase/issue records and the generated context packet.
2. Confirm requirements through `.planning/knowledge/`, local docs, or approved
   RAG query.
3. Confirm code impact through `.planning/graphs/`, `pik-graph-query`, and
   direct source reads.
4. Break work into ordered steps with dependencies and verification after each
   risky step.
5. Identify files likely to change, tests to run, migration/data risks, and
   rollback strategy.
6. Write the plan back to the active phase record.

Outputs:

- Implementation plan.
- Impact surface.
- Verification checklist.
- Next command recommendation: `pik-execute-phase`.

