---
name: pik-debug
description: AI-PIKit systematic debugging workflow with spec evidence, code-map impact, verification, and evidence writeback.
---

# AI-PIKit Debug

Use this when the user invokes `/pik-debug` or asks to debug through Project
Intelligence Kit.

Treat the user text after `/pik-debug` as the request.

## Required Flow

1. From the repository root, run:

   ```bash
   {{PIK_CLI}} workflow run debug --target . "$ARGUMENTS"
   ```

2. Read the generated `.planning/context/*debug*.md` packet and handoff.
3. Check specification evidence before making business-rule claims:
   - `.planning/knowledge/`
   - source docs such as `docs/`, `documents/`, or `仕様書/`
   - `{{PIK_CLI}} docs query --target . "<keywords>"` when local normalized docs exist
4. Check code-map evidence before risky edits:
   - `{{PIK_CLI}} graph status --target .`
   - `{{PIK_CLI}} graph query --target . "<entry point or symbol>"`
5. Follow `core/workflows/debug.md` and execute the debugging workflow inline
   using the same packet and verification gates.
6. After verification, record durable evidence:

   ```bash
   {{PIK_CLI}} evidence record --target . "<summary>" --command "<verification command>" --result "<result>" --writeback <active-record>
   ```

Keep the user-facing workflow name `/pik-debug`; mention GSD only as reference
design when needed. When suggesting next commands to the user, suggest
`/pik-*` commands, never `/gsd-*` commands.
