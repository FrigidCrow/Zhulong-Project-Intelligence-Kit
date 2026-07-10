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
const workRoot = tempRoot("zhulong-graph-hardening-");
const projectRoot = path.join(workRoot, "project");
const issues = [];
const evidence = [];

function write(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
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
  assertIncludes(label, fs.readFileSync(filePath, "utf8"), expected);
}

function zl(args, options = {}) {
  return runCommand(`zl ${args.join(" ")}`, "node", [zlCli, ...args], {
    cwd: projectRoot,
    timeout: 120000,
    ...options,
  });
}

fs.mkdirSync(projectRoot, { recursive: true });
write(path.join(projectRoot, "src", "approval.js"), "export function approve() { return 'APPROVAL_NODE'; }\n");
write(path.join(projectRoot, "src", "service.js"), "import { approve } from './approval.js'; export function service(){ return approve(); }\n");
write(path.join(projectRoot, "test", "approval.test.js"), "import { approve } from '../src/approval.js'; console.log(approve());\n");

zl(["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "graph_hardening_fixture", "--mode", "existing", "--force"]);
const graphPath = path.join(projectRoot, ".planning", "graphs", "graph.json");
const reportPath = path.join(projectRoot, ".planning", "graphs", "GRAPH_REPORT.md");
write(graphPath, `${JSON.stringify({
  nodes: [
    { id: "src/approval.js", path: "src/approval.js", kind: "module" },
    { id: "src/service.js", path: "src/service.js", kind: "module" },
    { id: "test/approval.test.js", path: "test/approval.test.js", kind: "test" },
  ],
  edges: [
    { source: "src/service.js", target: "src/approval.js", type: "imports" },
    { source: "test/approval.test.js", target: "src/approval.js", type: "tests" },
  ],
}, null, 2)}\n`);
write(reportPath, "# Graph Report\n\n- GRAPH_HARDENING_SENTINEL\n");
const future = new Date(Date.now() + 5000);
fs.utimesSync(graphPath, future, future);
fs.utimesSync(reportPath, future, future);

const fresh = zl(["graph", "freshness", "--target", projectRoot, "--strict"]);
assertIncludes("zl graph freshness", fresh.output, "Freshness: fresh");
assertFileIncludes("GRAPH_FRESHNESS", path.join(projectRoot, ".planning", "graphs", "GRAPH_FRESHNESS.md"), "State: fresh");

const impact = zl(["graph", "impact", "--target", projectRoot, "--files", "src/approval.js"]);
assertIncludes("zl graph impact", impact.output, "matched 1");
assertIncludes("zl graph impact", impact.output, "impacted nodes");
assertFileIncludes("GRAPH_IMPACT", path.join(projectRoot, ".planning", "graphs", "GRAPH_IMPACT.md"), "src/service.js");

const risk = zl(["graph", "risk", "--target", projectRoot]);
assertIncludes("zl graph risk", risk.output, "high coupling");
assertFileIncludes("GRAPH_RISK", path.join(projectRoot, ".planning", "graphs", "GRAPH_RISK.md"), "src/approval.js");
assertFileIncludes("GRAPH_RISK", path.join(projectRoot, ".planning", "graphs", "GRAPH_RISK.md"), "approval.test.js");

const newer = new Date(Date.now() + 15000);
fs.utimesSync(path.join(projectRoot, "src", "approval.js"), newer, newer);
const stale = zl(["graph", "freshness", "--target", projectRoot, "--strict"], { allowFailure: true });
if (stale.status === 0) addIssue("zl graph freshness stale", "expected non-zero for stale graph in strict mode");
assertIncludes("zl graph freshness stale", stale.output, "Freshness: STALE");

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  evidence,
  issues,
};

writeJsonReport("graph-hardening-check.json", data);
writeMarkdownReport("graph-hardening-check.md", "Zhulong Graph Impact/Risk/Freshness Verification", summarizeIssues(issues), [
  { title: "Evidence", body: evidence.length ? evidence.map((item) => `- ${item}`) : ["No evidence recorded."] },
  {
    title: "Fixture Paths",
    body: [
      `- Work root: \`${workRoot}\``,
      `- Project root: \`${projectRoot}\``,
      `- Reproduce command: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-graph-hardening.mjs"))}\``,
    ],
  },
  { title: "Issues", body: issues.length ? issues.map((issue) => `- ${issue.label}: ${issue.detail}`) : ["No graph hardening issues found."] },
]);

console.log(`graph hardening check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
