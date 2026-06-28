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
const workRoot = tempRoot("aipikit-workflow-closure-");
const roots = {
  newProject: path.join(workRoot, "new-project"),
  existingProject: path.join(workRoot, "existing-project"),
  graphLite: path.join(workRoot, "graph-lite"),
  fullStrict: path.join(workRoot, "full-strict"),
};
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

function pik(root, args = [], options = {}) {
  const command = `pik ${args.join(" ")}`;
  return record(command, runCommand(command, "node", [pikCli, ...args], {
    cwd: root,
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

function configPath(root) {
  return path.join(root, ".planning", "config.json");
}

function updateConfig(root, mutator) {
  const config = JSON.parse(read(configPath(root)));
  mutator(config);
  write(configPath(root), `${JSON.stringify(config, null, 2)}\n`);
}

function configureFakeGraph(root, marker = "WORKFLOW_CLOSURE_GRAPH") {
  write(path.join(root, ".planning", "fixtures", "fake-graphify.mjs"), [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "const out = path.join(process.cwd(), 'graphify-out');",
    "fs.mkdirSync(out, { recursive: true });",
    "fs.writeFileSync(path.join(out, 'graph.json'), JSON.stringify({ nodes: [{ id: 'src/approval.js', path: 'src/approval.js' }], edges: [] }, null, 2));",
    `fs.writeFileSync(path.join(out, 'GRAPH_REPORT.md'), '# Graph Report\\n\\n${marker} src/approval.js\\n');`,
    "console.log('WORKFLOW_CLOSURE_GRAPHIFY_OK');",
    "",
  ].join("\n"));
  updateConfig(root, (config) => {
    config.code_map = { ...(config.code_map || {}), provider: "graphify", update_command: "node .planning/fixtures/fake-graphify.mjs" };
    config.graphify = { ...(config.graphify || {}), update_command: "node .planning/fixtures/fake-graphify.mjs" };
  });
}

function configureLocalRagFixture(root) {
  updateConfig(root, (config) => {
    config.spec_context = {
      ...(config.spec_context || {}),
      enabled: true,
      provider: "graphrag-local",
      index_command: "node .planning/fixtures/fake-rag-index.mjs",
      query_command: "node .planning/fixtures/fake-rag-query.mjs {query}",
    };
    config.graphrag = {
      ...(config.graphrag || {}),
      enabled: true,
      mode: "local",
      requires_api_key: false,
      api_base: "http://127.0.0.1:11434",
      index_command: config.spec_context.index_command,
      local_query_command: config.spec_context.query_command,
    };
    config.privacy = {
      ...(config.privacy || {}),
      network_policy: "local_only",
      allow_external_rag: false,
      allow_external_tools: false,
      allowed_hosts: ["127.0.0.1", "localhost"],
    };
  });
  write(path.join(root, ".planning", "fixtures", "fake-rag-index.mjs"), [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "const out = path.join(process.cwd(), 'graphrag-workspace', 'output');",
    "fs.mkdirSync(out, { recursive: true });",
    "fs.writeFileSync(path.join(out, 'workflow-closure.txt'), 'WORKFLOW_CLOSURE_RAG_INDEX_OK\\n');",
    "console.log('WORKFLOW_CLOSURE_RAG_INDEX_OK');",
    "",
  ].join("\n"));
  write(path.join(root, ".planning", "fixtures", "fake-rag-query.mjs"), [
    "const query = process.argv.slice(2).join(' ');",
    "console.log(`WORKFLOW_CLOSURE_RAG_QUERY_OK ${query} [docs/spec.md:3]`);",
    "",
  ].join("\n"));
}

function makeGraphFresh(root) {
  for (const file of [".planning/graphs/graph.json", ".planning/graphs/GRAPH_REPORT.md"]) {
    const p = path.join(root, file);
    if (fs.existsSync(p)) {
      const future = new Date(Date.now() + 5000);
      fs.utimesSync(p, future, future);
    }
  }
}

function initProject(root, mode = "new") {
  fs.mkdirSync(root, { recursive: true });
  write(path.join(root, "src", "approval.js"), "export const workflowClosureLimit = 30000;\n");
  write(path.join(root, "test", "approval.test.js"), "console.log('WORKFLOW_CLOSURE_TEST');\n");
  write(path.join(root, "docs", "spec.md"), "# Spec\n\nWORKFLOW_CLOSURE_SPEC 30,000 [docs/spec.md:3]\n");
  pik(root, ["init", "--target", root, "--template", mode === "new" ? "greenfield-app" : "brownfield-monorepo", "--name", `workflow_closure_${mode}`, "--mode", mode, "--force"]);
  pik(root, ["codebase", "scan", "--target", root]);
  pik(root, ["docs", "sync", "--target", root]);
  configureLocalRagFixture(root);
  configureFakeGraph(root);
  pik(root, ["graph", "build", "--target", root, "--run"]);
  makeGraphFresh(root);
  pik(root, ["privacy", "offline-lock", "--target", root]);
}

function completeCurrentWorkflow(root) {
  pik(root, ["workflow", "continue", "--target", root, "--gate", "plan", "--evidence", "plan accepted"]);
  pik(root, ["workflow", "continue", "--target", root, "--gate", "implementation", "--evidence", "implementation done"]);
  pik(root, ["workflow", "continue", "--target", root, "--gate", "verification", "--evidence", "focused test passed"]);
  pik(root, ["evidence", "record", "--target", root, "workflow closure evidence", "--command", "fixture", "--result", "passed", "--writeback", ".planning/issues/workflow-closure.md"]);
  const completion = pik(root, ["workflow", "completion-check", "--target", root]);
  assertIncludes("completion allowed", completion.output, "completion allowed");
}

function scenarioNewProject() {
  initProject(roots.newProject, "new");
  const milestone = pik(roots.newProject, ["workflow", "run", "--target", roots.newProject, "new-milestone", "MVP4.1 first loop"]);
  assertIncludes("new project no heavy refresh", milestone.output, "heavy refresh executed: no");
  completeCurrentWorkflow(roots.newProject);
  assertFileIncludes("new project facade", path.join(roots.newProject, ".planning", "workflows", "new-milestone-mvp4-1-first-loop", "WORKFLOW_FACADE.md"), "Heavy refresh executed: no");
}

function scenarioExistingDocsUpdate() {
  initProject(roots.existingProject, "existing");
  write(path.join(roots.existingProject, "docs", "minutes.md"), "# Minutes\n\nWORKFLOW_CLOSURE_DOC_UPDATE 代理承認 updated [docs/minutes.md:3]\n");
  const sync = pik(roots.existingProject, ["docs", "sync", "--target", roots.existingProject]);
  assertIncludes("existing docs sync stale", sync.output, "STALE_NEEDS_REFRESH");
  assertIncludes("existing docs sync no heavy", sync.output, "heavy refresh executed: no");
  const query = pik(roots.existingProject, ["docs", "query", "--target", roots.existingProject, "WORKFLOW_CLOSURE_DOC_UPDATE"]);
  assertIncludes("existing docs query", query.output, "WORKFLOW_CLOSURE_DOC_UPDATE");
  const audit = pik(roots.existingProject, ["answer", "audit", "--target", roots.existingProject]);
  assertIncludes("existing answer audit", audit.output, "answer audit PASS");
  const debug = pik(roots.existingProject, ["workflow", "run", "--target", roots.existingProject, "debug", "既有项目文档更新后调查"]);
  assertIncludes("existing workflow no heavy", debug.output, "heavy refresh executed: no");
}

function scenarioGraphLiteNoDocs() {
  fs.mkdirSync(roots.graphLite, { recursive: true });
  write(path.join(roots.graphLite, "src", "lite.js"), "export const graphLite = true;\n");
  pik(roots.graphLite, ["init", "--target", roots.graphLite, "--template", "greenfield-app", "--name", "workflow_graph_lite", "--mode", "new", "--force"]);
  pik(roots.graphLite, ["mode", "set", "--target", roots.graphLite, "graph-lite"]);
  pik(roots.graphLite, ["codebase", "scan", "--target", roots.graphLite]);
  configureFakeGraph(roots.graphLite, "GRAPH_LITE_WORKFLOW_GRAPH");
  configureLocalRagFixture(roots.graphLite);
  pik(roots.graphLite, ["graph", "build", "--target", roots.graphLite, "--run"]);
  makeGraphFresh(roots.graphLite);
  pik(roots.graphLite, ["privacy", "offline-lock", "--target", roots.graphLite]);
  const run = pik(roots.graphLite, ["workflow", "run", "--target", roots.graphLite, "debug", "graph lite no docs"]);
  assertIncludes("graph-lite waived", run.output, "WAIVED_WITH_RISK");
  completeCurrentWorkflow(roots.graphLite);
  assertFileIncludes("graph-lite workflow state", path.join(roots.graphLite, ".planning", "workflows", "debug-graph-lite-no-docs", "WORKFLOW_STATE.md"), "WAIVED_WITH_RISK");
}

function scenarioFullStrictBlocking() {
  initProject(roots.fullStrict, "new");
  pik(roots.fullStrict, ["mode", "set", "--target", roots.fullStrict, "full-strict"]);
  const future = new Date(Date.now() + 10000);
  fs.utimesSync(path.join(roots.fullStrict, "src", "approval.js"), future, future);
  const stale = pik(roots.fullStrict, ["workflow", "run", "--target", roots.fullStrict, "execute-phase", "strict stale check"]);
  assertIncludes("full-strict stale", stale.output, "STALE_NEEDS_REFRESH");
  const completion = pik(roots.fullStrict, ["workflow", "completion-check", "--target", roots.fullStrict], { expectedStatus: 1 });
  assertIncludes("full-strict blocked", completion.output, "completion blocked");

  const config = JSON.parse(read(configPath(roots.fullStrict)));
  config.privacy.allow_external_rag = true;
  write(configPath(roots.fullStrict), `${JSON.stringify(config, null, 2)}\n`);
  const privacyFail = pik(roots.fullStrict, ["policy", "verify", "--target", roots.fullStrict], { expectedStatus: 1 });
  assertIncludes("full-strict external provider blocked", privacyFail.output, "policy verify FAIL");
}

scenarioNewProject();
scenarioExistingDocsUpdate();
scenarioGraphLiteNoDocs();
scenarioFullStrictBlocking();

for (const root of Object.values(roots)) {
  if (fs.existsSync(path.join(root, ".planning", "refresh", "REFRESH_RUN.md"))) {
    addIssue(path.basename(root), "Default workflow closure scenario created REFRESH_RUN.md.");
  } else {
    evidence.push(`${path.basename(root)}: no REFRESH_RUN.md from default workflow`);
  }
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  roots,
  evidence,
  commandResults,
  issues,
};

writeJsonReport("workflow-closure-check.json", data);
writeMarkdownReport("workflow-closure-check.md", "AI-PIKit Workflow Closure Verification", summarizeIssues(issues), [
  { title: "场景", body: [
    "- 新项目第一次闭环",
    "- 既有项目 + 文档更新",
    "- graph-lite 无文档 WAIVED_WITH_RISK",
    "- full-strict stale / privacy 阻断",
  ] },
  { title: "证据", body: evidence.length ? evidence.map((item) => `- ${item}`) : ["未记录证据。"] },
  { title: "Fixture 路径", body: [
    `- Work root: \`${workRoot}\``,
    `- 复现命令: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-workflow-closure.mjs"))}\``,
  ] },
  { title: "问题", body: issues.length ? issues.map((issue) => `- \`${issue.command}\`: ${issue.detail}`) : ["未发现 workflow closure 问题。"] },
]);

console.log(`workflow closure check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
