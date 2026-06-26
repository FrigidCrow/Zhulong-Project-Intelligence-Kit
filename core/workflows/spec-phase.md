# pik-spec-phase

Purpose: turn requirement text, QA, minutes, design notes, and business rules
into implementable specification evidence.

Reference design: `$gsd-spec-phase`

Required flow:

1. Read the context packet, `.planning/knowledge/`, active phase, and active
   issue/debug records.
2. Search local normalized documents with `pik-docs-query`.
3. Use `pik-docs-query --rag` only when the configured RAG backend is approved
   for the documents in scope.
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
- GraphRAG evidence and Graphify/code-map impact notes when relevant.
- Next command recommendation: usually `pik-discuss-phase` or `pik-plan-phase`.
