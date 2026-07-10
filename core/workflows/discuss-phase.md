# zl-discuss-phase

Purpose: resolve ambiguity before planning or implementation.

Reference design: `$gsd-discuss-phase`

Required flow:

1. Read the active phase/spec context and identify the exact discussion target.
2. Gather evidence from `.planning/knowledge/`, source documents, QA, minutes,
   and Graphify/code-map summaries when the topic touches code impact.
3. Present options with tradeoffs, affected files/modules, verification cost,
   and decision risk.
4. Mark each point as confirmed, assumption, recommendation, or open question.
5. Write accepted decisions and rejected alternatives back to the phase record.

Outputs:

- Decision notes in the active phase or issue record.
- Evidence record for important decisions.
- Next command recommendation: `zl-spec-phase` if more source evidence is
  needed, or `zl-plan-phase` when the decision is settled.

