---
name: zl-verify-work
description: Zhulong verification workflow that ties tests, spec evidence, code-map checks, risks, rollback notes, and writeback together.
---

# Zhulong Verify Work

Use this when the user invokes `/zl-verify-work` or asks Zhulong to verify a
change.

Treat the user text after `/zl-verify-work` as the verification request.

## Required Flow

1. From the repository root, run:

   ```bash
   {{ZL_CLI}} workflow run verify-work --target . "$ARGUMENTS"
   ```

2. Read the generated verify packet and handoff.
3. Confirm the implemented files, relevant requirements, and active planning
   records.
4. Run focused verification commands. Include tests, build, lint, typecheck, API,
   or manual checks as appropriate.
5. Check code-map freshness and diff when structural or dependency impact matters:

   ```bash
   {{ZL_CLI}} graph status --target .
   {{ZL_CLI}} graph diff --target . --details
   ```

6. Record evidence, unresolved risks, rollback notes, and follow-ups:

   ```bash
   {{ZL_CLI}} evidence record --target . "<summary>" --command "<command>" --result "<result>" --writeback <active-record>
   ```

7. Follow `core/workflows/verify-work.md` and verify inline with Zhulong gates.

Keep the user-facing workflow name `/zl-verify-work`. When suggesting next
commands to the user, suggest `/zl-*` commands, never `/gsd-*` commands.
