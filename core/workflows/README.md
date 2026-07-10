# Zhulong Native Workflow Contract

Zhulong workflow commands are the public control surface for general software
projects. GSD is kept as a reference design, not as the required runtime
backend. Document-heavy projects can enable retrieval and citation gates, while
non-document-heavy projects use the complete `rag none` path without RAG setup
or indexing.

Every `zl-*` workflow follows the same loop:

1. Read the generated `.planning/context/<kind>-*.md` context packet.
2. Check current project state in `.planning/STATE.md`, `.planning/issues/`,
   `.planning/phases/`, and `.planning/evidence/`.
3. Check project evidence from the request, issue records, source code, tests,
   and available documents before making business-rule claims.
4. Check Graphify/code-map evidence before risky edits.
5. Produce or update the relevant workflow record under `.planning/`.
6. Verify with focused commands, source reads, tests, logs, screenshots, or
   manual checks appropriate to the request.
7. Write decisions, evidence, risks, and follow-ups back with
   `zl-evidence-record` when work is non-trivial.
8. Recommend only `zl-*` commands to the user.

GraphRAG and Graphify are optional evidence backends selected by project mode:

- GraphRAG/document RAG answers document-grounded questions when the backend is
  enabled and must cite source documents when used.
- Graphify/code-map data identifies entry points, dependencies, impact surface,
  and graph drift.

When `rag_backend` is `none`, the absence of GraphRAG is intentional and must
not be reported as a setup failure. Use task records, direct source and test
reads, plus any available documents. If an enabled backend or required code map
is unavailable, say so plainly and never pretend the capability was used.
