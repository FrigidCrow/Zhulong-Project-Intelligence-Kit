# zl-verify-work

Purpose: verify that implementation, project evidence, code impact, and
recorded decisions line up before closing work.

Reference design: `$gsd-verify-work`

Required flow:

1. Read the active phase/issue/debug record and context packet.
2. Confirm acceptance criteria from the request, active records, source, tests,
   and optional documents when present.
3. Inspect changed files and relevant Graphify/code-map output.
4. Run or review focused tests, build, lint, typecheck, API checks, screenshots,
   logs, or manual verification as appropriate.
5. Confirm no user-facing command recommendation uses `gsd-*`.
6. Write a verification summary with commands, results, evidence paths, risks,
   and follow-ups.

Outputs:

- Verification pass/fail with evidence.
- Updated active record.
- Next command recommendation: `zl-complete-milestone` if complete, otherwise
  `zl-execute-phase` or `zl-debug`.
