# zl-debug

Purpose: diagnose a defect and, only when explicitly authorized, fix it with
project evidence, code-map impact, focused verification, and durable writeback.

Reference design: `$gsd-debug`

Required flow:

1. Follow `core/workflows/authorization.md`. The default intent is
   `diagnose-only`. Implement only when the user explicitly requests a fix or a
   matching bounded-autonomy Goal permits `debug_fix` for the current scope.
2. Reproduce or characterize the bug. If reproduction is impossible, record the
   missing condition instead of guessing.
3. Read relevant issue/debug records and current state.
4. Establish expected behavior from the request, issue records, source, tests,
   and available documents. Do not require document evidence in `rag none` mode.
5. Use Graphify/code-map data and source search to identify likely entry points,
   call chains, dependencies, and blast radius.
6. Form a root-cause hypothesis, then verify it with direct source reads or
   focused commands.
7. In diagnose-only mode, stop after the verified diagnosis. Otherwise implement
   the smallest change that resolves the confirmed root cause.
8. Run focused verification and any regression checks appropriate to the change.
9. Write cause, fix if authorized, tests, residual risks, and source evidence back to
   `.planning/debug/`, `.planning/issues/`, or `.planning/evidence/`.

Outputs:

- Bug diagnosis and fix summary.
- Verification record.
- Next command recommendation: `zl-verify-work` or `zl-complete-milestone`.
