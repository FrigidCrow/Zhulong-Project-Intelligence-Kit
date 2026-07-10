# zl-code-review

Purpose: review changes against requirements, code impact, tests, and evidence.

Reference design: `$gsd-code-review`

Required flow:

1. Inspect the actual diff and changed files.
2. Check whether each behavioral change has specification evidence.
3. Use Graphify/code-map data to look for missed callers, shared modules, or
   unverified impact surfaces.
4. Prioritize findings by severity, with file and line references.
5. Identify missing tests and residual risks.
6. Record review evidence when the review gates a delivery decision.

Outputs:

- Findings first, ordered by severity.
- Test gaps and residual risks.
- Next command recommendation: `zl-execute-phase` for fixes or
  `zl-verify-work` when ready.

