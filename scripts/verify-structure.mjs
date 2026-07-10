import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  runCommand,
  summarizeIssues,
  tempRoot,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const zlCli = path.join(kitRoot, "bin", "zl.mjs");
const workRoot = tempRoot("zhulong-structure-");
const projectRoot = path.join(workRoot, "project");
const issues = [];
const evidence = [];

function writeJson(relativePath, data) {
  const filePath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function run(args, expected = 0) {
  const result = runCommand(args.join(" "), "node", [zlCli, ...args], { cwd: projectRoot, allowFailure: true });
  if (result.status !== expected) issues.push({ case: args.join(" "), detail: `exit ${result.status}, expected ${expected}` });
  else evidence.push(`${args.join(" ")}: exit ${expected}`);
  return result;
}

function assert(condition, caseName, detail) {
  if (!condition) issues.push({ case: caseName, detail });
  else evidence.push(`${caseName}: ${detail}`);
}

fs.mkdirSync(projectRoot, { recursive: true });
const advisory = run(["structure", "audit", "--target", projectRoot]);
assert(advisory.output.includes("structure audit WAIVED_WITH_RISK"), "advisory", "missing artifacts do not block default mode");
run(["structure", "audit", "--target", projectRoot, "--strict"], 1);

writeJson(".planning/knowledge/DOCUMENT_INDEX.json", { documents: [] });
writeJson(".planning/quality/ANSWER_AUDIT.json", { status: "PASS", citations: [], metrics: {} });
writeJson(".planning/quality/AMBIGUITY_AUDIT.json", { status: "PASS", ambiguity_hits: 0, records: [] });
writeJson(".planning/trace/TRACE_MATRIX.json", { rows: [], summary: {} });
writeJson(".planning/refresh/REFRESH_STATE.json", { version: 1, rag: null, graph: null });
const strictPass = run(["structure", "audit", "--target", projectRoot, "--strict"]);
assert(strictPass.output.includes("structure audit PASS"), "strict pass", "all mini-schema contracts pass");
const report = JSON.parse(fs.readFileSync(path.join(projectRoot, ".planning", "quality", "STRUCTURE_AUDIT.json"), "utf8"));
assert(report.structure_compliance_rate === 1, "compliance rate", "rate is 1 for valid fixture");
assert(report.total === 5, "contract count", "five key artifacts checked");

const data = { generated: new Date().toISOString(), status: issues.length ? "FAIL" : "PASS", workRoot, evidence, issues };
writeJsonReport("structure-check.json", data);
writeMarkdownReport("structure-check.md", "Zhulong Structure Audit Verification", summarizeIssues(issues), [
  { title: "证据", body: evidence.map((item) => `- ${item}`) },
  { title: "问题", body: issues.length ? issues.map((item) => `- ${item.case}: ${item.detail}`) : ["未发现问题。"] },
]);
console.log(`structure check ${data.status} issues=${issues.length}`);
if (issues.length) process.exitCode = 1;
