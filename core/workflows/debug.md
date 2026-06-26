# pik-debug

Purpose: diagnose and fix a defect with specification evidence, code-map impact,
focused verification, and durable writeback.

Reference design: `$gsd-debug`

Required flow:

1. Reproduce or characterize the bug. If reproduction is impossible, record the
   missing condition instead of guessing.
2. Read relevant issue/debug records and current state.
3. Check specification evidence before deciding expected behavior.
4. Use Graphify/code-map data and source search to identify likely entry points,
   call chains, dependencies, and blast radius.
5. Form a root-cause hypothesis, then verify it with direct source reads or
   focused commands.
6. Implement the smallest change that resolves the confirmed root cause.
7. Run focused verification and any regression checks appropriate to the change.
8. Write cause, fix, tests, residual risks, and source evidence back to
   `.planning/debug/`, `.planning/issues/`, or `.planning/evidence/`.

Outputs:

- Bug diagnosis and fix summary.
- Verification record.
- Next command recommendation: `pik-verify-work` or `pik-complete-milestone`.

