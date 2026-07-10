---
name: zl-plan-phase
description: Zhulong native phase planning workflow with document evidence, code-map context, planning, and verification gates.
---

# Zhulong Plan Phase

Use this when the user invokes `/zl-plan-phase` or asks Zhulong to plan a phase.

Treat the user text after `/zl-plan-phase` as the planning request.

## Required Flow

1. From the repository root, run:

   ```bash
   {{ZL_CLI}} workflow run plan-phase --target . "$ARGUMENTS"
   ```

2. Read the generated `.planning/context/*plan*.md` packet and handoff.
3. Confirm current project state in `.planning/STATE.md`, `.planning/ROADMAP.md`,
   and active phase or issue records.
4. Query specification context before planning business behavior:
   - `{{ZL_CLI}} docs query --target . "<domain keywords>"`
   - use `{{ZL_CLI}} docs query --target . --rag "<question>"` only when the
     configured document RAG backend is approved for these documents.
5. Query code-map context for likely impact areas:

   ```bash
   {{ZL_CLI}} graph status --target .
   {{ZL_CLI}} graph query --target . "<module or symbol>"
   ```

6. Follow `core/workflows/plan-phase.md` and create the plan inline while
   preserving Zhulong evidence and verification gates.
7. Write planning decisions, source references, risks, and open questions back
   to the relevant `.planning/phases/` or `.planning/issues/` record.

Keep the user-facing workflow name `/zl-plan-phase`; GSD is reference design
only. When suggesting next commands to the user, suggest `/zl-*` commands,
never `/gsd-*` commands.
