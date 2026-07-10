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
const workRoot = tempRoot("zhulong-answer-audit-");
const projectRoot = path.join(workRoot, "project");
const missingSourceRoot = path.join(workRoot, "missing-source-project");
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

function zl(target, args = [], options = {}) {
  const command = `zl ${args.join(" ")}`;
  return record(command, runCommand(command, "node", [zlCli, ...args], {
    cwd: target,
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

function assertFileMissing(command, filePath) {
  if (fs.existsSync(filePath)) addIssue(command, `file should not exist: ${path.relative(workRoot, filePath)}`);
  else evidence.push(`${command}: file absent ${path.relative(workRoot, filePath)}`);
}

fs.mkdirSync(projectRoot, { recursive: true });
write(path.join(projectRoot, "src", "approval.js"), "export const answerAuditFixture = true;\n");
write(path.join(projectRoot, "docs", "spec.md"), [
  "# Answer Audit Spec",
  "",
  "ANSWER_AUDIT_SENTINEL_4201 source-backed answer.",
  "",
].join("\n"));

zl(projectRoot, ["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "answer_audit_fixture", "--mode", "new", "--force"]);
zl(projectRoot, ["docs", "sync", "--target", projectRoot]);
const query = zl(projectRoot, ["docs", "query", "--target", projectRoot, "ANSWER_AUDIT_SENTINEL_4201"]);
assertIncludes("docs query writes result", query.output, "DOCS_QUERY_RESULT.md");
assertIncludes("docs query auto audit", query.output, "answer audit auto PASS");

const defaultAudit = zl(projectRoot, ["answer", "audit", "--target", projectRoot]);
assertIncludes("default answer audit pass", defaultAudit.output, "answer audit PASS");
assertFileIncludes("ANSWER_AUDIT default", path.join(projectRoot, ".planning", "quality", "ANSWER_AUDIT.md"), "Status: PASS");

const explicitAudit = zl(projectRoot, ["answer", "audit", "--target", projectRoot, "--from", ".planning/knowledge/DOCS_QUERY_RESULT.md"]);
assertIncludes("explicit answer audit pass", explicitAudit.output, "answer audit PASS");

const inlineAudit = zl(projectRoot, ["answer", "audit", "--target", projectRoot, "--answer", "ANSWER_AUDIT_SENTINEL_4201 [docs/spec.md:3]"]);
assertIncludes("inline answer audit pass", inlineAudit.output, "answer audit PASS");
const inlineMetrics = JSON.parse(read(path.join(projectRoot, ".planning", "quality", "ANSWER_AUDIT.json"))).metrics;
if (inlineMetrics.citation_resolve_rate !== 1) addIssue("answer metrics", `citation_resolve_rate=${inlineMetrics.citation_resolve_rate}`);
else evidence.push("answer metrics: citation_resolve_rate=1");

zl(projectRoot, ["answer", "audit", "--target", projectRoot, "--answer", "The approved limit is 5000. [docs/spec.md:3]"]);
const driftMetrics = JSON.parse(read(path.join(projectRoot, ".planning", "quality", "ANSWER_AUDIT.json"))).metrics;
if (driftMetrics.value_drift_count < 1) addIssue("answer metrics", "numeric drift was not detected");
else evidence.push(`answer metrics: value_drift_count=${driftMetrics.value_drift_count}`);

const configPath = path.join(projectRoot, ".planning", "config.json");
const config = JSON.parse(read(configPath));
config.knowledge = { ...(config.knowledge || {}), auto_answer_audit: false };
write(configPath, `${JSON.stringify(config, null, 2)}\n`);
fs.rmSync(path.join(projectRoot, ".planning", "quality", "ANSWER_AUDIT.md"), { force: true });
fs.rmSync(path.join(projectRoot, ".planning", "quality", "ANSWER_AUDIT.json"), { force: true });
const disabledAuto = zl(projectRoot, ["docs", "query", "--target", projectRoot, "ANSWER_AUDIT_SENTINEL_4201"]);
assertIncludes("auto audit config", disabledAuto.output, "auto-run disabled");
assertFileMissing("auto audit config", path.join(projectRoot, ".planning", "quality", "ANSWER_AUDIT.json"));
config.knowledge.auto_answer_audit = true;
write(configPath, `${JSON.stringify(config, null, 2)}\n`);

const invalidCitation = zl(projectRoot, ["answer", "audit", "--target", projectRoot, "--answer", "bad citation [docs/missing.md:1]"], { expectedStatus: 1 });
assertIncludes("invalid citation fails", invalidCitation.output, "answer audit FAIL");
assertIncludes("invalid citation missing source", invalidCitation.output, "source file missing");

const waived = zl(projectRoot, ["answer", "audit", "--target", projectRoot, "--answer", "No citation in this default-local-rag answer."]);
assertIncludes("missing citation waived", waived.output, "answer audit WAIVED_WITH_RISK");

zl(projectRoot, ["mode", "set", "--target", projectRoot, "full-strict"]);
const strictMissing = zl(projectRoot, ["answer", "audit", "--target", projectRoot, "--answer", "No citation in this full-strict answer."], { expectedStatus: 1 });
assertIncludes("strict missing citation fails", strictMissing.output, "answer audit FAIL");

fs.rmSync(path.join(projectRoot, ".planning", "quality", "ANSWER_AUDIT.md"), { force: true });
fs.rmSync(path.join(projectRoot, ".planning", "quality", "ANSWER_AUDIT.json"), { force: true });
const workflow = zl(projectRoot, ["workflow", "run", "--target", projectRoot, "debug", "ANSWER_AUDIT workflow suggestion"], { expectedStatus: 0 });
assertIncludes("workflow does not block command execution", workflow.output, "heavy refresh executed: no");
const facadePath = path.join(projectRoot, ".planning", "workflows", "debug-answer-audit-workflow-suggestion", "WORKFLOW_FACADE.md");
assertFileIncludes("workflow facade suggests answer audit", facadePath, "zl-answer-audit --target <repo>");
assertFileMissing("workflow does not auto-run answer audit", path.join(projectRoot, ".planning", "quality", "ANSWER_AUDIT.md"));

fs.mkdirSync(missingSourceRoot, { recursive: true });
write(path.join(missingSourceRoot, "src", "empty.js"), "export const missingSourceFixture = true;\n");
zl(missingSourceRoot, ["init", "--target", missingSourceRoot, "--template", "greenfield-app", "--name", "missing_source_fixture", "--mode", "new", "--force"]);
const missingSource = zl(missingSourceRoot, ["answer", "audit", "--target", missingSourceRoot], { expectedStatus: 1 });
assertIncludes("missing answer source fails", missingSource.output, "answer audit FAIL");
assertIncludes("missing answer source next", missingSource.output, "zl-docs-query --target <repo>");

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  missingSourceRoot,
  evidence,
  commandResults,
  issues,
};

writeJsonReport("answer-audit-check.json", data);
writeMarkdownReport("answer-audit-check.md", "Zhulong Answer Audit Verification", summarizeIssues(issues), [
  { title: "证据", body: evidence.length ? evidence.map((item) => `- ${item}`) : ["未记录证据。"] },
  {
    title: "Fixture 路径",
    body: [
      `- Work root: \`${workRoot}\``,
      `- Project root: \`${projectRoot}\``,
      `- Missing-source project: \`${missingSourceRoot}\``,
      `- 复现命令: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-answer-audit.mjs"))}\``,
    ],
  },
  { title: "问题", body: issues.length ? issues.map((issue) => `- \`${issue.command}\`: ${issue.detail}`) : ["未发现 answer-audit 问题。"] },
]);

console.log(`answer audit check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
