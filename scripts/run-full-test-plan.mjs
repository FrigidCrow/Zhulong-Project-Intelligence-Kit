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

const args = process.argv.slice(2);
const runIdArg = args.find((arg) => arg.startsWith("--run-id="));
const runIdValue = runIdArg ? runIdArg.slice("--run-id=".length) : args[args.indexOf("--run-id") + 1];
const runId = (runIdValue || new Date().toISOString().replace(/[:.]/g, "-")).replace(/[^A-Za-z0-9_.-]/g, "-");
const issues = [];
const commandResults = [];

function reportBaseName() {
  if (runId === "round-1") return "full-test-round-1";
  if (runId === "round-2") return "full-test-round-2";
  return `full-test-${runId}`;
}

function runStep(label, command, timeout = 2400000) {
  const startedAt = new Date().toISOString();
  const result = runCommand(label, "bash", ["-lc", command], {
    cwd: kitRoot,
    timeout,
    allowFailure: true,
  });
  const finishedAt = new Date().toISOString();
  const item = {
    label,
    command,
    status: result.status,
    startedAt,
    finishedAt,
    stdout: result.stdout.trim().slice(-6000),
    stderr: result.stderr.trim().slice(-6000),
  };
  commandResults.push(item);
  if (result.status !== 0) issues.push({ command: label, detail: `exit ${result.status}` });
  return item;
}

const steps = [
  { label: "syntax check", command: "npm run check", timeout: 240000 },
  { label: "quality verification", command: "npm run verify:quality", timeout: 3600000 },
  { label: "integration verification", command: "npm run verify:integration", timeout: 3600000 },
  { label: "full command surface verification", command: "npm run verify:full-command-surface", timeout: 3600000 },
  { label: "cockpit build verification", command: "npm run verify:cockpit-build", timeout: 240000 },
  { label: "quality closure verification", command: "npm run verify:quality-closure", timeout: 3600000 },
];

for (const step of steps) {
  runStep(step.label, step.command, step.timeout);
}

const base = reportBaseName();
const data = {
  generated: new Date().toISOString(),
  runId,
  status: issues.length === 0 ? "PASS" : "FAIL",
  plan: "docs/full-test-plan.md",
  steps: commandResults,
  issues,
};

writeJsonReport(`${base}.json`, data);
writeMarkdownReport(`${base}.md`, `Zhulong 全量测试计划 ${runId}`, summarizeIssues(issues), [
  {
    title: "测试计划",
    body: [
      "- Source: `docs/full-test-plan.md`",
      "- 规则：正式测试轮如果失败，先记录到本报告；修复属于后续轮次。",
    ],
  },
  {
    title: "步骤",
    body: commandResults.map((item) => [
      `### ${item.label}`,
      "",
      `- Command: \`${item.command}\``,
      `- Status: ${item.status === 0 ? "PASS" : "FAIL"} (${item.status})`,
      `- Started: ${item.startedAt}`,
      `- Finished: ${item.finishedAt}`,
      "",
      "stdout 尾部:",
      "",
      "```text",
      item.stdout || "(empty)",
      "```",
      "",
      "stderr 尾部:",
      "",
      "```text",
      item.stderr || "(empty)",
      "```",
    ].join("\n")).flatMap((block) => block.split("\n")),
  },
  {
    title: "问题",
    body: issues.length ? issues.map((issue) => `- \`${issue.command}\`: ${issue.detail}`) : ["未发现全量测试问题。"],
  },
  {
    title: "复现",
    body: [`- \`node ${shellQuote(path.join(kitRoot, "scripts", "run-full-test-plan.mjs"))} --run-id ${runId}\``],
  },
]);

console.log(`full test plan ${data.status} run=${runId} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
