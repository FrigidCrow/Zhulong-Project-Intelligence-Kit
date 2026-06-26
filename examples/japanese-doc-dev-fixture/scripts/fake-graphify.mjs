import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const policyPath = path.join(root, "src", "approvalPolicy.js");
const servicePath = path.join(root, "src", "approvalService.js");
const policyText = fs.readFileSync(policyPath, "utf8");
const proxyLimit = policyText.match(/PROXY_APPROVAL_LIMIT\s*=\s*(\d+)/)?.[1] || "unknown";
const autoLimit = policyText.match(/AUTO_APPROVAL_LIMIT\s*=\s*(\d+)/)?.[1] || "unknown";

const outDir = path.join(root, "graphify-out");
fs.mkdirSync(outDir, { recursive: true });

const proxyLimitNode = `const:PROXY_APPROVAL_LIMIT:${proxyLimit}`;
const autoLimitNode = `const:AUTO_APPROVAL_LIMIT:${autoLimit}`;
const graph = {
  nodes: [
    { id: "file:src/approvalPolicy.js", kind: "file", label: "approvalPolicy.js" },
    { id: "file:src/approvalService.js", kind: "file", label: "approvalService.js" },
    { id: "test:tests/current.test.js", kind: "test", label: "current approval regression tests" },
    { id: "test:tests/cr017_proxy_limit.test.js", kind: "test", label: "CR-017 proxy limit acceptance tests" },
    { id: "function:evaluateApproval", kind: "function", label: "evaluateApproval" },
    { id: "function:submitApprovalRequest", kind: "function", label: "submitApprovalRequest" },
    { id: autoLimitNode, kind: "constant", label: `AUTO_APPROVAL_LIMIT=${autoLimit}` },
    { id: proxyLimitNode, kind: "constant", label: `PROXY_APPROVAL_LIMIT=${proxyLimit}` },
    { id: "req:CR-017", kind: "requirement", label: "代理承認上限金額を30,000円へ変更" }
  ],
  edges: [
    { source: "file:src/approvalService.js", target: "file:src/approvalPolicy.js", type: "imports" },
    { source: "file:src/approvalPolicy.js", target: "function:evaluateApproval", type: "defines" },
    { source: "file:src/approvalService.js", target: "function:submitApprovalRequest", type: "defines" },
    { source: "function:submitApprovalRequest", target: "function:evaluateApproval", type: "calls" },
    { source: "function:evaluateApproval", target: autoLimitNode, type: "uses" },
    { source: "function:evaluateApproval", target: proxyLimitNode, type: "uses" },
    { source: "req:CR-017", target: proxyLimitNode, type: "governs" },
    { source: "test:tests/cr017_proxy_limit.test.js", target: "req:CR-017", type: "verifies" }
  ],
  hyperedges: []
};

fs.writeFileSync(path.join(outDir, "graph.json"), `${JSON.stringify(graph, null, 2)}\n`);

const report = `# Fixture Graphify Report

Generated: ${new Date().toISOString()}

## Summary

- Nodes: ${graph.nodes.length}
- Edges: ${graph.edges.length}
- Current AUTO_APPROVAL_LIMIT: ${autoLimit}
- Current PROXY_APPROVAL_LIMIT: ${proxyLimit}

## Impact Surface

- CR-017 impacts \`src/approvalPolicy.js\`, especially \`PROXY_APPROVAL_LIMIT\` and \`evaluateApproval\`.
- \`src/approvalService.js\` calls \`evaluateApproval\` through \`submitApprovalRequest\`.
- \`tests/cr017_proxy_limit.test.js\` is the focused acceptance test for the Japanese QA decision.

## Requirement Links

- Requirement: CR-017 代理承認上限金額を30,000円へ変更
- Spec evidence: \`docs/qa/QA-042_代理承認上限.md\`
- Minutes evidence: \`docs/minutes/2026-06-18_承認仕様定例.md\`
`;

fs.writeFileSync(path.join(outDir, "GRAPH_REPORT.md"), report);
console.log(`Fixture Graphify wrote graphify-out with PROXY_APPROVAL_LIMIT=${proxyLimit}`);
