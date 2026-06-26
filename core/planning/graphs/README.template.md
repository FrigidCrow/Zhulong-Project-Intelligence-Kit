# Graph Records

Use this directory for graph cache pointers, graph freshness notes, and
workflow-facing graph summaries.

Generated graph data can be large. Keep it local by default.

## AI-PIKit Commands

Use these public commands when working with code-map evidence:

```bash
pik-graph-status --target <repo>
pik-graph-query --target <repo> "<entity or keywords>"
pik-graph-build --target <repo>
pik-graph-build --target <repo> --run
pik-graph-diff --target <repo>
```

`pik-graph-status` reports available graph artifacts and a simple freshness
warning. `pik-graph-query` searches local graph reports and graph JSON nodes.
`pik-graph-build` writes `GRAPH_BUILD_HANDOFF.md` for the current code-map
backend. `pik-graph-build --run` executes the configured Graphify update command
and syncs `graphify-out/` into `.planning/graphs/`. `pik-graph-diff` compares
the current graph with `.planning/graphs/graph.baseline.json`.

Graphify is the default backend, but it is not the permanent public interface.
