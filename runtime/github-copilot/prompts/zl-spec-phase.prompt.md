---
name: zl-spec-phase
description: Zhulong native specification clarification workflow.
argument-hint: phase or requirement
agent: agent
---

Run Zhulong Project Intelligence Kit specification clarification for the current
workspace.

1. Run `{{ZL_CLI}} workflow run spec-phase --target . "<phase or requirement>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Follow `core/workflows/spec-phase.md`.
4. Ground business-rule claims in the request, active records, source, and
   tests. Query local documents only when relevant sources exist; use RAG only
   when `rag_backend` is not `none` and the backend is approved.
5. Write confirmed facts, assumptions, contradictions, citations, and open
   questions to the active record.
6. Suggest only `/zl-*` commands. GSD is reference design only.
