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
const workRoot = tempRoot("aipikit-rag-commands-");
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

function runPik(args, options = {}) {
  const command = `pik ${args.join(" ")}`;
  return record(command, runCommand(command, "node", [pikCli, ...args], {
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
  for (const alias of ["pik-docs-scan", "pik-docs-status", "pik-docs-normalize", "pik-docs-index", "pik-docs-query"]) {
    const aliasPath = path.join(aliasBin, alias);
    if (fs.existsSync(aliasPath)) fs.rmSync(aliasPath);
    fs.symlinkSync(pikCli, aliasPath);
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

runPik(["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "rag_command_fixture", "--mode", "new", "--force"]);
configureFakeRag();

const canonicalScan = runPik(["docs", "scan", "--target", projectRoot]);
assertIncludes("pik docs scan", canonicalScan.output, "documents 3");
assertFileIncludes("pik docs scan", path.join(projectRoot, ".planning", "knowledge", "RAG_SOURCES.md"), "QA-101.md");
assertFileIncludes("pik docs scan", path.join(projectRoot, ".planning", "knowledge", "RAG_SOURCES.md"), "minutes.txt");
assertFileIncludes("pik docs scan", path.join(projectRoot, ".planning", "knowledge", "RAG_SOURCES.md"), "approval.csv");

const aliasScan = runAlias("pik-docs-scan", ["--target", projectRoot]);
assertIncludes("pik-docs-scan", aliasScan.output, "documents 3");

const canonicalStatus = runPik(["docs", "status", "--target", projectRoot]);
assertIncludes("pik docs status", canonicalStatus.output, "Total source documents: 3");

const aliasStatus = runAlias("pik-docs-status", ["--target", projectRoot]);
assertIncludes("pik-docs-status", aliasStatus.output, "Total source documents: 3");

const canonicalNormalize = runPik(["docs", "normalize", "--target", projectRoot]);
assertIncludes("pik docs normalize", canonicalNormalize.output, "normalized 3");
assertFileIncludes("pik docs normalize", path.join(projectRoot, ".planning", "knowledge", "normalized", "MANIFEST.md"), "QA-101.md");

const aliasNormalize = runAlias("pik-docs-normalize", ["--target", projectRoot]);
assertIncludes("pik-docs-normalize", aliasNormalize.output, "normalized 3");

const localQuery = runPik(["docs", "query", "--target", projectRoot, "RAG_COMMAND_SENTINEL"]);
assertIncludes("pik docs query", localQuery.output, "RAG_COMMAND_SENTINEL");
assertIncludes("pik docs query", localQuery.output, "QA-101.md");

const aliasLocalQuery = runAlias("pik-docs-query", ["--target", projectRoot, "RAG_MINUTES_SENTINEL"]);
assertIncludes("pik-docs-query", aliasLocalQuery.output, "RAG_MINUTES_SENTINEL");
assertIncludes("pik-docs-query", aliasLocalQuery.output, "minutes.txt");

const handoff = runPik(["docs", "index", "--target", projectRoot]);
assertIncludes("pik docs index", handoff.output, "backend document RAG handoff");
assertFileIncludes("pik docs index", path.join(projectRoot, ".planning", "knowledge", "RAG_INDEX_HANDOFF.md"), "pik-docs-index --target <repo> --run");

const aliasHandoff = runAlias("pik-docs-index", ["--target", projectRoot]);
assertIncludes("pik-docs-index", aliasHandoff.output, "backend document RAG handoff");

const runIndex = runPik(["docs", "index", "--target", projectRoot, "--run"]);
assertIncludes("pik docs index --run", runIndex.output, "status success");
assertFileIncludes("pik docs index --run", path.join(projectRoot, ".planning", "knowledge", "RAG_INDEX_RESULT.md"), "FAKE_RAG_INDEX_OK");
assertFileIncludes("pik docs index --run", path.join(projectRoot, ".planning", "knowledge", "RAG_INDEX_RESULT.md"), "Status: success");

const aliasRunIndex = runAlias("pik-docs-index", ["--target", projectRoot, "--run"]);
assertIncludes("pik-docs-index --run", aliasRunIndex.output, "status success");

const ragQuery = runPik(["docs", "query", "--target", projectRoot, "--rag", "代理承認の上限金額"]);
assertIncludes("pik docs query --rag", ragQuery.output, "RAG_ANSWER_SENTINEL_42420");
assertFileIncludes("pik docs query --rag", path.join(projectRoot, ".planning", "knowledge", "RAG_QUERY_RESULT.md"), "Status: success");

const backendQuery = runPik(["docs", "query", "--target", projectRoot, "--backend", "graphrag", "代理承認"]);
assertIncludes("pik docs query --backend graphrag", backendQuery.output, "RAG_ANSWER_SENTINEL_42420");

const aliasRagQuery = runAlias("pik-docs-query", ["--target", projectRoot, "--rag", "代理承認"]);
assertIncludes("pik-docs-query --rag", aliasRagQuery.output, "RAG_ANSWER_SENTINEL_42420");

const finalStatus = runAlias("pik-docs-status", ["--target", projectRoot]);
assertIncludes("pik-docs-status after RAG", finalStatus.output, "RAG backend: graphrag");
assertIncludes("pik-docs-status after RAG", finalStatus.output, "Index status: Indexed by configured RAG command");

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  commandsCovered: [
    "pik docs scan",
    "pik docs status",
    "pik docs normalize",
    "pik docs index",
    "pik docs index --run",
    "pik docs query",
    "pik docs query --rag",
    "pik docs query --backend graphrag",
    "pik-docs-scan",
    "pik-docs-status",
    "pik-docs-normalize",
    "pik-docs-index",
    "pik-docs-index --run",
    "pik-docs-query",
    "pik-docs-query --rag",
  ],
  evidence,
  commandResults,
  issues,
};

writeJsonReport("rag-command-check.json", data);
writeMarkdownReport("rag-command-check.md", "AI-PIKit RAG Command Verification", summarizeIssues(issues), [
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
