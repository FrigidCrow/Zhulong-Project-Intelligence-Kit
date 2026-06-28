import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  readText,
  runCommand,
  shellQuote,
  summarizeIssues,
  tempRoot,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const pikCli = path.join(kitRoot, "bin", "pik.mjs");
const workRoot = tempRoot("aipikit-security-governance-");
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

function pik(args, options = {}) {
  return runCommand(`pik ${args.join(" ")}`, "node", [pikCli, ...args], {
    cwd: projectRoot,
    timeout: 120000,
    ...options,
  });
}

fs.mkdirSync(projectRoot, { recursive: true });
write(path.join(projectRoot, "src", "index.js"), "export const securityGovernanceFixture = true;\n");
write(path.join(projectRoot, "docs", "spec.md"), "# Security Governance Fixture\n\nLOCAL_ONLY_SENTINEL\n");

const initDefault = pik(["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "security_governance_fixture", "--mode", "existing", "--force"]);
assertIncludes("default init", initDefault.output, "RAG backend: none");
const defaultConfig = JSON.parse(readText(path.join(projectRoot, ".planning", "config.json")));
if (defaultConfig.privacy?.network_policy !== "local_only") addIssue("default config", `expected local_only, got ${defaultConfig.privacy?.network_policy}`);
else evidence.push("default config: privacy.network_policy local_only");
if (defaultConfig.privacy?.allow_external_rag !== false) addIssue("default config", "expected allow_external_rag false");
else evidence.push("default config: allow_external_rag false");
if (defaultConfig.privacy?.allow_external_tools !== false) addIssue("default config", "expected allow_external_tools false");
else evidence.push("default config: allow_external_tools false");

const offlineLock = pik(["privacy", "offline-lock", "--target", projectRoot]);
assertIncludes("offline lock", offlineLock.output, "privacy audit PASS");

const strictAudit = pik(["privacy", "audit", "--target", projectRoot, "--strict"]);
assertIncludes("strict privacy audit", strictAudit.output, "privacy audit PASS");

const outboundAudit = pik(["privacy", "outbound", "--target", projectRoot]);
assertIncludes("outbound audit", outboundAudit.output, "outbound audit PASS");

const blockedExternalRoot = path.join(workRoot, "blocked-external");
fs.mkdirSync(blockedExternalRoot, { recursive: true });
const blockedExternal = runCommand("blocked external RAG init", "node", [pikCli, "init", "--target", blockedExternalRoot, "--template", "greenfield-app", "--name", "blocked_external", "--mode", "new", "--doc-policy", "strict", "--rag", "external", "--force"], {
  cwd: workRoot,
  timeout: 120000,
  allowFailure: true,
});
if (blockedExternal.status === 0) addIssue("external RAG opt-in", "expected strict external RAG without --allow-external-rag to fail");
assertIncludes("external RAG opt-in", blockedExternal.output, "External RAG is disabled by default");

const allowedExternalRoot = path.join(workRoot, "allowed-external");
fs.mkdirSync(allowedExternalRoot, { recursive: true });
const allowedExternal = runCommand("allowed external RAG init", "node", [pikCli, "init", "--target", allowedExternalRoot, "--template", "greenfield-app", "--name", "allowed_external", "--mode", "new", "--doc-policy", "strict", "--rag", "external", "--allow-external-rag", "--force"], {
  cwd: workRoot,
  timeout: 120000,
  allowFailure: true,
});
if (allowedExternal.status !== 0) addIssue("allowed external RAG", `expected explicit external RAG opt-in to initialize, got exit ${allowedExternal.status}`);
const externalRisk = path.join(allowedExternalRoot, ".planning", "privacy", "EXTERNAL_RAG_RISK.md");
if (!fs.existsSync(externalRisk)) addIssue("external RAG risk report", "missing EXTERNAL_RAG_RISK.md after explicit opt-in");
else {
  assertIncludes("external RAG risk report", readText(externalRisk), "may be sent to the configured external provider");
}
const allowedConfig = fs.existsSync(path.join(allowedExternalRoot, ".planning", "config.json"))
  ? JSON.parse(readText(path.join(allowedExternalRoot, ".planning", "config.json")))
  : {};
if (allowedConfig.privacy?.allow_external_rag !== true) addIssue("external RAG config", "expected allow_external_rag true after explicit opt-in");
else evidence.push("external RAG config: allow_external_rag true after explicit opt-in");

const runtimeBoundary = readText(path.join(kitRoot, "README.md"));
for (const runtime of ["Codex", "Claude Code", "GitHub Copilot"]) {
  assertIncludes(`runtime boundary ${runtime}`, runtimeBoundary, runtime);
}
assertIncludes("runtime boundary exception", runtimeBoundary, "Codex、Claude Code、GitHub Copilot 是外部 runtime");
assertIncludes("local-only docs", runtimeBoundary, "local-only");
assertIncludes("allow external RAG docs", runtimeBoundary, "--allow-external-rag");

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  score: issues.length === 0 ? 100 : 45,
  external_framework_mapping: {
    owasp_agentic_top_10: "prompt injection, tool misuse, excessive agency, identity/privilege abuse",
    nist_ai_rmf: "govern, map, measure, manage controls for internal AI system risk",
    promptfoo_redteam: "future automated adversarial prompt regression harness",
  },
  evidence,
  issues,
};

writeJsonReport("security-governance-check.json", data);
writeMarkdownReport("security-governance-check.md", "AI-PIKit Security Governance Verification", summarizeIssues(issues), [
  {
    title: "质量边界",
    body: [
      "- 默认 `privacy.network_policy = local_only`。",
      "- 默认 `privacy.allow_external_rag = false`。",
      "- 外部 RAG 必须显式 `--allow-external-rag`，并生成风险报告。",
      "- Codex、Claude Code、GitHub Copilot 是用户主动使用的 coding runtime 例外，不改变 AI-PIKit 命令默认本地边界。",
    ],
  },
  {
    title: "外部机制映射",
    body: Object.entries(data.external_framework_mapping).map(([key, value]) => `- ${key}: ${value}`),
  },
  {
    title: "Evidence",
    body: evidence.length ? evidence.map((item) => `- ${item}`) : ["No evidence recorded."],
  },
  {
    title: "Issues",
    body: issues.length ? issues.map((issue) => `- ${issue.label}: ${issue.detail}`) : ["No security governance issues found."],
  },
  {
    title: "复现",
    body: [`- \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-security-governance.mjs"))}\``],
  },
]);

console.log(`security governance check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
