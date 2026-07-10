import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  readText,
  runCommand,
  shellQuote,
  summarizeIssues,
  tempRoot,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const zlCli = path.join(kitRoot, "bin", "zl.mjs");
const cockpitSampleScript = path.join(kitRoot, "scripts", "render-cockpit-sample.mjs");
const cockpitSampleHtml = path.join(kitRoot, "templates", "cockpit", "sample.html");
const workRoot = tempRoot("zhulong-cockpit-build-");
const issues = [];
const evidence = [];
const results = [];

function write(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function addIssue(caseName, detail) {
  issues.push({ caseName, detail });
}

function assert(condition, caseName, detail) {
  if (!condition) addIssue(caseName, detail);
  else evidence.push(`${caseName}: ${detail}`);
}

function runCockpit(caseName, root) {
  const result = runCommand(
    `${caseName} cockpit build`,
    "node",
    [zlCli, "cockpit", "build", "--target", root],
    { timeout: 30000, allowFailure: true },
  );
  results.push({
    caseName,
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  });
  assert(result.status === 0, caseName, "command exits 0");
  assert(result.output.includes("heavy refresh executed: no"), caseName, "output includes heavy refresh executed: no");
  assert(result.output.includes("output .planning/cockpit/index.html"), caseName, "output path is stable");
  return result;
}

function runCockpitSample() {
  const result = runCommand(
    "template sample render",
    "node",
    [cockpitSampleScript],
    { timeout: 30000, allowFailure: true },
  );
  results.push({
    caseName: "template sample render",
    status: result.status,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  });
  assert(result.status === 0, "template sample render", "sample render exits 0");
  assert(fs.existsSync(cockpitSampleHtml), "template sample render", "templates/cockpit/sample.html generated");
  const html = readText(cockpitSampleHtml);
  assert(!html.includes("__ZHULONG_COCKPIT_DATA__"), "template sample render", "sample placeholder replaced");
  assert(html.includes("sample template data"), "template sample render", "sample page exposes sample mode");
  assert(html.includes("代理承認上限仕様"), "template sample render", "sample page contains fake Japanese project data");
  assert(html.includes("graph-search"), "template sample render", "sample includes interactive graph search");
  assert(html.includes("approval-flow"), "template sample render", "sample includes stable graph legend data");
  assert(html.includes("cockpit-viewmodel.v1"), "template sample render", "sample includes stable viewModel v1");
  assert(html.includes("Quality &amp; Token Metrics"), "template sample render", "sample includes quality and token metrics panel");
  assert(!/https?:\/\//i.test(html), "template sample render", "sample page contains no external URL");
}

function graphJson() {
  return JSON.stringify({
    nodes: [
      { id: "src/approval.js", kind: "module" },
      { id: "src/policy.js", kind: "module" },
      { id: "tests/approval.test.js", kind: "test" },
      { id: "docs/spec.md", kind: "doc" },
    ],
    edges: [
      { source: "tests/approval.test.js", target: "src/approval.js", type: "tests" },
      { source: "src/approval.js", target: "src/policy.js", type: "imports" },
      { source: "docs/spec.md", target: "src/approval.js", type: "specifies" },
    ],
  }, null, 2);
}

function largeGraphJson() {
  const nodes = Array.from({ length: 96 }, (_, index) => ({
    id: `src/module-${index}.ts`,
    kind: index % 5 === 0 ? "doc" : index % 3 === 0 ? "service" : "module",
    community: index % 6,
    label: `module-${index}`,
  }));
  const edges = Array.from({ length: 160 }, (_, index) => ({
    source: `src/module-${index % nodes.length}.ts`,
    target: `src/module-${(index * 7 + 3) % nodes.length}.ts`,
    relation: index % 4 === 0 ? "calls" : "relates",
    confidence: index % 5 === 0 ? "INFERRED" : "EXTRACTED",
  })).filter((edge) => edge.source !== edge.target);
  return JSON.stringify({ nodes, edges }, null, 2);
}

function seedBase(root) {
  write(path.join(root, "src", "approval.js"), "export const cockpitApprovalLimit = 30000;\n");
  write(path.join(root, ".planning", "graphs", "graph.json"), `${graphJson()}\n`);
  write(path.join(root, "graphify-out", "graph.json"), `${graphJson()}\n`);
  write(path.join(root, ".planning", "graphs", "GRAPH_REPORT.md"), "# Graph Report\n\nCOCKPIT_GRAPH_NODE approval\n");
  write(path.join(root, ".planning", "graphs", "GRAPH_IMPACT.md"), "# Graph Impact\n\n- Impacted nodes: 4\n");
  write(path.join(root, ".planning", "graphs", "GRAPH_RISK.md"), "# Graph Risk\n\n- High coupling: src/approval.js\n");
  write(path.join(root, ".planning", "graphs", "GRAPH_FRESHNESS.md"), "# Graph Freshness\n\n- State: fresh\n");
  write(path.join(root, ".planning", "privacy", "OFFLINE_LOCK.json"), JSON.stringify({ enabled: true, local_only: true }, null, 2));
  write(path.join(root, ".planning", "policies", "POLICY_VERIFY.json"), JSON.stringify({ status: "PASS", checks: [] }, null, 2));
  write(path.join(root, ".planning", "evidence", "INDEX.md"), "# Evidence Index\n\n- COCKPIT evidence\n");
  write(path.join(root, ".planning", "workflows", "cockpit-demo", "WORKFLOW_STATE.json"), JSON.stringify({
    id: "cockpit-demo",
    workflow: "debug",
    status: "running",
  }, null, 2));
  write(path.join(root, "verification", "reports", "quality-closure-check.json"), JSON.stringify({ status: "PASS" }, null, 2));
  write(path.join(root, "verification", "reports", "skills-usability-check.json"), JSON.stringify({ status: "PASS", expectedRenderedItems: 33 }, null, 2));
  write(path.join(root, "verification", "reports", "workflow-closure-check.json"), JSON.stringify({ status: "PASS" }, null, 2));
  write(path.join(root, "verification", "reports", "docs-completeness-check.json"), JSON.stringify({ status: "PASS", commandsChecked: ["zl-cockpit-build"] }, null, 2));
  write(path.join(root, "verification", "reports", "full-command-surface-check.json"), JSON.stringify({ status: "PASS", commandsCovered: ["zl-cockpit-build"] }, null, 2));
  const future = new Date(Date.now() + 5000);
  fs.utimesSync(path.join(root, ".planning", "graphs", "graph.json"), future, future);
  fs.utimesSync(path.join(root, "graphify-out", "graph.json"), future, future);
}

function seedRag(root) {
  write(path.join(root, ".planning", "knowledge", "DOCS_SYNC.md"), "# Docs Sync\n\n- Status: PASS\n- Heavy refresh executed: no\n");
  write(path.join(root, ".planning", "knowledge", "DOCS_SYNC.json"), JSON.stringify({ status: "PASS", heavyRefreshExecuted: false }, null, 2));
  write(path.join(root, ".planning", "knowledge", "RAG_INDEX_RESULT.md"), "# RAG Index Result\n\n- Status: success\n");
  write(path.join(root, ".planning", "knowledge", "RAG_QUERY_RESULT.md"), "# RAG Query Result\n\n- Status: success\n\nAnswer with [docs/spec.md]\n");
  write(path.join(root, ".planning", "knowledge", "DOCS_QUERY_RESULT.md"), "# Docs Query Result\n\n- docs/spec.md: approval limit\n");
  write(path.join(root, ".planning", "quality", "ANSWER_AUDIT.md"), "# Answer Audit\n\n- Status: PASS\n");
  write(path.join(root, ".planning", "quality", "ANSWER_AUDIT.json"), JSON.stringify({
    status: "PASS",
    metrics: { citation_resolve_rate: 1, value_drift_count: 0, unsupported_sentence_ratio: 0 },
  }, null, 2));
  write(path.join(root, ".planning", "quality", "AMBIGUITY_AUDIT.json"), JSON.stringify({ status: "PASS", ambiguity_hits: 0, ambiguity_density: 0, records: [] }, null, 2));
  write(path.join(root, ".planning", "quality", "STRUCTURE_AUDIT.json"), JSON.stringify({ status: "PASS", structure_compliance_rate: 1, records: [] }, null, 2));
  write(path.join(root, ".planning", "metrics", "TOKEN_USAGE.json"), JSON.stringify({ input_tokens: 1200, output_tokens: 300, cache_read_tokens: 800 }, null, 2));
  write(path.join(root, ".planning", "quality", "CITATION_AUDIT.md"), "# Citation Audit\n\n- Status: PASS\n");
  write(path.join(root, ".planning", "quality", "CITATION_AUDIT.json"), JSON.stringify({ status: "PASS" }, null, 2));
}

function assertCommonArtifacts(caseName, root) {
  const indexPath = path.join(root, ".planning", "cockpit", "index.html");
  const dataPath = path.join(root, ".planning", "cockpit", "cockpit-data.json");
  const reportPath = path.join(root, ".planning", "cockpit", "COCKPIT_REPORT.md");
  assert(fs.existsSync(indexPath), caseName, "index.html generated");
  assert(fs.existsSync(dataPath), caseName, "cockpit-data.json generated");
  assert(fs.existsSync(reportPath), caseName, "COCKPIT_REPORT.md generated");
  const html = readText(indexPath);
  assert(!/https?:\/\//i.test(html), caseName, "index.html contains no http/https URL");
  assert(html.includes("templates/cockpit/index.template.html"), caseName, "index.html was rendered from cockpit template");
  assert(!html.includes("__ZHULONG_COCKPIT_DATA__"), caseName, "index.html has no unreplaced template placeholder");
  const data = readJson(dataPath);
  for (const key of ["graphify", "rag", "workflow", "quality", "privacy"]) {
    assert(Object.prototype.hasOwnProperty.call(data, key), caseName, `cockpit-data.json includes ${key}`);
  }
  assert(data.template?.mode === "live", caseName, "cockpit-data.json records live template mode");
  assert(Array.isArray(data.nextCommands), caseName, "cockpit-data.json includes nextCommands");
  assert(data.viewModel?.version === "cockpit-viewmodel.v1", caseName, "cockpit-data.json includes stable viewModel v1");
  assert(data.viewModel?.impactGraph?.available !== undefined, caseName, "viewModel includes impactGraph");
  assert(Array.isArray(data.viewModel?.artifactGroups), caseName, "viewModel includes artifact groups");
  assert(Array.isArray(data.viewModel?.qualityMetrics), caseName, "viewModel includes quality metrics");
  assert(Object.prototype.hasOwnProperty.call(data.quality?.metrics || {}, "citationResolveRate"), caseName, "quality metrics include citation resolve rate slot");
  assert(typeof data.quality?.metrics?.tokenUsage?.available === "boolean", caseName, "quality metrics include optional token usage slot");
  return { html, data };
}

runCockpitSample();

const safeRoot = path.join(workRoot, "safe-graphify-html");
seedBase(safeRoot);
seedRag(safeRoot);
write(path.join(safeRoot, "graphify-out", "index.html"), "<!doctype html><html><body><h1>Graphify Local View</h1></body></html>\n");
const safeRun = runCockpit("safe graphify html", safeRoot);
assert(safeRun.output.includes("cockpit build PASS"), "safe graphify html", "fully populated fixture returns PASS");
const safe = assertCommonArtifacts("safe graphify html", safeRoot);
assert(safe.data.quality.metrics.citationResolveRate === 1, "safe graphify html", "quality metrics read citation resolve rate");
assert(safe.data.quality.metrics.tokenUsage.available === true, "safe graphify html", "quality metrics read optional token usage");
assert(fs.existsSync(path.join(safeRoot, ".planning", "cockpit", "assets", "graphify", "index.html")), "safe graphify html", "safe Graphify HTML copied");
assert(safe.html.includes("Knowledge Evidence Chain"), "safe graphify html", "Knowledge Evidence panel rendered");
assert(safe.data.graphify.html.copied.length === 1, "safe graphify html", "data records copied Graphify HTML");

const unsafeRoot = path.join(workRoot, "unsafe-graphify-html");
seedBase(unsafeRoot);
seedRag(unsafeRoot);
write(path.join(unsafeRoot, "graphify-out", "bad.html"), "<!doctype html><script src=\"https://cdn.example.test/graph.js\"></script>\n");
const unsafeRun = runCockpit("unsafe graphify html", unsafeRoot);
assert(unsafeRun.output.includes("cockpit build WARN"), "unsafe graphify html", "unsafe Graphify HTML returns WARN");
const unsafe = assertCommonArtifacts("unsafe graphify html", unsafeRoot);
assert(!fs.existsSync(path.join(unsafeRoot, ".planning", "cockpit", "assets", "graphify", "bad.html")), "unsafe graphify html", "unsafe Graphify HTML not copied");
assert(unsafe.data.graphify.html.blocked.length === 1, "unsafe graphify html", "data records blocked Graphify HTML");

const noRagRoot = path.join(workRoot, "no-rag");
seedBase(noRagRoot);
const noRagRun = runCockpit("no rag fixture", noRagRoot);
assert(noRagRun.output.includes("cockpit build WARN"), "no rag fixture", "missing RAG returns WARN");
const noRag = assertCommonArtifacts("no rag fixture", noRagRoot);
assert(noRag.html.includes("WAIVED_WITH_RISK"), "no rag fixture", "page renders WAIVED_WITH_RISK for missing RAG");
assert(noRag.data.rag.status === "WAIVED_WITH_RISK", "no rag fixture", "data records RAG WAIVED_WITH_RISK");
assert(noRag.data.graphify.preview.available === true, "no rag fixture", "fallback graph renders from graph.json");

const largeGraphRoot = path.join(workRoot, "large-graph");
seedBase(largeGraphRoot);
seedRag(largeGraphRoot);
write(path.join(largeGraphRoot, ".planning", "graphs", "graph.json"), `${largeGraphJson()}\n`);
write(path.join(largeGraphRoot, "graphify-out", "graph.json"), `${largeGraphJson()}\n`);
const largeRun = runCockpit("large graph aggregated view", largeGraphRoot);
assert(largeRun.output.includes("cockpit build PASS"), "large graph aggregated view", "large graph fixture returns PASS");
const large = assertCommonArtifacts("large graph aggregated view", largeGraphRoot);
assert(large.data.viewModel.impactGraph.mode === "aggregated-community", "large graph aggregated view", "large graph uses aggregated-community mode");
assert(large.data.viewModel.impactGraph.nodes.length <= 28, "large graph aggregated view", "aggregated view caps preview nodes");
assert(large.html.includes("graph-search"), "large graph aggregated view", "live cockpit includes graph search control");

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  results,
  evidence,
  issues,
};

writeJsonReport("cockpit-build-check.json", data);
writeMarkdownReport("cockpit-build-check.md", "Zhulong Cockpit Build Verification", summarizeIssues(issues), [
  {
    title: "覆盖场景",
    body: [
      "- Standalone cockpit template sample renders from `templates/cockpit/sample-data.json`.",
      "- Stable `cockpit-viewmodel.v1` is written and consumed by the viewer.",
      "- Safe Graphify HTML is copied into `.planning/cockpit/assets/graphify/`.",
      "- Unsafe Graphify HTML with external URL/CDN is blocked and reported as WARN.",
      "- Missing RAG evidence renders `WAIVED_WITH_RISK` without failing the build.",
      "- Large Graphify graphs switch to an aggregated community preview.",
      "- `cockpit-data.json` includes graphify, rag, workflow, quality, and privacy.",
      "- No fixture invokes GraphRAG index or Graphify build.",
    ],
  },
  {
    title: "运行结果",
    body: results.flatMap((result) => [
      `- ${result.caseName}: exit ${result.status}`,
      "```text",
      result.stdout || result.stderr,
      "```",
    ]),
  },
  {
    title: "问题",
    body: issues.length ? issues.map((issue) => `- ${issue.caseName}: ${issue.detail}`) : ["未发现 cockpit build 问题。"],
  },
  {
    title: "复现",
    body: [`- \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-cockpit-build.mjs"))}\``],
  },
]);

console.log(`cockpit build check ${data.status} cases=${results.length} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
