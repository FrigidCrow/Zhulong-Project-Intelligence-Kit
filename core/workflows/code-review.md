# zl-code-review

Purpose: review changes against requirements, code impact, tests, and evidence.

Reference design: `$gsd-code-review`

Required flow:

1. Inspect the actual diff and changed files.
2. Check whether each behavioral change is supported by the request, issue,
   source, tests, or optional document evidence.
3. Use Graphify/code-map data to look for missed callers, shared modules, or
   unverified impact surfaces.
4. Prioritize findings by severity, with file and line references.
5. For frontend changes, compare the diff with the `Frontend Design Decision`
   and `core/design/taste-adapter.md`. Report style drift, Taste overreach,
   unjustified dependencies, broken preserved contracts, accessibility gaps,
   and templated AI-default patterns relevant to the selected mode.
6. Identify missing tests and residual risks.
7. Record review evidence when the review gates a delivery decision.

Outputs:

- Findings first, ordered by severity.
- Test gaps and residual risks.
- Next command recommendation: `zl-execute-phase` for fixes or
  `zl-verify-work` when ready.
