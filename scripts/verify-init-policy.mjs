import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  kitRoot,
  runCommand,
  shellQuote,
  summarizeIssues,
  tempRoot,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const pikCli = path.join(kitRoot, "bin", "pik.mjs");
const workRoot = tempRoot("aipikit-init-policy-");
const issues = [];
const evidence = [];
const commandResults = [];

function write(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function project(name) {
  const root = path.join(workRoot, name);
  fs.mkdirSync(root, { recursive: true });
  write(path.join(root, "src", "index.js"), "export const sentinel = true;\n");
  write(path.join(root, "docs", "spec.md"), "# Spec\n\nINIT_POLICY_SENTINEL\n");
  return root;
}

function addIssue(command, detail) {
  issues.push({ command, detail });
}

function record(command, result, expectedStatus = 0) {
  commandResults.push({
    command,
    status: result.status,
    expectedStatus,
    stdout: result.stdout.trim().slice(0, 3000),
    stderr: result.stderr.trim().slice(0, 3000),
  });
  if (result.status !== expectedStatus) addIssue(command, `exit ${result.status}, expected ${expectedStatus}`);
  else evidence.push(`${command}: exit ${expectedStatus}`);
  return result;
}

function pik(cwd, args = [], expectedStatus = 0) {
  const command = `pik ${args.join(" ")}`;
  return record(command, runCommand(command, "node", [pikCli, ...args], {
    cwd,
    timeout: 240000,
    allowFailure: true,
  }), expectedStatus);
}

function pikInteractive(cwd, args = [], input = "", expectedStatus = 0) {
  const command = `pik ${args.join(" ")} <interactive>`;
  const result = spawnSync("node", [pikCli, ...args], {
    cwd,
    input,
    encoding: "utf8",
    env: { ...process.env },
    timeout: 240000,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return record(command, {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    output: `${result.stdout || ""}${result.stderr || ""}`,
  }, expectedStatus);
}

function assertIncludes(command, text, expected) {
  if (!text.includes(expected)) addIssue(command, `missing expected text: ${expected}`);
  else evidence.push(`${command}: found ${expected}`);
}

function assertNotExists(command, filePath) {
  if (fs.existsSync(filePath)) addIssue(command, `unexpected path exists: ${path.relative(workRoot, filePath)}`);
  else evidence.push(`${command}: path absent ${path.relative(workRoot, filePath)}`);
}

function assertFileIncludes(command, filePath, expected) {
  if (!fs.existsSync(filePath)) {
    addIssue(command, `missing file: ${path.relative(workRoot, filePath)}`);
    return;
  }
  assertIncludes(command, read(filePath), expected);
}

function config(root) {
  return JSON.parse(read(path.join(root, ".planning", "config.json")));
}

function assertConfig(command, root, predicate, detail) {
  if (!predicate(config(root))) addIssue(command, detail);
  else evidence.push(`${command}: ${detail}`);
}

function validateDefaultReferenceNone() {
  const root = project("reference-none");
  const init = pik(root, ["init", "--target", root, "--template", "greenfield-app", "--name", "reference_none", "--mode", "new", "--force"]);
  assertIncludes("default init policy", init.output, "Document policy: reference");
  assertIncludes("default init rag", init.output, "RAG backend: none");
  assertIncludes("default init heavy", init.output, "Heavy refresh executed: no");
  assertConfig("default config document_policy", root, (c) => c.document_policy === "reference", "document_policy is reference");
  assertConfig("default config rag_backend", root, (c) => c.rag_backend === "none", "rag_backend is none");
  assertConfig("default config profile", root, (c) => c.execution_budget?.profile === "graph-lite", "profile is graph-lite");
  assertConfig("default config spec disabled", root, (c) => c.spec_context?.enabled === false, "spec_context disabled");
  assertConfig("default config graphrag disabled", root, (c) => c.graphrag?.enabled === false, "graphrag disabled");
  assertFileIncludes("default INIT_PROFILE", path.join(root, ".planning", "INIT_PROFILE.md"), "RAG backend: `none`");
  assertNotExists("default no graphrag workspace", path.join(root, "graphrag-workspace", "settings.yaml"));

  const mode = pik(root, ["mode", "status", "--target", root]);
  assertIncludes("default mode document policy", mode.output, "Document policy: reference");
  assertIncludes("default mode rag backend", mode.output, "RAG backend: none");
  assertIncludes("default mode internal profile", mode.output, "Internal profile: graph-lite");

  const index = pik(root, ["docs", "index", "--target", root, "--run"], 1);
  assertIncludes("rag none index blocked", index.output, "RAG backend disabled");
  assertFileIncludes("rag none index report", path.join(root, ".planning", "knowledge", "RAG_INDEX_RESULT.md"), "RAG backend disabled");

  const query = pik(root, ["docs", "query", "--target", root, "--rag", "INIT_POLICY_SENTINEL"], 1);
  assertIncludes("rag none query blocked", query.output, "RAG backend disabled");
}

function validateStrictRequiresRag() {
  const root = project("strict-none");
  const init = pik(root, ["init", "--target", root, "--doc-policy", "strict", "--rag", "none", "--force"], 1);
  assertIncludes("strict none rejected", init.output, "strict requires --rag local or --rag external");
}

function validateExternalRequiresOptIn() {
  const blocked = project("external-blocked");
  const blockedInit = pik(blocked, ["init", "--target", blocked, "--doc-policy", "strict", "--rag", "external", "--force"], 1);
  assertIncludes("external without opt-in rejected", blockedInit.output, "External RAG is disabled by default");

  const allowed = project("external-allowed");
  const allowedInit = pik(allowed, ["init", "--target", allowed, "--doc-policy", "strict", "--rag", "external", "--allow-external-rag", "--force"]);
  assertIncludes("external opt-in init", allowedInit.output, "RAG backend: external");
  assertConfig("external opt-in config", allowed, (c) => c.privacy?.allow_external_rag === true && c.rag_backend === "external", "external rag opt-in recorded");
  assertFileIncludes("external risk report", path.join(allowed, ".planning", "privacy", "EXTERNAL_RAG_RISK.md"), "project document content");
}

function validateStrictLocalSkip() {
  const root = project("strict-local");
  const init = pik(root, [
    "init",
    "--target",
    root,
    "--template",
    "brownfield-monorepo",
    "--mode",
    "existing",
    "--doc-policy",
    "strict",
    "--rag",
    "local",
    "--setup-rag",
    "skip",
    "--force",
  ]);
  assertIncludes("strict local init", init.output, "Document policy: strict");
  assertIncludes("strict local rag", init.output, "RAG backend: local");
  assertConfig("strict local config", root, (c) => c.document_policy === "strict" && c.rag_backend === "local", "strict local policy recorded");
  assertConfig("strict local models", root, (c) => c.graphrag?.llm_model === "qwen2.5:7b" && c.graphrag?.embedding_model === "bge-m3", "default local models recorded");
  assertConfig("strict local provider", root, (c) => c.spec_context?.provider === "graphrag-local" && c.graphrag?.mode === "local", "local GraphRAG provider configured");
  assertFileIncludes("strict local setup plan", path.join(root, ".planning", "knowledge", "LOCAL_RAG_SETUP_PLAN.md"), "Heavy refresh executed: no");

  const status = pik(root, ["mode", "status", "--target", root]);
  assertIncludes("strict local mode status", status.output, "Document policy: strict");
  assertIncludes("strict local mode profile", status.output, "Internal profile: full-strict");
}

function validateModeAliases() {
  const root = project("mode-aliases");
  pik(root, ["init", "--target", root, "--doc-policy", "reference", "--rag", "none", "--force"]);
  const strict = pik(root, ["mode", "set", "--target", root, "docs-strict"]);
  assertIncludes("mode set docs-strict", strict.output, "Document policy: strict");
  assertIncludes("mode set docs-strict backend", strict.output, "RAG backend: local");
  assertIncludes("mode set docs-strict profile", strict.output, "Internal profile: full-strict");
  assertConfig("mode strict config", root, (c) => c.document_policy === "strict" && c.rag_backend === "local", "docs-strict maps to strict/local");

  const reference = pik(root, ["mode", "set", "--target", root, "docs-reference"]);
  assertIncludes("mode set docs-reference", reference.output, "Document policy: reference");
  assertIncludes("mode set docs-reference profile", reference.output, "Internal profile: graph-lite");
  assertConfig("mode reference config", root, (c) => c.document_policy === "reference" && c.execution_budget?.profile === "graph-lite", "docs-reference maps to graph-lite");
}

function validateInteractiveWizard() {
  const root = project("interactive-wizard");
  const init = pikInteractive(root, ["init", "--target", root, "--interactive", "--force"], "2\n2\n1\n1\n");
  assertIncludes("interactive wizard banner", init.output, "AI-PIKit init wizard");
  assertIncludes("interactive project prompt", init.output, "Project type");
  assertIncludes("interactive policy output", init.output, "Document policy: strict");
  assertIncludes("interactive rag output", init.output, "RAG backend: local");
  assertConfig("interactive config mode", root, (c) => c.document_policy === "strict" && c.rag_backend === "local", "interactive wizard records strict/local");
  assertFileIncludes("interactive init profile", path.join(root, ".planning", "INIT_PROFILE.md"), "Mode: new");
  assertFileIncludes("interactive local setup plan", path.join(root, ".planning", "knowledge", "LOCAL_RAG_SETUP_PLAN.md"), "Setup mode: `skip`");
}

validateDefaultReferenceNone();
validateStrictRequiresRag();
validateExternalRequiresOptIn();
validateStrictLocalSkip();
validateModeAliases();
validateInteractiveWizard();

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  evidence,
  commandResults,
  issues,
};

writeJsonReport("init-policy-check.json", data);
writeMarkdownReport("init-policy-check.md", "AI-PIKit Init Policy Verification", summarizeIssues(issues), [
  {
    title: "覆盖场景",
    body: [
      "- default `reference + rag none + local_only`",
      "- `strict + rag none` hard fail",
      "- external RAG requires `--allow-external-rag`",
      "- `strict + rag local + setup-rag skip` writes local setup plan without heavy refresh",
      "- `docs-reference` / `docs-strict` aliases map to compatible internal profiles",
      "- interactive `pik-init --interactive` prompts project type, document policy, RAG backend, and setup mode",
      "- `rag none` blocks `pik-docs-index --run` and `pik-docs-query --rag`",
    ],
  },
  {
    title: "证据",
    body: evidence.length ? evidence.map((item) => `- ${item}`) : ["未记录证据。"],
  },
  {
    title: "复现",
    body: [`- \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-init-policy.mjs"))}\``],
  },
  {
    title: "问题",
    body: issues.length ? issues.map((issue) => `- \`${issue.command}\`: ${issue.detail}`) : ["未发现 init policy 断链。"],
  },
]);

console.log(`init policy check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
