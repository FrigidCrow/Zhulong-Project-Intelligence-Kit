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
const pkg = JSON.parse(fs.readFileSync(path.join(kitRoot, "package.json"), "utf8"));
const binCommands = Object.keys(pkg.bin).filter((name) => name === "zl" || name.startsWith("zl-")).sort();
const workRoot = tempRoot("zhulong-full-command-surface-");
const projectRoot = path.join(workRoot, "project");
const aliasBin = path.join(workRoot, "bin");
const issues = [];
const evidence = [];
const commandResults = [];
const covered = new Set();

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
    stdout: result.stdout.trim().slice(0, 2400),
    stderr: result.stderr.trim().slice(0, 2400),
  });
  if (result.status !== expectedStatus) {
    addIssue(command, `exit ${result.status}, expected ${expectedStatus}`);
  } else {
    evidence.push(`${command}: exit ${expectedStatus}`);
  }
  return result;
}

function makeAliasBins() {
  fs.mkdirSync(aliasBin, { recursive: true });
  for (const command of binCommands) {
    const aliasPath = path.join(aliasBin, command);
    if (fs.existsSync(aliasPath)) fs.rmSync(aliasPath);
    fs.symlinkSync(zlCli, aliasPath);
  }
}

function makeFakeLocalRagTools() {
  const graphragPath = path.join(aliasBin, "graphrag");
  write(graphragPath, [
    "#!/usr/bin/env node",
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "const args = process.argv.slice(2);",
    "const rootIndex = args.indexOf('--root');",
    "if (args[0] !== 'init' || rootIndex < 0 || !args[rootIndex + 1]) process.exit(2);",
    "const root = path.resolve(args[rootIndex + 1]);",
    "fs.mkdirSync(root, { recursive: true });",
    "fs.writeFileSync(path.join(root, 'settings.yaml'), 'models:\\n');",
    "console.log('FULL_SURFACE_GRAPHRAG_INIT_OK');",
    "",
  ].join("\n"));
  fs.chmodSync(graphragPath, 0o755);

  const ollamaPath = path.join(aliasBin, "ollama");
  write(ollamaPath, "#!/usr/bin/env node\nconsole.log('FULL_SURFACE_OLLAMA_OK');\n");
  fs.chmodSync(ollamaPath, 0o755);
}

function runAlias(alias, args = [], options = {}) {
  const aliasPath = path.join(aliasBin, alias);
  const command = `${alias}${args.length ? ` ${args.join(" ")}` : ""}`;
  covered.add(alias);
  const result = runCommand(command, aliasPath, args, {
    cwd: options.cwd || projectRoot,
    timeout: options.timeout || 240000,
    allowFailure: true,
    env: {
      ...process.env,
      PATH: `${aliasBin}${path.delimiter}${process.env.PATH || ""}`,
    },
  });
  return record(command, result, options.expectedStatus ?? 0);
}

function runZl(args = [], options = {}) {
  const command = `zl${args.length ? ` ${args.join(" ")}` : ""}`;
  covered.add("zl");
  const result = runCommand(command, "node", [zlCli, ...args], {
    cwd: options.cwd || projectRoot,
    timeout: options.timeout || 240000,
    allowFailure: true,
    env: {
      ...process.env,
      PATH: `${aliasBin}${path.delimiter}${process.env.PATH || ""}`,
    },
  });
  return record(command, result, options.expectedStatus ?? 0);
}

function assertIncludes(command, text, expected) {
  if (!text.includes(expected)) addIssue(command, `missing expected text: ${expected}`);
  else evidence.push(`${command}: found ${expected}`);
}

function assertFileIncludes(command, filePath, expected) {
  if (!fs.existsSync(filePath)) {
    addIssue(command, `missing file: ${path.relative(projectRoot, filePath)}`);
    return;
  }
  assertIncludes(command, read(filePath), expected);
}

function updateConfig(mutator) {
  const configPath = path.join(projectRoot, ".planning", "config.json");
  const config = JSON.parse(read(configPath));
  mutator(config);
  write(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function configureFakeRagAndGraph() {
  const fixtureDir = path.join(projectRoot, ".planning", "fixtures");
  write(path.join(fixtureDir, "fake-rag-index.mjs"), [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "const out = path.join(process.cwd(), 'graphrag-workspace', 'output');",
    "fs.mkdirSync(out, { recursive: true });",
    "fs.writeFileSync(path.join(out, 'full-surface-rag.txt'), 'FULL_SURFACE_RAG_INDEX_OK\\n');",
    "console.log('FULL_SURFACE_RAG_INDEX_OK FULL_SURFACE_SENTINEL_7719');",
    "",
  ].join("\n"));
  write(path.join(fixtureDir, "fake-rag-query.mjs"), [
    "const query = process.argv.slice(2).join(' ');",
    "console.log(`FULL_SURFACE_RAG_QUERY_OK query=${query}`);",
    "console.log('FULL_SURFACE_SENTINEL_7719 answer=local-only');",
    "",
  ].join("\n"));
  write(path.join(fixtureDir, "fake-graphify.mjs"), [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "const out = path.join(process.cwd(), 'graphify-out');",
    "fs.mkdirSync(out, { recursive: true });",
    "fs.writeFileSync(path.join(out, 'graph.json'), JSON.stringify({",
    "  nodes: [",
    "    { id: 'src/approval.js', path: 'src/approval.js', kind: 'module' },",
    "    { id: 'test/approval.test.js', path: 'test/approval.test.js', kind: 'test' }",
    "  ],",
    "  edges: [{ source: 'test/approval.test.js', target: 'src/approval.js', type: 'tests' }]",
    "}, null, 2));",
    "fs.writeFileSync(path.join(out, 'GRAPH_REPORT.md'), '# Graph Report\\n\\nFULL_SURFACE_GRAPH_NODE approvalLimit\\n');",
    "console.log('FULL_SURFACE_GRAPHIFY_OK');",
    "",
  ].join("\n"));

  updateConfig((config) => {
    config.spec_context = {
      ...(config.spec_context || {}),
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
      root: "graphrag-workspace",
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
      update_command: "node .planning/fixtures/fake-graphify.mjs",
    };
    config.graphify = {
      ...(config.graphify || {}),
      update_command: "node .planning/fixtures/fake-graphify.mjs",
    };
  });
}

function prepareProject() {
  fs.mkdirSync(projectRoot, { recursive: true });
  write(path.join(projectRoot, "src", "approval.js"), [
    "export const approvalLimit = 7719;",
    "export function canApprove(value) { return value <= approvalLimit; }",
    "",
  ].join("\n"));
  write(path.join(projectRoot, "test", "approval.test.js"), "console.log('FULL_SURFACE_TEST_OK approvalLimit');\n");
  write(path.join(projectRoot, "docs", "specs", "approval.md"), [
    "# Approval 仕様",
    "",
    "- FULL_SURFACE_SENTINEL_7719",
    "- Approval limit is 7,719 for the full command surface fixture.",
    "",
  ].join("\n"));
  write(path.join(projectRoot, "documents", "minutes.txt"), [
    "FULL_SURFACE_MINUTES",
    "All evidence must stay under .planning.",
    "",
  ].join("\n"));
  write(path.join(projectRoot, "仕様書", "matrix.csv"), [
    "id,value",
    "FULL_SURFACE_CSV,local",
    "",
  ].join("\n"));
}

function maybeRunLocalGraphRagInit() {
  const result = runAlias("zl-rag-init-local", ["--target", projectRoot, "--force", "--skip-model-check"], {
    timeout: 360000,
  });
  assertIncludes("zl-rag-init-local", result.output, "Local GraphRAG default mode initialized");
}

function makeGraphFresh() {
  const graphPath = path.join(projectRoot, ".planning", "graphs", "graph.json");
  const reportPath = path.join(projectRoot, ".planning", "graphs", "GRAPH_REPORT.md");
  if (fs.existsSync(graphPath)) {
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(graphPath, future, future);
  }
  if (fs.existsSync(reportPath)) {
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(reportPath, future, future);
  }
}

function runDocumentAndRagCommands() {
  runAlias("zl-docs-scan", ["--target", projectRoot]);
  runAlias("zl-docs-status", ["--target", projectRoot]);
  runAlias("zl-docs-normalize", ["--target", projectRoot]);
  runAlias("zl-docs-extract", ["--target", projectRoot]);
  runAlias("zl-docs-diff", ["--target", projectRoot]);
  const citations = runAlias("zl-docs-citations", ["--target", projectRoot, "FULL_SURFACE_SENTINEL_7719"]);
  assertIncludes("zl-docs-citations", citations.output, "FULL_SURFACE_SENTINEL_7719");
  runAlias("zl-citation-audit", ["--target", projectRoot]);
  const docsSync = runAlias("zl-docs-sync", ["--target", projectRoot]);
  assertIncludes("zl-docs-sync", docsSync.output, "heavy refresh executed: no");
  runAlias("zl-ambiguity-audit", ["--target", projectRoot]);
  runAlias("zl-docs-index", ["--target", projectRoot]);
  const indexRun = runAlias("zl-docs-index", ["--target", projectRoot, "--run"]);
  assertIncludes("zl-docs-index --run", indexRun.output, "status success");
  const localQuery = runAlias("zl-docs-query", ["--target", projectRoot, "FULL_SURFACE_SENTINEL_7719"]);
  assertIncludes("zl-docs-query", localQuery.output, "FULL_SURFACE_SENTINEL_7719");
  const answerAudit = runAlias("zl-answer-audit", ["--target", projectRoot]);
  assertIncludes("zl-answer-audit", answerAudit.output, "answer audit PASS");
  const ragQuery = runAlias("zl-docs-query", ["--target", projectRoot, "--rag", "FULL_SURFACE_SENTINEL_7719"]);
  assertIncludes("zl-docs-query --rag", ragQuery.output, "FULL_SURFACE_SENTINEL_7719");
  runAlias("zl-answer-audit", ["--target", projectRoot, "--answer", "FULL_SURFACE_SENTINEL_7719 [docs/specs/approval.md:3]"]);
  runAlias("zl-rag-golden-add", ["--target", projectRoot, "--question", "FULL_SURFACE_SENTINEL_7719", "--expect", "FULL_SURFACE_SENTINEL_7719", "--citation", "docs/specs/approval.md:3"]);
  runAlias("zl-rag-golden-run", ["--target", projectRoot]);
  runAlias("zl-rag-eval", ["--target", projectRoot]);
}

function runGraphCommands() {
  runAlias("zl-graph-build", ["--target", projectRoot]);
  const build = runAlias("zl-graph-build", ["--target", projectRoot, "--run"]);
  assertIncludes("zl-graph-build --run", build.output, "status success");
  makeGraphFresh();
  runAlias("zl-graph-status", ["--target", projectRoot]);
  const query = runAlias("zl-graph-query", ["--target", projectRoot, "approvalLimit"]);
  assertIncludes("zl-graph-query", query.output, "approval");
  runAlias("zl-graph-diff", ["--target", projectRoot]);
  runAlias("zl-graph-impact", ["--target", projectRoot, "--files", "src/approval.js"]);
  runAlias("zl-graph-risk", ["--target", projectRoot]);
  runAlias("zl-graph-freshness", ["--target", projectRoot, "--strict"]);
}

function runRefreshModeCommands() {
  const preflight = runAlias("zl-preflight", ["--target", projectRoot]);
  assertIncludes("zl-preflight", preflight.output, "heavy refresh executed: no");
  runAlias("zl-refresh-plan", ["--target", projectRoot]);
  runAlias("zl-refresh-run", ["--target", projectRoot, "--rag", "--force"]);
  runAlias("zl-refresh-run", ["--target", projectRoot, "--graph", "--force"]);
  runAlias("zl-mode-status", ["--target", projectRoot]);
  const modeSet = runAlias("zl-mode-set", ["--target", projectRoot, "graph-lite"]);
  assertIncludes("zl-mode-set", modeSet.output, "mode graph-lite");
  runAlias("zl-mode-set", ["--target", projectRoot, "default-local-rag"]);
}

function runEvidenceTracePolicyAndPrivacyCommands() {
  runAlias("zl-evidence-record", [
    "--target",
    projectRoot,
    "Full command surface evidence",
    "--source",
    "docs/specs/approval.md",
    "--command",
    "npm run verify:full-command-surface",
    "--result",
    "passed",
    "--writeback",
    ".planning/issues/full-command-surface.md",
  ]);
  runAlias("zl-evidence-status", ["--target", projectRoot]);
  runAlias("zl-trace-build", ["--target", projectRoot]);
  const traceQuery = runAlias("zl-trace-query", ["--target", projectRoot, "FULL_SURFACE"]);
  assertIncludes("zl-trace-query", traceQuery.output, "Trace query");
  runAlias("zl-trace-audit", ["--target", projectRoot]);
  runAlias("zl-structure-audit", ["--target", projectRoot]);
  runAlias("zl-offline-lock", ["--target", projectRoot]);
  runAlias("zl-privacy-audit", ["--target", projectRoot, "--strict"]);
  runAlias("zl-outbound-audit", ["--target", projectRoot]);
  runAlias("zl-license-audit", ["--target", projectRoot]);
  runAlias("zl-policy-list", ["--target", projectRoot]);
  runAlias("zl-policy-explain", ["--target", projectRoot, "trace.matrix"]);
  runAlias("zl-policy-check", ["--target", projectRoot, "--strict"]);
  runAlias("zl-policy-lock", ["--target", projectRoot]);
  runAlias("zl-policy-verify", ["--target", projectRoot]);
  runAlias("zl-policy-diff", ["--target", projectRoot]);
  runAlias("zl-help-skills", ["--target", projectRoot, "文档更新后想确认影响面和完成前检查"]);
  runAlias("zl-next", ["--target", projectRoot]);
}

function runRuntimeAndContextCommands() {
  for (const runtime of ["codex", "claude-code", "github-copilot"]) {
    const dest = path.join(workRoot, "runtime", runtime);
    runAlias("zl-runtime-install", ["--runtime", runtime, "--dest", dest, "--force"]);
    runAlias("zl-runtime-status", ["--runtime", runtime, "--dest", dest]);
  }
  runAlias("zl-context-debug", ["--target", projectRoot, "FULL_SURFACE debug context"]);
  runAlias("zl-context-execute", ["--target", projectRoot, "FULL_SURFACE execute context"]);
}

function runWorkflowCommands() {
  runAlias("zl-workflow-run", ["--target", projectRoot, "debug", "FULL_SURFACE workflow"]);
  const active = JSON.parse(read(path.join(projectRoot, ".planning", "workflows", "ACTIVE.json")));
  for (const [gate, name] of [["plan", "PLAN.md"], ["verification", "VERIFICATION.md"]]) {
    const artifact = path.join(projectRoot, ".planning", "workflows", active.id, name);
    write(artifact, `# ${gate}: ${active.id}\n\nStatus: complete\n\nEvidence:\n\n- full command surface fixture\n`);
    runAlias("zl-workflow-continue", ["--target", projectRoot, "--gate", gate, "--evidence", path.relative(projectRoot, artifact)]);
  }
  runAlias("zl-evidence-record", ["--target", projectRoot, "workflow command surface", "--command", "fixture", "--result", "passed", "--writeback", ".planning/issues/full-command-surface.md"]);
  runAlias("zl", ["workflow", "accept", "--target", projectRoot, "--source", "user-message", "--request", "full command surface accepted"]);
  runAlias("zl-workflow-status", ["--target", projectRoot]);
  runAlias("zl-workflow-audit", ["--target", projectRoot]);
  runAlias("zl-gate-check", ["--target", projectRoot]);
  runAlias("zl-completion-check", ["--target", projectRoot]);
  runAlias("zl", ["workflow", "complete", "--target", projectRoot]);

  for (const command of [
    "zl-new-milestone",
    "zl-spec-phase",
    "zl-discuss-phase",
    "zl-ui-phase",
    "zl-debug",
    "zl-plan-phase",
    "zl-execute-phase",
    "zl-code-review",
    "zl-verify-work",
    "zl-complete-milestone",
  ]) {
    runAlias(command, ["--target", projectRoot, `FULL_SURFACE ${command}`]);
  }
}

function runCockpitCommand() {
  const result = runAlias("zl-cockpit-build", ["--target", projectRoot]);
  assertIncludes("zl-cockpit-build", result.output, "cockpit build");
  assertIncludes("zl-cockpit-build", result.output, "heavy refresh executed: no");
  assertFileIncludes("cockpit report", path.join(projectRoot, ".planning", "cockpit", "COCKPIT_REPORT.md"), "Heavy refresh executed: no");
  assertFileIncludes("cockpit html", path.join(projectRoot, ".planning", "cockpit", "index.html"), "Zhulong 项目驾驶舱");
}

prepareProject();
makeAliasBins();
makeFakeLocalRagTools();
runZl([]);
runAlias("zl-init", ["--target", projectRoot, "--template", "greenfield-app", "--name", "full_command_surface", "--mode", "new", "--force"]);
runAlias("zl-verify", ["--target", projectRoot]);
runAlias("zl-map", ["--target", projectRoot]);
runAlias("zl-codebase", ["--target", projectRoot]);
runAlias("zl-codebase-scan", ["--target", projectRoot]);
runAlias("zl-codebase-status", ["--target", projectRoot]);
maybeRunLocalGraphRagInit();
configureFakeRagAndGraph();
runDocumentAndRagCommands();
runGraphCommands();
runRefreshModeCommands();
runEvidenceTracePolicyAndPrivacyCommands();
runRuntimeAndContextCommands();
runWorkflowCommands();
runCockpitCommand();

for (const command of binCommands) {
  if (!covered.has(command)) addIssue(command, "package bin command was not executed by full command surface verification");
}

assertFileIncludes("policy check report", path.join(projectRoot, ".planning", "policies", "POLICY_CHECK.md"), "Status: PASS");
assertFileIncludes("policy lock report", path.join(projectRoot, ".planning", "policies", "POLICY_LOCK.md"), "Snapshot hash");
assertFileIncludes("policy verify report", path.join(projectRoot, ".planning", "policies", "POLICY_VERIFY.md"), "Status: PASS");
assertFileIncludes("policy diff report", path.join(projectRoot, ".planning", "policies", "POLICY_DIFF.md"), "Status: CLEAN");
assertFileIncludes("trace audit report", path.join(projectRoot, ".planning", "trace", "TRACE_AUDIT.md"), "Status: PASS");
assertFileIncludes("docs sync report", path.join(projectRoot, ".planning", "knowledge", "DOCS_SYNC.md"), "Heavy refresh executed: no");
assertFileIncludes("answer audit report", path.join(projectRoot, ".planning", "quality", "ANSWER_AUDIT.md"), "Status: PASS");
assertFileIncludes("help skills report", path.join(projectRoot, ".planning", "help", "HELP_SKILLS.md"), "Recommendations");
assertFileIncludes("refresh state", path.join(projectRoot, ".planning", "refresh", "REFRESH_STATE.json"), "\"graph\"");
assertFileIncludes("preflight report", path.join(projectRoot, ".planning", "refresh", "PREFLIGHT.md"), "Heavy refresh executed: no");

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  commandsRequired: binCommands,
  commandsCovered: [...covered].sort(),
  evidence,
  commandResults,
  issues,
};

writeJsonReport("full-command-surface-check.json", data);
writeMarkdownReport("full-command-surface-check.md", "Zhulong 全命令面验证", summarizeIssues(issues), [
  {
    title: "命令覆盖",
    body: [
      `- Required commands: ${data.commandsRequired.length}`,
      `- Executed commands: ${data.commandsCovered.length}`,
      "",
      ...data.commandsRequired.map((command) => `- ${covered.has(command) ? "PASS" : "FAIL"} \`${command}\``),
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
      `- 复现命令: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-full-command-surface.mjs"))}\``,
    ],
  },
  {
    title: "问题",
    body: issues.length ? issues.map((issue) => `- \`${issue.command}\`: ${issue.detail}`) : ["未发现全命令面问题。"],
  },
]);

console.log(`full command surface check ${data.status} commands=${data.commandsCovered.length}/${data.commandsRequired.length} issues=${issues.length}`);
if (issues.length > 0) {
  for (const issue of issues) console.error(`- ${issue.command}: ${issue.detail}`);
  process.exitCode = 1;
}
