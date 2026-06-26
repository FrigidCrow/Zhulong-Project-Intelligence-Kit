---
name: pik-plan-phase
description: AI-PIKit native phase planning workflow with document evidence, code-map context, planning, and verification gates.
---

# AI-PIKit Plan Phase

Use this when the user invokes `/pik-plan-phase` or asks AI-PIKit to plan a phase.

Treat the user text after `/pik-plan-phase` as the planning request.

## Required Flow

1. From the repository root, run:

   ```bash
   {{PIK_CLI}} workflow run plan-phase --target . "$ARGUMENTS"
   ```

2. Read the generated `.planning/context/*plan*.md` packet and handoff.
3. Confirm current project state in `.planning/STATE.md`, `.planning/ROADMAP.md`,
   and active phase or issue records.
4. Query specification context before planning business behavior:
   - `{{PIK_CLI}} docs query --target . "<domain keywords>"`
   - use `{{PIK_CLI}} docs query --target . --rag "<question>"` only when the
     configured document RAG backend is approved for these documents.
5. Query code-map context for likely impact areas:

   ```bash
   {{PIK_CLI}} graph status --target .
   {{PIK_CLI}} graph query --target . "<module or symbol>"
   ```

6. Follow `core/workflows/plan-phase.md` and create the plan inline while
   preserving AI-PIKit evidence and verification gates.
7. Write planning decisions, source references, risks, and open questions back
   to the relevant `.planning/phases/` or `.planning/issues/` record.

Keep the user-facing workflow name `/pik-plan-phase`; GSD is reference design
only. When suggesting next commands to the user, suggest `/pik-*` commands,
never `/gsd-*` commands.
