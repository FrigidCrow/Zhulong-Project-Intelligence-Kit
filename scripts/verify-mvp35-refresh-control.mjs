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

const zlCli = path.join(kitRoot, "bin", "zl.mjs");
const workRoot = tempRoot("zhulong-mvp35-refresh-");
const projectRoot = path.join(workRoot, "project");
const aliasBin = path.join(workRoot, "bin");
const issues = [];
const evidence = [];
const commandResults = [];
const newCommands = [
  "zl-preflight",
  "zl-refresh-plan",
  "zl-refresh-run",
  "zl-mode-status",
  "zl-mode-set",
];

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
    stdout: result.stdout.trim().slice(0, 4000),
    stderr: result.stderr.trim().slice(0, 4000),
  });
  if (result.status !== expectedStatus) addIssue(command, `exit ${result.status}, expected ${expectedStatus}`);
  else evidence.push(`${command}: exit ${expectedStatus}`);
  return result;
}

function makeAliasBins() {
  fs.mkdirSync(aliasBin, { recursive: true });
  const pkg = JSON.parse(read(path.join(kitRoot, "package.json")));
  for (const command of Object.keys(pkg.bin).filter((name) => name === "zl" || name.startsWith("zl-"))) {
    const aliasPath = path.join(aliasBin, command);
    if (fs.existsSync(aliasPath)) fs.rmSync(aliasPath);
    fs.symlinkSync(zlCli, aliasPath);
  }
}

function runAlias(alias, args = [], options = {}) {
  const aliasPath = path.join(aliasBin, alias);
  const command = `${alias}${args.length ? ` ${args.join(" ")}` : ""}`;
  return record(command, runCommand(command, aliasPath, args, {
    cwd: options.cwd || projectRoot,
    timeout: options.timeout || 240000,
    allowFailure: true,
    env: {
      ...process.env,
      PATH: `${aliasBin}${path.delimiter}${process.env.PATH || ""}`,
    },
  }), options.expectedStatus ?? 0);
}

function git(args, options = {}) {
  return record(`git ${args.join(" ")}`, runCommand(`git ${args.join(" ")}`, "git", args, {
    cwd: projectRoot,
    timeout: 120000,
    allowFailure: true,
  }), options.expectedStatus ?? 0);
}

function commit(message) {
  git(["add", "."]);
  git(["commit", "-m", message]);
}

function assertIncludes(command, text, expected) {
  if (!text.includes(expected)) addIssue(command, `missing expected text: ${expected}`);
  else evidence.push(`${command}: found ${expected}`);
}

function assertFileIncludes(command, filePath, expected) {
  if (!fs.existsSync(filePath)) {
    addIssue(command, `missing file: ${path.relative(kitRoot, filePath)}`);
    return;
  }
  assertIncludes(command, read(filePath), expected);
}

function readConfig() {
  return JSON.parse(read(path.join(projectRoot, ".planning", "config.json")));
}

function writeConfig(config) {
  write(path.join(projectRoot, ".planning", "config.json"), `${JSON.stringify(config, null, 2)}\n`);
}

function configureFakeBackends() {
  const fixtureDir = path.join(projectRoot, ".planning", "fixtures");
  write(path.join(fixtureDir, "fake-rag-index.mjs"), [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "const out = path.join(process.cwd(), 'graphrag-workspace', 'output');",
    "fs.mkdirSync(out, { recursive: true });",
    "fs.writeFileSync(path.join(out, 'mvp35-rag.txt'), 'MVP35_RAG_REFRESH_OK\\n');",
    "console.log('MVP35_RAG_REFRESH_OK');",
    "",
  ].join("\n"));
  write(path.join(fixtureDir, "fake-graphify.mjs"), [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "const out = path.join(process.cwd(), 'graphify-out');",
    "fs.mkdirSync(out, { recursive: true });",
    "fs.writeFileSync(path.join(out, 'graph.json'), JSON.stringify({",
    "  nodes: [{ id: 'src/approval.js', path: 'src/approval.js', kind: 'module' }],",
    "  edges: []",
    "}, null, 2));",
    "fs.writeFileSync(path.join(out, 'GRAPH_REPORT.md'), '# Graph Report\\n\\nMVP35_GRAPH_REFRESH_OK src/approval.js\\n');",
    "console.log('MVP35_GRAPH_REFRESH_OK');",
    "",
  ].join("\n"));

  const config = readConfig();
  config.spec_context = {
    ...(config.spec_context || {}),
    provider: "graphrag-local",
    source_paths: ["docs"],
    index_command: "node .planning/fixtures/fake-rag-index.mjs",
    query_command: "node .planning/fixtures/fake-rag-index.mjs {query}",
  };
  config.graphrag = {
    ...(config.graphrag || {}),
    enabled: true,
    mode: "local",
    requires_api_key: false,
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
  writeConfig(config);
}

function setupProject() {
  fs.mkdirSync(projectRoot, { recursive: true });
  git(["init"]);
  git(["config", "user.email", "zhulong@example.local"]);
  git(["config", "user.name", "Zhulong Test"]);
  write(path.join(projectRoot, "src", "approval.js"), [
    "export const approvalLimit = 30000;",
    "export function canApprove(value) { return value <= approvalLimit; }",
    "",
  ].join("\n"));
  write(path.join(projectRoot, "docs", "specs", "approval.md"), [
    "# Approval 仕様",
    "",
    "MVP35_DOC_SENTINEL initial approval spec.",
    "",
  ].join("\n"));
  commit("initial docs and source");
  runAlias("zl-init", ["--target", projectRoot, "--template", "greenfield-app", "--name", "mvp35_refresh_fixture", "--mode", "new", "--force"]);
  configureFakeBackends();
  runAlias("zl-docs-extract", ["--target", projectRoot]);
  runAlias("zl-docs-index", ["--target", projectRoot, "--run"]);
  runAlias("zl-graph-build", ["--target", projectRoot, "--run"]);
}

function validateFreshBaseline() {
  const result = runAlias("zl-preflight", ["--target", projectRoot]);
  assertIncludes("fresh baseline preflight", result.output, "preflight PASS");
  assertIncludes("fresh baseline preflight", result.output, "heavy refresh executed: no");
  assertFileIncludes("refresh state after initial runs", path.join(projectRoot, ".planning", "refresh", "REFRESH_STATE.json"), "\"rag\"");
  assertFileIncludes("refresh state after initial runs", path.join(projectRoot, ".planning", "refresh", "REFRESH_STATE.json"), "\"graph\"");
}

function validateUnrelatedCommitIsIgnored() {
  write(path.join(projectRoot, "README.md"), "# Project notes\n\nThis root note is unrelated to docs source paths and code graph.\n");
  commit("unrelated root note");
  const result = runAlias("zl-preflight", ["--target", projectRoot]);
  assertIncludes("unrelated commit preflight", result.output, "preflight PASS");
  assertIncludes("unrelated commit preflight", result.output, "behind-unrelated");
  assertIncludes("unrelated commit preflight", result.output, "action: skip");
}

function validateRagRelevantCommit() {
  fs.appendFileSync(path.join(projectRoot, "docs", "specs", "approval.md"), "MVP35_DOC_SENTINEL updated approval spec.\n");
  commit("doc update");
  const plan = runAlias("zl-refresh-plan", ["--target", projectRoot]);
  assertIncludes("doc update refresh plan", plan.output, "refresh plan WARN");
  assertIncludes("doc update refresh plan", plan.output, "rag refresh");
  assertIncludes("doc update refresh plan", read(path.join(projectRoot, ".planning", "refresh", "REFRESH_PLAN.md")), "recommend differential refresh");

  const refresh = runAlias("zl-refresh-run", ["--target", projectRoot, "--rag"]);
  assertIncludes("rag refresh run", refresh.output, "rag refresh PASS");
  assertFileIncludes("rag refresh report", path.join(projectRoot, ".planning", "refresh", "REFRESH_RUN.md"), "RAG diff/extract/index completed");
  const post = runAlias("zl-preflight", ["--target", projectRoot]);
  assertIncludes("post rag refresh preflight", post.output, "preflight PASS");
}

function validateGraphRelevantCommit() {
  fs.appendFileSync(path.join(projectRoot, "src", "approval.js"), "export const mvp35GraphSentinel = true;\n");
  commit("source update");
  const plan = runAlias("zl-refresh-plan", ["--target", projectRoot]);
  assertIncludes("source update refresh plan", plan.output, "refresh plan WARN");
  assertIncludes("source update refresh plan", plan.output, "graph refresh");

  const refresh = runAlias("zl-refresh-run", ["--target", projectRoot, "--graph"]);
  assertIncludes("graph refresh run", refresh.output, "graph refresh PASS");
  assertFileIncludes("graph refresh report", path.join(projectRoot, ".planning", "refresh", "REFRESH_RUN.md"), "Graphify build completed");
  const post = runAlias("zl-preflight", ["--target", projectRoot, "--strict"]);
  assertIncludes("post graph refresh strict preflight", post.output, "preflight PASS");
}

function validateModes() {
  const setLite = runAlias("zl-mode-set", ["--target", projectRoot, "graph-lite"]);
  assertIncludes("mode set graph-lite", setLite.output, "mode graph-lite");
  const statusLite = runAlias("zl-mode-status", ["--target", projectRoot]);
  assertIncludes("mode status graph-lite", statusLite.output, "RAG required: no");

  const setStrict = runAlias("zl-mode-set", ["--target", projectRoot, "full-strict"]);
  assertIncludes("mode set full-strict", setStrict.output, "mode full-strict");
  const statusStrict = runAlias("zl-mode-status", ["--target", projectRoot]);
  assertIncludes("mode status full-strict", statusStrict.output, "Strict: yes");

  runAlias("zl-mode-set", ["--target", projectRoot, "default-local-rag"]);
}

function validateDocsSynchronized() {
  for (const command of newCommands) {
    assertFileIncludes(`README documents ${command}`, path.join(kitRoot, "README.md"), command);
    assertFileIncludes(`commands.html documents ${command}`, path.join(kitRoot, "docs", "commands.html"), command);
    assertFileIncludes(`changelog documents ${command}`, path.join(kitRoot, "docs", "changelog.md"), command);
    assertFileIncludes(`quality plan documents ${command}`, path.join(kitRoot, "docs", "quality-plan.md"), command);
  }
  assertFileIncludes("package verify:mvp35", path.join(kitRoot, "package.json"), "verify:mvp35");
}

makeAliasBins();
setupProject();
validateFreshBaseline();
validateUnrelatedCommitIsIgnored();
validateRagRelevantCommit();
validateGraphRelevantCommit();
validateModes();
validateDocsSynchronized();

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  evidence,
  commandResults,
  issues,
};

writeJsonReport("mvp35-refresh-control-check.json", data);
writeMarkdownReport("mvp35-refresh-control-check.md", "Zhulong MVP3.5 Refresh Control Verification", summarizeIssues(issues), [
  {
    title: "验证范围",
    body: [
      "- `zl-preflight`：轻量检查，不执行重刷新。",
      "- `zl-refresh-plan`：根据 commit 距离和相关变更生成刷新建议。",
      "- `zl-refresh-run`：只有显式命令才执行 RAG/Graphify refresh。",
      "- `zl-mode-status` / `zl-mode-set`：切换 default-local-rag、graph-lite、full-strict。",
      "- 文档同步：README、changelog、commands、quality-plan 必须记录新增命令。",
    ],
  },
  {
    title: "证据",
    body: evidence.length ? evidence.map((item) => `- ${item}`) : ["未记录证据。"],
  },
  {
    title: "Fixture 路径",
    body: [
      `- Work root: \`${workRoot}\``,
      `- Project root: \`${projectRoot}\``,
      `- 复现命令: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-mvp35-refresh-control.mjs"))}\``,
    ],
  },
  {
    title: "问题",
    body: issues.length ? issues.map((issue) => `- \`${issue.command}\`: ${issue.detail}`) : ["未发现 MVP3.5 refresh control 问题。"],
  },
]);

console.log(`mvp35 refresh control check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
