# Graph Records

Use this directory for graph cache pointers, graph freshness notes, and
workflow-facing graph summaries.

Generated graph data can be large. Keep it local by default.

## Zhulong Commands

Use these public commands when working with code-map evidence:

```bash
zl-graph-status --target <repo>
zl-graph-query --target <repo> "<entity or keywords>"
zl-graph-build --target <repo>
zl-graph-build --target <repo> --run
zl-graph-diff --target <repo>
```

`zl-graph-status` reports available graph artifacts and a simple freshness
warning. `zl-graph-query` searches local graph reports and graph JSON nodes.
`zl-graph-build` writes `GRAPH_BUILD_HANDOFF.md` for the current code-map
backend. `zl-graph-build --run` executes the configured Graphify update command
and syncs `graphify-out/` into `.planning/graphs/`. `zl-graph-diff` compares
the current graph with `.planning/graphs/graph.baseline.json`.

Graphify is the default backend, but it is not the permanent public interface.
