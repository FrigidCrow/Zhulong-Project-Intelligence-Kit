# pik-verify-work

Purpose: verify that implementation, specification evidence, code impact, and
recorded decisions line up before closing work.

Reference design: `$gsd-verify-work`

Required flow:

1. Read the active phase/issue/debug record and context packet.
2. Confirm acceptance criteria and source documents.
3. Inspect changed files and relevant Graphify/code-map output.
4. Run or review focused tests, build, lint, typecheck, API checks, screenshots,
   logs, or manual verification as appropriate.
5. Confirm no user-facing command recommendation uses `gsd-*`.
6. Write a verification summary with commands, results, evidence paths, risks,
   and follow-ups.

Outputs:

- Verification pass/fail with evidence.
- Updated active record.
- Next command recommendation: `pik-complete-milestone` if complete, otherwise
  `pik-execute-phase` or `pik-debug`.

