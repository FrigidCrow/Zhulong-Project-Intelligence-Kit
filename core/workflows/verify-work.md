# zl-verify-work

Purpose: verify that implementation, project evidence, code impact, and
recorded decisions line up before closing work.

Reference design: `$gsd-verify-work`

Required flow:

1. Follow `core/workflows/authorization.md`. Verification may establish
   eligibility but does not itself close the workflow or authorize repairs.
2. Read the active phase/issue/debug record and context packet.
3. Confirm acceptance criteria from the request, active records, source, tests,
   and optional documents when present.
4. Inspect changed files and relevant Graphify/code-map output.
5. Run or review focused tests, build, lint, typecheck, API checks, screenshots,
   logs, or manual verification as appropriate.
6. For frontend work, verify the mode-specific contract from
   `core/design/taste-adapter.md`: preservation drift for `preserve`, allowed
   evolution for `evolve`, relevant Taste pre-flight checks for `create`, and
   product-system behavior for `system`. Cover desktop/mobile, contrast,
   reduced motion, themes when required, and representative screenshots.
7. Confirm no user-facing command recommendation uses `gsd-*`.
8. Write a verification summary with commands, results, evidence paths, risks,
   and follow-ups.

Outputs:

- Verification pass/fail with evidence.
- Updated active record.
- Next command recommendation: `zl-complete-milestone` if complete, otherwise
  `zl-execute-phase` or `zl-debug`.
