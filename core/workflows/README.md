# Zhulong Native Workflow Contract

Zhulong workflow commands are the public control surface for document-heavy
development projects. GSD is kept as a reference design, not as the required
runtime backend.

Every `zl-*` workflow follows the same loop:

1. Read the generated `.planning/context/<kind>-*.md` context packet.
2. Check current project state in `.planning/STATE.md`, `.planning/issues/`,
   `.planning/phases/`, and `.planning/evidence/`.
3. Check specification evidence before making business-rule claims.
4. Check Graphify/code-map evidence before risky edits.
5. Produce or update the relevant workflow record under `.planning/`.
6. Verify with focused commands, source reads, tests, logs, screenshots, or
   manual checks appropriate to the request.
7. Write decisions, evidence, risks, and follow-ups back with
   `zl-evidence-record` when work is non-trivial.
8. Recommend only `zl-*` commands to the user.

GraphRAG and Graphify are workflow gates:

- GraphRAG/document RAG answers specification questions and must cite source
  documents when available.
- Graphify/code-map data identifies entry points, dependencies, impact surface,
  and graph drift.

If GraphRAG or Graphify is not initialized, the workflow must say so plainly and
fall back to source documents and direct code reads. It must not pretend the
capability was used.

