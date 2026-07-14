# zl-complete-milestone

Purpose: close a milestone only after implementation, verification, evidence,
and follow-up records are coherent.

Reference design: `$gsd-complete-milestone`

Required flow:

1. Follow `core/workflows/authorization.md`. Closing requires an explicit user
   request or a matching bounded-autonomy Goal grant with
   `complete_milestone` permission.
2. Read active phase/milestone records, issue/debug records, and evidence.
3. Confirm all required verification has passed or that exceptions are clearly
   recorded.
4. Summarize shipped scope, changed files/modules, source requirements,
   Graphify/code-map impact, RAG/spec evidence, test commands, and risks.
5. Move unresolved items to explicit follow-ups.
6. Update `.planning/STATE.md` so future work can resume from the right context.
7. Run the read-only completion check, then use `zl workflow complete` to
   archive or mark the milestone complete without deleting evidence.

Outputs:

- Milestone completion summary.
- Updated state and follow-up list.
- Evidence references for future maintenance.
