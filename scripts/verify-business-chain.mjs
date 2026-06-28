import path from "node:path";
import {
  kitRoot,
  readText,
  runCommand,
  shellQuote,
  summarizeIssues,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const gates = [
  {
    id: "init-policy",
    script: "verify:init-policy",
    proves: "pik-init can select reference/strict document policy and none/local/external RAG without hidden refresh.",
    report: "verification/reports/init-policy-check.md",
  },
  {
    id: "full-command-surface",
    script: "verify:full-command-surface",
    proves: "Every public pik-* bin declared in package.json can execute.",
    report: "verification/reports/full-command-surface-check.md",
  },
  {
    id: "skills-usability",
    script: "verify:skills-usability",
    proves: "Codex / Claude Code / GitHub Copilot runtime packs point to local pik-* workflow commands.",
    report: "verification/reports/skills-usability-check.md",
  },
  {
    id: "workflow-closure",
    script: "verify:workflow-closure",
    proves: "New project, existing project, reference risk waiver, and strict blocking workflow paths close correctly.",
    report: "verification/reports/workflow-closure-check.md",
  },
  {
    id: "policy-hardening",
    script: "verify:policy-hardening",
    proves: "Policy lock/verify/diff and privacy/freshness/citation blocking remain coherent.",
    report: "verification/reports/policy-hardening-check.md",
  },
  {
    id: "docs-completeness",
    script: "verify:docs-completeness",
    proves: "README and command manual expose the same command surface and examples.",
    report: "verification/reports/docs-completeness-check.md",
  },
];

const results = [];
const issues = [];
const evidence = [];

function addIssue(id, detail) {
  issues.push({ id, detail });
}

for (const gate of gates) {
  const result = runCommand(`npm run ${gate.script}`, "npm", ["run", gate.script], {
    cwd: kitRoot,
    timeout: 900000,
    allowFailure: true,
  });
  results.push({
    ...gate,
    status: result.status === 0 ? "PASS" : "FAIL",
    exitCode: result.status,
    stdout: result.stdout.trim().slice(0, 4000),
    stderr: result.stderr.trim().slice(0, 4000),
  });
  if (result.status === 0) evidence.push(`${gate.id}: PASS`);
  else addIssue(gate.id, `npm run ${gate.script} exited ${result.status}`);
}

const readme = readText(path.join(kitRoot, "README.md"));
const changelog = readText(path.join(kitRoot, "docs", "changelog.md"));
const qualityPlan = readText(path.join(kitRoot, "docs", "quality-plan.md"));
const packageJson = readText(path.join(kitRoot, "package.json"));

const docAssertions = [
  ["README documents default reference/rag none", readme.includes("--doc-policy reference") && readme.includes("--rag none")],
  ["README documents strict/local", readme.includes("--doc-policy strict") && readme.includes("--rag local")],
  ["README documents external opt-in", readme.includes("--allow-external-rag")],
  ["Changelog records MVP4.3", changelog.includes("MVP4.3 Init Wizard")],
  ["Quality plan includes verify:init-policy", qualityPlan.includes("verify:init-policy")],
  ["package verify:quality includes init policy", packageJson.includes("verify:init-policy")],
];

for (const [label, ok] of docAssertions) {
  if (ok) evidence.push(label);
  else addIssue("documentation-chain", label);
}

const businessChains = [
  {
    name: "轻量接入链",
    status: results.find((item) => item.id === "init-policy")?.status === "PASS"
      && results.find((item) => item.id === "workflow-closure")?.status === "PASS"
      ? "PASS"
      : "FAIL",
    checkpoints: [
      "default reference + rag none",
      "rag none blocks GraphRAG run/query",
      "reference/no-doc workflow writes WAIVED_WITH_RISK",
      "no hidden heavy refresh",
    ],
  },
  {
    name: "严格文档链",
    status: results.find((item) => item.id === "init-policy")?.status === "PASS"
      && results.find((item) => item.id === "policy-hardening")?.status === "PASS"
      ? "PASS"
      : "FAIL",
    checkpoints: [
      "strict cannot use rag none",
      "strict local writes local setup plan",
      "missing citation / stale graph fail under strict",
      "external provider/API key/URL fail unless explicitly opted in",
    ],
  },
  {
    name: "Runtime skills 链",
    status: results.find((item) => item.id === "skills-usability")?.status === "PASS" ? "PASS" : "FAIL",
    checkpoints: [
      "Codex skills render",
      "Claude Code skills render",
      "GitHub Copilot prompts render",
      "skills point to local bin/pik.mjs and pik-* examples",
    ],
  },
  {
    name: "文档/命令一致性链",
    status: results.find((item) => item.id === "docs-completeness")?.status === "PASS"
      && results.find((item) => item.id === "full-command-surface")?.status === "PASS"
      ? "PASS"
      : "FAIL",
    checkpoints: [
      "package bin commands execute",
      "commands.html has anchors/details",
      "README key commands link to details",
      "no executable gsd-* guidance",
    ],
  },
];

for (const chain of businessChains) {
  if (chain.status !== "PASS") addIssue("business-chain", `${chain.name} is ${chain.status}`);
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  gates: results,
  businessChains,
  evidence,
  issues,
};

writeJsonReport("business-chain-audit.json", data);
writeMarkdownReport("business-chain-audit.md", "AI-PIKit Business Chain Audit", summarizeIssues(issues), [
  {
    title: "业务链结果",
    body: businessChains.map((chain) => [
      `- ${chain.status} ${chain.name}`,
      ...chain.checkpoints.map((checkpoint) => `  - ${checkpoint}`),
    ].join("\n")),
  },
  {
    title: "Gate 结果",
    body: results.map((result) => `- ${result.status} \`npm run ${result.script}\`: ${result.proves} 报告 \`${result.report}\``),
  },
  {
    title: "文档断链检查",
    body: docAssertions.map(([label, ok]) => `- ${ok ? "PASS" : "FAIL"} ${label}`),
  },
  {
    title: "问题",
    body: issues.length ? issues.map((issue) => `- \`${issue.id}\`: ${issue.detail}`) : ["未发现当前业务链断链。"],
  },
  {
    title: "复现",
    body: [`- \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-business-chain.mjs"))}\``],
  },
]);

console.log(`business chain audit ${data.status} gates=${gates.length} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
