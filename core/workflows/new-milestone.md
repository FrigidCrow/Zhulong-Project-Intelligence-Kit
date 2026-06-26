# pik-new-milestone

Purpose: start a durable milestone loop for a project change, defect cluster, or
feature slice.

Reference design: `$gsd-new-milestone`

Required flow:

1. Read `.planning/PROJECT.md`, `.planning/STATE.md`, existing
   `.planning/phases/`, `.planning/issues/`, and recent `.planning/evidence/`.
2. Clarify the milestone goal, acceptance boundary, risks, and expected delivery
   artifacts.
3. Check document evidence in `.planning/knowledge/` and source documents. Use
   GraphRAG/document RAG only when approved for the project data.
4. Check Graphify/code-map context when the milestone touches existing code,
   shared modules, interfaces, or risky impact surfaces.
5. Create or update a milestone/phase record under `.planning/phases/`.
6. Link known source documents, QA, meeting notes, issue records, code areas,
   Graphify/code-map artifacts, and RAG evidence.
7. Record open questions separately from confirmed facts.
8. Set the next public command:
   - `pik-spec-phase` when requirements are unclear.
   - `pik-discuss-phase` when decisions or alternatives need discussion.
   - `pik-plan-phase` when the scope is clear enough to plan.

Outputs:

- `.planning/phases/<milestone>/` or an updated phase record.
- Updated `.planning/STATE.md` summary if the active milestone changed.
- Evidence record when source documents or decisions were used.
- GraphRAG/Graphify readiness notes when either enhancement is required.
