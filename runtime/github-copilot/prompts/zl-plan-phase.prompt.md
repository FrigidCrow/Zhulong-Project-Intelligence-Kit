---
name: zl-plan-phase
description: Zhulong native phase planning with task/source evidence, optional documents, code-map impact, and verification gates.
argument-hint: phase or planning request
agent: agent
---

Run Zhulong Project Intelligence Kit phase planning for the current workspace.

Use the text typed after `/zl-plan-phase` as the planning request.

1. Run `{{ZL_CLI}} workflow run plan-phase --target . "<planning request>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Read `.planning/STATE.md`, `.planning/ROADMAP.md`, and relevant phase or
   issue records before planning.
4. Confirm requirements from the request, active records, source, and tests.
   Query local documents only when relevant sources exist; use RAG only when
   `rag_backend` is not `none` and the backend is approved.
5. Query code-map artifacts with `{{ZL_CLI}} graph status --target .` and
   `{{ZL_CLI}} graph query --target . "<module or symbol>"`.
6. Follow `core/workflows/plan-phase.md` and create the plan inline while
   preserving Zhulong gates.
7. Write decisions, evidence, risks, and open questions back to `.planning/`.

Keep the user-facing command name `zl-plan-phase`; GSD is reference design
only. When suggesting next commands to the user, suggest `/zl-*` commands,
never `/gsd-*` commands.
