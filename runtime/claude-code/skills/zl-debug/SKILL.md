---
name: zl-debug
description: Zhulong systematic debugging workflow with spec evidence, code-map impact, verification, and evidence writeback.
---

# Zhulong Debug

Use this when the user invokes `/zl-debug` or asks to debug through Project
Intelligence Kit.

Treat the user text after `/zl-debug` as the request.

## Required Flow

1. From the repository root, run:

   ```bash
   {{ZL_CLI}} workflow run debug --target . "$ARGUMENTS"
   ```

   If the current user message explicitly requests a fix, implementation,
   patch, or repair, append `--intent fix`; otherwise keep diagnose-only.

2. Read the generated `.planning/context/*debug*.md` packet and handoff.
3. Establish expected behavior from the request, active records, source, and
   tests. Query `.planning/knowledge/` or local documents only when relevant
   sources exist. Use RAG only when `rag_backend` is not `none` and approved.
4. Check code-map evidence before risky edits:
   - `{{ZL_CLI}} graph status --target .`
   - `{{ZL_CLI}} graph query --target . "<entry point or symbol>"`
5. Follow `core/workflows/debug.md` and execute the debugging workflow inline
   using the same packet and verification gates.
6. Default to diagnose-only. Implement only when the user explicitly asks for
   a fix or a matching bounded-autonomy Goal permits `debug_fix`.
7. After verification, record durable evidence:

   ```bash
   {{ZL_CLI}} evidence record --target . "<summary>" --command "<verification command>" --result "<result>" --writeback <active-record>
   ```

Keep the user-facing workflow name `/zl-debug`; mention GSD only as reference
design when needed. When suggesting next commands to the user, suggest
`/zl-*` commands, never `/gsd-*` commands.
