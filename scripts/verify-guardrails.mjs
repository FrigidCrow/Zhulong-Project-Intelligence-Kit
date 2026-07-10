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
assert(Array.isArray(settings.permissions?.allow) && settings.permissions.allow.length === 0, "neutral permissions", "allow list is explicit and empty by default");
assert(Array.isArray(settings.permissions?.ask) && settings.permissions.ask.length === 0, "neutral permissions", "ask list is explicit and empty by default");
assert(Array.isArray(deny) && deny.length === 0, "neutral permissions", "deny list is empty by default");
for (const key of ["disableAllHooks", "disableBypassPermissionsMode", "disableAutoMode"]) {
  assert(!(key in settings), "platform defaults", `${key} is not overridden by the kit`);
}
const context = fs.readFileSync(contextPath, "utf8");
for (const expected of ["B1 稳定前缀", "B2 引用优先", "B3 制品交接", "B6 Token 用量槽位", "TOKEN_USAGE.json", "重命令边界"]) {
  assert(context.includes(expected), "context efficiency", `contains ${expected}`);
}

const data = { generated: new Date().toISOString(), status: issues.length ? "FAIL" : "PASS", evidence, issues };
writeJsonReport("guardrails-check.json", data);
writeMarkdownReport("guardrails-check.md", "Zhulong Runtime Boundary Verification", summarizeIssues(issues), [
  { title: "证据", body: evidence.map((item) => `- ${item}`) },
  { title: "问题", body: issues.length ? issues.map((item) => `- ${item.case}: ${item.detail}`) : ["未发现问题。"] },
]);
console.log(`guardrails check ${data.status} issues=${issues.length}`);
if (issues.length) process.exitCode = 1;
