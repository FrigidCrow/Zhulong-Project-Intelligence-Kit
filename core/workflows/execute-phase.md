# pik-execute-phase

Purpose: implement a planned change while keeping evidence, impact, and
verification linked.

Reference design: `$gsd-execute-phase`

Required flow:

1. Read the active plan and context packet before editing.
2. Re-check any stale specification or code-map evidence if documents or code
   changed since planning.
3. Make scoped edits that match the plan. If the plan is wrong, stop and update
   the plan or decision record before continuing.
4. Run focused verification as soon as meaningful checkpoints exist.
5. Refresh Graphify with `pik-graph-build --run` when structural relationships
   changed and direct Graphify execution is approved.
6. Record commands, results, changed files, deviations, and risks.

Outputs:

- Implemented change.
- Verification output.
- Evidence record and active phase writeback.
- Next command recommendation: `pik-verify-work`.

