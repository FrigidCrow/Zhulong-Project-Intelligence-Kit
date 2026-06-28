import path from "node:path";
import {
  kitRoot,
  runCommand,
  shellQuote,
  summarizeIssues,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const checks = [
  "check",
  "verify:quality",
  "verify:full-command-surface",
  "verify:integration",
  "verify:runtime",
  "verify:skills-usability",
  "verify:workflow-closure",
  "verify:cockpit-build",
  "verify:init-policy",
  "verify:business-chain",
  "verify:docs-completeness",
];
const results = [];
const issues = [];
const evidence = [];

writeJsonReport("quality-closure-check.json", {
  generated: new Date().toISOString(),
  status: "RUNNING",
  checks,
  results: [],
  evidence: ["quality closure gate started"],
  issues: [],
});
writeMarkdownReport("quality-closure-check.md", "AI-PIKit Quality Closure Verification", ["状态: RUNNING", "问题数: 0"], [
  {
    title: "聚合 Gate",
    body: checks.map((script) => `- PENDING \`npm run ${script}\``),
  },
  {
    title: "说明",
    body: ["This placeholder is written before nested documentation checks so repository-local report links are resolvable. The final result overwrites it at the end of the run."],
  },
]);

for (const script of checks) {
  const result = runCommand(`npm run ${script}`, "npm", ["run", script], {
    cwd: kitRoot,
    timeout: 900000,
    allowFailure: true,
  });
  results.push({
    script,
    status: result.status,
    stdout: result.stdout.trim().slice(0, 5000),
    stderr: result.stderr.trim().slice(0, 5000),
  });
  if (result.status === 0) evidence.push(`npm run ${script}: PASS`);
  else issues.push({ script, detail: `exit ${result.status}` });
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  checks,
  results,
  evidence,
  issues,
};

writeJsonReport("quality-closure-check.json", data);
writeMarkdownReport("quality-closure-check.md", "AI-PIKit Quality Closure Verification", summarizeIssues(issues), [
  {
    title: "聚合 Gate",
    body: checks.map((script) => {
      const result = results.find((item) => item.script === script);
      return `- ${result?.status === 0 ? "PASS" : "FAIL"} \`npm run ${script}\``;
    }),
  },
  {
    title: "边界",
    body: [
      "- 本 gate 覆盖 MVP4.2 新增的 `pik-cockpit-build`，但不会在验证中触发重刷新。",
      "- 默认验证使用本地 fixture，不需要外部 LLM / API key。",
      "- policy、workflow、skills、docs completeness 检查不得触发隐藏 heavy refresh。",
      "- cockpit build 检查只读取本地 artifact，不执行 GraphRAG index 或 Graphify build。",
    ],
  },
  {
    title: "问题",
    body: issues.length ? issues.map((issue) => `- \`npm run ${issue.script}\`: ${issue.detail}`) : ["未发现 quality closure 问题。"],
  },
  {
    title: "复现",
    body: [`- \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-quality-closure.mjs"))}\``],
  },
]);

console.log(`quality closure check ${data.status} checks=${checks.length} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
