# Source Search Adapter

Source search is the proof adapter.

## Responsibilities

- Verify graph and RAG findings against real files.
- Locate exact definitions, references, routes, SQL, configs, and tests.
- Keep claims grounded in source.

## Preferred Commands

```bash
rg "<pattern>"
rg --files
git status --short
git diff -- <path>
```

Use structured parsers or language-aware tools when the project provides them.

