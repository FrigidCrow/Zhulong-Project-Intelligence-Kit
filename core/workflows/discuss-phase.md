# zl-discuss-phase

Purpose: resolve ambiguity before planning or implementation.

Reference design: `$gsd-discuss-phase`

Required flow:

1. Follow `core/workflows/authorization.md`. A proposal is not an accepted
   decision; only an explicit user response or an in-scope routine technical
   choice under a Goal grant may be recorded as accepted.
2. Read the active phase/spec context and identify the exact discussion target.
3. Gather evidence from `.planning/knowledge/`, source documents, QA, minutes,
   and Graphify/code-map summaries when the topic touches code impact.
4. Present options with tradeoffs, affected files/modules, verification cost,
   and decision risk.
5. Mark each point as confirmed, assumption, recommendation, proposed decision,
   or open question.
6. Write accepted decisions only with their authorization evidence, and record
   the structured state with `zl workflow decisions`.

Outputs:

- Decision notes in the active phase or issue record.
- Evidence record for important decisions.
- Next command recommendation: `zl-spec-phase` if more source evidence is
  needed, or `zl-plan-phase` when the decision is settled.
