---
state_version: 1.0
project: "{{PROJECT_NAME}}"
status: initialized
current_milestone: null
current_phase: null
last_updated: "{{GENERATED_AT}}"
---

# State: {{PROJECT_NAME}}

## Current Status

Zhulong Project Intelligence Kit has been initialized. No active milestone is selected.

## Knowledge Artifacts

- `.planning/PROJECT.md`
- `.planning/knowledge/`
- `.planning/context/`
- `.planning/codebase/`
- `.planning/evidence/`
- `.planning/issues/`
- `.planning/debug/`
- `.planning/phases/`
- `.planning/graphs/`
- `project.manifest.yml`

## Required Workflow Memory

- Use Zhulong state before debug, planning, execution, or review work.
- Use `.planning/knowledge/` before specification, QA, screen, API, DB, terminology, or customer-intent claims.
- Use graph/code-map context before risky code edits when available.
- Verify findings with source, tests, logs, schemas, or docs.
- Record durable evidence with `zl-evidence-record` after non-trivial work.
- Keep local planning and graph artifacts local-only by default.

## Suggested Next Work

1. Run `zl-map --target {{PROJECT_ROOT}}`.
2. Run `zl-docs-scan --target {{PROJECT_ROOT}}`.
3. Fill `.planning/knowledge/GLOSSARY.md`.
4. Fill `.planning/codebase/STACK.md` and `.planning/codebase/ARCHITECTURE.md`.
5. Configure build/test/lint commands in `project.manifest.yml`.
6. Run `zl-evidence-status --target {{PROJECT_ROOT}}`.
7. Configure Graphify and document RAG adapters if used.
