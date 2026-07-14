# zl-new-milestone

Purpose: start a durable milestone loop for a project change, defect cluster, or
feature slice.

Reference design: `$gsd-new-milestone`

Required flow:

1. Follow `core/workflows/authorization.md`. Without a matching Goal grant,
   creating this milestone does not authorize starting its next workflow.
2. Read `.planning/PROJECT.md`, `.planning/STATE.md`, existing
   `.planning/phases/`, `.planning/issues/`, and recent `.planning/evidence/`.
3. Clarify the milestone goal, acceptance boundary, risks, and expected delivery
   artifacts.
4. Check task, issue, source, and test evidence. Check `.planning/knowledge/`
   only when project documents exist, and use GraphRAG only when `rag_backend`
   is not `none` and the backend is approved for the project data.
5. Check Graphify/code-map context when the milestone touches existing code,
   shared modules, interfaces, or risky impact surfaces.
6. Create or update a milestone/phase record under `.planning/phases/`.
7. Link known source documents, QA, meeting notes, issue records, code areas,
   Graphify/code-map artifacts, and RAG evidence.
8. Record open questions separately from confirmed facts.
9. Recommend, but do not automatically execute, the next public command unless
   a matching bounded-autonomy Goal authorizes advancement:
   - `zl-spec-phase` when requirements are unclear.
   - `zl-discuss-phase` when decisions or alternatives need discussion.
   - `zl-plan-phase` when the scope is clear enough to plan.

Outputs:

- `.planning/phases/<milestone>/` or an updated phase record.
- Updated `.planning/STATE.md` summary if the active milestone changed.
- Evidence record when source documents or decisions were used.
- GraphRAG/Graphify readiness notes when either enhancement is required.
