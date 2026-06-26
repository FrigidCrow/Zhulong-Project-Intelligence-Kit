---
name: pik-plan-phase
description: AI-PIKit native phase planning with task state, specification evidence, code-map impact, and verification gates.
argument-hint: phase or planning request
agent: agent
---

Run AI Project Intelligence Kit phase planning for the current workspace.

Use the text typed after `/pik-plan-phase` as the planning request.

1. Run `{{PIK_CLI}} workflow run plan-phase --target . "<planning request>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Read `.planning/STATE.md`, `.planning/ROADMAP.md`, and relevant phase or
   issue records before planning.
4. Query specs, QA, minutes, design, API, DB, and test documents before making
   business-rule claims.
5. Query code-map artifacts with `{{PIK_CLI}} graph status --target .` and
   `{{PIK_CLI}} graph query --target . "<module or symbol>"`.
6. Follow `core/workflows/plan-phase.md` and create the plan inline while
   preserving AI-PIKit gates.
7. Write decisions, evidence, risks, and open questions back to `.planning/`.

Keep the user-facing command name `pik-plan-phase`; GSD is reference design
only. When suggesting next commands to the user, suggest `/pik-*` commands,
never `/gsd-*` commands.
