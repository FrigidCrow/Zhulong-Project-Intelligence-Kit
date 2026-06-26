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
const pkg = JSON.parse(fs.readFileSync(path.join(kitRoot, "package.json"), "utf8"));
const binCommands = Object.keys(pkg.bin).filter((name) => name === "pik" || name.startsWith("pik-")).sort();
const workRoot = tempRoot("aipikit-full-command-surface-");
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
    fs.symlinkSync(pikCli, aliasPath);
  }
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

function runPik(args = [], options = {}) {
  const command = `pik${args.length ? ` ${args.join(" ")}` : ""}`;
  covered.add("pik");
  const result = runCommand(command, "node", [pikCli, ...args], {
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
  const result = runAlias("pik-rag-init-local", ["--target", projectRoot, "--force", "--skip-model-check"], {
    timeout: 360000,
  });
  assertIncludes("pik-rag-init-local", result.output, "Local GraphRAG default mode initialized");
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
  runAlias("pik-docs-scan", ["--target", projectRoot]);
  runAlias("pik-docs-status", ["--target", projectRoot]);
  runAlias("pik-docs-normalize", ["--target", projectRoot]);
  runAlias("pik-docs-extract", ["--target", projectRoot]);
  runAlias("pik-docs-diff", ["--target", projectRoot]);
  const citations = runAlias("pik-docs-citations", ["--target", projectRoot, "FULL_SURFACE_SENTINEL_7719"]);
  assertIncludes("pik-docs-citations", citations.output, "FULL_SURFACE_SENTINEL_7719");
  runAlias("pik-citation-audit", ["--target", projectRoot]);
  runAlias("pik-docs-index", ["--target", projectRoot]);
  const indexRun = runAlias("pik-docs-index", ["--target", projectRoot, "--run"]);
  assertIncludes("pik-docs-index --run", indexRun.output, "status success");
  const localQuery = runAlias("pik-docs-query", ["--target", projectRoot, "FULL_SURFACE_SENTINEL_7719"]);
  assertIncludes("pik-docs-query", localQuery.output, "FULL_SURFACE_SENTINEL_7719");
  const ragQuery = runAlias("pik-docs-query", ["--target", projectRoot, "--rag", "FULL_SURFACE_SENTINEL_7719"]);
  assertIncludes("pik-docs-query --rag", ragQuery.output, "FULL_SURFACE_SENTINEL_7719");
  runAlias("pik-rag-golden-add", ["--target", projectRoot, "--question", "FULL_SURFACE_SENTINEL_7719", "--expect", "FULL_SURFACE_SENTINEL_7719", "--citation", "docs/specs/approval.md:3"]);
  runAlias("pik-rag-golden-run", ["--target", projectRoot]);
  runAlias("pik-rag-eval", ["--target", projectRoot]);
}

function runGraphCommands() {
  runAlias("pik-graph-build", ["--target", projectRoot]);
  const build = runAlias("pik-graph-build", ["--target", projectRoot, "--run"]);
  assertIncludes("pik-graph-build --run", build.output, "status success");
  makeGraphFresh();
  runAlias("pik-graph-status", ["--target", projectRoot]);
  const query = runAlias("pik-graph-query", ["--target", projectRoot, "approvalLimit"]);
  assertIncludes("pik-graph-query", query.output, "approval");
  runAlias("pik-graph-diff", ["--target", projectRoot]);
  runAlias("pik-graph-impact", ["--target", projectRoot, "--files", "src/approval.js"]);
  runAlias("pik-graph-risk", ["--target", projectRoot]);
  runAlias("pik-graph-freshness", ["--target", projectRoot, "--strict"]);
}

function runRefreshModeCommands() {
  const preflight = runAlias("pik-preflight", ["--target", projectRoot]);
  assertIncludes("pik-preflight", preflight.output, "heavy refresh executed: no");
  runAlias("pik-refresh-plan", ["--target", projectRoot]);
  runAlias("pik-refresh-run", ["--target", projectRoot, "--rag", "--force"]);
  runAlias("pik-refresh-run", ["--target", projectRoot, "--graph", "--force"]);
  runAlias("pik-mode-status", ["--target", projectRoot]);
  const modeSet = runAlias("pik-mode-set", ["--target", projectRoot, "graph-lite"]);
  assertIncludes("pik-mode-set", modeSet.output, "mode graph-lite");
  runAlias("pik-mode-set", ["--target", projectRoot, "default-local-rag"]);
}

function runEvidenceTracePolicyAndPrivacyCommands() {
  runAlias("pik-evidence-record", [
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
  runAlias("pik-evidence-status", ["--target", projectRoot]);
  runAlias("pik-trace-build", ["--target", projectRoot]);
  const traceQuery = runAlias("pik-trace-query", ["--target", projectRoot, "FULL_SURFACE"]);
  assertIncludes("pik-trace-query", traceQuery.output, "Trace query");
  runAlias("pik-trace-audit", ["--target", projectRoot]);
  runAlias("pik-offline-lock", ["--target", projectRoot]);
  runAlias("pik-privacy-audit", ["--target", projectRoot, "--strict"]);
  runAlias("pik-outbound-audit", ["--target", projectRoot]);
  runAlias("pik-license-audit", ["--target", projectRoot]);
  runAlias("pik-policy-list", ["--target", projectRoot]);
  runAlias("pik-policy-explain", ["--target", projectRoot, "trace.matrix"]);
  runAlias("pik-policy-check", ["--target", projectRoot, "--strict"]);
  runAlias("pik-policy-lock", ["--target", projectRoot]);
  runAlias("pik-policy-verify", ["--target", projectRoot]);
  runAlias("pik-policy-diff", ["--target", projectRoot]);
  runAlias("pik-help-skills", ["--target", projectRoot, "文档更新后想确认影响面和完成前检查"]);
}

function runRuntimeAndContextCommands() {
  for (const runtime of ["codex", "claude-code", "github-copilot"]) {
    const dest = path.join(workRoot, "runtime", runtime);
    runAlias("pik-runtime-install", ["--runtime", runtime, "--dest", dest, "--force"]);
    runAlias("pik-runtime-status", ["--runtime", runtime, "--dest", dest]);
  }
  runAlias("pik-context-debug", ["--target", projectRoot, "FULL_SURFACE debug context"]);
  runAlias("pik-context-execute", ["--target", projectRoot, "FULL_SURFACE execute context"]);
}

function runWorkflowCommands() {
  runAlias("pik-workflow-run", ["--target", projectRoot, "debug", "FULL_SURFACE workflow"]);
  runAlias("pik-workflow-continue", ["--target", projectRoot, "--gate", "plan", "--evidence", "PLAN.md reviewed"]);
  runAlias("pik-workflow-continue", ["--target", projectRoot, "--gate", "implementation", "--evidence", "src/approval.js verified"]);
  runAlias("pik-workflow-continue", ["--target", projectRoot, "--gate", "verification", "--evidence", "npm run verify:full-command-surface"]);
  runAlias("pik-workflow-status", ["--target", projectRoot]);
  runAlias("pik-workflow-audit", ["--target", projectRoot]);
  runAlias("pik-gate-check", ["--target", projectRoot]);
  runAlias("pik-completion-check", ["--target", projectRoot]);

  for (const command of [
    "pik-new-milestone",
    "pik-spec-phase",
    "pik-discuss-phase",
    "pik-ui-phase",
    "pik-debug",
    "pik-plan-phase",
    "pik-execute-phase",
    "pik-code-review",
    "pik-verify-work",
    "pik-complete-milestone",
  ]) {
    runAlias(command, ["--target", projectRoot, `FULL_SURFACE ${command}`]);
  }
}

prepareProject();
makeAliasBins();
runPik([]);
runAlias("pik-init", ["--target", projectRoot, "--template", "greenfield-app", "--name", "full_command_surface", "--mode", "new", "--force"]);
runAlias("pik-verify", ["--target", projectRoot]);
runAlias("pik-map", ["--target", projectRoot]);
runAlias("pik-codebase", ["--target", projectRoot]);
runAlias("pik-codebase-scan", ["--target", projectRoot]);
runAlias("pik-codebase-status", ["--target", projectRoot]);
maybeRunLocalGraphRagInit();
configureFakeRagAndGraph();
runDocumentAndRagCommands();
runGraphCommands();
runRefreshModeCommands();
runEvidenceTracePolicyAndPrivacyCommands();
runRuntimeAndContextCommands();
runWorkflowCommands();

for (const command of binCommands) {
  if (!covered.has(command)) addIssue(command, "package bin command was not executed by full command surface verification");
}

assertFileIncludes("policy check report", path.join(projectRoot, ".planning", "policies", "POLICY_CHECK.md"), "Status: PASS");
assertFileIncludes("policy lock report", path.join(projectRoot, ".planning", "policies", "POLICY_LOCK.md"), "Snapshot hash");
assertFileIncludes("policy verify report", path.join(projectRoot, ".planning", "policies", "POLICY_VERIFY.md"), "Status: PASS");
assertFileIncludes("policy diff report", path.join(projectRoot, ".planning", "policies", "POLICY_DIFF.md"), "Status: CLEAN");
assertFileIncludes("trace audit report", path.join(projectRoot, ".planning", "trace", "TRACE_AUDIT.md"), "Status: PASS");
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
writeMarkdownReport("full-command-surface-check.md", "AI-PIKit 全命令面验证", summarizeIssues(issues), [
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
if (issues.length > 0) process.exitCode = 1;
