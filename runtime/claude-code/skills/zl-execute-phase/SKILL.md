---
name: zl-execute-phase
description: Zhulong phase execution workflow grounded in task state, source/test evidence, optional documents, code-map impact, and evidence writeback.
---

# Zhulong Execute Phase

Use this when the user invokes `/zl-execute-phase` or asks Zhulong to execute a
planned change.

Treat the user text after `/zl-execute-phase` as the execution request.

## Required Flow

1. From the repository root, run:

   ```bash
   {{ZL_CLI}} workflow run execute-phase --target . "$ARGUMENTS"
   ```

2. Read the generated `.planning/context/*execute*.md` packet and handoff.
3. Read active phase, issue, debug, and plan records before editing.
4. Verify expected behavior from the plan, active records, source, and tests.
   Query local documents only when relevant sources exist; use RAG only when
   `rag_backend` is not `none` and the backend is approved.
5. Verify likely impact with code-map artifacts before editing. Refresh the graph
   with `{{ZL_CLI}} graph build --target . --run` only when direct graph
   execution is approved for the project.
6. Implement the smallest coherent change, following the existing project style.
7. Run focused tests and any required build, lint, typecheck, or manual checks.
8. If code structure changed and direct graph execution is approved, run:

   ```bash
   {{ZL_CLI}} graph build --target . --run
   {{ZL_CLI}} graph diff --target . --details
   ```

9. Record evidence with `{{ZL_CLI}} evidence record --target . ... --writeback
   <active-record>`.
10. Follow `core/workflows/execute-phase.md` and execute inline with the same
    gates.

Keep the user-facing workflow name `/zl-execute-phase`. When suggesting next
commands to the user, suggest `/zl-*` commands, never `/gsd-*` commands.
