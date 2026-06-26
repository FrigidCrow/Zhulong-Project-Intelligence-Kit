import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  runCommand,
  shellQuote,
  summarizeIssues,
  tempRoot,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const pikCli = path.join(kitRoot, "bin", "pik.mjs");
const workRoot = tempRoot("aipikit-policy-hardening-");
const projectRoot = path.join(workRoot, "project");
const graphLiteRoot = path.join(workRoot, "graph-lite-project");
const issues = [];
const evidence = [];
const commandResults = [];

function write(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function addIssue(command, detail) {
  issues.push({ command, detail });
}

function record(command, result, expectedStatus = 0) {
  commandResults.push({
    command,
    status: result.status,
    expectedStatus,
    stdout: result.stdout.trim().slice(0, 3000),
    stderr: result.stderr.trim().slice(0, 3000),
  });
  if (result.status !== expectedStatus) addIssue(command, `exit ${result.status}, expected ${expectedStatus}`);
  else evidence.push(`${command}: exit ${expectedStatus}`);
  return result;
}

function pik(target, args = [], options = {}) {
  const command = `pik ${args.join(" ")}`;
  return record(command, runCommand(command, "node", [pikCli, ...args], {
    cwd: target,
    timeout: options.timeout || 240000,
    allowFailure: true,
  }), options.expectedStatus ?? 0);
}

function assertIncludes(command, text, expected) {
  if (!text.includes(expected)) addIssue(command, `missing expected text: ${expected}`);
  else evidence.push(`${command}: found ${expected}`);
}

function assertFileIncludes(command, filePath, expected) {
  if (!fs.existsSync(filePath)) {
    addIssue(command, `missing file: ${path.relative(workRoot, filePath)}`);
    return;
  }
  assertIncludes(command, read(filePath), expected);
}

function configPath(target) {
  return path.join(target, ".planning", "config.json");
}

function readConfig(target) {
  return JSON.parse(read(configPath(target)));
}

function writeConfig(target, config) {
  write(configPath(target), `${JSON.stringify(config, null, 2)}\n`);
}

function writeFreshGraph(target, marker = "POLICY_GRAPH") {
  const graphDir = path.join(target, ".planning", "graphs");
  write(path.join(graphDir, "graph.json"), JSON.stringify({
    nodes: [{ id: "src/approval.js", path: "src/approval.js" }],
    edges: [],
  }, null, 2));
  write(path.join(graphDir, "GRAPH_REPORT.md"), `# Graph Report\n\n${marker} src/approval.js\n`);
  const future = new Date(Date.now() + 5000);
  fs.utimesSync(path.join(graphDir, "graph.json"), future, future);
  fs.utimesSync(path.join(graphDir, "GRAPH_REPORT.md"), future, future);
}

function writeFreshRag(target, profile = "full-strict") {
  const knowledgeDir = path.join(target, ".planning", "knowledge");
  write(path.join(knowledgeDir, "RAG_INDEX_RESULT.md"), [
    "# RAG Index Result",
    "",
    "Status: success",
    "Mode: local fixture",
    "",
    "This fixture proves that policy commands can verify local RAG state without running a heavy index.",
    "",
  ].join("\n"));

  const refreshDir = path.join(target, ".planning", "refresh");
  const now = new Date().toISOString();
  write(path.join(refreshDir, "REFRESH_STATE.json"), `${JSON.stringify({
    version: 1,
    generatedAt: now,
    updatedAt: now,
    profile,
    rag: {
      kind: "rag",
      lastRunAt: now,
      lastCommit: null,
      lastShortCommit: null,
      command: "fixture: local RAG index evidence",
      artifact: ".planning/knowledge/RAG_INDEX_RESULT.md",
      corpusHash: "policy-hardening-rag-fixture",
      fileCount: 1,
      sourcePaths: ["docs"],
      note: "Synthetic local fixture; policy commands must not trigger GraphRAG index.",
    },
    graph: {
      kind: "graph",
      lastRunAt: now,
      lastCommit: null,
      lastShortCommit: null,
      command: "fixture: local graph evidence",
      artifact: ".planning/graphs/GRAPH_REPORT.md",
      corpusHash: "policy-hardening-graph-fixture",
      fileCount: 2,
      codePaths: ["src", "test"],
      note: "Synthetic local fixture; policy commands must not trigger Graphify build.",
    },
  }, null, 2)}\n`);
}

function prepareStrictProject() {
  fs.mkdirSync(projectRoot, { recursive: true });
  write(path.join(projectRoot, "src", "approval.js"), "export const policyHardeningLimit = 51000;\n");
  write(path.join(projectRoot, "test", "approval.test.js"), "console.log('POLICY_HARDENING_TEST');\n");
  write(path.join(projectRoot, "docs", "spec.md"), "# Spec\n\nPOLICY_HARDENING_SPEC citation target.\n");
  pik(projectRoot, ["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "policy_hardening_fixture", "--mode", "new", "--force"]);
  pik(projectRoot, ["mode", "set", "--target", projectRoot, "full-strict"]);
  pik(projectRoot, ["codebase", "scan", "--target", projectRoot]);
  pik(projectRoot, ["docs", "scan", "--target", projectRoot]);
  pik(projectRoot, ["docs", "extract", "--target", projectRoot]);
  pik(projectRoot, ["docs", "citations", "--target", projectRoot, "POLICY_HARDENING_SPEC"]);
  writeFreshGraph(projectRoot);
  writeFreshRag(projectRoot, "full-strict");
  pik(projectRoot, ["privacy", "offline-lock", "--target", projectRoot]);
}

function testPolicyLockVerifyDiff() {
  const lock = pik(projectRoot, ["policy", "lock", "--target", projectRoot]);
  assertIncludes("policy lock", lock.output, "policy lock PASS");
  assertIncludes("policy lock no heavy", lock.output, "heavy refresh executed: no");
  assertFileIncludes("POLICY_LOCK hash", path.join(projectRoot, ".planning", "policies", "POLICY_LOCK.json"), "snapshotHash");

  const verify = pik(projectRoot, ["policy", "verify", "--target", projectRoot]);
  assertIncludes("policy verify", verify.output, "policy verify PASS");
  assertIncludes("policy verify no heavy", verify.output, "heavy refresh executed: no");

  const clean = pik(projectRoot, ["policy", "diff", "--target", projectRoot]);
  assertIncludes("policy diff clean", clean.output, "policy diff CLEAN");

  const config = readConfig(projectRoot);
  config.privacy.allow_external_rag = true;
  writeConfig(projectRoot, config);
  const changed = pik(projectRoot, ["policy", "diff", "--target", projectRoot], { expectedStatus: 1 });
  assertIncludes("policy diff changed", changed.output, "policy diff CHANGED");
  assertFileIncludes("POLICY_DIFF field", path.join(projectRoot, ".planning", "policies", "POLICY_DIFF.md"), "privacy.allow_external_rag");
  const unsafe = pik(projectRoot, ["policy", "verify", "--target", projectRoot], { expectedStatus: 1 });
  assertIncludes("policy verify unsafe", unsafe.output, "policy verify FAIL");
  assertIncludes("policy verify unsafe external", unsafe.output, "allow_external_rag");

  config.privacy.allow_external_rag = false;
  writeConfig(projectRoot, config);
}

function testFullStrictStaleAndMissingCitation() {
  pik(projectRoot, ["policy", "verify", "--target", projectRoot]);
  const future = new Date(Date.now() + 10000);
  fs.utimesSync(path.join(projectRoot, "src", "approval.js"), future, future);
  const stale = pik(projectRoot, ["policy", "verify", "--target", projectRoot], { expectedStatus: 1 });
  assertIncludes("full-strict stale", stale.output, "STALE_NEEDS_REFRESH");
  assertIncludes("full-strict stale no heavy", stale.output, "heavy refresh executed: no");

  writeFreshGraph(projectRoot, "POLICY_GRAPH_REFRESHED_MANUAL");
  fs.rmSync(path.join(projectRoot, ".planning", "knowledge", "CITATIONS.md"), { force: true });
  const missingCitation = pik(projectRoot, ["policy", "verify", "--target", projectRoot], { expectedStatus: 1 });
  assertIncludes("full-strict missing citation", missingCitation.output, "evidence.citations");
  assertIncludes("full-strict missing citation fail", missingCitation.output, "FAIL");
}

function prepareGraphLiteProject() {
  fs.mkdirSync(graphLiteRoot, { recursive: true });
  write(path.join(graphLiteRoot, "src", "lite.js"), "export const graphLiteOnly = true;\n");
  pik(graphLiteRoot, ["init", "--target", graphLiteRoot, "--template", "greenfield-app", "--name", "graph_lite_fixture", "--mode", "new", "--force"]);
  pik(graphLiteRoot, ["mode", "set", "--target", graphLiteRoot, "graph-lite"]);
  pik(graphLiteRoot, ["codebase", "scan", "--target", graphLiteRoot]);
  writeFreshGraph(graphLiteRoot, "GRAPH_LITE_GRAPH");
  pik(graphLiteRoot, ["privacy", "offline-lock", "--target", graphLiteRoot]);
}

function testGraphLiteWaiver() {
  const run = pik(graphLiteRoot, ["workflow", "run", "--target", graphLiteRoot, "debug", "GRAPH_LITE no docs"]);
  assertIncludes("graph-lite workflow", run.output, "WAIVED_WITH_RISK");
  pik(graphLiteRoot, ["workflow", "continue", "--target", graphLiteRoot, "--gate", "plan", "--evidence", "graph-lite plan accepted"]);
  pik(graphLiteRoot, ["workflow", "continue", "--target", graphLiteRoot, "--gate", "implementation", "--evidence", "graph-lite implementation accepted"]);
  pik(graphLiteRoot, ["workflow", "continue", "--target", graphLiteRoot, "--gate", "verification", "--evidence", "graph-lite verification accepted"]);
  pik(graphLiteRoot, ["evidence", "record", "--target", graphLiteRoot, "graph-lite evidence", "--command", "manual", "--result", "passed", "--writeback", ".planning/issues/graph-lite.md"]);
  const completion = pik(graphLiteRoot, ["workflow", "completion-check", "--target", graphLiteRoot]);
  assertIncludes("graph-lite completion allowed", completion.output, "completion allowed");
  assertIncludes("graph-lite completion waiver", completion.output, "WAIVED_WITH_RISK");
  assertFileIncludes("graph-lite workflow audit waiver", path.join(graphLiteRoot, ".planning", "workflows", "debug-graph-lite-no-docs", "WORKFLOW_STATE.md"), "WAIVED_WITH_RISK");
}

prepareStrictProject();
testPolicyLockVerifyDiff();
testFullStrictStaleAndMissingCitation();
prepareGraphLiteProject();
testGraphLiteWaiver();

for (const report of [
  path.join(projectRoot, ".planning", "policies", "POLICY_VERIFY.md"),
  path.join(projectRoot, ".planning", "policies", "POLICY_DIFF.md"),
  path.join(graphLiteRoot, ".planning", "workflows", "debug-graph-lite-no-docs", "WORKFLOW_FACADE.md"),
]) {
  assertFileIncludes(`heavy refresh guard ${path.basename(report)}`, report, "Heavy refresh executed: no");
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  graphLiteRoot,
  evidence,
  commandResults,
  issues,
};

writeJsonReport("policy-hardening-check.json", data);
writeMarkdownReport("policy-hardening-check.md", "AI-PIKit Policy Hardening & Guard Contract Verification", summarizeIssues(issues), [
  {
    title: "证据",
    body: evidence.length ? evidence.map((item) => `- ${item}`) : ["未记录证据。"],
  },
  {
    title: "Fixture 路径",
    body: [
      `- Work root: \`${workRoot}\``,
      `- Strict project: \`${projectRoot}\``,
      `- Graph-lite project: \`${graphLiteRoot}\``,
      `- 复现命令: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-policy-hardening.mjs"))}\``,
    ],
  },
  {
    title: "问题",
    body: issues.length ? issues.map((issue) => `- \`${issue.command}\`: ${issue.detail}`) : ["未发现 policy hardening 问题。"],
  },
]);

console.log(`policy hardening check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
