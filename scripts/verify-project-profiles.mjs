import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  portableText,
  runCommand,
  summarizeIssues,
  tempRoot,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const zlCli = path.join(kitRoot, "bin", "zl.mjs");
const workRoot = tempRoot("zhulong-project-profiles-");
const issues = [];
const evidence = [];
const commandResults = [];

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function write(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function copyFixture(relativeSource, name) {
  const source = path.join(kitRoot, relativeSource);
  const target = path.join(workRoot, name);
  fs.cpSync(source, target, {
    recursive: true,
    filter: (entry) => !entry.includes(`${path.sep}node_modules${path.sep}`),
  });
  return target;
}

function record(label, result, expectedStatus = 0) {
  commandResults.push({
    label,
    status: result.status,
    expectedStatus,
    output: portableText(result.output.trim().slice(0, 4000)),
  });
  if (result.status === expectedStatus) evidence.push(`${label}: exit ${expectedStatus}`);
  else issues.push({ label, detail: `exit ${result.status}, expected ${expectedStatus}` });
  return result;
}

function run(root, label, command, args = [], expectedStatus = 0) {
  return record(label, runCommand(label, command, args, {
    cwd: root,
    timeout: 240000,
    allowFailure: true,
  }), expectedStatus);
}

function zl(root, label, args = [], expectedStatus = 0) {
  return run(root, label, "node", [zlCli, ...args], expectedStatus);
}

function assert(label, condition, detail) {
  if (condition) evidence.push(`${label}: ${detail}`);
  else issues.push({ label, detail });
}

function assertIncludes(label, text, expected) {
  assert(label, text.includes(expected), `expected text: ${expected}`);
}

function assertExcludes(label, text, forbidden) {
  assert(label, !text.includes(forbidden), `forbidden text absent: ${forbidden}`);
}

function configureGraph(root, updateCommand) {
  const configPath = path.join(root, ".planning", "config.json");
  const config = JSON.parse(read(configPath));
  config.code_map = {
    ...(config.code_map || {}),
    provider: "fixture-graphify",
    enabled: true,
    update_command: updateCommand,
  };
  config.graphify = {
    ...(config.graphify || {}),
    enabled: true,
    update_command: updateCommand,
  };
  writeJson(configPath, config);
}

function makeGraphFresh(root) {
  const future = new Date(Date.now() + 5000);
  for (const relative of [".planning/graphs/graph.json", ".planning/graphs/GRAPH_REPORT.md"]) {
    const filePath = path.join(root, relative);
    if (fs.existsSync(filePath)) fs.utimesSync(filePath, future, future);
  }
}

function completeCoreWorkflow(root, profileName) {
  const request = `${profileName} project profile`;
  const started = zl(root, `${profileName} workflow start`, ["workflow", "run", "--target", root, "new-milestone", request]);
  assertIncludes(`${profileName} no hidden refresh`, started.output, "heavy refresh executed: no");
  const active = JSON.parse(read(path.join(root, ".planning", "workflows", "ACTIVE.json")));
  const planPath = path.join(root, ".planning", "workflows", active.id, "PLAN.md");
  write(planPath, `# Plan: ${active.id}\n\nStatus: complete\n\nEvidence:\n\n- profile fixture planned\n`);
  zl(root, `${profileName} gate plan`, ["workflow", "continue", "--target", root, "--gate", "plan", "--evidence", path.relative(root, planPath)]);
  zl(root, `${profileName} evidence`, [
    "evidence", "record", "--target", root,
    `${profileName} project profile verified`,
    "--command", "npm test",
    "--result", "passed",
    "--writeback", ".planning/issues/project-profile.md",
  ]);
  zl(root, `${profileName} acceptance`, ["workflow", "accept", "--target", root, "--source", "user-message", "--request", "profile fixture accepted"]);
  const completion = zl(root, `${profileName} completion`, ["workflow", "completion-check", "--target", root]);
  assertIncludes(`${profileName} completion eligible`, completion.output, "completion eligible");
  return completion;
}

function verifyNonDocumentProfile() {
  const root = copyFixture("examples/non-document-project-fixture", "non-document-project");
  run(root, "non-document unit tests", "npm", ["test"]);
  const init = zl(root, "non-document init", [
    "init", "--target", root,
    "--template", "brownfield-monorepo",
    "--name", "non_document_project",
    "--mode", "existing",
    "--doc-policy", "reference",
    "--rag", "none",
    "--force",
  ]);
  assertIncludes("non-document policy output", init.output, "Document policy: reference");
  assertIncludes("non-document RAG output", init.output, "RAG backend: none");

  const configPath = path.join(root, ".planning", "config.json");
  let config = JSON.parse(read(configPath));
  assert("non-document config policy", config.document_policy === "reference", "document_policy is reference");
  assert("non-document config RAG", config.rag_backend === "none", "rag_backend is none");
  assert("non-document GraphRAG disabled", config.graphrag?.enabled === false, "graphrag.enabled is false");
  assert("non-document spec context disabled", config.spec_context?.enabled === false, "spec_context.enabled is false");

  zl(root, "non-document codebase", ["codebase", "scan", "--target", root]);
  configureGraph(root, "node scripts/fake-graphify.mjs");
  zl(root, "non-document graph", ["graph", "build", "--target", root, "--run"]);
  makeGraphFresh(root);
  zl(root, "non-document offline lock", ["privacy", "offline-lock", "--target", root]);
  completeCoreWorkflow(root, "non-document");

  const next = zl(root, "non-document next", ["next", "--target", root]);
  for (const forbidden of ["zl-rag", "docs-index", "--rag", "graphrag"]) {
    assertExcludes("non-document next", next.output.toLowerCase(), forbidden);
  }
  const help = zl(root, "non-document help", ["help", "skills", "--target", root, "修复任务队列代码并验证测试"]);
  assertExcludes("non-document help", help.output.toLowerCase(), "zl-rag-init-local");

  config = JSON.parse(read(configPath));
  assert("non-document RAG remains disabled", config.rag_backend === "none" && config.graphrag?.enabled === false, "RAG state unchanged after workflow");
  assert("non-document no RAG workspace", !fs.existsSync(path.join(root, "graphrag-workspace")), "graphrag-workspace is absent");
  assert("non-document no RAG setup plan", !fs.existsSync(path.join(root, ".planning", "knowledge", "LOCAL_RAG_SETUP_PLAN.md")), "LOCAL_RAG_SETUP_PLAN.md is absent");
  assert("non-document no hidden refresh ledger", !fs.existsSync(path.join(root, ".planning", "refresh", "REFRESH_RUN.md")), "REFRESH_RUN.md is absent");
  return root;
}

function verifyDocumentHeavyProfile() {
  const root = copyFixture("examples/japanese-doc-dev-fixture", "document-heavy-project");
  run(root, "document-heavy unit tests", "npm", ["test"]);
  const init = zl(root, "document-heavy init", [
    "init", "--target", root,
    "--template", "brownfield-monorepo",
    "--name", "document_heavy_project",
    "--mode", "existing",
    "--doc-policy", "strict",
    "--rag", "local",
    "--setup-rag", "skip",
    "--force",
  ]);
  assertIncludes("document-heavy policy output", init.output, "Document policy: strict");
  assertIncludes("document-heavy RAG output", init.output, "RAG backend: local");

  const configPath = path.join(root, ".planning", "config.json");
  const config = JSON.parse(read(configPath));
  const fixtureConfig = JSON.parse(read(path.join(root, "zl.fixture.config.json")));
  config.spec_context = { ...config.spec_context, ...fixtureConfig.spec_context, enabled: true, require_citations: true };
  config.graphrag = { ...config.graphrag, ...fixtureConfig.graphrag, enabled: true, mode: "local" };
  config.code_map = { ...config.code_map, ...fixtureConfig.code_map };
  config.graphify = { ...config.graphify, ...fixtureConfig.graphify };
  config.privacy = { ...config.privacy, ...fixtureConfig.privacy, network_policy: "local_only", allow_external_rag: false };
  writeJson(configPath, config);

  zl(root, "document-heavy codebase", ["codebase", "scan", "--target", root]);
  const sync = zl(root, "document-heavy docs sync", ["docs", "sync", "--target", root]);
  assertIncludes("document-heavy docs discovered", sync.output, "docs sync");
  zl(root, "document-heavy RAG index", ["docs", "index", "--target", root, "--run"]);
  const query = zl(root, "document-heavy RAG query", ["docs", "query", "--target", root, "--rag", "代理承認の上限金額"]);
  assertIncludes("document-heavy query evidence", query.output, "30,000");
  zl(root, "document-heavy answer audit", ["answer", "audit", "--target", root]);
  zl(root, "document-heavy graph", ["graph", "build", "--target", root, "--run"]);
  makeGraphFresh(root);
  zl(root, "document-heavy offline lock", ["privacy", "offline-lock", "--target", root]);
  completeCoreWorkflow(root, "document-heavy");

  assert("document-heavy RAG index exists", fs.existsSync(path.join(root, "graphrag-workspace", "output", "index.json")), "fixture RAG index exists");
  assert("document-heavy document index exists", fs.existsSync(path.join(root, ".planning", "knowledge", "DOCUMENT_INDEX.json")), "DOCUMENT_INDEX.json exists");
  assert("document-heavy answer audit exists", fs.existsSync(path.join(root, ".planning", "quality", "ANSWER_AUDIT.json")), "ANSWER_AUDIT.json exists");
  assert("document-heavy no hidden refresh ledger", !fs.existsSync(path.join(root, ".planning", "refresh", "REFRESH_RUN.md")), "REFRESH_RUN.md is absent");
  return root;
}

const roots = {
  nonDocument: verifyNonDocumentProfile(),
  documentHeavy: verifyDocumentHeavyProfile(),
};

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  roots,
  evidence,
  commandResults,
  issues,
};

writeJsonReport("project-profiles-check.json", data);
writeMarkdownReport("project-profiles-check.md", "Zhulong Project Profiles Verification", summarizeIssues(issues), [
  {
    title: "项目画像",
    body: [
      "- 非文档密集型：`reference + rag none`，代码、图、工作流和证据闭环。",
      "- 文档密集型：`strict + rag local`，文档索引、查询、回答审计和相同工作流闭环。",
    ],
  },
  { title: "证据", body: evidence.length ? evidence.map((item) => `- ${item}`) : ["未记录证据。"] },
  { title: "问题", body: issues.length ? issues.map((issue) => `- ${issue.label}: ${issue.detail}`) : ["未发现项目画像断链。"] },
]);

console.log(`project profiles check ${data.status} profiles=2 issues=${issues.length}`);
if (issues.length) process.exitCode = 1;
