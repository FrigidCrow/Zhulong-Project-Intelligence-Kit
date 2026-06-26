# GSD Adapter

GSD is the workflow adapter.

## Responsibilities

- Preserve project memory.
- Turn work into phases, plans, issues, debug records, and verification records.
- Keep execution traceable from evidence to implementation to deployment.

## Canonical Workflow

```text
research -> discuss -> plan -> execute -> verify -> ship -> retrospective
```

## Records

- `.planning/PROJECT.md`: durable project memory.
- `.planning/STATE.md`: current position and next work.
- `.planning/issues/`: issue and feature records.
- `.planning/debug/`: diagnosis sessions.
- `.planning/phases/`: phase context, plans, validation, summaries.
- `.planning/codebase/`: architecture and codebase maps.

