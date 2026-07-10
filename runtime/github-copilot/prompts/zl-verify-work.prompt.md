---
name: zl-verify-work
description: Zhulong verification that ties tests, spec evidence, code-map checks, risks, rollback notes, and writeback together.
argument-hint: verification request
agent: agent
---

Run Zhulong Project Intelligence Kit verification for the current workspace.

Use the text typed after `/zl-verify-work` as the verification request.

1. Run `{{ZL_CLI}} workflow run verify-work --target . "<verification request>"`.
2. Read the generated `.planning/context/` packet and handoff.
3. Confirm implemented files, relevant requirements, and active planning records.
4. Run focused verification commands: tests, build, lint, typecheck, API, or
   manual checks as appropriate.
5. Check code-map freshness and diff when structural or dependency impact
   matters with `{{ZL_CLI}} graph status --target .` and `{{ZL_CLI}} graph
   diff --target . --details`.
6. Record evidence, unresolved risks, rollback notes, and follow-ups with
   `{{ZL_CLI}} evidence record --target . "<summary>" --command "<command>"
   --result "<result>" --writeback <active-record>`.
7. Follow `core/workflows/verify-work.md` and verify inline with the same gates.

Keep the user-facing command name `zl-verify-work`. When suggesting next
commands to the user, suggest `/zl-*` commands, never `/gsd-*` commands.
