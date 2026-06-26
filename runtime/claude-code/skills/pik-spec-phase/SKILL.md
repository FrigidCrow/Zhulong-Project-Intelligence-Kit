---
name: pik-spec-phase
description: AI-PIKit native specification clarification workflow for Claude Code.
---

# AI-PIKit Spec Phase

Use this when the user invokes `/pik-spec-phase`.

1. Run `{{PIK_CLI}} workflow run spec-phase --target . "$ARGUMENTS"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/spec-phase.md`.
4. Query local documents and approved RAG before business-rule claims.
5. Write confirmed facts, assumptions, contradictions, citations, and open
   questions to the active record.
6. Suggest only `/pik-*` commands.

GSD is reference design only; do not route the user to `/gsd-*`.
