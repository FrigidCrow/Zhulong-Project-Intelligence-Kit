# zl-spec-phase

Purpose: turn user requests, issue records, acceptance criteria, tests, optional
documents, and business rules into implementable requirement evidence.

Reference design: `$gsd-spec-phase`

Required flow:

1. Read the context packet, active phase, issue/debug records, relevant source,
   and tests. Read `.planning/knowledge/` only when project documents exist.
2. Search local normalized documents with `zl-docs-query` only when the source
   inventory contains relevant material.
3. Use `zl-docs-query --rag` only when `rag_backend` is not `none` and the
   configured backend is approved for the documents in scope.
4. Use Graphify/code-map context when a requirement names modules, functions,
   screens, APIs, DB tables, batch jobs, tests, or impact boundaries.
5. Separate confirmed requirements, inferred assumptions, contradictions, and
   unanswered questions.
6. Update `.planning/knowledge/REQUIREMENT_TRACE.md` or the active phase record
   with source paths, citations, GraphRAG/RAG result paths, and Graphify/code-map
   impact notes.
7. Do not proceed to implementation planning until acceptance conditions and
   unresolved decisions are explicit.

Outputs:

- Requirement trace updates.
- Open-question list.
- Optional document/RAG evidence and Graphify/code-map impact notes when relevant.
- Next command recommendation: usually `zl-discuss-phase` or `zl-plan-phase`.
