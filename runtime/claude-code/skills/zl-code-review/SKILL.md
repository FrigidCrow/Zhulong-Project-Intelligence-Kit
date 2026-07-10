---
name: zl-code-review
description: Zhulong code review workflow focused on spec drift, code-map impact, behavioral risk, tests, and evidence.
---

# Zhulong Code Review

Use this when the user invokes `/zl-code-review` or asks for a Zhulong-grounded
review.

Treat the user text after `/zl-code-review` as the review scope.

## Required Flow

1. From the repository root, run:

   ```bash
   {{ZL_CLI}} workflow run code-review --target . "$ARGUMENTS"
   ```

2. Read the generated review packet and handoff.
3. Inspect the diff and affected source files directly.
4. Check whether behavior claims match the request, active records, source,
   tests, or optional project documents when present.
5. Use the code map for impact and dependency checks:

   ```bash
   {{ZL_CLI}} graph status --target .
   {{ZL_CLI}} graph query --target . "<changed symbol or module>"
   ```

6. Lead with findings ordered by severity. Include file and line references.
7. Mention missing tests, missing evidence, stale graph data, or unresolved
   specification ambiguity as review risks.
8. If the review creates durable verification evidence, record it with
   `{{ZL_CLI}} evidence record --target . ... --writeback <active-record>`.
9. Follow `core/workflows/code-review.md` and perform the review inline with Zhulong
   gates.

Keep the user-facing workflow name `/zl-code-review`. When suggesting next
commands to the user, suggest `/zl-*` commands, never `/gsd-*` commands.
