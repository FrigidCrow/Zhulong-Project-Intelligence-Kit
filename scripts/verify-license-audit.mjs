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

const zlCli = path.join(kitRoot, "bin", "zl.mjs");
const issues = [];
const evidence = [];

function addIssue(label, detail) {
  issues.push({ label, detail });
}

function assertIncludes(label, text, expected) {
  if (!text.includes(expected)) addIssue(label, `missing expected text: ${expected}`);
  else evidence.push(`${label}: found ${expected}`);
}

const result = runCommand("zl license audit", "node", [zlCli, "license", "audit", "--target", kitRoot], {
  cwd: kitRoot,
  timeout: 180000,
  allowFailure: true,
});
assertIncludes("zl license audit", result.output, "license audit");
assertIncludes("zl license audit", result.output, "write");

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

const noticesPath = path.join(kitRoot, "THIRD_PARTY_LICENSES.md");
if (!fs.existsSync(noticesPath)) {
  addIssue("third-party notices", "missing THIRD_PARTY_LICENSES.md");
} else {
  const notices = fs.readFileSync(noticesPath, "utf8");
  assertIncludes("third-party notices", notices, "Vendored ambiguity wordlists");
  assertIncludes("third-party notices", notices, "None.");
  assertIncludes("third-party notices", notices, "ambiguity-wordlists.json");
  assertIncludes("third-party notices", notices, "Vendored Taste Skill snapshot");
  assertIncludes("third-party notices", notices, "b17742737e796305d829b3ad39eda3add0d79060");
  assertIncludes("third-party notices", notices, "MIT");
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  commandStatus: result.status,
  evidence,
  issues,
};

writeJsonReport("license-audit-check.json", data);
writeMarkdownReport("license-audit-check.md", "Zhulong License Audit Verification", summarizeIssues(issues), [
  { title: "Evidence", body: evidence.length ? evidence.map((item) => `- ${item}`) : ["No evidence recorded."] },
  {
    title: "Reproduce",
    body: [`- Command: \`node ${shellQuote(zlCli)} license audit --target ${shellQuote(kitRoot)}\``],
  },
  { title: "Issues", body: issues.length ? issues.map((issue) => `- ${issue.label}: ${issue.detail}`) : ["No license audit verifier issues found."] },
]);

console.log(`license audit check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
