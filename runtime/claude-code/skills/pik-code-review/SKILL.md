---
name: pik-code-review
description: AI-PIKit code review workflow focused on spec drift, code-map impact, behavioral risk, tests, and evidence.
---

# AI-PIKit Code Review

Use this when the user invokes `/pik-code-review` or asks for an AI-PIKit-grounded
review.

Treat the user text after `/pik-code-review` as the review scope.

## Required Flow

1. From the repository root, run:

   ```bash
   {{PIK_CLI}} workflow run code-review --target . "$ARGUMENTS"
   ```

2. Read the generated review packet and handoff.
3. Inspect the diff and affected source files directly.
4. Check whether behavior claims match specification, QA, minutes, design, API,
   DB, or test documents.
5. Use the code map for impact and dependency checks:

   ```bash
   {{PIK_CLI}} graph status --target .
   {{PIK_CLI}} graph query --target . "<changed symbol or module>"
   ```

6. Lead with findings ordered by severity. Include file and line references.
7. Mention missing tests, missing evidence, stale graph data, or unresolved
   specification ambiguity as review risks.
8. If the review creates durable verification evidence, record it with
   `{{PIK_CLI}} evidence record --target . ... --writeback <active-record>`.
9. Follow `core/workflows/code-review.md` and perform the review inline with AI-PIKit
   gates.

Keep the user-facing workflow name `/pik-code-review`. When suggesting next
commands to the user, suggest `/pik-*` commands, never `/gsd-*` commands.
