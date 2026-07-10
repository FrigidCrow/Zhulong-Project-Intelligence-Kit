import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  summarizeIssues,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const issues = [];
const evidence = [];
const settingsPath = path.join(kitRoot, "runtime", "claude-code", "settings.template.json");
const contextPath = path.join(kitRoot, "docs", "context-efficiency.md");

function assert(condition, caseName, detail) {
  if (!condition) issues.push({ case: caseName, detail });
  else evidence.push(`${caseName}: ${detail}`);
}

const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
const deny = settings.permissions?.deny || [];
for (const expected of ["WebFetch", "Bash(curl *)", "Bash(wget *)", "Read(./.env)", "Write(./docs/**)"]) {
  assert(deny.includes(expected), "deny template", `contains ${expected}`);
}
assert(settings.disableAllHooks === true, "hook boundary", "disableAllHooks enabled");
assert(settings.disableBypassPermissionsMode === "disable", "permission bypass", "bypass mode disabled");
const context = fs.readFileSync(contextPath, "utf8");
for (const expected of ["B1 稳定前缀", "B2 引用优先", "B3 制品交接", "B6 Token 用量槽位", "TOKEN_USAGE.json", "重命令边界"]) {
  assert(context.includes(expected), "context efficiency", `contains ${expected}`);
}

const data = { generated: new Date().toISOString(), status: issues.length ? "FAIL" : "PASS", evidence, issues };
writeJsonReport("guardrails-check.json", data);
writeMarkdownReport("guardrails-check.md", "Zhulong Guardrails Verification", summarizeIssues(issues), [
  { title: "证据", body: evidence.map((item) => `- ${item}`) },
  { title: "问题", body: issues.length ? issues.map((item) => `- ${item.case}: ${item.detail}`) : ["未发现问题。"] },
]);
console.log(`guardrails check ${data.status} issues=${issues.length}`);
if (issues.length) process.exitCode = 1;
