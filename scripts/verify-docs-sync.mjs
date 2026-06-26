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
const workRoot = tempRoot("aipikit-docs-sync-");
const projectRoot = path.join(workRoot, "project");
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

function pik(args = [], options = {}) {
  const command = `pik ${args.join(" ")}`;
  return record(command, runCommand(command, "node", [pikCli, ...args], {
    cwd: projectRoot,
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
    addIssue(command, `missing file: ${path.relative(projectRoot, filePath)}`);
    return;
  }
  assertIncludes(command, read(filePath), expected);
}

function assertFileMissing(command, filePath) {
  if (fs.existsSync(filePath)) addIssue(command, `file should not exist: ${path.relative(projectRoot, filePath)}`);
  else evidence.push(`${command}: file absent ${path.relative(projectRoot, filePath)}`);
}

function updateConfig(mutator) {
  const configPath = path.join(projectRoot, ".planning", "config.json");
  const config = JSON.parse(read(configPath));
  mutator(config);
  write(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

fs.mkdirSync(projectRoot, { recursive: true });
write(path.join(projectRoot, "src", "app.js"), "export const docsSyncFixture = true;\n");
write(path.join(projectRoot, "docs", "spec.md"), [
  "# Docs Sync Spec",
  "",
  "DOCS_SYNC_SENTINEL_4101 first version.",
  "",
].join("\n"));

pik(["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "docs_sync_fixture", "--mode", "new", "--force"]);

write(path.join(projectRoot, ".planning", "fixtures", "fake-rag-index.mjs"), [
  "import fs from 'node:fs';",
  "import path from 'node:path';",
  "const out = path.join(process.cwd(), 'graphrag-workspace', 'output');",
  "fs.mkdirSync(out, { recursive: true });",
  "fs.writeFileSync(path.join(out, 'docs-sync-index.txt'), 'DOCS_SYNC_INDEX_OK');",
  "console.log('DOCS_SYNC_INDEX_OK');",
  "",
].join("\n"));
updateConfig((config) => {
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
    api_base: "http://127.0.0.1:11434",
    index_command: "node .planning/fixtures/fake-rag-index.mjs",
  };
});

const firstSync = pik(["docs", "sync", "--target", projectRoot]);
assertIncludes("first docs sync", firstSync.output, "docs sync STALE_NEEDS_REFRESH");
assertIncludes("first docs sync heavy", firstSync.output, "heavy refresh executed: no");
assertFileIncludes("DOCS_SYNC first", path.join(projectRoot, ".planning", "knowledge", "DOCS_SYNC.md"), "Status: STALE_NEEDS_REFRESH");
assertFileMissing("default docs sync no RAG index", path.join(projectRoot, ".planning", "knowledge", "RAG_INDEX_RESULT.md"));

pik(["docs", "citations", "--target", projectRoot, "DOCS_SYNC_SENTINEL_4101"]);
const cleanSync = pik(["docs", "sync", "--target", projectRoot]);
assertIncludes("clean docs sync", cleanSync.output, "docs sync PASS");
assertFileIncludes("DOCS_SYNC clean", path.join(projectRoot, ".planning", "knowledge", "DOCS_SYNC.md"), "Citation audit: PASS");

write(path.join(projectRoot, "docs", "spec.md"), [
  "# Docs Sync Spec",
  "",
  "DOCS_SYNC_SENTINEL_4101 second version.",
  "DOCS_SYNC_SENTINEL_4102 changed.",
  "",
].join("\n"));
const modifiedSync = pik(["docs", "sync", "--target", projectRoot]);
assertIncludes("modified docs sync", modifiedSync.output, "docs sync STALE_NEEDS_REFRESH");
assertIncludes("modified docs sync count", modifiedSync.output, "modified 1");

pik(["docs", "citations", "--target", projectRoot, "DOCS_SYNC_SENTINEL_4102"]);
const indexedSync = pik(["docs", "sync", "--target", projectRoot, "--index"], { timeout: 300000 });
assertIncludes("indexed docs sync heavy", indexedSync.output, "heavy refresh executed: yes");
assertIncludes("indexed docs sync status", indexedSync.output, "index success");
assertFileIncludes("RAG index result", path.join(projectRoot, ".planning", "knowledge", "RAG_INDEX_RESULT.md"), "Status: success");

fs.rmSync(path.join(projectRoot, "docs", "spec.md"));
const removedSync = pik(["docs", "sync", "--target", projectRoot]);
assertIncludes("removed docs sync", removedSync.output, "docs sync STALE_NEEDS_REFRESH");
assertIncludes("removed docs sync count", removedSync.output, "removed 1");

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  evidence,
  commandResults,
  issues,
};

writeJsonReport("docs-sync-check.json", data);
writeMarkdownReport("docs-sync-check.md", "AI-PIKit Docs Sync Verification", summarizeIssues(issues), [
  { title: "证据", body: evidence.length ? evidence.map((item) => `- ${item}`) : ["未记录证据。"] },
  {
    title: "Fixture 路径",
    body: [
      `- Work root: \`${workRoot}\``,
      `- Project root: \`${projectRoot}\``,
      `- 复现命令: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-docs-sync.mjs"))}\``,
    ],
  },
  { title: "问题", body: issues.length ? issues.map((issue) => `- \`${issue.command}\`: ${issue.detail}`) : ["未发现 docs-sync 问题。"] },
]);

console.log(`docs sync check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
