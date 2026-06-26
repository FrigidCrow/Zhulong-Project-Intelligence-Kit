# Brownfield Monorepo Template

Use this template for inherited systems with multiple services, frontends,
database schemas, and unclear historical context.

## Default Bias

- Diagnose before editing.
- Prefer small reversible changes.
- Use graph impact analysis before modifying high-degree modules.
- Record issue/debug evidence locally.
- Treat architecture docs and graph output as orientation until source-verified.

## Recommended First Pass

1. Identify subsystems and entry points.
2. Generate or import per-subsystem Graphify outputs.
3. Build a GraphRAG workspace from architecture docs, issue records, runbooks,
   and sanitized project notes.
4. Write `.planning/codebase/ARCHITECTURE.md`.
5. Add one issue record and run the full workflow end to end.

