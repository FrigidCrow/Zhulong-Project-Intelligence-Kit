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
const workRoot = tempRoot("aipikit-mvp3-");
const projectRoot = path.join(workRoot, "project");
const issues = [];
const evidence = [];

function write(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function addIssue(label, detail) {
  issues.push({ label, detail });
}

function assertIncludes(label, text, expected) {
  if (!text.includes(expected)) addIssue(label, `missing expected text: ${expected}`);
  else evidence.push(`${label}: found ${expected}`);
}

function assertFileIncludes(label, filePath, expected) {
  if (!fs.existsSync(filePath)) {
    addIssue(label, `missing file: ${path.relative(projectRoot, filePath)}`);
    return;
  }
  assertIncludes(label, read(filePath), expected);
}

function pik(args, options = {}) {
  return runCommand(`pik ${args.join(" ")}`, "node", [pikCli, ...args], {
    cwd: projectRoot,
    timeout: 180000,
    ...options,
  });
}

fs.mkdirSync(projectRoot, { recursive: true });
write(path.join(projectRoot, "src", "policy.js"), "export const mvp3Policy = 'MVP3_CODE_NODE_3301';\n");
write(path.join(projectRoot, "test", "policy.test.js"), "console.log('MVP3_TEST_3301');\n");
write(path.join(projectRoot, "docs", "specs", "mvp3.md"), [
  "# MVP3 仕様",
  "",
  "- MVP3_SENTINEL_3301",
  "- Evidence Quality & Policy Mode must keep citation, trace, policy, and golden evidence local.",
  "",
].join("\n"));

pik(["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "mvp3_fixture", "--mode", "existing", "--force"]);
pik(["codebase", "scan", "--target", projectRoot]);
const fixtureDir = path.join(projectRoot, ".planning", "fixtures");
write(path.join(fixtureDir, "fake-rag-index.mjs"), [
  "import fs from 'node:fs';",
  "import path from 'node:path';",
  "const out = path.join(process.cwd(), 'graphrag-workspace', 'output');",
  "fs.mkdirSync(out, { recursive: true });",
  "fs.writeFileSync(path.join(out, 'mvp3-rag.txt'), 'MVP3_RAG_INDEX_OK\\n');",
  "console.log('MVP3_RAG_INDEX_OK');",
  "",
].join("\n"));
write(path.join(fixtureDir, "fake-graphify.mjs"), [
  "import fs from 'node:fs';",
  "import path from 'node:path';",
  "const out = path.join(process.cwd(), 'graphify-out');",
  "fs.mkdirSync(out, { recursive: true });",
  "fs.writeFileSync(path.join(out, 'graph.json'), JSON.stringify({",
  "  nodes: [",
  "    { id: 'src/policy.js', path: 'src/policy.js' },",
  "    { id: 'test/policy.test.js', path: 'test/policy.test.js' }",
  "  ],",
  "  edges: [{ source: 'test/policy.test.js', target: 'src/policy.js', type: 'tests' }]",
  "}, null, 2));",
  "fs.writeFileSync(path.join(out, 'GRAPH_REPORT.md'), '# Graph Report\\n\\n- MVP3_CODE_NODE_3301\\n');",
  "console.log('MVP3_GRAPHIFY_OK');",
  "",
].join("\n"));
const configPath = path.join(projectRoot, ".planning", "config.json");
const config = JSON.parse(read(configPath));
config.spec_context = {
  ...(config.spec_context || {}),
  provider: "graphrag-local",
  index_command: "node .planning/fixtures/fake-rag-index.mjs",
};
config.graphrag = {
  ...(config.graphrag || {}),
  enabled: true,
  mode: "local",
  requires_api_key: false,
  index_command: config.spec_context.index_command,
};
config.privacy = {
  ...(config.privacy || {}),
  network_policy: "local_only",
  allow_external_rag: false,
  allow_external_tools: false,
  allowed_hosts: ["127.0.0.1", "localhost"],
};
config.code_map = {
  ...(config.code_map || {}),
  provider: "graphify",
  enabled: true,
  update_command: "node .planning/fixtures/fake-graphify.mjs",
};
config.graphify = {
  ...(config.graphify || {}),
  enabled: true,
  update_command: "node .planning/fixtures/fake-graphify.mjs",
};
write(configPath, `${JSON.stringify(config, null, 2)}\n`);
pik(["docs", "extract", "--target", projectRoot]);
const docsIndex = pik(["docs", "index", "--target", projectRoot, "--run"]);
assertIncludes("pik docs index --run", docsIndex.output, "status success");
const graphBuild = pik(["graph", "build", "--target", projectRoot, "--run"]);
assertIncludes("pik graph build --run", graphBuild.output, "status success");

const graphPath = path.join(projectRoot, ".planning", "graphs", "graph.json");
const reportPath = path.join(projectRoot, ".planning", "graphs", "GRAPH_REPORT.md");
write(graphPath, `${JSON.stringify({
  nodes: [
    { id: "src/policy.js", path: "src/policy.js" },
    { id: "test/policy.test.js", path: "test/policy.test.js" },
  ],
  edges: [{ source: "test/policy.test.js", target: "src/policy.js", type: "tests" }],
}, null, 2)}\n`);
write(reportPath, "# Graph Report\n\n- MVP3_CODE_NODE_3301\n");
const future = new Date(Date.now() + 5000);
fs.utimesSync(graphPath, future, future);
fs.utimesSync(reportPath, future, future);

const citations = pik(["docs", "citations", "--target", projectRoot, "MVP3_SENTINEL_3301"]);
assertIncludes("pik docs citations", citations.output, "MVP3_SENTINEL_3301");

const citationAudit = pik(["docs", "citation-audit", "--target", projectRoot]);
assertIncludes("pik citation audit", citationAudit.output, "citation audit PASS");

const goldenAdd = pik(["rag", "golden-add", "--target", projectRoot, "--question", "MVP3_SENTINEL_3301", "--expect", "MVP3_SENTINEL_3301", "--citation", "docs/specs/mvp3.md:1"]);
assertIncludes("pik rag golden-add", goldenAdd.output, "golden");

const goldenRun = pik(["rag", "golden-run", "--target", projectRoot]);
assertIncludes("pik rag golden-run", goldenRun.output, "rag golden run PASS");

const ragEval = pik(["rag", "eval", "--target", projectRoot]);
assertIncludes("pik rag eval", ragEval.output, "rag eval PASS");

const evidenceRecord = pik([
  "evidence",
  "record",
  "--target",
  projectRoot,
  "MVP3 evidence quality verification",
  "--source",
  "docs/specs/mvp3.md",
  "--command",
  "npm run verify:mvp3",
  "--result",
  "passed",
]);
assertIncludes("pik evidence record", evidenceRecord.output, "write");

const traceBuild = pik(["trace", "build", "--target", projectRoot]);
assertIncludes("pik trace build", traceBuild.output, "trace rows");
const traceQuery = pik(["trace", "query", "--target", projectRoot, "MVP3"]);
assertIncludes("pik trace query", traceQuery.output, "Trace query");
const traceAudit = pik(["trace", "audit", "--target", projectRoot]);
assertIncludes("pik trace audit", traceAudit.output, "trace audit PASS");

const offlineLock = pik(["privacy", "offline-lock", "--target", projectRoot]);
assertIncludes("pik offline-lock", offlineLock.output, "privacy audit PASS");

const policyList = pik(["policy", "list", "--target", projectRoot]);
assertIncludes("pik policy list", policyList.output, "privacy.local_only");
const policyExplain = pik(["policy", "explain", "--target", projectRoot, "trace.matrix"]);
assertIncludes("pik policy explain", policyExplain.output, "trace.matrix");
const policyCheck = pik(["policy", "check", "--target", projectRoot, "--strict"]);
assertIncludes("pik policy check", policyCheck.output, "policy check PASS");

const helpSkills = pik(["help", "skills", "--target", projectRoot, "文档更新后想确认影响面和完成前检查"]);
assertIncludes("pik help skills", helpSkills.output, "文档更新");
assertIncludes("pik help skills", helpSkills.output, "改修影响面");
assertFileIncludes("HELP_SKILLS", path.join(projectRoot, ".planning", "help", "HELP_SKILLS.md"), "Recommendations");

assertFileIncludes("RAG_EVAL", path.join(projectRoot, ".planning", "quality", "RAG_EVAL.md"), "Status: PASS");
assertFileIncludes("TRACE_AUDIT", path.join(projectRoot, ".planning", "trace", "TRACE_AUDIT.md"), "Status: PASS");
assertFileIncludes("POLICY_CHECK", path.join(projectRoot, ".planning", "policies", "POLICY_CHECK.md"), "Status: PASS");

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  evidence,
  issues,
};

writeJsonReport("mvp3-evidence-policy-check.json", data);
writeMarkdownReport("mvp3-evidence-policy-check.md", "AI-PIKit MVP3 证据质量与策略模式验证", summarizeIssues(issues), [
  { title: "证据", body: evidence.length ? evidence.map((item) => `- ${item}`) : ["未记录证据。"] },
  {
    title: "Fixture 路径",
    body: [
      `- Work root: \`${workRoot}\``,
      `- Project root: \`${projectRoot}\``,
      `- 复现命令: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-mvp3-evidence-policy.mjs"))}\``,
    ],
  },
  { title: "问题", body: issues.length ? issues.map((issue) => `- ${issue.label}: ${issue.detail}`) : ["未发现 MVP3 问题。"] },
]);

console.log(`mvp3 evidence policy check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
