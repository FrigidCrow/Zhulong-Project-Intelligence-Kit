import fs from "node:fs";
import path from "node:path";

const outDir = path.join(process.cwd(), "graphify-out");
fs.mkdirSync(outDir, { recursive: true });

const graph = {
  nodes: [
    { id: "file:src/taskQueue.mjs", kind: "file", label: "taskQueue.mjs" },
    { id: "function:nextRunnable", kind: "function", label: "nextRunnable" },
    { id: "function:completeTask", kind: "function", label: "completeTask" },
    { id: "test:test/taskQueue.test.mjs", kind: "test", label: "task queue tests" }
  ],
  edges: [
    { source: "file:src/taskQueue.mjs", target: "function:nextRunnable", type: "defines" },
    { source: "file:src/taskQueue.mjs", target: "function:completeTask", type: "defines" },
    { source: "test:test/taskQueue.test.mjs", target: "function:nextRunnable", type: "verifies" },
    { source: "test:test/taskQueue.test.mjs", target: "function:completeTask", type: "verifies" }
  ],
  hyperedges: []
};

fs.writeFileSync(path.join(outDir, "graph.json"), `${JSON.stringify(graph, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, "GRAPH_REPORT.md"), `# Non-document Fixture Graph\n\n- Nodes: ${graph.nodes.length}\n- Edges: ${graph.edges.length}\n- Knowledge source: code and tests\n`);
console.log("NON_DOCUMENT_GRAPHIFY_OK");
