---
name: pik-spec-phase
description: AI-PIKit native specification clarification workflow.
argument-hint: phase or requirement
agent: agent
---

Run AI Project Intelligence Kit specification clarification for the current
workspace.

1. Run `{{PIK_CLI}} workflow run spec-phase --target . "<phase or requirement>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Follow `core/workflows/spec-phase.md`.
4. Query local documents and approved RAG before business-rule claims.
5. Write confirmed facts, assumptions, contradictions, citations, and open
   questions to the active record.
6. Suggest only `/pik-*` commands. GSD is reference design only.
