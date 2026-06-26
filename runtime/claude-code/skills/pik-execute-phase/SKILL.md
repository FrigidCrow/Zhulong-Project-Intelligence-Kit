---
name: pik-execute-phase
description: AI-PIKit phase execution workflow grounded in task state, Japanese-style document evidence, code-map impact, tests, and evidence writeback.
---

# AI-PIKit Execute Phase

Use this when the user invokes `/pik-execute-phase` or asks AI-PIKit to execute a
planned change.

Treat the user text after `/pik-execute-phase` as the execution request.

## Required Flow

1. From the repository root, run:

   ```bash
   {{PIK_CLI}} workflow run execute-phase --target . "$ARGUMENTS"
   ```

2. Read the generated `.planning/context/*execute*.md` packet and handoff.
3. Read active phase, issue, debug, and plan records before editing.
4. Verify relevant specification evidence with local docs or configured RAG.
5. Verify likely impact with code-map artifacts before editing. Refresh the graph
   with `{{PIK_CLI}} graph build --target . --run` only when direct graph
   execution is approved for the project.
6. Implement the smallest coherent change, following the existing project style.
7. Run focused tests and any required build, lint, typecheck, or manual checks.
8. If code structure changed and direct graph execution is approved, run:

   ```bash
   {{PIK_CLI}} graph build --target . --run
   {{PIK_CLI}} graph diff --target . --details
   ```

9. Record evidence with `{{PIK_CLI}} evidence record --target . ... --writeback
   <active-record>`.
10. Follow `core/workflows/execute-phase.md` and execute inline with the same
    gates.

Keep the user-facing workflow name `/pik-execute-phase`. When suggesting next
commands to the user, suggest `/pik-*` commands, never `/gsd-*` commands.
