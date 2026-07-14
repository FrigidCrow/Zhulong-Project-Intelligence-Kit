# zl-execute-phase

Purpose: implement a planned change while keeping evidence, impact, and
verification linked.

Reference design: `$gsd-execute-phase`

Required flow:

1. Follow `core/workflows/authorization.md`. Do not edit without an explicit
   implementation request or a matching bounded-autonomy Goal grant.
2. Read the active plan and context packet before editing.
3. Re-check stale requirement or code-map evidence if the task records,
   optional documents, tests, or code changed since planning.
4. Make scoped edits that match the plan. If the plan is wrong, stop and update
   the plan or decision record before continuing.
5. For frontend work, enforce `core/design/taste-adapter.md` and the recorded
   `Frontend Design Decision`. In `preserve`, do not add a font, palette,
   radius system, UI/icon library, or motion dependency without approval.
6. Run focused verification as soon as meaningful checkpoints exist.
7. Refresh Graphify with `zl-graph-build --run` when structural relationships
   changed and direct Graphify execution is approved.
8. Record commands, results, changed files, design-contract deviations, and risks.

Outputs:

- Implemented change.
- Verification output.
- Evidence record and active phase writeback.
- Next command recommendation: `zl-verify-work`.
