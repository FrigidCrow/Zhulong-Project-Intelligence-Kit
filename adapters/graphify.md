# Graphify Adapter

Graphify is the code relationship adapter.

## Responsibilities

- Build machine-queryable code graphs.
- Answer entity, dependency, call-chain, and impact questions.
- Provide graph reports for architecture orientation.
- Refresh graph data when structural relationships change.

## Common Commands

AI-PIKit facade:

```bash
pik-graph-status --target <repo>
pik-graph-query --target <repo> "<entity-or-question>"
pik-graph-build --target <repo>
pik-graph-build --target <repo> --run
pik-graph-diff --target <repo>
```

Adapter command examples:

```bash
graphify query "<entity-or-question>" --budget 3000
graphify path "<source>" "<target>"
graphify explain "<entity>"
graphify update .
```

## Workflow Contract

Before high-risk production edits:

1. Identify the target subsystem and likely entity.
2. Run a focused graph query/path/explain.
3. Verify the result with source search and file reads.
4. Record important findings in the issue/debug/phase artifact.

After structural edits:

1. Run focused tests/build checks.
2. Run `pik-graph-build --run` when direct graph refresh is approved.
3. Run `pik-graph-diff` to inspect structural graph changes.
4. Refresh only the affected subsystem graph when possible.
5. Refresh the root graph only for cross-subsystem or shared-boundary changes.
