# GraphRAG Adapter

GraphRAG is the business and document knowledge adapter.

## Responsibilities

- Index architecture notes, issue records, runbooks, sanitized logs, decision
  records, and business documentation.
- Answer broad business-flow, domain, subsystem-boundary, and historical
  context questions.
- Provide orientation before source verification.

## Common Commands

AI-PIKit facade:

```bash
pik-docs-index --target <repo>
pik-docs-index --target <repo> --run
pik-docs-query --target <repo> --rag "<question>"
```

Adapter command examples:

```bash
graphrag index --root graphrag-workspace --method fast
graphrag query --root graphrag-workspace --method local --response-type "List of 8 concise points" "<question>"
graphrag query --root graphrag-workspace --method global --response-type "List of 8 concise points" "<question>"
```

## Workflow Contract

1. Use local queries for concrete project/business questions.
2. Use global queries for broad system-wide summaries.
3. Use `pik-docs-index` for handoff mode when privacy or model settings need review.
4. Use `pik-docs-index --run` only when direct document RAG execution is approved.
5. Treat broad or surprising claims as hypotheses.
6. Verify with source, SQL, logs, docs, or issue evidence.

## Field Lesson

For day-to-day development, GraphRAG is usually too slow and expensive to call
inside every bug fix. Prefer this pattern:

1. Run GraphRAG during project onboarding, major architecture discovery, or
   after substantial design-document accumulation.
2. Export community reports and architecture summaries into readable Markdown.
3. Teach AGENTS/GSD workflows to read those cached summaries before broad
   architecture or business-flow claims.
4. Keep Graphify as the live code-impact and call-chain tool.

The original field note is preserved at
`docs/field-notes/gsd-graphify-graphrag-sop.md`.

The operational field note from 2026-06-24 is preserved at
`docs/field-notes/graphrag-local-operations-guide.md`. It captures a practical
distinction that should influence future templates:

- `basic`, `local`, and `global` are query methods, not index methods.
- `fast` and `standard` are index methods.
- `local` and `global` need successful graph/community report outputs.
- pure local standard indexing can be too slow for interactive work;
  use fast/basic for lightweight local workflows or run standard indexing
  overnight/on stronger hardware.
- external completion providers can make standard indexing practical, but
  project documents and query context may leave the machine.
