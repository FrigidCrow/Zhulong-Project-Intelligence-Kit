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
const workRoot = tempRoot("zhulong-knowledge-reliability-");
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

function zl(args = [], options = {}) {
  const command = `zl ${args.join(" ")}`;
  return record(command, runCommand(command, "node", [zlCli, ...args], {
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

fs.mkdirSync(projectRoot, { recursive: true });
write(path.join(projectRoot, "src", "knowledge.js"), "export const knowledgeReliabilityFixture = true;\n");
write(path.join(projectRoot, "docs", "qa", "QA-900.md"), [
  "# QA-900",
  "",
  "KNOWLEDGE_RELIABILITY_SENTINEL_4301 must be cited before completion.",
  "",
].join("\n"));

zl(["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "knowledge_reliability_fixture", "--mode", "new", "--force"]);
const sync = zl(["docs", "sync", "--target", projectRoot]);
assertIncludes("knowledge docs sync status", sync.output, "docs sync STALE_NEEDS_REFRESH");
assertIncludes("knowledge docs sync light", sync.output, "heavy refresh executed: no");

const query = zl(["docs", "query", "--target", projectRoot, "KNOWLEDGE_RELIABILITY_SENTINEL_4301"]);
assertIncludes("knowledge docs query writes result", query.output, "DOCS_QUERY_RESULT.md");
assertFileIncludes("DOCS_QUERY_RESULT", path.join(projectRoot, ".planning", "knowledge", "DOCS_QUERY_RESULT.md"), "KNOWLEDGE_RELIABILITY_SENTINEL_4301");

const audit = zl(["answer", "audit", "--target", projectRoot]);
assertIncludes("knowledge answer audit", audit.output, "answer audit PASS");
assertIncludes("knowledge answer audit light", audit.output, "heavy refresh executed: no");
assertFileIncludes("ANSWER_AUDIT", path.join(projectRoot, ".planning", "quality", "ANSWER_AUDIT.md"), "Status: PASS");

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  evidence,
  commandResults,
  issues,
};

writeJsonReport("knowledge-reliability-check.json", data);
writeMarkdownReport("knowledge-reliability-check.md", "Zhulong Knowledge Reliability Lite Verification", summarizeIssues(issues), [
  { title: "证据", body: evidence.length ? evidence.map((item) => `- ${item}`) : ["未记录证据。"] },
  {
    title: "Fixture 路径",
    body: [
      `- Work root: \`${workRoot}\``,
      `- Project root: \`${projectRoot}\``,
      `- 复现命令: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-knowledge-reliability.mjs"))}\``,
    ],
  },
  { title: "问题", body: issues.length ? issues.map((issue) => `- \`${issue.command}\`: ${issue.detail}`) : ["未发现 knowledge reliability 问题。"] },
]);

console.log(`knowledge reliability check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
