import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  runCommand,
  shellQuote,
  summarizeIssues,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const pikCli = path.join(kitRoot, "bin", "pik.mjs");
const issues = [];
const evidence = [];

function addIssue(label, detail) {
  issues.push({ label, detail });
}

function assertIncludes(label, text, expected) {
  if (!text.includes(expected)) addIssue(label, `missing expected text: ${expected}`);
  else evidence.push(`${label}: found ${expected}`);
}

const result = runCommand("pik license audit", "node", [pikCli, "license", "audit", "--target", kitRoot], {
  cwd: kitRoot,
  timeout: 180000,
  allowFailure: true,
});
assertIncludes("pik license audit", result.output, "license audit");
assertIncludes("pik license audit", result.output, "write");

const reportPath = path.join(kitRoot, "verification", "reports", "license-audit.md");
if (!fs.existsSync(reportPath)) {
  addIssue("license report", "missing verification/reports/license-audit.md");
} else {
  const report = fs.readFileSync(reportPath, "utf8");
  assertIncludes("license report", report, "Restricted / commercial-review licenses");
  assertIncludes("license report", report, "Non-MIT or unknown items");
  assertIncludes("license report", report, "ollama");
  assertIncludes("license report", report, "graphify");
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  commandStatus: result.status,
  evidence,
  issues,
};

writeJsonReport("license-audit-check.json", data);
writeMarkdownReport("license-audit-check.md", "AI-PIKit License Audit Verification", summarizeIssues(issues), [
  { title: "Evidence", body: evidence.length ? evidence.map((item) => `- ${item}`) : ["No evidence recorded."] },
  {
    title: "Reproduce",
    body: [`- Command: \`node ${shellQuote(pikCli)} license audit --target ${shellQuote(kitRoot)}\``],
  },
  { title: "Issues", body: issues.length ? issues.map((issue) => `- ${issue.label}: ${issue.detail}`) : ["No license audit verifier issues found."] },
]);

console.log(`license audit check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
