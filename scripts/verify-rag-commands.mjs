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
const workRoot = tempRoot("zhulong-rag-commands-");
const projectRoot = path.join(workRoot, "project");
const aliasBin = path.join(workRoot, "bin");
const issues = [];
const evidence = [];
const commandResults = [];

function addIssue(command, detail) {
  issues.push({ command, detail });
}

function write(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function record(command, result) {
  commandResults.push({
    command,
    status: result.status,
    stdout: result.stdout.trim().slice(0, 2000),
    stderr: result.stderr.trim().slice(0, 2000),
  });
  return result;
}

function runZl(args, options = {}) {
  const command = `zl ${args.join(" ")}`;
  return record(command, runCommand(command, "node", [zlCli, ...args], {
    cwd: projectRoot,
    timeout: 120000,
    ...options,
  }));
}

function runAlias(alias, args, options = {}) {
  const aliasPath = path.join(aliasBin, alias);
  const command = `${alias} ${args.join(" ")}`;
  return record(command, runCommand(command, aliasPath, args, {
    cwd: projectRoot,
    timeout: 120000,
    ...options,
  }));
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

function makeAliasBins() {
  fs.mkdirSync(aliasBin, { recursive: true });
  for (const alias of ["zl-docs-scan", "zl-docs-status", "zl-docs-normalize", "zl-docs-index", "zl-docs-query"]) {
    const aliasPath = path.join(aliasBin, alias);
    if (fs.existsSync(aliasPath)) fs.rmSync(aliasPath);
    fs.symlinkSync(zlCli, aliasPath);
  }
}

function configureFakeRag() {
  const fixtureDir = path.join(projectRoot, ".planning", "fixtures");
  write(path.join(fixtureDir, "fake-rag-index.mjs"), [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "const out = path.join(process.cwd(), 'graphrag-workspace', 'output');",
    "fs.mkdirSync(out, { recursive: true });",
    "fs.writeFileSync(path.join(out, 'fake-index.txt'), 'FAKE_RAG_INDEX_OK\\n');",
    "console.log('FAKE_RAG_INDEX_OK approval-limit=42420');",
    "",
  ].join("\n"));
  write(path.join(fixtureDir, "fake-rag-query.mjs"), [
    "const query = process.argv.slice(2).join(' ');",
    "console.log(`FAKE_RAG_QUERY_OK query=${query}`);",
    "console.log('RAG_ANSWER_SENTINEL_42420');",
    "",
  ].join("\n"));

  const configPath = path.join(projectRoot, ".planning", "config.json");
  const config = JSON.parse(read(configPath));
  config.spec_context.provider = "graphrag";
  config.spec_context.index_command = "node .planning/fixtures/fake-rag-index.mjs";
  config.spec_context.query_command = "node .planning/fixtures/fake-rag-query.mjs {query}";
  config.graphrag.enabled = true;
  config.graphrag.root = "graphrag-workspace";
  config.graphrag.index_command = config.spec_context.index_command;
  config.graphrag.local_query_command = config.spec_context.query_command;
  write(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

fs.mkdirSync(projectRoot, { recursive: true });
makeAliasBins();
write(path.join(projectRoot, "src", "approval.js"), "export const approvalLimit = 42420;\n");
write(path.join(projectRoot, "docs", "qa", "QA-101.md"), [
  "# QA-101 承認仕様",
  "",
  "- RAG_COMMAND_SENTINEL",
  "- 代理承認の上限金額は 42,420 円。",
  "",
].join("\n"));
write(path.join(projectRoot, "documents", "minutes.txt"), [
  "Minutes",
  "RAG_MINUTES_SENTINEL",
  "The workflow must keep evidence in .planning/knowledge.",
  "",
].join("\n"));
write(path.join(projectRoot, "仕様書", "approval.csv"), [
  "key,value",
  "RAG_CSV_SENTINEL,代理承認",
  "",
].join("\n"));

runZl(["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "rag_command_fixture", "--mode", "new", "--force"]);
configureFakeRag();

const canonicalScan = runZl(["docs", "scan", "--target", projectRoot]);
assertIncludes("zl docs scan", canonicalScan.output, "documents 3");
assertFileIncludes("zl docs scan", path.join(projectRoot, ".planning", "knowledge", "RAG_SOURCES.md"), "QA-101.md");
assertFileIncludes("zl docs scan", path.join(projectRoot, ".planning", "knowledge", "RAG_SOURCES.md"), "minutes.txt");
assertFileIncludes("zl docs scan", path.join(projectRoot, ".planning", "knowledge", "RAG_SOURCES.md"), "approval.csv");

const aliasScan = runAlias("zl-docs-scan", ["--target", projectRoot]);
assertIncludes("zl-docs-scan", aliasScan.output, "documents 3");

const canonicalStatus = runZl(["docs", "status", "--target", projectRoot]);
assertIncludes("zl docs status", canonicalStatus.output, "Total source documents: 3");

const aliasStatus = runAlias("zl-docs-status", ["--target", projectRoot]);
assertIncludes("zl-docs-status", aliasStatus.output, "Total source documents: 3");

const canonicalNormalize = runZl(["docs", "normalize", "--target", projectRoot]);
assertIncludes("zl docs normalize", canonicalNormalize.output, "normalized 3");
assertFileIncludes("zl docs normalize", path.join(projectRoot, ".planning", "knowledge", "normalized", "MANIFEST.md"), "QA-101.md");

const aliasNormalize = runAlias("zl-docs-normalize", ["--target", projectRoot]);
assertIncludes("zl-docs-normalize", aliasNormalize.output, "normalized 3");

const localQuery = runZl(["docs", "query", "--target", projectRoot, "RAG_COMMAND_SENTINEL"]);
assertIncludes("zl docs query", localQuery.output, "RAG_COMMAND_SENTINEL");
assertIncludes("zl docs query", localQuery.output, "QA-101.md");

const aliasLocalQuery = runAlias("zl-docs-query", ["--target", projectRoot, "RAG_MINUTES_SENTINEL"]);
assertIncludes("zl-docs-query", aliasLocalQuery.output, "RAG_MINUTES_SENTINEL");
assertIncludes("zl-docs-query", aliasLocalQuery.output, "minutes.txt");

const handoff = runZl(["docs", "index", "--target", projectRoot]);
assertIncludes("zl docs index", handoff.output, "backend document RAG handoff");
assertFileIncludes("zl docs index", path.join(projectRoot, ".planning", "knowledge", "RAG_INDEX_HANDOFF.md"), "zl-docs-index --target <repo> --run");

const aliasHandoff = runAlias("zl-docs-index", ["--target", projectRoot]);
assertIncludes("zl-docs-index", aliasHandoff.output, "backend document RAG handoff");

const runIndex = runZl(["docs", "index", "--target", projectRoot, "--run"]);
assertIncludes("zl docs index --run", runIndex.output, "status success");
assertFileIncludes("zl docs index --run", path.join(projectRoot, ".planning", "knowledge", "RAG_INDEX_RESULT.md"), "FAKE_RAG_INDEX_OK");
assertFileIncludes("zl docs index --run", path.join(projectRoot, ".planning", "knowledge", "RAG_INDEX_RESULT.md"), "Status: success");

const aliasRunIndex = runAlias("zl-docs-index", ["--target", projectRoot, "--run"]);
assertIncludes("zl-docs-index --run", aliasRunIndex.output, "status success");

const ragQuery = runZl(["docs", "query", "--target", projectRoot, "--rag", "代理承認の上限金額"]);
assertIncludes("zl docs query --rag", ragQuery.output, "RAG_ANSWER_SENTINEL_42420");
assertFileIncludes("zl docs query --rag", path.join(projectRoot, ".planning", "knowledge", "RAG_QUERY_RESULT.md"), "Status: success");

const backendQuery = runZl(["docs", "query", "--target", projectRoot, "--backend", "graphrag", "代理承認"]);
assertIncludes("zl docs query --backend graphrag", backendQuery.output, "RAG_ANSWER_SENTINEL_42420");

const aliasRagQuery = runAlias("zl-docs-query", ["--target", projectRoot, "--rag", "代理承認"]);
assertIncludes("zl-docs-query --rag", aliasRagQuery.output, "RAG_ANSWER_SENTINEL_42420");

const finalStatus = runAlias("zl-docs-status", ["--target", projectRoot]);
assertIncludes("zl-docs-status after RAG", finalStatus.output, "RAG backend: graphrag");
assertIncludes("zl-docs-status after RAG", finalStatus.output, "Index status: Indexed by configured RAG command");

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  commandsCovered: [
    "zl docs scan",
    "zl docs status",
    "zl docs normalize",
    "zl docs index",
    "zl docs index --run",
    "zl docs query",
    "zl docs query --rag",
    "zl docs query --backend graphrag",
    "zl-docs-scan",
    "zl-docs-status",
    "zl-docs-normalize",
    "zl-docs-index",
    "zl-docs-index --run",
    "zl-docs-query",
    "zl-docs-query --rag",
  ],
  evidence,
  commandResults,
  issues,
};

writeJsonReport("rag-command-check.json", data);
writeMarkdownReport("rag-command-check.md", "Zhulong RAG Command Verification", summarizeIssues(issues), [
  {
    title: "Commands Covered",
    body: data.commandsCovered.map((item) => `- \`${item}\``),
  },
  {
    title: "Evidence",
    body: evidence.length === 0 ? ["No evidence recorded."] : evidence.map((item) => `- ${item}`),
  },
  {
    title: "Fixture Paths",
    body: [
      `- Work root: \`${workRoot}\``,
      `- Project root: \`${projectRoot}\``,
      `- Reproduce command: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-rag-commands.mjs"))}\``,
    ],
  },
  {
    title: "Issues",
    body: issues.length === 0 ? ["No RAG command issues found."] : issues.map((issue) => `- ${issue.command}: ${issue.detail}`),
  },
]);

console.log(`rag command check ${data.status} commands=${data.commandsCovered.length} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
