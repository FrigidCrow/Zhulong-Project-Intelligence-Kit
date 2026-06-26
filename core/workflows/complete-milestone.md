# pik-complete-milestone

Purpose: close a milestone only after implementation, verification, evidence,
and follow-up records are coherent.

Reference design: `$gsd-complete-milestone`

Required flow:

1. Read active phase/milestone records, issue/debug records, and evidence.
2. Confirm all required verification has passed or that exceptions are clearly
   recorded.
3. Summarize shipped scope, changed files/modules, source requirements,
   Graphify/code-map impact, RAG/spec evidence, test commands, and risks.
4. Move unresolved items to explicit follow-ups.
5. Update `.planning/STATE.md` so future work can resume from the right context.
6. Archive or mark the milestone as complete without deleting evidence.

Outputs:

- Milestone completion summary.
- Updated state and follow-up list.
- Evidence references for future maintenance.

