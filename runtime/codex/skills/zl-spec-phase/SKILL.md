---
name: zl-spec-phase
description: Zhulong native specification clarification workflow for Codex with local documents, approved RAG, traceability, and open-question handling.
---

# Zhulong Spec Phase

Treat all user text after `$zl-spec-phase` as `ZL_ARGS`.

## Required Flow

1. Run `{{ZL_CLI}} workflow run spec-phase --target "$PWD" "<ZL_ARGS>"`.
2. Read the generated context packet and handoff under `.planning/context/`.
3. Follow `core/workflows/spec-phase.md`.
4. Use local document search before business-rule claims. Use
   `zl-docs-query --rag` only when the configured RAG backend is approved.
5. Update requirement trace or the active phase with confirmed facts,
   assumptions, contradictions, citations, and open questions.
6. Suggest only `zl-*` commands to the user.

GSD is reference design only. Do not ask the user to invoke `$gsd-*` directly.
