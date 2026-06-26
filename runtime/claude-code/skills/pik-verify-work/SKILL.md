---
name: pik-verify-work
description: AI-PIKit verification workflow that ties tests, spec evidence, code-map checks, risks, rollback notes, and writeback together.
---

# AI-PIKit Verify Work

Use this when the user invokes `/pik-verify-work` or asks AI-PIKit to verify a
change.

Treat the user text after `/pik-verify-work` as the verification request.

## Required Flow

1. From the repository root, run:

   ```bash
   {{PIK_CLI}} workflow run verify-work --target . "$ARGUMENTS"
   ```

2. Read the generated verify packet and handoff.
3. Confirm the implemented files, relevant requirements, and active planning
   records.
4. Run focused verification commands. Include tests, build, lint, typecheck, API,
   or manual checks as appropriate.
5. Check code-map freshness and diff when structural or dependency impact matters:

   ```bash
   {{PIK_CLI}} graph status --target .
   {{PIK_CLI}} graph diff --target . --details
   ```

6. Record evidence, unresolved risks, rollback notes, and follow-ups:

   ```bash
   {{PIK_CLI}} evidence record --target . "<summary>" --command "<command>" --result "<result>" --writeback <active-record>
   ```

7. Follow `core/workflows/verify-work.md` and verify inline with AI-PIKit gates.

Keep the user-facing workflow name `/pik-verify-work`. When suggesting next
commands to the user, suggest `/pik-*` commands, never `/gsd-*` commands.
