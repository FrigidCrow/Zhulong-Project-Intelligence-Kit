import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { execFileSync, execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import {
  measureAnswerGrounding,
  runAmbiguityAudit,
  runStructureAudit,
} from "./quality/audits.mjs";
import { normalizeArgv, parseArgs } from "./cli/args.mjs";
import { dispatchCommand } from "./cli/router.mjs";
import {
  DEFAULT_DOC_EXTENSIONS,
  DEFAULT_DOC_SOURCE_PATHS,
  DEFAULT_DOCUMENT_POLICY,
  DEFAULT_LOCAL_EMBEDDING_MODEL,
  DEFAULT_LOCAL_LLM_MODEL,
  DEFAULT_RAG_BACKEND,
  REFRESH_PROFILES,
  RAG_BACKENDS,
  applyProjectPolicyToConfig,
  documentPolicyFromProfile,
  inferRagBackend,
  normalizeDocumentPolicy,
  normalizeProfileName,
  normalizeRagBackend,
  profileNameForDocumentPolicy,
} from "./project/policy-config.mjs";
import { sha256Text, stableJson, stableValue } from "./shared/stable-json.mjs";
import { WORKFLOW_COMMANDS } from "./workflow/catalog.mjs";
import { runtime as runRuntimeCommand } from "./runtime/pack.mjs";
import {
  codebaseFileKind,
  createCodebaseCommand,
  scanCodebase as scanProjectCodebase,
} from "./codebase/command.mjs";
import { createEvidenceCommand, evidenceRecordFiles } from "./evidence/command.mjs";
import { createDocsCommand } from "./docs/command.mjs";
import { createRagCommand } from "./rag/command.mjs";
import { createGraphCommand } from "./graph/command.mjs";
import { createPolicyCommand } from "./policy/command.mjs";
import { createCockpitCommand } from "./cockpit/command.mjs";
import { createWorkflowCommand } from "./workflow/command.mjs";
import {
  EXIT_CODES,
  commandFailure,
  commandIdentity,
  createOutputSession,
  environmentFailure,
} from "./cli/output.mjs";
import { completionCommand } from "./cli/completion.mjs";
import { doctorCommand } from "./cli/doctor.mjs";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCAL_ONLY_PATHS = [
  "AGENTS.md",
  "project.manifest.yml",
  ".planning/",
  "docs/architecture/",
  "graphify-corpus/",
  "graphify-out/",
  "graphrag-workspace/",
  ".ai-work/",
  ".ai-notes/",
  ".codex-work/",
];
const TEMPLATE_SKIP_NAMES = new Set([".DS_Store"]);
const DEFAULT_CODE_SOURCE_PATHS = [
  "src",
  "app",
  "packages",
  "lib",
  "test",
  "tests",
  "__tests__",
  "services",
  "components",
  "server",
  "client",
  "pages",
  "api",
  "cmd",
  "internal",
  "pkg",
];
const DOC_IGNORE_NAMES = new Set([
  ".DS_Store",
  ".git",
  ".planning",
  ".ai-notes",
  ".ai-work",
  ".codex-work",
  "graphify-corpus",
  "graphify-out",
  "graphrag-workspace",
  "node_modules",
  "target",
  "dist",
  "build",
  "coverage",
]);
const CODE_MAP_IGNORE_NAMES = new Set([
  ...DOC_IGNORE_NAMES,
  "AGENTS.md",
  "project.manifest.yml",
  "docs",
  "documents",
  "仕様書",
]);
const GRAPH_STALE_GRACE_MS = 1000;
const FORBIDDEN_NETWORK_COMMANDS = [
  "curl",
  "wget",
  "scp",
  "sftp",
  "ssh",
  "rsync",
  "nc",
  "netcat",
  "telnet",
  "ftp",
  "lftp",
];
const ALLOWED_RUNTIME_NAMES = ["codex", "claude", "claude code", "copilot", "github copilot"];
function usage(options = {}) {
  const write = options.error ? console.error : console.log;
  write(`Zhulong Project Intelligence Kit

Usage:
  zhulong doctor --target <repo> [--json]
  zhulong completion bash|zsh|fish
  zhulong <command> [--json] [--quiet] [--no-color]
  zl-init --target <repo> --template <name> --name <project_name>
  zl-init --target <repo> --template <name> --name <project_name> --force
  zl-init --target <repo> --template greenfield-app --name <project_name> --mode new
  zl-init --target <repo> --template brownfield-monorepo --name <project_name> --mode existing
  zl-init --target <repo> --doc-policy reference --rag none
  zl-init --target <repo> --doc-policy strict --rag local --setup-rag skip
  zl-init --target <repo> --doc-policy strict --rag external --allow-external-rag
  zl-codebase --target <repo>
  zl-codebase-scan --target <repo>
  zl-codebase-status --target <repo>
  zl-docs-scan --target <repo>
  zl-docs-status --target <repo>
  zl-docs-normalize --target <repo>
  zl-docs-extract --target <repo>
  zl-docs-diff --target <repo>
  zl-docs-citations --target <repo> "<question or keywords>"
  zl-docs-sync --target <repo>
  zl-docs-sync --target <repo> --index
  zl-ambiguity-audit --target <repo>
  zl-ambiguity-audit --target <repo> --strict
  zl-structure-audit --target <repo>
  zl-structure-audit --target <repo> --strict
  zl-docs-index --target <repo>
  zl-docs-index --target <repo> --run
  zl-docs-query --target <repo> "<question or keywords>"
  zl-docs-query --target <repo> --rag "<question>"
  zl-answer-audit --target <repo>
  zl-answer-audit --target <repo> --from .planning/knowledge/RAG_QUERY_RESULT.md
  zl-answer-audit --target <repo> --answer "<answer text with citations>"
  zl-rag-init-local --target <repo>
  zl-rag-init-local --target <repo> --force
  zl-rag-golden-add --target <repo> --question "<q>" --expect "<term>" --citation "<path:line>"
  zl-rag-golden-run --target <repo>
  zl-rag-eval --target <repo>
  zl-preflight --target <repo>
  zl-preflight --target <repo> --strict
  zl-refresh-plan --target <repo>
  zl-refresh-run --target <repo> --rag
  zl-refresh-run --target <repo> --graph
  zl-refresh-run --target <repo> --all
  zl-mode-status --target <repo>
  zl-mode-set --target <repo> docs-reference|docs-strict
  zl-mode-set --target <repo> default-local-rag|graph-lite|full-strict
  zl-citation-audit --target <repo>
  zl-trace-build --target <repo>
  zl-trace-query --target <repo> "<keyword>"
  zl-trace-audit --target <repo>
  zl-policy-list --target <repo>
  zl-policy-check --target <repo>
  zl-policy-explain --target <repo> privacy.local_only
  zl-policy-lock --target <repo>
  zl-policy-verify --target <repo>
  zl-policy-diff --target <repo>
  zl-help-skills --target <repo> "现在是文档更新情况，有没有适合我的命令"
  zl-next --target <repo>
  zl-privacy-audit --target <repo>
  zl-privacy-audit --target <repo> --strict
  zl-offline-lock --target <repo>
  zl-outbound-audit --target <repo>
  zl-license-audit --target <repo>
  zl-graph-build --target <repo>
  zl-graph-build --target <repo> --run
  zl-graph-status --target <repo>
  zl-graph-query --target <repo> "<entity or keywords>"
  zl-graph-diff --target <repo>
  zl-graph-diff --target <repo> --save-baseline
  zl-graph-impact --target <repo> --files "src/a.js,src/b.js"
  zl-graph-risk --target <repo>
  zl-graph-freshness --target <repo> --strict
  zl-evidence-record --target <repo> "<summary>" --command "<command>" --result "<result>"
  zl-evidence-record --target <repo> "<summary>" --writeback .planning/issues/<issue>.md
  zl-evidence-status --target <repo>
  zl-runtime-install --runtime codex|claude-code|github-copilot --dest <dir>
  zl-runtime-status --runtime codex|claude-code|github-copilot --dest <dir>
  zl-context-debug --target <repo> "<bug description>"
  zl-context-execute --target <repo> "<change request>"
  zl-new-milestone --target <repo> "<milestone name or goal>"
  zl-spec-phase --target <repo> "<phase or requirement>"
  zl-discuss-phase --target <repo> "<phase or decision topic>"
  zl-ui-phase --target <repo> "<phase or UI scope>"
  zl-debug --target <repo> "<bug description>"
  zl-plan-phase --target <repo> "<phase or planning request>"
  zl-execute-phase --target <repo> "<phase or execution request>"
  zl-code-review --target <repo> "<review request>"
  zl-verify-work --target <repo> "<verification request>"
  zl-complete-milestone --target <repo> "<milestone name>"
  zl-workflow-run --target <repo> <workflow> "<request>"
  zl-gate-check --target <repo>
  zl-workflow-status --target <repo>
  zl-workflow-continue --target <repo> --gate plan --evidence "<evidence>"
  zl-workflow-audit --target <repo>
  zl-completion-check --target <repo>
  zl-cockpit-build --target <repo>
  zl-verify --target <repo>
  zl-map --target <repo>
Templates:
  brownfield-monorepo
  greenfield-app
  backend-service
  frontend-app
`);
}

function requireDir(dir, label) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw environmentFailure(`${label} does not exist or is not a directory: ${dir}`);
  }
}

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw environmentFailure(`${label} does not exist or is not a file: ${filePath}`);
  }
}

function gitExcludePath(target) {
  try {
    const relativePath = execFileSync("git", ["rev-parse", "--git-path", "info/exclude"], {
      cwd: target,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return path.resolve(target, relativePath);
  } catch {
    return null;
  }
}

function ensureLocalExcludes(target) {
  const excludePath = gitExcludePath(target);
  if (!excludePath) return;

  fs.mkdirSync(path.dirname(excludePath), { recursive: true });
  const current = fs.existsSync(excludePath) ? fs.readFileSync(excludePath, "utf8") : "";
  const lines = new Set(current.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  const missing = LOCAL_ONLY_PATHS.filter((item) => !lines.has(item));

  if (missing.length === 0) {
    console.log("ok local git excludes already include Zhulong paths");
    return;
  }

  const prefix = current.endsWith("\n") || current.length === 0 ? "" : "\n";
  const block = `${prefix}\n# Zhulong Project Intelligence Kit local artifacts\n${missing.join("\n")}\n`;
  fs.appendFileSync(excludePath, block);
  console.log(`update ${excludePath}`);
}

function render(content, values) {
  return content.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => values[key] ?? "");
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function outputName(fileName) {
  if (fileName === "planning") return ".planning";
  return fileName.replace(".template", "");
}

function copyTemplateTree(sourceDir, targetDir, values, options = {}) {
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (TEMPLATE_SKIP_NAMES.has(entry.name)) continue;

    const sourcePath = path.join(sourceDir, entry.name);
    const targetName = outputName(entry.name);
    const targetPath = path.join(targetDir, targetName);

    if (entry.isDirectory()) {
      fs.mkdirSync(targetPath, { recursive: true });
      copyTemplateTree(sourcePath, targetPath, values, options);
      continue;
    }

    if (fs.existsSync(targetPath) && !options.force) {
      console.log(`skip existing ${path.relative(targetDir, targetPath) || targetPath}`);
      continue;
    }

    const content = fs.readFileSync(sourcePath, "utf8");
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, render(content, values));
    console.log(`write ${targetPath}`);
  }
}

function validateInitPolicy({ documentPolicy, ragBackend, allowExternalRag }) {
  if (documentPolicy === "strict" && ragBackend === "none") {
    throw commandFailure("Invalid init policy: --doc-policy strict requires --rag local or --rag external. Recommended: --rag local --setup-rag skip.");
  }
  if (ragBackend === "external" && !allowExternalRag) {
    throw commandFailure("External RAG is disabled by default. Re-run with --allow-external-rag only after confirming project data may leave the local machine.");
  }
}

function hasInitArg(args, ...keys) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(args, key));
}

function shouldRunInitWizard(args) {
  if (args["no-interactive"]) return false;
  if (args.interactive) return true;
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function createInitPrompter(args) {
  if (args.interactive && !process.stdin.isTTY) {
    const scriptedInput = fs.readFileSync(0, "utf8").split(/\r?\n/);
    return {
      async ask(prompt) {
        process.stdout.write(prompt);
        const answer = scriptedInput.length ? scriptedInput.shift() : "";
        console.log(answer);
        return answer;
      },
      close() {},
    };
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return {
    ask(prompt) {
      return rl.question(prompt);
    },
    close() {
      rl.close();
    },
  };
}

async function promptChoice(prompter, message, choices, defaultValue) {
  const defaultIndex = Math.max(0, choices.findIndex((choice) => choice.value === defaultValue));
  console.log("");
  console.log(message);
  choices.forEach((choice, index) => {
    const marker = choice.value === defaultValue ? " (default)" : "";
    console.log(`${index + 1}. ${choice.label}${marker}`);
  });
  while (true) {
    const answer = (await prompter.ask(`Select [${defaultIndex + 1}]: `)).trim().toLowerCase();
    if (!answer) return defaultValue;
    if (/^\d+$/.test(answer)) {
      const index = Number(answer) - 1;
      if (choices[index]) return choices[index].value;
    }
    const match = choices.find((choice) => {
      const aliases = [choice.value, choice.label, ...(choice.aliases || [])].map((item) => String(item).toLowerCase());
      return aliases.includes(answer);
    });
    if (match) return match.value;
    console.log(`Invalid choice: ${answer}`);
  }
}

async function resolveInitWizardArgs(args) {
  if (!shouldRunInitWizard(args)) return args;
  const resolved = { ...args };
  const prompter = createInitPrompter(resolved);
  try {
    console.log("Zhulong init wizard");
    console.log("Press Enter to accept defaults. Explicit CLI flags always win.");

    if (!hasInitArg(resolved, "mode")) {
      const mode = await promptChoice(prompter, "1. Project type?", [
        { value: "existing", label: "existing - existing project", aliases: ["既有", "既存"] },
        { value: "new", label: "new - new project", aliases: ["新项目", "新規"] },
      ], "existing");
      resolved.mode = mode;
      if (!hasInitArg(resolved, "template")) {
        resolved.template = mode === "new" ? "greenfield-app" : "brownfield-monorepo";
      }
    }

    if (!hasInitArg(resolved, "doc-policy", "docPolicy")) {
      resolved["doc-policy"] = await promptChoice(prompter, "2. Document policy?", [
        { value: "reference", label: "reference - docs are useful references", aliases: ["不严格", "参考"] },
        { value: "strict", label: "strict - docs are blocking specification evidence", aliases: ["严格", "仕様"] },
      ], DEFAULT_DOCUMENT_POLICY);
    }

    const documentPolicy = normalizeDocumentPolicy(resolved["doc-policy"] || resolved.docPolicy || DEFAULT_DOCUMENT_POLICY);
    if (!hasInitArg(resolved, "rag", "rag-backend", "ragBackend")) {
      const ragChoices = documentPolicy === "strict"
        ? [
          { value: "local", label: "local - local GraphRAG + local models", aliases: ["本地"] },
          { value: "external", label: "external - external RAG provider, explicit risk opt-in", aliases: ["外部"] },
        ]
        : [
          { value: "none", label: "none - no RAG install, local workflow only", aliases: ["不启用"] },
          { value: "local", label: "local - local GraphRAG + local models", aliases: ["本地"] },
          { value: "external", label: "external - external RAG provider, explicit risk opt-in", aliases: ["外部"] },
        ];
      resolved.rag = await promptChoice(prompter, "3. RAG backend?", ragChoices, documentPolicy === "strict" ? "local" : DEFAULT_RAG_BACKEND);
    }

    const ragBackend = normalizeRagBackend(resolved.rag || resolved["rag-backend"] || resolved.ragBackend || DEFAULT_RAG_BACKEND);
    if (ragBackend === "local" && !hasInitArg(resolved, "setup-rag", "setupRag")) {
      resolved["setup-rag"] = await promptChoice(prompter, "4. Local RAG setup?", [
        { value: "skip", label: "skip - write setup plan only", aliases: ["later", "以后"] },
        { value: "ask", label: "ask - check dependencies and guide setup", aliases: ["check", "检查"] },
        { value: "install", label: "install - try local setup now", aliases: ["安装"] },
      ], "skip");
    }

    if (ragBackend === "external" && !hasInitArg(resolved, "allow-external-rag", "allowExternalRag")) {
      const confirm = await promptChoice(prompter, "5. External RAG may send documents/query context outside this machine. Confirm?", [
        { value: "no", label: "no - stop and keep data local", aliases: ["n"] },
        { value: "yes", label: "yes - I have approval to use external RAG", aliases: ["y"] },
      ], "no");
      if (confirm === "yes") resolved["allow-external-rag"] = true;
    }
  } finally {
    prompter.close();
  }
  return resolved;
}

function writeExternalRagRisk(target, details) {
  const outPath = path.join(target, ".planning", "privacy", "EXTERNAL_RAG_RISK.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const content = `# External RAG Risk Acknowledgement

Generated: ${new Date().toISOString()}

## Summary

- Document policy: \`${details.documentPolicy}\`
- RAG backend: \`external\`
- Explicit opt-in: ${details.allowExternalRag ? "yes" : "no"}
- Privacy boundary: project document content, extracted text units, embeddings, query text, and graph context may be sent to the configured external provider.

## Required Rule

Do not use external RAG for confidential customer projects unless the project has written approval for data export. The default and recommended strict setup is:

\`\`\`bash
zl-init --target "$PWD" --doc-policy strict --rag local --setup-rag skip
\`\`\`

## Why This Matters

GraphRAG indexing reads project documents and creates intermediate text units, entity/relationship context, summaries, vectors, and query context. If provider settings point to external LLM or embedding services, those contents can leave the local machine.
`;
  fs.writeFileSync(outPath, content);
  return outPath;
}

function writeLocalRagSetupPlan(target, details) {
  const outPath = path.join(target, ".planning", "knowledge", "LOCAL_RAG_SETUP_PLAN.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const graphRagAvailable = commandAvailable("graphrag");
  const ollamaAvailable = commandAvailable("ollama");
  let modelAvailable = false;
  let embeddingAvailable = false;
  if (ollamaAvailable) {
    modelAvailable = ollamaModelAvailable(details.model);
    embeddingAvailable = ollamaModelAvailable(details.embedding);
  }
  const content = `# Local RAG Setup Plan

Generated: ${new Date().toISOString()}

## Selected Policy

- Document policy: \`${details.documentPolicy}\`
- RAG backend: \`local\`
- Setup mode: \`${details.setupRag}\`
- Heavy refresh executed: no

## Recommended Local Models

- LLM: \`${details.model}\`
- Embedding: \`${details.embedding}\`

## Dependency Check

- GraphRAG CLI: ${graphRagAvailable ? "present" : "missing"}
- Ollama CLI: ${ollamaAvailable ? "present" : "missing"}
- LLM model: ${modelAvailable ? "present" : "missing"}
- Embedding model: ${embeddingAvailable ? "present" : "missing"}

## Next Steps

\`\`\`bash
python3 -m pip install --user graphrag
brew install ollama
brew services start ollama
ollama pull ${details.model}
ollama pull ${details.embedding}
zl-rag-init-local --target "$PWD"
\`\`\`

## Safety

Keep \`.planning/config.json\` and \`graphrag-workspace/settings.yaml\` on Ollama / localhost for confidential projects. Switching provider, API base, or key settings to an external service can send source documents and query context outside the machine.
`;
  fs.writeFileSync(outPath, content);
  return { outPath, graphRagAvailable, ollamaAvailable, modelAvailable, embeddingAvailable };
}

function configureProjectPolicy(target, options) {
  const configPath = planningConfigPath(target);
  const current = readPlanningConfig(target);
  const applied = applyProjectPolicyToConfig(current, options);
  writeJsonFile(configPath, applied.config);
  if (applied.ragBackend === "external") {
    applied.externalRiskPath = writeExternalRagRisk(target, {
      documentPolicy: applied.documentPolicy,
      allowExternalRag: Boolean(options.allowExternalRag),
    });
  }
  if (applied.ragBackend === "local") {
    applied.localRagSetup = writeLocalRagSetupPlan(target, {
      documentPolicy: applied.documentPolicy,
      setupRag: options.setupRag || "skip",
      model: applied.localModel,
      embedding: applied.localEmbedding,
    });
  }
  return applied;
}

async function init(rawArgs) {
  const args = await resolveInitWizardArgs(rawArgs);
  const target = path.resolve(args.target || process.cwd());
  const template = args.template || "brownfield-monorepo";
  const projectName = args.name || path.basename(target);
  const templateDir = path.join(kitRoot, "templates", template);
  const mode = args.mode || (template === "greenfield-app" ? "new" : "existing");
  const documentPolicy = normalizeDocumentPolicy(args["doc-policy"] || args.docPolicy || DEFAULT_DOCUMENT_POLICY);
  const ragBackend = normalizeRagBackend(args.rag || args["rag-backend"] || args.ragBackend || DEFAULT_RAG_BACKEND);
  const setupRag = String(args["setup-rag"] || args.setupRag || "skip").toLowerCase();
  const allowExternalRag = Boolean(args["allow-external-rag"] || args.allowExternalRag);
  const localModel = args.model || process.env.ZHULONG_LOCAL_LLM_MODEL || DEFAULT_LOCAL_LLM_MODEL;
  const localEmbedding = args.embedding || process.env.ZHULONG_LOCAL_EMBEDDING_MODEL || DEFAULT_LOCAL_EMBEDDING_MODEL;

  requireDir(target, "Target");
  requireDir(templateDir, "Template");
  validateInitPolicy({ documentPolicy, ragBackend, allowExternalRag });

  const values = {
    PROJECT_NAME: projectName,
    PROJECT_TYPE: template,
    PROJECT_ROOT: target,
    GENERATED_AT: new Date().toISOString(),
  };

  copyTemplateTree(path.join(kitRoot, "core"), target, values, { force: args.force });
  copyTemplateTree(templateDir, target, values, { force: args.force });
  const policy = configureProjectPolicy(target, {
    documentPolicy,
    ragBackend,
    setupRag,
    allowExternalRag,
    model: localModel,
    embedding: localEmbedding,
  });
  ensureLocalExcludes(target);
  writeInitProfile(target, {
    projectName,
    template,
    mode,
    force: Boolean(args.force),
    documentPolicy: policy.documentPolicy,
    ragBackend: policy.ragBackend,
    profileName: policy.profileName,
    setupRag,
    localModel: policy.localModel,
    localEmbedding: policy.localEmbedding,
    localRagSetupPath: policy.localRagSetup?.outPath,
    externalRiskPath: policy.externalRiskPath,
  });

  if (policy.ragBackend === "local" && setupRag === "install") {
    ragInitLocal({
      target,
      force: args.force,
      model: policy.localModel,
      embedding: policy.localEmbedding,
    });
  }

  console.log(`\nInitialized ${projectName} with template ${template} in ${mode} mode`);
  console.log(`Document policy: ${policy.documentPolicy}`);
  console.log(`RAG backend: ${policy.ragBackend}`);
  console.log(`Internal profile: ${policy.profileName}`);
  console.log("Heavy refresh executed: no");
}

function writeInitProfile(target, profile) {
  const outPath = path.join(target, ".planning", "INIT_PROFILE.md");
  const mode = profile.mode === "new" ? "new" : "existing";
  const localRagLines = profile.ragBackend === "local"
    ? [
      `- Local LLM model: \`${profile.localModel}\``,
      `- Local embedding model: \`${profile.localEmbedding}\``,
      profile.localRagSetupPath ? `- Local RAG setup plan: \`${path.relative(target, profile.localRagSetupPath)}\`` : "- Local RAG setup plan: pending",
      "- Run `zl-rag-init-local --target <repo>` after GraphRAG, Ollama, and models are available.",
    ].join("\n")
    : profile.ragBackend === "external"
      ? [
        "- External RAG is explicitly opted in.",
        profile.externalRiskPath ? `- External RAG risk report: \`${path.relative(target, profile.externalRiskPath)}\`` : "- External RAG risk report: missing",
        "- Do not use external RAG for confidential projects without written approval.",
      ].join("\n")
      : [
        "- RAG is disabled for this project by default.",
        "- `zl-docs-sync` and extracted-document query remain available.",
        "- `zl-docs-index --run` and `zl-docs-query --rag` require switching to local or external RAG first.",
      ].join("\n");
  const content = `# Zhulong Init Profile

Generated: ${new Date().toISOString()}

## Project

- Name: ${profile.projectName}
- Template: ${profile.template}
- Mode: ${mode}
- Force: ${profile.force ? "true" : "false"}
- Document policy: \`${profile.documentPolicy}\`
- RAG backend: \`${profile.ragBackend}\`
- Internal profile: \`${profile.profileName}\`
- Heavy refresh executed: no

## RAG Setup

${localRagLines}

## Guard Baseline

${mode === "new"
  ? "- New project mode: codebase may initially be empty; codebase guard expects scaffold/source files once implementation starts."
  : "- Existing project mode: codebase guard expects source inventory before risky workflow execution."}
- Run \`zl-codebase-scan --target <repo>\` after init.
- Run \`zl-docs-sync --target <repo>\` after init when the project has documents.
- Run \`zl-graph-build --target <repo> --run\` only when code-map baseline is explicitly needed.
`;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content);
}

function readManifest(target) {
  const manifestPath = path.join(target, "project.manifest.yml");
  if (!fs.existsSync(manifestPath)) return { path: manifestPath, text: "" };
  return { path: manifestPath, text: fs.readFileSync(manifestPath, "utf8") };
}

function readPlanningConfig(target) {
  const configPath = path.join(target, ".planning", "config.json");
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return {};
  }
}

function projectPolicyState(target) {
  const config = readPlanningConfig(target);
  const explicitProfile = config.execution_budget?.profile || config.execution?.profile || "";
  const profileName = normalizeProfileName(explicitProfile, config.document_policy ? profileNameForDocumentPolicy(config.document_policy) : "graph-lite");
  const documentPolicy = normalizeDocumentPolicy(config.document_policy || config.execution_budget?.document_policy || documentPolicyFromProfile(profileName));
  const ragBackend = inferRagBackend(config, profileName);
  return { config, profileName, documentPolicy, ragBackend };
}

function planningConfigPath(target) {
  return path.join(target, ".planning", "config.json");
}

function activeRefreshProfile(target) {
  const { config, profileName, documentPolicy, ragBackend } = projectPolicyState(target);
  const name = normalizeProfileName(profileName, profileNameForDocumentPolicy(documentPolicy));
  const profile = REFRESH_PROFILES[name] || REFRESH_PROFILES["graph-lite"];
  return {
    name: profile ? name : "graph-lite",
    ...(profile || REFRESH_PROFILES["graph-lite"]),
    documentPolicy,
    ragBackend,
    rawProfile: config.execution_budget?.profile || null,
  };
}

function configuredCodeSourcePaths(target) {
  const config = readPlanningConfig(target);
  return uniqueList([
    ...(Array.isArray(config.execution_budget?.code_paths) ? config.execution_budget.code_paths : []),
    ...(Array.isArray(config.code_map?.source_paths) ? config.code_map.source_paths : []),
    ...(Array.isArray(config.graphify?.source_paths) ? config.graphify.source_paths : []),
    ...DEFAULT_CODE_SOURCE_PATHS,
  ]);
}

function refreshPaths(target) {
  const refreshDir = path.join(target, ".planning", "refresh");
  return {
    refreshDir,
    stateJson: path.join(refreshDir, "REFRESH_STATE.json"),
    stateMd: path.join(refreshDir, "REFRESH_STATE.md"),
    preflightJson: path.join(refreshDir, "PREFLIGHT.json"),
    preflightMd: path.join(refreshDir, "PREFLIGHT.md"),
    planJson: path.join(refreshDir, "REFRESH_PLAN.json"),
    planMd: path.join(refreshDir, "REFRESH_PLAN.md"),
    runMd: path.join(refreshDir, "REFRESH_RUN.md"),
    modeMd: path.join(refreshDir, "MODE.md"),
  };
}

function loadRefreshState(target) {
  const paths = refreshPaths(target);
  const state = readJsonIfExists(paths.stateJson);
  if (state && typeof state === "object") return state;
  return {
    version: 1,
    generatedAt: null,
    updatedAt: null,
    profile: activeRefreshProfile(target).name,
    rag: null,
    graph: null,
  };
}

function writeRefreshStateMarkdown(target, state) {
  const paths = refreshPaths(target);
  fs.mkdirSync(paths.refreshDir, { recursive: true });
  const content = `# Zhulong Refresh State

Generated: ${new Date().toISOString()}

## Summary

- Profile: \`${state.profile || activeRefreshProfile(target).name}\`
- RAG last refresh: ${state.rag?.lastRunAt || "missing"}
- RAG commit: ${state.rag?.lastShortCommit || state.rag?.lastCommit || "missing"}
- Graph last refresh: ${state.graph?.lastRunAt || "missing"}
- Graph commit: ${state.graph?.lastShortCommit || state.graph?.lastCommit || "missing"}

## RAG

${state.rag ? [
  `- Command: \`${state.rag.command || "-"}\``,
  `- Source paths: ${state.rag.sourcePaths?.map((item) => `\`${item}\``).join(", ") || "-"}`,
  `- Corpus hash: \`${state.rag.corpusHash || "-"}\``,
  `- Artifact: \`${state.rag.artifact || "-"}\``,
].join("\n") : "- No RAG refresh state recorded."}

## Graph

${state.graph ? [
  `- Command: \`${state.graph.command || "-"}\``,
  `- Code paths: ${state.graph.codePaths?.map((item) => `\`${item}\``).join(", ") || "-"}`,
  `- Corpus hash: \`${state.graph.corpusHash || "-"}\``,
  `- Artifact: \`${state.graph.artifact || "-"}\``,
].join("\n") : "- No Graphify refresh state recorded."}

## Rule

- Ordinary workflow commands may read this state and warn about stale context.
- Heavy refresh must come from explicit \`zl-refresh-run\`, \`zl-docs-index --run\`, \`zl-graph-build --run\`, or a strict policy gate.
`;
  fs.writeFileSync(paths.stateMd, content);
  return paths.stateMd;
}

function saveRefreshState(target, state) {
  const paths = refreshPaths(target);
  fs.mkdirSync(paths.refreshDir, { recursive: true });
  state.version = state.version || 1;
  state.profile = activeRefreshProfile(target).name;
  state.updatedAt = new Date().toISOString();
  writeJsonFile(paths.stateJson, state);
  writeRefreshStateMarkdown(target, state);
  return paths.stateJson;
}

function gitInfo(target) {
  try {
    const inside = execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: target,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() === "true";
    if (!inside) return { available: false };
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: target,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return { available: true, head, shortHead: head.slice(0, 12) };
  } catch {
    return { available: false };
  }
}

function gitCommitExists(target, commit) {
  if (!commit) return false;
  try {
    execFileSync("git", ["cat-file", "-e", `${commit}^{commit}`], {
      cwd: target,
      encoding: "utf8",
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function gitCommitDistance(target, fromCommit, toCommit = "HEAD") {
  if (!fromCommit) return null;
  try {
    const output = execFileSync("git", ["rev-list", "--count", `${fromCommit}..${toCommit}`], {
      cwd: target,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return Number(output);
  } catch {
    return null;
  }
}

function gitChangedFilesSince(target, fromCommit) {
  if (!fromCommit || !gitCommitExists(target, fromCommit)) return [];
  try {
    const output = execFileSync("git", ["diff", "--name-only", `${fromCommit}..HEAD`], {
      cwd: target,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function gitUncommittedFiles(target) {
  try {
    const output = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
      cwd: target,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return output.split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .map((line) => {
        const raw = line.slice(3).trim();
        const rename = raw.split(" -> ").pop();
        return rename || raw;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeRelativePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\/+/, "");
}

function relativePathUnder(relativePath, root) {
  const rel = normalizeRelativePath(relativePath);
  const base = normalizeRelativePath(root).replace(/\/+$/, "");
  if (!base || base === ".") return true;
  return rel === base || rel.startsWith(`${base}/`);
}

function ignoredRefreshPath(relativePath) {
  const parts = normalizeRelativePath(relativePath).split("/");
  return parts.some((part) => DOC_IGNORE_NAMES.has(part));
}

function isRagRelevantPath(target, relativePath) {
  const rel = normalizeRelativePath(relativePath);
  if (!rel || ignoredRefreshPath(rel)) return false;
  const { sourcePaths, extensions } = docScanConfig(target);
  const ext = path.extname(rel).toLowerCase();
  if (!extensions.includes(ext)) return false;
  return sourcePaths.some((root) => relativePathUnder(rel, root));
}

function isGraphRelevantPath(target, relativePath) {
  const rel = normalizeRelativePath(relativePath);
  if (!rel || ignoredRefreshPath(rel)) return false;
  const parts = rel.split("/");
  if (parts.some((part) => CODE_MAP_IGNORE_NAMES.has(part))) return false;
  const underConfigured = configuredCodeSourcePaths(target).some((root) => relativePathUnder(rel, root));
  const kind = codebaseFileKind(rel);
  return underConfigured || kind === "source" || /(^|\/)(test|tests|spec|specs|__tests__)(\/|$)|(\.|-)(test|spec)\./i.test(rel);
}

function refreshRelevantFiles(target, files, kind) {
  const predicate = kind === "rag" ? isRagRelevantPath : isGraphRelevantPath;
  return uniqueList(files.map(normalizeRelativePath).filter((file) => predicate(target, file)));
}

function hashItems(items) {
  const hash = crypto.createHash("sha256");
  for (const item of items) hash.update(`${item}\n`);
  return hash.digest("hex");
}

function documentCorpusSignature(target) {
  const { sourcePaths, extensions } = docScanConfig(target);
  const scan = discoverDocuments(target, sourcePaths, extensions);
  const rows = scan.files.map((file) => {
    const full = path.join(target, file.path);
    return `${file.path}\0${sha256File(full)}\0${file.size}`;
  });
  return {
    hash: hashItems(rows),
    files: scan.files.length,
    sourcePaths,
  };
}

function codeCorpusSignature(target) {
  const files = scanCodebase(target).files
    .filter((file) => file.kind === "source" || /(^|\/)(test|tests|spec|specs|__tests__)(\/|$)|(\.|-)(test|spec)\./i.test(file.path))
    .map((file) => `${file.path}\0${sha256File(path.join(target, file.path))}\0${file.size}`);
  return {
    hash: hashItems(files),
    files: files.length,
    codePaths: configuredCodeSourcePaths(target),
  };
}

function markRefreshState(target, kind, details = {}) {
  const state = loadRefreshState(target);
  const git = gitInfo(target);
  const nowIso = new Date().toISOString();
  const signature = kind === "rag" ? documentCorpusSignature(target) : codeCorpusSignature(target);
  state[kind] = {
    kind,
    lastRunAt: nowIso,
    lastCommit: git.available ? git.head : null,
    lastShortCommit: git.available ? git.shortHead : null,
    command: details.command || "",
    artifact: details.artifact || "",
    corpusHash: signature.hash,
    fileCount: signature.files,
    sourcePaths: kind === "rag" ? signature.sourcePaths : undefined,
    codePaths: kind === "graph" ? signature.codePaths : undefined,
    note: details.note || "",
  };
  return saveRefreshState(target, state);
}

function domainArtifactExists(target, kind) {
  if (kind === "rag") {
    const paths = ragArtifactPaths(target);
    return hasSuccessfulResult(paths.indexResult) || fs.existsSync(paths.workspaceOutput);
  }
  const status = graphStatus(target);
  return Boolean(status.planningGraph || status.graphifyGraph);
}

function domainMissingReason(target, kind) {
  if (kind === "rag") return "RAG index result is missing. Run `zl-rag-init-local` and explicit refresh before using RAG as current evidence.";
  return "Graphify/code-map graph is missing. Run `zl-refresh-run --graph` or `zl-graph-build --run` before using impact evidence.";
}

function assessRefreshDomain(target, kind, state, git, profile) {
  const domainState = state[kind];
  const required = kind === "rag" ? profile.ragRequired : profile.graphRequired;
  const lastCommit = domainState?.lastCommit || null;
  const lastCommitKnown = git.available && lastCommit && gitCommitExists(target, lastCommit);
  const committedChanges = lastCommitKnown ? gitChangedFilesSince(target, lastCommit) : [];
  const uncommittedChanges = git.available ? gitUncommittedFiles(target) : [];
  const relevantCommitted = git.available ? refreshRelevantFiles(target, committedChanges, kind) : [];
  const relevantUncommitted = git.available ? refreshRelevantFiles(target, uncommittedChanges, kind) : [];
  const allRelevant = uniqueList([...relevantCommitted, ...relevantUncommitted]);
  const commitDistance = lastCommitKnown ? gitCommitDistance(target, lastCommit) : null;
  const artifactExists = domainArtifactExists(target, kind);

  const base = {
    kind,
    required,
    artifactExists,
    lastCommit,
    lastShortCommit: domainState?.lastShortCommit || (lastCommit ? lastCommit.slice(0, 12) : null),
    lastRunAt: domainState?.lastRunAt || null,
    commitDistance,
    committedChanges: committedChanges.length,
    uncommittedChanges: uncommittedChanges.length,
    relevantCommitted,
    relevantUncommitted,
    relevantFiles: allRelevant,
    unrelatedCommittedCount: Math.max(0, committedChanges.length - relevantCommitted.length),
    unrelatedUncommittedCount: Math.max(0, uncommittedChanges.length - relevantUncommitted.length),
    command: kind === "rag" ? "zl-refresh-run --target <repo> --rag" : "zl-refresh-run --target <repo> --graph",
  };

  if (!required && !artifactExists) {
    return {
      ...base,
      status: "optional-missing",
      severity: "ok",
      action: "skip",
      message: `${kind} is optional in ${profile.name}; missing artifacts are allowed but answers must be marked WAIVED_WITH_RISK.`,
    };
  }

  if (!artifactExists) {
    return {
      ...base,
      status: "missing",
      severity: profile.strict || required ? "fail" : "warn",
      action: "refresh",
      message: domainMissingReason(target, kind),
    };
  }

  if (!domainState) {
    return {
      ...base,
      status: "untracked",
      severity: "warn",
      action: "refresh",
      message: `${kind} artifacts exist, but REFRESH_STATE has no ${kind} baseline. Run explicit refresh once to bind artifacts to the current commit.`,
    };
  }

  if (git.available && !lastCommitKnown) {
    return {
      ...base,
      status: "unknown",
      severity: "warn",
      action: "refresh",
      message: `${kind} baseline commit is missing or no longer reachable. Rebuild once to reset freshness.`,
    };
  }

  if (allRelevant.length > 0) {
    return {
      ...base,
      status: "stale-related",
      severity: profile.strict ? "fail" : "warn",
      action: "refresh",
      message: `${kind} is behind relevant project changes. Differential refresh is recommended.`,
    };
  }

  if (git.available && (commitDistance || 0) > 0) {
    return {
      ...base,
      status: "behind-unrelated",
      severity: "ok",
      action: "skip",
      message: `${kind} is ${commitDistance} commit(s) behind HEAD, but changed files are unrelated to ${kind}; safe to ignore unless policy says otherwise.`,
    };
  }

  if (!git.available) {
    return {
      ...base,
      status: "mtime-only",
      severity: "ok",
      action: "skip",
      message: `${kind} has artifacts, but target is not a git worktree. Use artifact freshness and explicit refresh for high-risk work.`,
    };
  }

  return {
    ...base,
    status: "fresh",
    severity: "ok",
    action: "skip",
    message: `${kind} baseline is current for relevant paths.`,
  };
}

function refreshAssessment(target) {
  const profile = activeRefreshProfile(target);
  const state = loadRefreshState(target);
  const git = gitInfo(target);
  const rag = assessRefreshDomain(target, "rag", state, git, profile);
  const graph = assessRefreshDomain(target, "graph", state, git, profile);
  const domains = [rag, graph];
  const status = domains.some((item) => item.severity === "fail")
    ? "FAIL"
    : domains.some((item) => item.severity === "warn")
      ? "WARN"
      : "PASS";
  return {
    generatedAt: new Date().toISOString(),
    profile,
    git,
    status,
    domains,
  };
}

function domainLabel(kind) {
  return kind === "rag" ? "GraphRAG" : "Graphify";
}

function formatDomainConsole(domain) {
  const distance = domain.commitDistance === null || domain.commitDistance === undefined ? "unknown" : String(domain.commitDistance);
  return [
    `${domain.severity.toUpperCase()} ${domain.kind} ${domain.status}`,
    `  commits behind: ${distance}`,
    `  relevant changes: ${domain.relevantFiles.length}`,
    `  relevant paths: ${domain.relevantFiles.length ? domain.relevantFiles.join(", ") : "none"}`,
    `  unrelated committed changes: ${domain.unrelatedCommittedCount}`,
    `  action: ${domain.action === "refresh" ? domain.command : "skip"}`,
    `  ${domain.message}`,
  ].join("\n");
}

function formatPreflightPacket(assessment) {
  return [
    `- Status: ${assessment.status}`,
    `- Profile: \`${assessment.profile.name}\``,
    `- Git: ${assessment.git.available ? `\`${assessment.git.shortHead}\`` : "not a git worktree"}`,
    ...assessment.domains.map((domain) => {
      const distance = domain.commitDistance === null || domain.commitDistance === undefined ? "unknown" : String(domain.commitDistance);
      const command = domain.action === "refresh" ? domain.command : "skip";
      return `- ${domainLabel(domain.kind)}: ${domain.status}, commits behind ${distance}, relevant changes ${domain.relevantFiles.length}, action ${command}`;
    }),
    "- Heavy refresh executed: no",
  ].join("\n");
}

function writePreflightReport(target, assessment) {
  const paths = refreshPaths(target);
  fs.mkdirSync(paths.refreshDir, { recursive: true });
  writeJsonFile(paths.preflightJson, assessment);
  const content = `# Zhulong Preflight

Generated: ${assessment.generatedAt}

## Summary

- Status: ${assessment.status}
- Profile: \`${assessment.profile.name}\`
- Git: ${assessment.git.available ? `\`${assessment.git.shortHead}\`` : "not a git worktree"}
- Heavy refresh executed: no

## Domains

${assessment.domains.map((domain) => `### ${domainLabel(domain.kind)}

- Status: ${domain.status}
- Severity: ${domain.severity}
- Commits behind: ${domain.commitDistance ?? "unknown"}
- Relevant changed files: ${domain.relevantFiles.length}
- Unrelated committed changes: ${domain.unrelatedCommittedCount}
- Action: ${domain.action === "refresh" ? `\`${domain.command}\`` : "skip"}
- Message: ${domain.message}

${domain.relevantFiles.length ? domain.relevantFiles.map((file) => `- \`${file}\``).join("\n") : "- No relevant changed files."}
`).join("\n")}

## Rule

- Preflight is lightweight. It does not rebuild GraphRAG or Graphify.
- Heavy refresh must come from \`zl-refresh-run\`, \`zl-docs-index --run\`, \`zl-graph-build --run\`, or a strict policy gate.
- Commits unrelated to document source paths or code-map paths are reported but do not force refresh.
`;
  fs.writeFileSync(paths.preflightMd, content);
  return { jsonPath: paths.preflightJson, mdPath: paths.preflightMd };
}

function writeRefreshPlan(target, assessment) {
  const paths = refreshPaths(target);
  fs.mkdirSync(paths.refreshDir, { recursive: true });
  const actions = assessment.domains.map((domain) => ({
    kind: domain.kind,
    status: domain.status,
    action: domain.action,
    command: domain.action === "refresh" ? domain.command : "skip",
    reason: domain.message,
    relevantFiles: domain.relevantFiles,
    commitDistance: domain.commitDistance,
  }));
  writeJsonFile(paths.planJson, {
    generatedAt: assessment.generatedAt,
    status: assessment.status,
    profile: assessment.profile.name,
    actions,
  });
  const content = `# Zhulong Refresh Plan

Generated: ${assessment.generatedAt}

## Summary

- Status: ${assessment.status}
- Profile: \`${assessment.profile.name}\`
- Heavy refresh executed: no

## Actions

${actions.map((action) => `### ${domainLabel(action.kind)}

- Current status: ${action.status}
- Commit distance: ${action.commitDistance ?? "unknown"}
- Decision: ${action.action === "refresh" ? "recommend differential refresh" : "skip"}
- Command: ${action.action === "refresh" ? `\`${action.command}\`` : "none"}
- Reason: ${action.reason}

${action.relevantFiles.length ? action.relevantFiles.map((file) => `- \`${file}\``).join("\n") : "- No relevant changed files."}
`).join("\n")}

## Execution Rule

This plan is advisory. It does not run GraphRAG/Graphify. To execute, run one of:

\`\`\`bash
zl-refresh-run --target <repo> --rag
zl-refresh-run --target <repo> --graph
zl-refresh-run --target <repo> --all
\`\`\`
`;
  fs.writeFileSync(paths.planMd, content);
  return { jsonPath: paths.planJson, mdPath: paths.planMd, actions };
}

function preflightCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const assessment = refreshAssessment(target);
  const written = writePreflightReport(target, assessment);
  console.log(`preflight ${assessment.status}`);
  console.log(`profile ${assessment.profile.name}`);
  for (const domain of assessment.domains) console.log(formatDomainConsole(domain));
  console.log(`write ${written.mdPath}`);
  console.log("heavy refresh executed: no");
  if ((args.strict || assessment.profile.strict) && assessment.status !== "PASS") process.exitCode = 1;
}

function refreshPlanCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const assessment = refreshAssessment(target);
  const written = writeRefreshPlan(target, assessment);
  console.log(`refresh plan ${assessment.status}`);
  for (const action of written.actions) {
    console.log(`${action.kind} ${action.action} ${action.status} ${action.command}`);
  }
  console.log(`write ${written.mdPath}`);
  console.log("heavy refresh executed: no");
}

function requestedRefreshKinds(args) {
  const kinds = new Set();
  if (args.all) {
    kinds.add("rag");
    kinds.add("graph");
  }
  if (args.rag) kinds.add("rag");
  if (args.graph) kinds.add("graph");
  const positional = args._.slice(1).map((item) => String(item).toLowerCase());
  for (const item of positional) {
    if (item === "all") {
      kinds.add("rag");
      kinds.add("graph");
    } else if (item === "rag" || item === "graph") {
      kinds.add(item);
    }
  }
  return [...kinds];
}

function writeRefreshRunReport(target, results) {
  const paths = refreshPaths(target);
  fs.mkdirSync(paths.refreshDir, { recursive: true });
  const ok = results.every((item) => item.ok || item.skipped);
  const content = `# Zhulong Refresh Run

Generated: ${new Date().toISOString()}

## Summary

- Status: ${ok ? "PASS" : "FAIL"}
- Steps: ${results.length}

## Steps

${results.map((item) => `### ${domainLabel(item.kind)}

- Status: ${item.skipped ? "SKIP" : item.ok ? "PASS" : "FAIL"}
- Command: \`${item.command || "-"}\`
- Reason: ${item.reason || "-"}
- Artifact: \`${item.artifact || "-"}\`
`).join("\n")}
`;
  fs.writeFileSync(paths.runMd, content);
  return { ok, outPath: paths.runMd };
}

function refreshRunCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const kinds = requestedRefreshKinds(args);
  if (kinds.length === 0) {
    console.log("missing refresh target. Run: zl-refresh-run --target <repo> --rag|--graph|--all");
    process.exitCode = 1;
    return;
  }

  const assessment = refreshAssessment(target);
  const byKind = new Map(assessment.domains.map((domain) => [domain.kind, domain]));
  const results = [];

  for (const kind of kinds) {
    const domain = byKind.get(kind);
    if (!args.force && domain?.action === "skip") {
      results.push({
        kind,
        skipped: true,
        ok: true,
        command: "skip",
        reason: domain.message,
        artifact: "",
      });
      console.log(`skip ${kind}: ${domain.message}`);
      continue;
    }

    if (kind === "rag") {
      const diff = diffDocuments(target);
      const extracted = extractDocuments(target);
      const index = runRagIndex(target, args);
      results.push({
        kind,
        ok: index.ok,
        command: index.command,
        reason: index.ok ? "RAG diff/extract/index completed." : index.errorMessage || "RAG refresh failed.",
        artifact: index.resultPath,
        diff: diff.paths.diffPath,
        extracted: extracted.paths.indexPath,
      });
      console.log(`rag refresh ${index.ok ? "PASS" : "FAIL"}`);
      console.log(`write ${diff.paths.diffPath}`);
      console.log(`write ${extracted.paths.indexPath}`);
      console.log(`write ${index.resultPath}`);
      continue;
    }

    if (kind === "graph") {
      const graphResult = runGraphBuild(target, args);
      results.push({
        kind,
        ok: graphResult.ok,
        command: graphResult.command,
        reason: graphResult.ok ? "Graphify build completed." : graphResult.errorMessage || "Graph refresh failed.",
        artifact: graphResult.resultPath,
      });
      console.log(`graph refresh ${graphResult.ok ? "PASS" : "FAIL"}`);
      console.log(`write ${graphResult.resultPath}`);
    }
  }

  const report = writeRefreshRunReport(target, results);
  console.log(`write ${report.outPath}`);
  if (!report.ok) process.exitCode = 1;
}

function modeStatusText(profile) {
  return [
    `Document policy: ${profile.documentPolicy}`,
    `RAG backend: ${profile.ragBackend}`,
    `RAG required: ${profile.ragRequired ? "yes" : "no"}`,
    `Graph required: ${profile.graphRequired ? "yes" : "no"}`,
    `Strict blocking: ${profile.strict ? "yes" : "no"}`,
    `Strict: ${profile.strict ? "yes" : "no"}`,
    `Internal profile: ${profile.name}`,
    `Label: ${profile.label}`,
    `Description: ${profile.description}`,
    `Heavy refresh executed: no`,
  ].join("\n");
}

function writeModeReport(target, profile) {
  const paths = refreshPaths(target);
  fs.mkdirSync(paths.refreshDir, { recursive: true });
  const content = `# Zhulong Mode

Generated: ${new Date().toISOString()}

\`\`\`text
${modeStatusText(profile)}
\`\`\`

## Profiles

Recommended user modes:

- \`docs-reference\`: 文档只做参考，缺文档/缺 citation 用 \`WAIVED_WITH_RISK\` 记录，不阻断普通开发。
- \`docs-strict\`: 文档是强约束依据，缺 citation、RAG stale、Graphify stale 会按严格规则阻断。

Legacy internal profiles:

${Object.entries(REFRESH_PROFILES).map(([name, item]) => `- \`${name}\`: ${item.description}`).join("\n")}
`;
  fs.writeFileSync(paths.modeMd, content);
  return paths.modeMd;
}

function modeStatusCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const profile = activeRefreshProfile(target);
  const outPath = writeModeReport(target, profile);
  console.log(modeStatusText(profile));
  console.log(`write ${outPath}`);
}

function modeSetCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const nextRaw = args.profile || args._[1] || "docs-reference";
  const next = normalizeProfileName(nextRaw);
  if (!REFRESH_PROFILES[next]) {
    console.log(`unknown mode ${nextRaw}`);
    console.log(`available docs-reference, docs-strict, ${Object.keys(REFRESH_PROFILES).join(", ")}`);
    process.exitCode = 1;
    return;
  }
  const configPath = planningConfigPath(target);
  const config = readPlanningConfig(target);
  const documentPolicy = documentPolicyFromProfile(next);
  const currentBackend = inferRagBackend(config, next);
  const ragBackend = next === "full-strict" && currentBackend === "none" ? "local" : currentBackend;
  const applied = applyProjectPolicyToConfig(config, {
    documentPolicy,
    ragBackend,
    profile: next,
    model: config.graphrag?.llm_model,
    embedding: config.graphrag?.embedding_model,
  });
  writeJsonFile(configPath, applied.config);
  if (applied.ragBackend === "local" && !fs.existsSync(path.join(target, ".planning", "knowledge", "LOCAL_RAG_SETUP_PLAN.md"))) {
    writeLocalRagSetupPlan(target, {
      documentPolicy: applied.documentPolicy,
      setupRag: "skip",
      model: applied.localModel,
      embedding: applied.localEmbedding,
    });
  }
  const profile = activeRefreshProfile(target);
  const state = loadRefreshState(target);
  state.profile = next;
  saveRefreshState(target, state);
  const outPath = writeModeReport(target, profile);
  console.log(`mode ${next}`);
  console.log(modeStatusText(profile));
  console.log(`write ${configPath}`);
  console.log(`write ${outPath}`);
}

function mode(args) {
  const subcommand = args._[0];
  if (subcommand === "status") {
    modeStatusCommand(args);
    return;
  }
  if (subcommand === "set") {
    modeSetCommand(args);
    return;
  }
  usage();
  process.exitCode = 1;
}

function refresh(args) {
  const subcommand = args._[0];
  if (subcommand === "plan") {
    refreshPlanCommand(args);
    return;
  }
  if (subcommand === "run") {
    refreshRunCommand(args);
    return;
  }
  usage();
  process.exitCode = 1;
}

function uniqueList(items) {
  return [...new Set(items.filter(Boolean))];
}

function normalizeExtensions(items) {
  return uniqueList(items.map((item) => {
    const value = String(item).trim().toLowerCase();
    return value.startsWith(".") ? value : `.${value}`;
  }));
}

function docScanConfig(target) {
  const config = readPlanningConfig(target);
  const specContext = config.spec_context || {};
  const sourcePaths = uniqueList([
    ...(Array.isArray(specContext.source_paths) ? specContext.source_paths : []),
    ...DEFAULT_DOC_SOURCE_PATHS,
  ]);
  const extensions = normalizeExtensions([
    ...(Array.isArray(specContext.scan_extensions) ? specContext.scan_extensions : []),
    ...DEFAULT_DOC_EXTENSIONS,
  ]);
  return { sourcePaths, extensions };
}

function walkFiles(dir, ignoreNames, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreNames.has(entry.name)) continue;
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(entryPath, ignoreNames, results);
    } else if (entry.isFile()) {
      results.push(entryPath);
    }
  }
  return results;
}

function fileCategory(ext) {
  if ([".md", ".markdown", ".txt", ".csv"].includes(ext)) return "Text";
  if (ext === ".pdf") return "PDF";
  if ([".doc", ".docx"].includes(ext)) return "Word";
  if ([".xls", ".xlsx"].includes(ext)) return "Excel";
  return "Other";
}

function markdownCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function formatBytes(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function discoverDocuments(target, sourcePaths, extensions) {
  const extensionSet = new Set(extensions);
  const sourceRoots = sourcePaths
    .map((item) => path.resolve(target, item))
    .filter((item) => fs.existsSync(item) && fs.statSync(item).isDirectory());
  const files = [];

  for (const root of sourceRoots) {
    for (const filePath of walkFiles(root, DOC_IGNORE_NAMES)) {
      const ext = path.extname(filePath).toLowerCase();
      if (!extensionSet.has(ext)) continue;
      const stat = fs.statSync(filePath);
      files.push({
        path: path.relative(target, filePath),
        root: path.relative(target, root) || ".",
        ext,
        category: fileCategory(ext),
        size: stat.size,
        modified: stat.mtime.toISOString(),
      });
    }
  }

  files.sort((a, b) => a.path.localeCompare(b.path));
  return { sourceRoots: sourceRoots.map((item) => path.relative(target, item) || "."), files };
}

function countBy(items, key) {
  const counts = new Map();
  for (const item of items) {
    const value = item[key];
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

function writeDocScan(target, scan) {
  const knowledgeDir = path.join(target, ".planning", "knowledge");
  fs.mkdirSync(knowledgeDir, { recursive: true });

  const generatedAt = new Date().toISOString();
  const categoryCounts = countBy(scan.files, "category");
  const extensionCounts = countBy(scan.files, "ext");
  const sourceRoots = scan.sourceRoots.length ? scan.sourceRoots : ["None found"];

  const sourcesContent = `# RAG Sources: ${path.basename(target)}

Generated by Zhulong Project Intelligence Kit on ${generatedAt}.

## Summary

- Last scan: ${generatedAt}
- Total documents: ${scan.files.length}
- Source roots: ${sourceRoots.map((item) => `\`${item}\``).join(", ")}

## Source Documents

| Path | Category | Extension | Size | Modified |
| --- | --- | --- | ---: | --- |
${scan.files.length ? scan.files.map((file) => `| \`${markdownCell(file.path)}\` | ${file.category} | \`${file.ext}\` | ${formatBytes(file.size)} | ${file.modified} |`).join("\n") : "| None found | - | - | - | - |"}

## Notes

- This file is a source inventory, not proof that a document has been indexed.
- Use \`zl-docs-index\` to create a document RAG handoff.
- Use \`zl-docs-index --run\` only when direct RAG indexing is approved.
- PDF/Word/Excel text extraction remains metadata-only until a secure
  extraction workflow is configured.
`;

  const statusContent = `# Document RAG Status: ${path.basename(target)}

Generated by Zhulong Project Intelligence Kit on ${generatedAt}.

## Current Status

- Last scan: ${generatedAt}
- Scan command: \`zl-docs-scan --target ${target}\`
- Total source documents: ${scan.files.length}
- Normalized documents: 0
- RAG backend: Not configured
- Index status: Not indexed

## Source Coverage

| Category | Count | Notes |
| --- | ---: | --- |
| Text | ${categoryCounts.get("Text") || 0} | Markdown, text, and CSV files |
| PDF | ${categoryCounts.get("PDF") || 0} | Metadata only in MVP1 |
| Word | ${categoryCounts.get("Word") || 0} | Metadata only in MVP1 |
| Excel | ${categoryCounts.get("Excel") || 0} | Metadata only in MVP1 |
| Other | ${categoryCounts.get("Other") || 0} | Metadata only in MVP1 |

## Extensions

${[...extensionCounts.entries()].sort().map(([ext, count]) => `- \`${ext}\`: ${count}`).join("\n") || "- None found"}

## Next Actions

- [ ] Review \`.planning/knowledge/RAG_SOURCES.md\`.
- [ ] Fill \`.planning/knowledge/GLOSSARY.md\`.
- [ ] Use \`zl-docs-index\` for RAG backend handoff if needed.
- [ ] Use \`zl-docs-index --run\` only when direct document RAG execution is approved.
- [ ] Keep private customer documents and generated indexes local unless a secure sharing process exists.
`;

  const sourcesPath = path.join(knowledgeDir, "RAG_SOURCES.md");
  const statusPath = path.join(knowledgeDir, "DOC_RAG_STATUS.md");
  fs.writeFileSync(sourcesPath, sourcesContent);
  fs.writeFileSync(statusPath, statusContent);
  return { sourcesPath, statusPath, generatedAt };
}

function isTextDocument(file) {
  return file.category === "Text";
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function xmlDecode(value) {
  return String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function decodePdfString(value) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\([()\\])/g, "$1");
}

function readZipEntries(filePath) {
  const buffer = fs.readFileSync(filePath);
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66000); i -= 1) {
    if (buffer.readUInt32LE(i) === eocdSignature) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset < 0) throw commandFailure("ZIP end-of-central-directory not found");

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let cursor = buffer.readUInt32LE(eocdOffset + 16);
  const entries = new Map();

  for (let i = 0; i < entryCount; i += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) break;
    const compression = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.slice(cursor + 46, cursor + 46 + nameLength).toString("utf8");

    if (buffer.readUInt32LE(localOffset) === 0x04034b50) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.slice(dataStart, dataStart + compressedSize);
      let data = null;
      if (compression === 0) data = compressed;
      else if (compression === 8) data = zlib.inflateRawSync(compressed);
      if (data) entries.set(name, data);
    }

    cursor += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function textFromWordXml(xml) {
  const paragraphs = String(xml || "")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tab>/g, "\t");
  const chunks = [];
  for (const match of paragraphs.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)) {
    chunks.push(xmlDecode(match[1]));
  }
  return chunks.join("").replace(/\n{3,}/g, "\n\n").trim();
}

function extractDocxText(filePath) {
  const entries = readZipEntries(filePath);
  const targets = [...entries.keys()].filter((name) =>
    name === "word/document.xml" || /^word\/(header|footer)\d+\.xml$/.test(name)
  );
  return targets.map((name) => textFromWordXml(entries.get(name).toString("utf8"))).filter(Boolean).join("\n\n").trim();
}

function extractXlsxText(filePath) {
  const entries = readZipEntries(filePath);
  const shared = [];
  const sharedXml = entries.get("xl/sharedStrings.xml");
  if (sharedXml) {
    for (const match of sharedXml.toString("utf8").matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
      const text = [...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((part) => xmlDecode(part[1])).join("");
      shared.push(text);
    }
  }

  const sheetNames = [...entries.keys()].filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort();
  const lines = [];
  for (const sheetName of sheetNames) {
    lines.push(`# ${sheetName}`);
    const xml = entries.get(sheetName).toString("utf8");
    for (const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const cells = [];
      for (const cell of row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
        const attrs = cell[1] || "";
        const body = cell[2] || "";
        const type = (attrs.match(/\bt="([^"]+)"/) || [])[1];
        const value = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        const inline = (body.match(/<t\b[^>]*>([\s\S]*?)<\/t>/) || [])[1];
        if (type === "s" && value !== undefined) cells.push(shared[Number(value)] || "");
        else if (inline !== undefined) cells.push(xmlDecode(inline));
        else if (value !== undefined) cells.push(xmlDecode(value));
      }
      if (cells.some(Boolean)) lines.push(cells.join(", "));
    }
  }
  return lines.join("\n").trim();
}

function extractPdfText(filePath) {
  if (commandAvailable("pdftotext")) {
    try {
      return execFileSync("pdftotext", ["-layout", filePath, "-"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 60000,
      }).trim();
    } catch {
      // Fall through to a conservative literal-string fallback.
    }
  }

  const raw = fs.readFileSync(filePath).toString("latin1");
  const chunks = [];
  for (const match of raw.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
    chunks.push(decodePdfString(match[0].replace(/\)\s*Tj$/, "").slice(1)));
  }
  for (const match of raw.matchAll(/\[(.*?)\]\s*TJ/gs)) {
    const line = [...match[1].matchAll(/\((?:\\.|[^\\)])*\)/g)]
      .map((item) => decodePdfString(item[0].slice(1, -1)))
      .join("");
    if (line.trim()) chunks.push(line);
  }
  return chunks.join("\n").trim();
}

function extractDocumentText(target, file) {
  const sourcePath = path.join(target, file.path);
  if ([".md", ".markdown", ".txt", ".csv"].includes(file.ext)) {
    return { ok: true, method: "plain-text", text: fs.readFileSync(sourcePath, "utf8") };
  }
  try {
    if (file.ext === ".docx") {
      return { ok: true, method: "docx-zip-xml", text: extractDocxText(sourcePath) };
    }
    if (file.ext === ".xlsx") {
      return { ok: true, method: "xlsx-zip-xml", text: extractXlsxText(sourcePath) };
    }
    if (file.ext === ".pdf") {
      return { ok: true, method: commandAvailable("pdftotext") ? "pdftotext" : "pdf-literal-fallback", text: extractPdfText(sourcePath) };
    }
    return { ok: false, method: "unsupported", text: "", warning: `unsupported extension ${file.ext}` };
  } catch (error) {
    return { ok: false, method: "extract-error", text: "", warning: error.message || String(error) };
  }
}

function safeGeneratedName(relativePath) {
  const cleaned = relativePath
    .replace(/[\\/]/g, "__")
    .replace(/[^a-zA-Z0-9._\-\u3040-\u30ff\u3400-\u9fff]+/g, "_");
  return `${cleaned}.md`;
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function normalizeDocuments(target) {
  const { sourcePaths, extensions } = docScanConfig(target);
  const scan = discoverDocuments(target, sourcePaths, extensions);
  writeDocScan(target, scan);

  const knowledgeDir = path.join(target, ".planning", "knowledge");
  const normalizedDir = path.join(knowledgeDir, "normalized");
  fs.rmSync(normalizedDir, { recursive: true, force: true });
  fs.mkdirSync(normalizedDir, { recursive: true });

  const generatedAt = new Date().toISOString();
  const normalized = [];
  const skipped = [];

  for (const file of scan.files) {
    if (!isTextDocument(file)) {
      skipped.push({ ...file, reason: "metadata-only in MVP" });
      continue;
    }
    const sourcePath = path.join(target, file.path);
    const text = fs.readFileSync(sourcePath, "utf8");
    const outName = safeGeneratedName(file.path);
    const outPath = path.join(normalizedDir, outName);
    const content = `---
source_path: ${yamlString(file.path)}
category: ${yamlString(file.category)}
extension: ${yamlString(file.ext)}
normalized_at: ${yamlString(generatedAt)}
---

# Normalized Source: ${file.path}

${text}
`;
    fs.writeFileSync(outPath, content);
    normalized.push({ ...file, normalized_path: path.relative(target, outPath) });
  }

  const manifestPath = path.join(normalizedDir, "MANIFEST.md");
  const manifest = `# Normalized Document Manifest

Generated by Zhulong Project Intelligence Kit on ${generatedAt}.

## Summary

- Source documents: ${scan.files.length}
- Normalized documents: ${normalized.length}
- Skipped documents: ${skipped.length}

## Normalized

| Source | Normalized Path | Extension |
| --- | --- | --- |
${normalized.length ? normalized.map((file) => `| \`${markdownCell(file.path)}\` | \`${markdownCell(file.normalized_path)}\` | \`${file.ext}\` |`).join("\n") : "| None | - | - |"}

## Skipped

| Source | Category | Extension | Reason |
| --- | --- | --- | --- |
${skipped.length ? skipped.map((file) => `| \`${markdownCell(file.path)}\` | ${file.category} | \`${file.ext}\` | ${file.reason} |`).join("\n") : "| None | - | - | - |"}
`;
  fs.writeFileSync(manifestPath, manifest);
  writeDocStatus(target, scan, {
    generatedAt,
    normalizedCount: normalized.length,
    backend: "local-normalized-text",
    indexStatus: "Normalized text available",
  });

  return { scan, normalized, skipped, normalizedDir, manifestPath };
}

function documentIndexPaths(target) {
  return {
    knowledgeDir: path.join(target, ".planning", "knowledge"),
    extractedDir: path.join(target, ".planning", "knowledge", "extracted"),
    indexPath: path.join(target, ".planning", "knowledge", "DOCUMENT_INDEX.json"),
    reportPath: path.join(target, ".planning", "knowledge", "DOCUMENT_EXTRACT_REPORT.md"),
    diffPath: path.join(target, ".planning", "knowledge", "DOCUMENT_DIFF.md"),
    citationsPath: path.join(target, ".planning", "knowledge", "CITATIONS.md"),
    docsQueryJson: path.join(target, ".planning", "knowledge", "DOCS_QUERY_RESULT.json"),
    docsQueryMd: path.join(target, ".planning", "knowledge", "DOCS_QUERY_RESULT.md"),
    docsSyncJson: path.join(target, ".planning", "knowledge", "DOCS_SYNC.json"),
    docsSyncMd: path.join(target, ".planning", "knowledge", "DOCS_SYNC.md"),
  };
}

function loadDocumentIndex(target) {
  const { indexPath } = documentIndexPaths(target);
  if (!fs.existsSync(indexPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(indexPath, "utf8"));
  } catch {
    return null;
  }
}

function writeDocumentExtractReport(target, index, paths) {
  const rows = index.documents.map((doc) => {
    const status = doc.extracted ? "extracted" : "failed";
    const warning = doc.warning ? `; ${doc.warning}` : "";
    return `| \`${markdownCell(doc.path)}\` | ${doc.category} | \`${doc.ext}\` | ${status} | ${doc.method}${warning} | ${doc.textLength} | \`${doc.sha256.slice(0, 12)}\` |`;
  });
  const content = `# Document Extraction Report

Generated: ${index.generatedAt}

## Summary

- Status: ${index.documents.every((doc) => doc.extracted || doc.optional) ? "PASS" : "WARN"}
- Source documents: ${index.documents.length}
- Extracted documents: ${index.documents.filter((doc) => doc.extracted).length}
- Output directory: \`${path.relative(target, paths.extractedDir)}\`
- Index: \`${path.relative(target, paths.indexPath)}\`

## Extraction Matrix

| Source | Category | Ext | Status | Method | Text chars | SHA-256 |
| --- | --- | --- | --- | --- | ---: | --- |
${rows.length ? rows.join("\n") : "| None | - | - | - | - | - | - |"}

## Citation Rule

- Extracted files preserve source path and line anchors.
- Use \`zl-docs-citations --target <repo> "<query>"\` before treating an answer as specification evidence.
- Answers without a matching citation must be labeled as hypothesis, not source-backed fact.
`;
  fs.writeFileSync(paths.reportPath, content);
}

function extractDocuments(target) {
  const { sourcePaths, extensions } = docScanConfig(target);
  const scan = discoverDocuments(target, sourcePaths, extensions);
  writeDocScan(target, scan);
  const paths = documentIndexPaths(target);
  fs.rmSync(paths.extractedDir, { recursive: true, force: true });
  fs.mkdirSync(paths.extractedDir, { recursive: true });

  const generatedAt = new Date().toISOString();
  const documents = [];

  for (const file of scan.files) {
    const sourcePath = path.join(target, file.path);
    const extraction = extractDocumentText(target, file);
    const text = extraction.text || "";
    const outName = safeGeneratedName(file.path);
    const extractedPath = path.join(paths.extractedDir, outName);
    const extractedRelative = path.relative(target, extractedPath);
    if (extraction.ok && text.trim()) {
      const content = `---
source_path: ${yamlString(file.path)}
category: ${yamlString(file.category)}
extension: ${yamlString(file.ext)}
sha256: ${yamlString(sha256File(sourcePath))}
extracted_at: ${yamlString(generatedAt)}
extract_method: ${yamlString(extraction.method)}
---

# Extracted Source: ${file.path}

${text.trim()}
`;
      fs.writeFileSync(extractedPath, content);
    }
    documents.push({
      path: file.path,
      root: file.root,
      ext: file.ext,
      category: file.category,
      size: file.size,
      modified: file.modified,
      sha256: sha256File(sourcePath),
      extracted: Boolean(extraction.ok && text.trim()),
      method: extraction.method,
      warning: extraction.warning || (extraction.ok && !text.trim() ? "no extractable text found" : ""),
      extracted_path: extraction.ok && text.trim() ? extractedRelative : null,
      textLength: text.trim().length,
    });
  }

  const index = {
    generatedAt,
    sourceRoots: scan.sourceRoots,
    documents,
  };
  writeJsonFile(paths.indexPath, index);
  writeDocumentExtractReport(target, index, paths);
  writeDocStatus(target, scan, {
    generatedAt,
    normalizedCount: documents.filter((doc) => doc.extracted).length,
    backend: "local-extracted-documents",
    indexStatus: "Document text extracted with local methods",
  });
  return { scan, index, paths };
}

function currentDocumentFingerprints(target) {
  const { sourcePaths, extensions } = docScanConfig(target);
  const scan = discoverDocuments(target, sourcePaths, extensions);
  const map = new Map();
  for (const file of scan.files) {
    map.set(file.path, {
      path: file.path,
      sha256: sha256File(path.join(target, file.path)),
      modified: file.modified,
      size: file.size,
      ext: file.ext,
      category: file.category,
    });
  }
  return { scan, map };
}

function diffDocuments(target) {
  const previous = loadDocumentIndex(target);
  const current = currentDocumentFingerprints(target);
  const previousMap = new Map((previous?.documents || []).map((doc) => [doc.path, doc]));
  const added = [];
  const removed = [];
  const modified = [];
  const unchanged = [];

  for (const [docPath, doc] of current.map.entries()) {
    const old = previousMap.get(docPath);
    if (!old) added.push(doc);
    else if (old.sha256 !== doc.sha256) modified.push({ before: old, after: doc });
    else unchanged.push(doc);
  }
  for (const [docPath, doc] of previousMap.entries()) {
    if (!current.map.has(docPath)) removed.push(doc);
  }

  const paths = documentIndexPaths(target);
  fs.mkdirSync(paths.knowledgeDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const content = `# Document Diff

Generated: ${generatedAt}

## Summary

- Previous index: ${previous ? previous.generatedAt : "missing"}
- Current documents: ${current.map.size}
- Added: ${added.length}
- Modified: ${modified.length}
- Removed: ${removed.length}
- Unchanged: ${unchanged.length}

## Added

${added.length ? added.map((doc) => `- \`${doc.path}\` (${doc.ext}, ${formatBytes(doc.size)})`).join("\n") : "- None"}

## Modified

${modified.length ? modified.map((item) => `- \`${item.after.path}\` (${item.before.sha256.slice(0, 12)} -> ${item.after.sha256.slice(0, 12)})`).join("\n") : "- None"}

## Removed

${removed.length ? removed.map((doc) => `- \`${doc.path}\``).join("\n") : "- None"}

## Next Action

- If added or modified is non-zero, run \`zl-docs-extract --target <repo>\`.
- If extracted documents are used by GraphRAG, run \`zl-rag-init-local --target <repo>\` and \`zl-docs-index --target <repo> --run\`.
`;
  fs.writeFileSync(paths.diffPath, content);
  return { previous, current, added, modified, removed, unchanged, paths };
}

function parseSourceFromExtracted(text, fallback) {
  const match = text.match(/^source_path:\s*"(.+)"\s*$/m);
  return match ? match[1] : fallback;
}

function queryExtractedDocuments(target, query) {
  const paths = documentIndexPaths(target);
  if (!fs.existsSync(paths.extractedDir) || !fs.statSync(paths.extractedDir).isDirectory()) {
    return { missing: true, matches: [] };
  }
  const terms = uniqueList(String(query || "").toLowerCase().split(/\s+/).filter(Boolean));
  const files = walkFiles(paths.extractedDir, new Set([".DS_Store"]))
    .filter((filePath) => filePath.endsWith(".md"));
  const matches = [];
  for (const filePath of files) {
    const text = fs.readFileSync(filePath, "utf8");
    const sourcePath = parseSourceFromExtracted(text, path.relative(target, filePath));
    const lines = text.split(/\r?\n/);
    const sourceTitleIndex = lines.findIndex((line) => line.startsWith("# Extracted Source:"));
    lines.forEach((line, index) => {
      const haystack = line.toLowerCase();
      const score = terms.reduce((count, term) => count + (haystack.includes(term) ? 1 : 0), 0);
      if (score > 0) {
        const sourceLine = sourceTitleIndex >= 0 ? index - sourceTitleIndex - 1 : index + 1;
        matches.push({
          sourcePath,
          extractedPath: path.relative(target, filePath),
          line: sourceLine > 0 ? sourceLine : index + 1,
          score,
          text: line.trim(),
        });
      }
    });
  }
  matches.sort((a, b) => b.score - a.score || a.sourcePath.localeCompare(b.sourcePath) || a.line - b.line);
  return { missing: false, matches };
}

function writeCitations(target, query, matches) {
  const paths = documentIndexPaths(target);
  fs.mkdirSync(paths.knowledgeDir, { recursive: true });
  const content = `# Document Citations

Generated: ${new Date().toISOString()}

## Query

${query}

## Summary

- Matches: ${matches.length}
- Evidence rule: if no citation is listed here, treat the answer as hypothesis.

## Citations

${matches.length ? matches.slice(0, 20).map((match, index) => `${index + 1}. \`${match.sourcePath}:${match.line}\` - ${match.text}`).join("\n") : "- None"}
`;
  fs.writeFileSync(paths.citationsPath, content);
  return paths.citationsPath;
}

function writeDocsQueryResult(target, query, result, backend = "local-documents") {
  const paths = documentIndexPaths(target);
  fs.mkdirSync(paths.knowledgeDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const matches = result.matches || [];
  const status = result.missing ? "failed" : matches.length > 0 ? "success" : "no_match";
  const data = {
    generatedAt,
    status,
    backend,
    query,
    matches: matches.slice(0, 50),
    heavyRefreshExecuted: false,
  };
  writeJsonFile(paths.docsQueryJson, data);
  const content = `# Docs Query Result

Generated: ${generatedAt}

## Query

${query}

## Result

- Status: ${status}
- Backend: ${backend}
- Matches: ${matches.length}
- Heavy refresh executed: no

## Answer

${matches.length
  ? matches.slice(0, 8).map((match) => `- \`${match.sourcePath}:${match.line}\` - ${match.text}`).join("\n")
  : result.missing ? "- Missing local document index." : "- No local document matches."}

## Next Command

\`\`\`bash
zl-answer-audit --target <repo>
\`\`\`
`;
  fs.writeFileSync(paths.docsQueryMd, content);
  return { jsonPath: paths.docsQueryJson, mdPath: paths.docsQueryMd, data };
}

function docsSync(target, args = {}) {
  const diff = diffDocuments(target);
  const changedCount = diff.added.length + diff.modified.length + diff.removed.length;
  const extraction = extractDocuments(target);
  const ambiguity = runAmbiguityAudit(target, { strict: Boolean(args.strict) });
  const citations = citationAudit(target);
  const indexResult = args.index ? runRagIndex(target, args) : null;
  const stale = changedCount > 0 || (!diff.previous && diff.current.map.size > 0);
  const status = ambiguity.blocking || (indexResult && !indexResult.ok)
    ? "FAIL"
    : stale && !indexResult
      ? "STALE_NEEDS_REFRESH"
      : citations.ok
        ? "PASS"
        : "WAIVED_WITH_RISK";
  const paths = documentIndexPaths(target);
  const generatedAt = new Date().toISOString();
  const data = {
    generatedAt,
    status,
    stale,
    changedCount,
    diff: {
      previousIndex: diff.previous?.generatedAt || null,
      currentDocuments: diff.current.map.size,
      added: diff.added.map((doc) => doc.path),
      modified: diff.modified.map((item) => item.after.path),
      removed: diff.removed.map((doc) => doc.path),
      unchanged: diff.unchanged.length,
      report: path.relative(target, diff.paths.diffPath),
    },
    extraction: {
      documents: extraction.index.documents.length,
      extracted: extraction.index.documents.filter((doc) => doc.extracted).length,
      report: path.relative(target, extraction.paths.reportPath),
      index: path.relative(target, extraction.paths.indexPath),
    },
    citationAudit: {
      status: citations.ok ? "PASS" : "FAIL",
      citations: citations.records.length,
      issues: citations.issues,
      report: path.relative(target, citations.outPath),
    },
    ambiguityAudit: {
      status: ambiguity.status,
      hits: ambiguity.ambiguity_hits,
      density: ambiguity.ambiguity_density,
      report: path.relative(target, ambiguity.mdPath),
    },
    index: indexResult
      ? {
        status: indexResult.ok ? "success" : "failed",
        command: indexResult.command,
        report: path.relative(target, indexResult.resultPath),
      }
      : null,
    heavyRefreshExecuted: Boolean(args.index),
  };
  writeJsonFile(paths.docsSyncJson, data);
  const content = `# Docs Sync

Generated: ${generatedAt}

## Summary

- Status: ${status}
- Changed documents: ${changedCount}
- Added: ${diff.added.length}
- Modified: ${diff.modified.length}
- Removed: ${diff.removed.length}
- Extracted documents: ${data.extraction.extracted} / ${data.extraction.documents}
- Citation audit: ${data.citationAudit.status}
- Ambiguity audit: ${data.ambiguityAudit.status} (${data.ambiguityAudit.hits} hits)
- Heavy refresh executed: ${args.index ? "yes" : "no"}

## Sync Order

1. Diff current source documents against the previous \`DOCUMENT_INDEX.json\`.
2. Extract documents and overwrite \`DOCUMENT_INDEX.json\`.
3. Run deterministic ambiguity and citation audits.
4. Run GraphRAG index only when \`--index\` is explicit.

## Diff

- Previous index: ${diff.previous?.generatedAt || "missing"}
- Diff report: \`${path.relative(target, diff.paths.diffPath)}\`

### Added

${diff.added.length ? diff.added.map((doc) => `- \`${doc.path}\``).join("\n") : "- None"}

### Modified

${diff.modified.length ? diff.modified.map((item) => `- \`${item.after.path}\``).join("\n") : "- None"}

### Removed

${diff.removed.length ? diff.removed.map((doc) => `- \`${doc.path}\``).join("\n") : "- None"}

## Citation Audit

- Report: \`${path.relative(target, citations.outPath)}\`
- Issues: ${citations.issues.length}

${citations.issues.length ? citations.issues.map((issue) => `- \`${issue.citation}\`: ${issue.detail}`).join("\n") : "No citation issues found."}

## Index

${indexResult
  ? `- Status: ${indexResult.ok ? "success" : "failed"}\n- Command: \`${markdownCell(indexResult.command)}\`\n- Report: \`${path.relative(target, indexResult.resultPath)}\``
  : "- Skipped. Run `zl-docs-sync --target <repo> --index` only when GraphRAG refresh is approved."}

## Next Commands

${status === "STALE_NEEDS_REFRESH"
  ? "- `zl-refresh-plan --target <repo>`\n- `zl-docs-sync --target <repo> --index`"
  : "- `zl-answer-audit --target <repo>` after the next docs/RAG answer."}
`;
  fs.writeFileSync(paths.docsSyncMd, content);
  return { ...data, paths };
}

function qualityPaths(target) {
  const qualityDir = path.join(target, ".planning", "quality");
  return {
    qualityDir,
    goldenPath: path.join(qualityDir, "rag-goldens.json"),
    goldenRunPath: path.join(qualityDir, "RAG_GOLDEN_RUN.md"),
    ragEvalPath: path.join(qualityDir, "RAG_EVAL.md"),
    answerAuditJson: path.join(qualityDir, "ANSWER_AUDIT.json"),
    answerAuditMd: path.join(qualityDir, "ANSWER_AUDIT.md"),
    ambiguityAuditJson: path.join(qualityDir, "AMBIGUITY_AUDIT.json"),
    ambiguityAuditMd: path.join(qualityDir, "AMBIGUITY_AUDIT.md"),
    structureAuditJson: path.join(qualityDir, "STRUCTURE_AUDIT.json"),
    structureAuditMd: path.join(qualityDir, "STRUCTURE_AUDIT.md"),
  };
}

function ambiguityAuditCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const result = runAmbiguityAudit(target, { strict: Boolean(args.strict) });
  console.log(`ambiguity audit ${result.status}`);
  console.log(`files ${result.files_scanned}`);
  console.log(`ambiguity hits ${result.ambiguity_hits}`);
  console.log(`ambiguity density ${result.ambiguity_density}`);
  console.log(`write ${result.mdPath}`);
  console.log("heavy refresh executed: no");
  process.exitCode = result.blocking ? 1 : 0;
}

function structureAuditCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const result = runStructureAudit(target, { strict: Boolean(args.strict) });
  console.log(`structure audit ${result.status}`);
  console.log(`structure compliance rate ${result.structure_compliance_rate}`);
  console.log(`passed ${result.passed}/${result.total}`);
  for (const record of result.records.filter((item) => !item.valid)) console.log(`${record.status} ${record.path} ${record.detail}`);
  console.log(`write ${result.mdPath}`);
  console.log("heavy refresh executed: no");
  process.exitCode = result.blocking ? 1 : 0;
}

function loadGoldens(target) {
  const { goldenPath } = qualityPaths(target);
  if (!fs.existsSync(goldenPath)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(goldenPath, "utf8"));
    return Array.isArray(data.cases) ? data.cases : Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveGoldens(target, cases) {
  const paths = qualityPaths(target);
  fs.mkdirSync(paths.qualityDir, { recursive: true });
  writeJsonFile(paths.goldenPath, {
    generatedAt: new Date().toISOString(),
    cases,
  });
  return paths.goldenPath;
}

function ragGoldenAdd(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const question = args.question || args._.slice(1).join(" ").trim();
  const expect = args.expect || args.expected || args.answer;
  if (!question || !expect) {
    console.log('missing --question "<q>" or --expect "<term>"');
    process.exitCode = 1;
    return;
  }
  const cases = loadGoldens(target);
  const id = args.id || `golden-${slugify(question, "case")}`;
  const item = {
    id,
    question,
    expected_terms: String(expect).split(",").map((term) => term.trim()).filter(Boolean),
    citation: args.citation || "",
    createdAt: new Date().toISOString(),
  };
  const next = cases.filter((entry) => entry.id !== id);
  next.push(item);
  const outPath = saveGoldens(target, next);
  console.log(`write ${outPath}`);
  console.log(`golden ${id}`);
}

function runRagGoldens(target) {
  const paths = qualityPaths(target);
  const cases = loadGoldens(target);
  const results = [];
  for (const item of cases) {
    const extracted = queryExtractedDocuments(target, item.question);
    const normalized = extracted.missing ? queryNormalizedDocs(target, item.question) : { matches: [] };
    const matches = extracted.missing ? (normalized.matches || []) : (extracted.matches || []);
    const text = matches.map((match) => `${match.sourcePath || ""} ${match.text || ""}`).join("\n").toLowerCase();
    const expected = Array.isArray(item.expected_terms) ? item.expected_terms : [];
    const missingTerms = expected.filter((term) => !text.includes(String(term).toLowerCase()));
    const ok = expected.length > 0 && missingTerms.length === 0 && matches.length > 0;
    results.push({
      id: item.id,
      question: item.question,
      expected_terms: expected,
      citation: item.citation || "",
      ok,
      missing_terms: missingTerms,
      matches: matches.slice(0, 5),
    });
  }

  fs.mkdirSync(paths.qualityDir, { recursive: true });
  const pass = results.filter((item) => item.ok).length;
  const content = `# RAG Golden Run

Generated: ${new Date().toISOString()}

## Summary

- Status: ${results.length > 0 && pass === results.length ? "PASS" : "FAIL"}
- Cases: ${results.length}
- PASS: ${pass}
- FAIL: ${results.length - pass}

## Results

${results.length ? results.map((item) => `### ${item.id}

- Status: ${item.ok ? "PASS" : "FAIL"}
- Question: ${item.question}
- Expected terms: ${item.expected_terms.map((term) => `\`${term}\``).join(", ")}
- Citation hint: ${item.citation || "-"}
- Missing terms: ${item.missing_terms.length ? item.missing_terms.join(", ") : "-"}
- Matches: ${item.matches.length}
`).join("\n") : "No golden cases found. Run `zl-rag-golden-add` first."}
`;
  fs.writeFileSync(paths.goldenRunPath, content);
  return { ok: results.length > 0 && pass === results.length, results, outPath: paths.goldenRunPath };
}

function ragGoldenRun(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const result = runRagGoldens(target);
  console.log(`rag golden run ${result.ok ? "PASS" : "FAIL"}`);
  console.log(`cases ${result.results.length}`);
  console.log(`write ${result.outPath}`);
  process.exitCode = result.ok ? 0 : 1;
}

function parseCitationRecords(text) {
  const records = [];
  for (const match of String(text || "").matchAll(/`([^`]+):(\d+)`\s*-\s*(.*)$/gm)) {
    records.push({
      sourcePath: match[1],
      line: Number(match[2]),
      text: match[3] || "",
    });
  }
  return records;
}

function citationAudit(target) {
  const paths = documentIndexPaths(target);
  const issues = [];
  const citationText = fs.existsSync(paths.citationsPath) ? fs.readFileSync(paths.citationsPath, "utf8") : "";
  const records = parseCitationRecords(citationText);
  if (!citationText) issues.push({ citation: "CITATIONS.md", detail: "missing citation report" });
  if (records.length === 0) issues.push({ citation: "CITATIONS.md", detail: "no citation records found" });
  for (const record of records) {
    const sourcePath = path.join(target, record.sourcePath);
    if (!fs.existsSync(sourcePath)) {
      issues.push({ citation: `${record.sourcePath}:${record.line}`, detail: "source file missing" });
      continue;
    }
    if (record.line < 1) issues.push({ citation: `${record.sourcePath}:${record.line}`, detail: "invalid line number" });
  }
  const outPath = path.join(paths.knowledgeDir, "CITATION_AUDIT.md");
  fs.mkdirSync(paths.knowledgeDir, { recursive: true });
  const content = `# Citation Audit

Generated: ${new Date().toISOString()}

## Summary

- Status: ${issues.length === 0 ? "PASS" : "FAIL"}
- Citations: ${records.length}
- Issues: ${issues.length}

## Issues

${issues.length ? issues.map((issue) => `- \`${issue.citation}\`: ${issue.detail}`).join("\n") : "No citation issues found."}
`;
  fs.writeFileSync(outPath, content);
  return { ok: issues.length === 0, records, issues, outPath };
}

function citationAuditCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const result = citationAudit(target);
  console.log(`citation audit ${result.ok ? "PASS" : "FAIL"}`);
  console.log(`citations ${result.records.length}`);
  console.log(`write ${result.outPath}`);
  for (const issue of result.issues) console.log(`FAIL ${issue.citation} ${issue.detail}`);
  process.exitCode = result.ok ? 0 : 1;
}

function ragEval(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const golden = runRagGoldens(target);
  const citations = citationAudit(target);
  const paths = qualityPaths(target);
  const ok = golden.ok && citations.ok;
  const content = `# RAG Evaluation

Generated: ${new Date().toISOString()}

## Summary

- Status: ${ok ? "PASS" : "FAIL"}
- Golden cases: ${golden.results.length}
- Golden pass: ${golden.results.filter((item) => item.ok).length}
- Citation audit: ${citations.ok ? "PASS" : "FAIL"}

## Evidence

- Golden run: \`${path.relative(target, golden.outPath)}\`
- Citation audit: \`${path.relative(target, citations.outPath)}\`

## Rule

- RAG answers used as specification evidence must have matching expected terms and valid citations.
- Missing citations mean the answer is a hypothesis, not a source-backed fact.
`;
  fs.mkdirSync(paths.qualityDir, { recursive: true });
  fs.writeFileSync(paths.ragEvalPath, content);
  console.log(`rag eval ${ok ? "PASS" : "FAIL"}`);
  console.log(`write ${paths.ragEvalPath}`);
  process.exitCode = ok ? 0 : 1;
}

function answerSourceCandidates(target) {
  const docPaths = documentIndexPaths(target);
  const ragPaths = ragArtifactPaths(target);
  return [
    { kind: "rag-query", path: ragPaths.queryResult },
    { kind: "docs-query", path: docPaths.docsQueryMd },
    { kind: "citations", path: docPaths.citationsPath },
  ];
}

function resolveAnswerSource(target, args = {}) {
  if (args.answer) {
    return {
      kind: "inline-answer",
      sourcePath: null,
      relativePath: "--answer",
      text: String(args.answer),
      exists: true,
    };
  }
  if (args.from) {
    const sourcePath = path.isAbsolute(args.from) ? args.from : path.join(target, args.from);
    return {
      kind: "explicit-file",
      sourcePath,
      relativePath: path.relative(target, sourcePath) || args.from,
      text: fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, "utf8") : "",
      exists: fs.existsSync(sourcePath),
    };
  }
  for (const candidate of answerSourceCandidates(target)) {
    if (fs.existsSync(candidate.path)) {
      return {
        kind: candidate.kind,
        sourcePath: candidate.path,
        relativePath: path.relative(target, candidate.path),
        text: fs.readFileSync(candidate.path, "utf8"),
        exists: true,
      };
    }
  }
  return {
    kind: "missing",
    sourcePath: null,
    relativePath: "",
    text: "",
    exists: false,
  };
}

function normalizeCitationPath(value) {
  return String(value || "")
    .trim()
    .replace(/^["'`[(]+/, "")
    .replace(/["'`\])]+$/, "")
    .replace(/^\.\//, "");
}

function parseAnswerCitationToken(value) {
  const clean = normalizeCitationPath(value);
  if (!clean || clean.includes("://")) return null;
  const lineMatch = clean.match(/^(.*):(\d+)$/);
  const sourcePath = lineMatch ? lineMatch[1] : clean;
  if (!/\.(md|markdown|txt|csv|pdf|docx|xlsx)$/i.test(sourcePath)) return null;
  return {
    sourcePath,
    line: lineMatch ? Number(lineMatch[2]) : null,
  };
}

function parseAnswerCitations(text) {
  const records = [];
  const seen = new Set();
  const add = (record) => {
    if (!record?.sourcePath) return;
    const key = `${record.sourcePath}:${record.line || ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    records.push(record);
  };

  for (const record of parseCitationRecords(text)) {
    add({ sourcePath: record.sourcePath, line: record.line, text: record.text || "" });
  }

  const citationPattern = /(?:^|[\s`[(])(\.?[\w./\-\u3040-\u30ff\u3400-\u9fff]+?\.(?:md|markdown|txt|csv|pdf|docx|xlsx)(?::\d+)?)(?=$|[\s`\])])/giu;
  for (const match of String(text || "").matchAll(citationPattern)) {
    add(parseAnswerCitationToken(match[1]));
  }

  return records;
}

function isLineCheckableSource(filePath) {
  return [".md", ".markdown", ".txt", ".csv"].includes(path.extname(filePath).toLowerCase());
}

function validateAnswerCitations(target, citations) {
  const issues = [];
  const validated = [];
  for (const citation of citations) {
    const citationPath = normalizeCitationPath(citation.sourcePath);
    const absolutePath = path.isAbsolute(citationPath) ? citationPath : path.join(target, citationPath);
    const relativePath = path.relative(target, absolutePath);
    const outsideTarget = relativePath.startsWith("..") || path.isAbsolute(relativePath);
    if (outsideTarget) {
      issues.push({ citation: citationPath, detail: "citation points outside target repository" });
      validated.push({ ...citation, sourcePath: citationPath, exists: false, lineValid: false });
      continue;
    }
    if (!fs.existsSync(absolutePath)) {
      issues.push({ citation: `${citationPath}${citation.line ? `:${citation.line}` : ""}`, detail: "source file missing" });
      validated.push({ ...citation, sourcePath: citationPath, exists: false, lineValid: citation.line == null });
      continue;
    }
    let lineValid = true;
    if (citation.line != null) {
      if (citation.line < 1) {
        lineValid = false;
      } else if (isLineCheckableSource(absolutePath)) {
        const lineCount = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/).length;
        lineValid = citation.line <= lineCount;
      }
      if (!lineValid) {
        issues.push({ citation: `${citationPath}:${citation.line}`, detail: "invalid line number" });
      }
    }
    validated.push({
      ...citation,
      sourcePath: citationPath,
      exists: true,
      lineValid,
    });
  }
  return { issues, validated };
}

function missingCitationStatus(profile) {
  if (profile.strict || profile.name === "full-strict") {
    return { status: "FAIL", blocking: true };
  }
  return { status: "WAIVED_WITH_RISK", blocking: false };
}

function answerAudit(target, args = {}) {
  const profile = activeRefreshProfile(target);
  const source = resolveAnswerSource(target, args);
  const generatedAt = new Date().toISOString();
  const suggestions = [
    'zl-docs-query --target <repo> --rag "<question>"',
    'zl-docs-query --target <repo> "<question or keywords>"',
  ];

  if (!source.exists) {
    return {
      generatedAt,
      status: "FAIL",
      blocking: true,
      profile: profile.name,
      source,
      citations: [],
      issues: [{ citation: "answer source", detail: "no answer source found" }],
      metrics: measureAnswerGrounding(target, "", []),
      suggestions,
      heavyRefreshExecuted: false,
    };
  }

  const citations = parseAnswerCitations(source.text);
  if (citations.length === 0) {
    const state = missingCitationStatus(profile);
    return {
      generatedAt,
      status: state.status,
      blocking: state.blocking,
      profile: profile.name,
      source,
      citations: [],
      issues: [{ citation: source.relativePath || source.kind, detail: "missing citation in answer source" }],
      metrics: measureAnswerGrounding(target, source.text, []),
      suggestions: ["zl-docs-citations --target <repo> \"<query>\"", "zl-answer-audit --target <repo> --from <answer-file>"],
      heavyRefreshExecuted: false,
    };
  }

  const validation = validateAnswerCitations(target, citations);
  const ok = validation.issues.length === 0;
  return {
    generatedAt,
    status: ok ? "PASS" : "FAIL",
    blocking: !ok,
    profile: profile.name,
    source,
    citations: validation.validated,
    issues: validation.issues,
    metrics: measureAnswerGrounding(target, source.text, validation.validated),
    suggestions: ok ? [] : ["zl-docs-query --target <repo> \"<question or keywords>\"", "zl-docs-citations --target <repo> \"<query>\""],
    heavyRefreshExecuted: false,
  };
}

function writeAnswerAuditReports(target, result) {
  const paths = qualityPaths(target);
  fs.mkdirSync(paths.qualityDir, { recursive: true });
  writeJsonFile(paths.answerAuditJson, {
    generatedAt: result.generatedAt,
    status: result.status,
    blocking: result.blocking,
    profile: result.profile,
    source: {
      kind: result.source.kind,
      path: result.source.relativePath || null,
      exists: result.source.exists,
    },
    citations: result.citations,
    metrics: result.metrics,
    issues: result.issues,
    suggestions: result.suggestions,
    heavyRefreshExecuted: false,
  });
  const content = `# Answer Audit

Generated: ${result.generatedAt}

## Summary

- Status: ${result.status}
- Blocking: ${result.blocking ? "yes" : "no"}
- Profile: \`${result.profile}\`
- Source: \`${result.source.relativePath || result.source.kind}\`
- Citations: ${result.citations.length}
- Issues: ${result.issues.length}
- Citation resolve rate: ${result.metrics.citation_resolve_rate}
- Value drift count: ${result.metrics.value_drift_count}
- Unsupported sentence ratio: ${result.metrics.unsupported_sentence_ratio}
- Heavy refresh executed: no

## Citations

${result.citations.length
  ? result.citations.map((citation) => `- \`${citation.sourcePath}${citation.line ? `:${citation.line}` : ""}\` exists=${citation.exists ? "yes" : "no"} line_valid=${citation.lineValid === false ? "no" : "yes"}`).join("\n")
  : "- None"}

## Issues

${result.issues.length ? result.issues.map((issue) => `- \`${issue.citation}\`: ${issue.detail}`).join("\n") : "No answer audit issues found."}

## Grounding Metrics

- Method: ${result.metrics.method}
- Claim sentences: ${result.metrics.claim_sentences}
- Unsupported sentences: ${result.metrics.unsupported_sentences.length}
- Drift values: ${result.metrics.value_drift_values.length ? result.metrics.value_drift_values.map((value) => `\`${value}\``).join(", ") : "None"}

## Next Commands

${result.suggestions.length ? result.suggestions.map((command) => `- \`${command}\``).join("\n") : "- No follow-up command required."}
`;
  fs.writeFileSync(paths.answerAuditMd, content);
  return { jsonPath: paths.answerAuditJson, mdPath: paths.answerAuditMd };
}

function answerAuditCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const result = answerAudit(target, args);
  const written = writeAnswerAuditReports(target, result);
  console.log(`answer audit ${result.status}`);
  console.log(`source ${result.source.relativePath || result.source.kind}`);
  console.log(`citations ${result.citations.length}`);
  for (const issue of result.issues) console.log(`${result.status} ${issue.citation} ${issue.detail}`);
  for (const suggestion of result.suggestions) console.log(`next ${suggestion}`);
  console.log(`write ${written.mdPath}`);
  console.log("heavy refresh executed: no");
  process.exitCode = result.blocking ? 1 : 0;
}

function writeDocStatus(target, scan, options = {}) {
  const knowledgeDir = path.join(target, ".planning", "knowledge");
  fs.mkdirSync(knowledgeDir, { recursive: true });
  const generatedAt = options.generatedAt || new Date().toISOString();
  const categoryCounts = countBy(scan.files, "category");
  const extensionCounts = countBy(scan.files, "ext");
  const statusPath = path.join(knowledgeDir, "DOC_RAG_STATUS.md");
  const statusContent = `# Document RAG Status: ${path.basename(target)}

Generated by Zhulong Project Intelligence Kit on ${generatedAt}.

## Current Status

- Last scan: ${generatedAt}
- Scan command: \`zl-docs-scan --target ${target}\`
- Total source documents: ${scan.files.length}
- Normalized documents: ${options.normalizedCount || 0}
- RAG backend: ${options.backend || "Not configured"}
- Index status: ${options.indexStatus || "Not indexed"}

## Source Coverage

| Category | Count | Notes |
| --- | ---: | --- |
| Text | ${categoryCounts.get("Text") || 0} | Markdown, text, and CSV files |
| PDF | ${categoryCounts.get("PDF") || 0} | Metadata only in MVP1 |
| Word | ${categoryCounts.get("Word") || 0} | Metadata only in MVP1 |
| Excel | ${categoryCounts.get("Excel") || 0} | Metadata only in MVP1 |
| Other | ${categoryCounts.get("Other") || 0} | Metadata only in MVP1 |

## Extensions

${[...extensionCounts.entries()].sort().map(([ext, count]) => `- \`${ext}\`: ${count}`).join("\n") || "- None found"}

## Next Actions

- [ ] Review \`.planning/knowledge/RAG_SOURCES.md\`.
- [ ] Fill \`.planning/knowledge/GLOSSARY.md\`.
- [ ] Use \`zl-docs-query\` for local normalized text lookup.
- [ ] Use \`zl-docs-index\` for RAG backend handoff if needed.
- [ ] Use \`zl-docs-index --run\` only when direct document RAG execution is approved.
- [ ] Keep private customer documents and generated indexes local unless a secure sharing process exists.
`;
  fs.writeFileSync(statusPath, statusContent);
  return statusPath;
}

function parseSourcePathFromNormalized(text, fallback) {
  const match = text.match(/^source_path:\s*"(.+)"\s*$/m);
  return match ? match[1] : fallback;
}

function queryNormalizedDocs(target, query) {
  const normalizedDir = path.join(target, ".planning", "knowledge", "normalized");
  if (!fs.existsSync(normalizedDir) || !fs.statSync(normalizedDir).isDirectory()) {
    return { missing: true, matches: [] };
  }
  const terms = uniqueList(String(query || "").toLowerCase().split(/\s+/).filter(Boolean));
  if (terms.length === 0) return { missing: false, matches: [] };

  const files = walkFiles(normalizedDir, new Set([".DS_Store"]))
    .filter((filePath) => filePath.endsWith(".md") && path.basename(filePath) !== "MANIFEST.md");
  const matches = [];

  for (const filePath of files) {
    const text = fs.readFileSync(filePath, "utf8");
    const sourcePath = parseSourcePathFromNormalized(text, path.relative(target, filePath));
    const lines = text.split(/\r?\n/);
    const sourceTitleIndex = lines.findIndex((line) => line.startsWith("# Normalized Source:"));
    lines.forEach((line, index) => {
      const haystack = line.toLowerCase();
      const score = terms.reduce((count, term) => count + (haystack.includes(term) ? 1 : 0), 0);
      if (score > 0) {
        const sourceLine = sourceTitleIndex >= 0 ? index - sourceTitleIndex - 1 : index + 1;
        matches.push({
          sourcePath,
          normalizedPath: path.relative(target, filePath),
          line: sourceLine > 0 ? sourceLine : index + 1,
          score,
          text: line.trim(),
        });
      }
    });
  }

  matches.sort((a, b) => b.score - a.score || a.sourcePath.localeCompare(b.sourcePath) || a.line - b.line);
  return { missing: false, matches };
}

function ragArtifactPaths(target) {
  return {
    indexHandoff: path.join(target, ".planning", "knowledge", "RAG_INDEX_HANDOFF.md"),
    indexResult: path.join(target, ".planning", "knowledge", "RAG_INDEX_RESULT.md"),
    queryResult: path.join(target, ".planning", "knowledge", "RAG_QUERY_RESULT.md"),
    workspace: path.join(target, "graphrag-workspace"),
    workspaceOutput: path.join(target, "graphrag-workspace", "output"),
  };
}

function ragExecutionDisabled(target) {
  const config = readPlanningConfig(target);
  return inferRagBackend(config, config.execution_budget?.profile) === "none";
}

function configuredRagIndexCommand(target, args = {}) {
  const config = readPlanningConfig(target);
  return args["index-command"]
    || config.spec_context?.index_command
    || config.graphrag?.index_command
    || "graphrag index --root graphrag-workspace --method fast";
}

function configuredRagQueryCommand(target, args = {}, query = "") {
  const config = readPlanningConfig(target);
  const command = args["query-command"]
    || config.spec_context?.query_command
    || config.graphrag?.local_query_command
    || 'graphrag query --root graphrag-workspace --method local --response-type "List of 8 concise points with data references"';
  if (command.includes("{query}")) {
    return command.replaceAll("{query}", shellQuote(query));
  }
  return `${command} ${shellQuote(query)}`;
}

function ragStatusLine(target) {
  const paths = ragArtifactPaths(target);
  const parts = [];
  parts.push(fs.existsSync(paths.workspace) ? "- GraphRAG workspace: present" : "- GraphRAG workspace: missing");
  parts.push(fs.existsSync(paths.workspaceOutput) ? "- GraphRAG output: present" : "- GraphRAG output: missing");
  parts.push(fs.existsSync(paths.indexResult) ? "- Last Zhulong index result: present" : "- Last Zhulong index result: missing");
  parts.push(fs.existsSync(paths.queryResult) ? "- Last Zhulong query result: present" : "- Last Zhulong query result: missing");
  return parts.join("\n");
}

function writeRagIndexHandoff(target, args = {}) {
  const paths = ragArtifactPaths(target);
  fs.mkdirSync(path.dirname(paths.indexHandoff), { recursive: true });
  const generatedAt = new Date().toISOString();
  const ragDisabled = ragExecutionDisabled(target);
  const indexCommand = ragDisabled ? "(disabled: current RAG backend is none)" : configuredRagIndexCommand(target, args);
  const content = `# RAG Index Handoff

Generated: ${generatedAt}

## Purpose

Build or refresh the document RAG backend for Zhulong spec context.

## Current Backend

- RAG backend: \`${inferRagBackend(readPlanningConfig(target), activeRefreshProfile(target).name)}\`
- Provider: ${ragDisabled ? "disabled" : "configured GraphRAG"}
- Runtime: ${ragDisabled ? "not required" : "Ollama + LanceDB for local RAG"}
- Replaceable: true

## Suggested Command

\`\`\`bash
${indexCommand}
\`\`\`

## Zhulong Direct Run

\`\`\`bash
zl-docs-index --target <repo> --run
\`\`\`

## Notes

- Run \`zl-rag-init-local --target <repo>\` before indexing confidential documents.
- If RAG backend is \`none\`, switch intentionally with \`zl-init --doc-policy strict --rag local\` on first setup or \`zl-mode-set docs-strict\`, then run \`zl-rag-init-local\`.
- In local-only mode, \`zl-docs-index --run\` runs \`zl-privacy-audit\` before GraphRAG.
- Do not change \`model_provider\`, \`api_base\`, or API-key settings to an external service unless the project has explicitly opted out of local-only mode.
- External providers can receive source document chunks, extracted text units, query text, and generated context.
- After indexing, run \`zl-docs-status --target <repo>\`.
`;
  fs.writeFileSync(paths.indexHandoff, content);
  return paths.indexHandoff;
}

function runRagIndex(target, args = {}) {
  const paths = ragArtifactPaths(target);
  fs.mkdirSync(path.dirname(paths.indexResult), { recursive: true });
  const command = ragExecutionDisabled(target) ? "" : configuredRagIndexCommand(target, args);
  const generatedAt = new Date().toISOString();
  let stdout = "";
  let stderr = "";
  let ok = true;
  let errorMessage = "";

  if (ragExecutionDisabled(target)) {
    ok = false;
    errorMessage = "RAG backend disabled: current project uses --rag none. Run zl-init with --rag local for first setup, or switch policy intentionally before running GraphRAG index.";
    const resultContent = `# RAG Index Result

Generated: ${generatedAt}

## Result

- Status: failed
- Reason: RAG backend disabled
- Heavy refresh executed: no

## Stderr

\`\`\`text
${limitedText(errorMessage)}
\`\`\`
`;
    fs.writeFileSync(paths.indexResult, resultContent);
    return { ok, command: "(disabled)", resultPath: paths.indexResult, errorMessage };
  }

  const privacy = enforcePrivacyBeforeRagRun(target, command, "index");
  if (!privacy.ok) {
    ok = false;
    errorMessage = `Local-only privacy audit failed:\n${privacy.issues.map((issue) => `- ${issue.file}: ${issue.detail}`).join("\n")}`;
    const resultContent = `# RAG Index Result

Generated: ${generatedAt}

## Command

\`\`\`bash
${command}
\`\`\`

## Result

- Status: failed
- Privacy audit: failed

## RAG Status

${ragStatusLine(target)}

## Stderr

\`\`\`text
${limitedText(errorMessage) || "(empty)"}
\`\`\`
`;
    fs.writeFileSync(paths.indexResult, resultContent);
    return { ok, command, resultPath: paths.indexResult, errorMessage };
  }

  try {
    stdout = execSync(command, {
      cwd: target,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: Number(args.timeout || 1200000),
    });
  } catch (error) {
    ok = false;
    stdout = error.stdout ? String(error.stdout) : "";
    stderr = error.stderr ? String(error.stderr) : "";
    errorMessage = error.message || "RAG index command failed";
  }

  const { sourcePaths, extensions } = docScanConfig(target);
  const scan = discoverDocuments(target, sourcePaths, extensions);
  writeDocScan(target, scan);
  writeDocStatus(target, scan, {
    generatedAt,
    normalizedCount: fs.existsSync(path.join(target, ".planning", "knowledge", "normalized"))
      ? walkFiles(path.join(target, ".planning", "knowledge", "normalized"), new Set([".DS_Store"])).filter((filePath) => filePath.endsWith(".md") && path.basename(filePath) !== "MANIFEST.md").length
      : 0,
    backend: "graphrag",
    indexStatus: ok ? "Indexed by configured RAG command" : "Index command failed",
  });

  const resultContent = `# RAG Index Result

Generated: ${generatedAt}

## Command

\`\`\`bash
${command}
\`\`\`

## Result

- Status: ${ok ? "success" : "failed"}
- Workspace: ${fs.existsSync(paths.workspace) ? "present" : "missing"}
- Output: ${fs.existsSync(paths.workspaceOutput) ? "present" : "missing"}

## RAG Status

${ragStatusLine(target)}

## Stdout

\`\`\`text
${limitedText(stdout) || "(empty)"}
\`\`\`

## Stderr

\`\`\`text
${limitedText(stderr || errorMessage) || "(empty)"}
\`\`\`
`;
  fs.writeFileSync(paths.indexResult, resultContent);
  if (ok) {
    markRefreshState(target, "rag", {
      command,
      artifact: path.relative(target, paths.indexResult),
      note: "Updated by zl-docs-index --run or zl-refresh-run --rag.",
    });
  }
  return { ok, command, resultPath: paths.indexResult, errorMessage };
}

function runRagQuery(target, query, args = {}) {
  const paths = ragArtifactPaths(target);
  fs.mkdirSync(path.dirname(paths.queryResult), { recursive: true });
  const command = ragExecutionDisabled(target) ? "" : configuredRagQueryCommand(target, args, query);
  const generatedAt = new Date().toISOString();
  let stdout = "";
  let stderr = "";
  let ok = true;
  let errorMessage = "";

  if (ragExecutionDisabled(target)) {
    ok = false;
    errorMessage = "RAG backend disabled: current project uses --rag none. Use normal zl-docs-query without --rag, or initialize local RAG explicitly.";
    const resultContent = `# RAG Query Result

Generated: ${generatedAt}

## Query

${query}

## Result

- Status: failed
- Reason: RAG backend disabled
- Heavy refresh executed: no

## Answer

\`\`\`text
(empty)
\`\`\`

## Stderr

\`\`\`text
${limitedText(errorMessage)}
\`\`\`
`;
    fs.writeFileSync(paths.queryResult, resultContent);
    return { ok, command: "(disabled)", resultPath: paths.queryResult, stdout, stderr, errorMessage };
  }

  const privacy = enforcePrivacyBeforeRagRun(target, command, "query");
  if (!privacy.ok) {
    ok = false;
    errorMessage = `Local-only privacy audit failed:\n${privacy.issues.map((issue) => `- ${issue.file}: ${issue.detail}`).join("\n")}`;
    const resultContent = `# RAG Query Result

Generated: ${generatedAt}

## Query

${query}

## Command

\`\`\`bash
${command}
\`\`\`

## Result

- Status: failed
- Privacy audit: failed

## Answer

\`\`\`text
(empty)
\`\`\`

## Stderr

\`\`\`text
${limitedText(errorMessage) || "(empty)"}
\`\`\`
`;
    fs.writeFileSync(paths.queryResult, resultContent);
    return { ok, command, resultPath: paths.queryResult, stdout, stderr, errorMessage };
  }

  try {
    stdout = execSync(command, {
      cwd: target,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: Number(args.timeout || 600000),
    });
  } catch (error) {
    ok = false;
    stdout = error.stdout ? String(error.stdout) : "";
    stderr = error.stderr ? String(error.stderr) : "";
    errorMessage = error.message || "RAG query command failed";
  }

  const resultContent = `# RAG Query Result

Generated: ${generatedAt}

## Query

${query}

## Command

\`\`\`bash
${command}
\`\`\`

## Result

- Status: ${ok ? "success" : "failed"}

## Answer

\`\`\`text
${limitedText(stdout, 8000) || "(empty)"}
\`\`\`

## Stderr

\`\`\`text
${limitedText(stderr || errorMessage) || "(empty)"}
\`\`\`
`;
  fs.writeFileSync(paths.queryResult, resultContent);
  return { ok, command, resultPath: paths.queryResult, stdout, stderr, errorMessage };
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function localGraphRagOptions(target, args = {}) {
  const config = readPlanningConfig(target);
  const graphRag = config.graphrag || {};
  return {
    model: args.model || graphRag.llm_model || process.env.ZHULONG_LOCAL_LLM_MODEL || DEFAULT_LOCAL_LLM_MODEL,
    embedding: args.embedding || graphRag.embedding_model || process.env.ZHULONG_LOCAL_EMBEDDING_MODEL || DEFAULT_LOCAL_EMBEDDING_MODEL,
    apiBase: args["api-base"] || graphRag.api_base || process.env.ZHULONG_LOCAL_OLLAMA_BASE || "http://127.0.0.1:11434",
    indexMethod: args["index-method"] || "fast",
    queryMethod: args["query-method"] || "basic",
  };
}

function commandAvailable(command) {
  try {
    execFileSync("sh", ["-lc", `command -v ${shellQuote(command)}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function ollamaModelAvailable(model) {
  try {
    const output = execFileSync("ollama", ["list"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const wanted = String(model).replace(/:latest$/, "");
    return output.split(/\r?\n/).some((line) => line.split(/\s+/)[0]?.replace(/:latest$/, "") === wanted);
  } catch {
    return false;
  }
}

function supportedGraphRagInput(filePath) {
  return [".md", ".markdown", ".txt", ".csv"].includes(path.extname(filePath).toLowerCase());
}

function localRagInputName(index, sourcePath) {
  const clean = sourcePath
    .replace(/\\/g, "/")
    .replace(/[^A-Za-z0-9._/-]+/g, "-")
    .replace(/\//g, "__")
    .replace(/^-+|-+$/g, "");
  return `${String(index).padStart(4, "0")}-${clean || "document"}.txt`;
}

function syncLocalGraphRagInput(target, workspace) {
  const { sourcePaths, extensions } = docScanConfig(target);
  const scan = discoverDocuments(target, sourcePaths, extensions);
  writeDocScan(target, scan);

  const inputDir = path.join(workspace, "input");
  fs.rmSync(inputDir, { recursive: true, force: true });
  fs.mkdirSync(inputDir, { recursive: true });

  const copied = [];
  const skipped = [];
  let index = 0;
  for (const item of scan.files) {
    const relativeSource = item.path;
    const absoluteSource = path.join(target, relativeSource);
    if (!supportedGraphRagInput(relativeSource)) {
      skipped.push({ source: relativeSource, reason: "Local MVP supports .md/.markdown/.txt/.csv input only." });
      continue;
    }
    index += 1;
    const outName = localRagInputName(index, relativeSource);
    const outPath = path.join(inputDir, outName);
    const sourceText = fs.readFileSync(absoluteSource, "utf8");
    const content = [
      `Source: ${relativeSource}`,
      `Title: ${path.basename(relativeSource)}`,
      "",
      sourceText,
      "",
    ].join("\n");
    fs.writeFileSync(outPath, content);
    copied.push({ source: relativeSource, input: path.relative(target, outPath) });
  }

  return { scan, copied, skipped, inputDir };
}

function replaceYamlSection(text, sectionName, body) {
  const pattern = new RegExp(`(^|\\n)${sectionName}:\\n[\\s\\S]*?(?=\\n(?:[A-Za-z_]+:|###)|$)`);
  if (!pattern.test(text)) return `${text.trimEnd()}\n\n${sectionName}:\n${body}\n`;
  return text.replace(pattern, (_, prefix) => `${prefix}${sectionName}:\n${body}\n`);
}

function writeLocalGraphRagSettings(settingsPath, options) {
  let settings = fs.readFileSync(settingsPath, "utf8");
  settings = replaceYamlSection(settings, "completion_models", [
    "  default_completion_model:",
    "    model_provider: ollama",
    `    model: ${options.model}`,
    "    auth_method: api_key",
    "    api_key: ollama",
    `    api_base: ${options.apiBase}`,
    "    call_args:",
    "      temperature: 0",
    "      num_ctx: 16384",
    "    retry:",
    "      type: exponential_backoff",
  ].join("\n"));
  settings = replaceYamlSection(settings, "embedding_models", [
    "  default_embedding_model:",
    "    model_provider: ollama",
    `    model: ${options.embedding}`,
    "    auth_method: api_key",
    "    api_key: ollama",
    `    api_base: ${options.apiBase}`,
    "    retry:",
    "      type: exponential_backoff",
  ].join("\n"));
  settings = replaceYamlSection(settings, "workflows", [
    "  - load_input_documents",
    "  - create_base_text_units",
    "  - create_final_documents",
    "  - create_final_text_units",
    "  - generate_text_embeddings",
  ].join("\n"));
  fs.writeFileSync(settingsPath, settings);
}

function updateLocalGraphRagConfig(target, options) {
  const configPath = path.join(target, ".planning", "config.json");
  const config = readPlanningConfig(target);
  config.document_policy = normalizeDocumentPolicy(config.document_policy || (config.execution_budget?.profile === "full-strict" ? "strict" : "reference"));
  config.rag_backend = "local";
  config.execution_budget = {
    ...(config.execution_budget || {}),
    profile: config.document_policy === "strict" ? "full-strict" : (config.execution_budget?.profile === "default-local-rag" ? "default-local-rag" : "graph-lite"),
    document_policy: config.document_policy,
    rag_backend: "local",
    heavy_refresh: "explicit_or_policy",
    auto_refresh: false,
    refresh_state_path: ".planning/refresh/REFRESH_STATE.json",
  };
  config.spec_context = {
    ...(config.spec_context || {}),
    enabled: true,
    provider: "graphrag-local",
    index_command: `graphrag index --root graphrag-workspace --method ${options.indexMethod}`,
    query_command: `graphrag query --root graphrag-workspace --method ${options.queryMethod} --response-type "List of 8 concise points with data references" {query}`,
  };
  config.graphrag = {
    ...(config.graphrag || {}),
    enabled: true,
    mode: "local",
    profile: "local_basic",
    requires_api_key: false,
    root: "graphrag-workspace",
    llm_provider: "ollama",
    llm_model: options.model,
    embedding_provider: "ollama",
    embedding_model: options.embedding,
    api_base: options.apiBase,
    vector_store: "lancedb",
    index_command: config.spec_context.index_command,
    local_query_command: config.spec_context.query_command,
  };
  config.privacy = {
    ...(config.privacy || {}),
    network_policy: "local_only",
    allow_external_rag: false,
    allowed_hosts: ["127.0.0.1", "localhost"],
    forbidden_env_keys: [
      "GRAPHRAG_API_KEY",
      "OPENAI_API_KEY",
      "AZURE_OPENAI_API_KEY",
      "DEEPSEEK_API_KEY",
      "ANTHROPIC_API_KEY",
      "GEMINI_API_KEY",
    ],
  };
  writeJsonFile(configPath, config);
  return config;
}

function writeLocalRagStatus(target, details) {
  const outPath = path.join(target, ".planning", "knowledge", "LOCAL_RAG_STATUS.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const content = `# Local GraphRAG Status

Generated: ${new Date().toISOString()}

## Mode

- Backend: GraphRAG local
- Profile: local_basic
- Network policy: local_only
- External API key required: false
- LLM provider: ollama
- LLM model: ${details.options.model}
- Embedding provider: ollama
- Embedding model: ${details.options.embedding}
- API base: ${details.options.apiBase}
- Vector store: lancedb

## Input Sync

- Source documents discovered: ${details.scan.files.length}
- Copied to GraphRAG input: ${details.copied.length}
- Skipped unsupported in MVP: ${details.skipped.length}

## Commands

\`\`\`bash
${details.config.spec_context.index_command}
${details.config.spec_context.query_command}
\`\`\`

## Copied Inputs

${details.copied.length ? details.copied.map((item) => `- \`${item.source}\` -> \`${item.input}\``).join("\n") : "- None"}

## Skipped Inputs

${details.skipped.length ? details.skipped.map((item) => `- \`${item.source}\`: ${item.reason}`).join("\n") : "- None"}

## Safety

Do not change this workspace to an external provider for confidential projects.
Changing \`model_provider\`, \`api_base\`, or API-key fields can send source
documents, extracted text units, graph context, and queries to an external
service during indexing or query.
`;
  fs.writeFileSync(outPath, content);
  return outPath;
}

function ragInitLocal(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const configPath = path.join(target, ".planning", "config.json");
  if (!fs.existsSync(configPath)) {
    throw environmentFailure("Missing .planning/config.json. Run zl-init first.");
  }

  const options = localGraphRagOptions(target, args);
  const paths = ragArtifactPaths(target);
  fs.mkdirSync(paths.workspace, { recursive: true });

  if (!commandAvailable("graphrag")) {
    throw environmentFailure("GraphRAG CLI is not installed. Install it before running zl-rag-init-local.");
  }
  if (!commandAvailable("ollama")) {
    throw environmentFailure("Ollama is not installed. Install Ollama and pull the local models first.");
  }
  if (!args["skip-model-check"]) {
    const missing = [];
    if (!ollamaModelAvailable(options.model)) missing.push(options.model);
    if (!ollamaModelAvailable(options.embedding)) missing.push(options.embedding);
    if (missing.length) {
      throw environmentFailure(`Missing Ollama model(s): ${missing.join(", ")}. Run: ollama pull ${missing[0]}`);
    }
  }

  const sync = syncLocalGraphRagInput(target, paths.workspace);
  const settingsPath = path.join(paths.workspace, "settings.yaml");
  if (args.force || !fs.existsSync(settingsPath)) {
    execSync(`graphrag init --root ${shellQuote(paths.workspace)} --model ${shellQuote(options.model)} --embedding ${shellQuote(options.embedding)} --force`, {
      cwd: target,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 120000,
    });
  }
  writeLocalGraphRagSettings(settingsPath, options);
  fs.rmSync(path.join(paths.workspace, ".env"), { force: true });

  const config = updateLocalGraphRagConfig(target, options);
  const statusPath = writeLocalRagStatus(target, { options, config, ...sync });
  const audit = runPrivacyAudit(target, { strictLocal: true, writeReport: true });

  console.log("Local GraphRAG default mode initialized");
  console.log(`write ${settingsPath}`);
  console.log(`write ${statusPath}`);
  console.log(`input copied ${sync.copied.length}`);
  console.log(`input skipped ${sync.skipped.length}`);
  console.log(`privacy ${audit.ok ? "PASS" : "FAIL"}`);
  if (!audit.ok) {
    for (const issue of audit.issues) console.log(`FAIL ${issue.file} ${issue.detail}`);
    process.exitCode = 1;
  }
}

function stripComment(line) {
  const index = line.indexOf("#");
  return index >= 0 ? line.slice(0, index) : line;
}

function auditTextForExternalRisk(fileLabel, text, options, issues) {
  const allowedHosts = new Set(options.allowedHosts || ["127.0.0.1", "localhost"]);
  const uncommented = text.split(/\r?\n/).map(stripComment).join("\n");
  for (const command of FORBIDDEN_NETWORK_COMMANDS) {
    const pattern = new RegExp(`(^|[^A-Za-z0-9_-])${command}([^A-Za-z0-9_-]|$)`, "i");
    if (pattern.test(uncommented)) {
      issues.push({ file: fileLabel, detail: `network-capable command is not allowed in local-only mode: ${command}` });
    }
  }
  const urlMatches = uncommented.matchAll(/https?:\/\/[^\s"'`<>]+/g);
  for (const match of urlMatches) {
    try {
      const url = new URL(match[0]);
      if (!allowedHosts.has(url.hostname)) {
        issues.push({ file: fileLabel, detail: `external URL is not allowed in local-only mode: ${url.origin}` });
      }
    } catch {
      issues.push({ file: fileLabel, detail: `unparseable URL in local-only mode: ${match[0]}` });
    }
  }

  const providerMatch = uncommented.match(/\bmodel_provider:\s*(openai|azure|azure_openai|deepseek|anthropic|gemini|cohere)\b/i);
  if (providerMatch) {
    issues.push({ file: fileLabel, detail: `external model_provider is not allowed: ${providerMatch[1]}` });
  }

  const tokenMatch = uncommented.match(/\bsk-[A-Za-z0-9_-]{20,}\b/);
  if (tokenMatch) {
    issues.push({ file: fileLabel, detail: "secret-shaped API key found" });
  }

  if (!fileLabel.endsWith(".planning/config.json")) {
    const envMatch = uncommented.match(/\b(GRAPHRAG_API_KEY|OPENAI_API_KEY|AZURE_OPENAI_API_KEY|DEEPSEEK_API_KEY|ANTHROPIC_API_KEY|GEMINI_API_KEY)\b/);
    if (envMatch) {
      issues.push({ file: fileLabel, detail: `external API key reference is not allowed: ${envMatch[1]}` });
    }
  }
}

function runPrivacyAudit(target, options = {}) {
  const config = readPlanningConfig(target);
  const privacy = config.privacy || {};
  const networkPolicy = privacy.network_policy || "local_only";
  const offlineLock = privacy.offline_lock === true || Boolean(readJsonIfExists(path.join(target, ".planning", "privacy", "OFFLINE_LOCK.json"))?.enabled);
  const allowedHosts = Array.isArray(privacy.allowed_hosts) && privacy.allowed_hosts.length
    ? privacy.allowed_hosts
    : ["127.0.0.1", "localhost"];
  const issues = [];
  const checked = [];

  const addFile = (relativePath) => {
    const filePath = path.join(target, relativePath);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return;
    checked.push(relativePath);
    auditTextForExternalRisk(relativePath, fs.readFileSync(filePath, "utf8"), { allowedHosts }, issues);
  };

  for (const relativePath of [
    ".planning/config.json",
    "project.manifest.yml",
    "graphrag-workspace/settings.yaml",
    "graphrag-workspace/.env",
    ".planning/knowledge/RAG_INDEX_RESULT.md",
    ".planning/knowledge/RAG_QUERY_RESULT.md",
    ".planning/privacy/OFFLINE_LOCK.json",
    ".planning/privacy/OUTBOUND_AUDIT.md",
    ".planning/graphs/GRAPH_BUILD_RESULT.md",
    ".planning/graphs/GRAPH_IMPACT.md",
    ".planning/graphs/GRAPH_RISK.md",
  ]) {
    addFile(relativePath);
  }

  if (options.command) {
    checked.push("<runtime command>");
    auditTextForExternalRisk("<runtime command>", options.command, { allowedHosts }, issues);
  }

  if (options.strictLocal) {
    const ragBackend = inferRagBackend(config, config.execution_budget?.profile);
    if (networkPolicy !== "local_only") issues.push({ file: ".planning/config.json", detail: `privacy.network_policy must be local_only, got ${networkPolicy}` });
    if (privacy.allow_external_rag !== false) issues.push({ file: ".planning/config.json", detail: "privacy.allow_external_rag must be false in default local mode" });
    if (privacy.allow_external_tools === true) issues.push({ file: ".planning/config.json", detail: "privacy.allow_external_tools must not be true in strict local mode" });
    if (ragBackend === "local") {
      if (config.spec_context?.provider !== "graphrag-local") issues.push({ file: ".planning/config.json", detail: "spec_context.provider must be graphrag-local when rag_backend is local" });
      if (config.graphrag?.mode !== "local") issues.push({ file: ".planning/config.json", detail: "graphrag.mode must be local when rag_backend is local" });
      if (config.graphrag?.requires_api_key !== false) issues.push({ file: ".planning/config.json", detail: "graphrag.requires_api_key must be false" });
      if (config.graphrag?.api_base && !String(config.graphrag.api_base).startsWith("http://127.0.0.1") && !String(config.graphrag.api_base).startsWith("http://localhost")) {
        issues.push({ file: ".planning/config.json", detail: `graphrag.api_base must point to localhost, got ${config.graphrag.api_base}` });
      }
    }
    if (options.requireOfflineLock && !offlineLock) {
      issues.push({ file: ".planning/privacy/OFFLINE_LOCK.json", detail: "offline lock is required but not enabled" });
    }
  }

  const outPath = path.join(target, ".planning", "knowledge", "PRIVACY_AUDIT.md");
  if (options.writeReport) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const content = `# Zhulong Privacy Audit

Generated: ${new Date().toISOString()}

## Summary

- Status: ${issues.length === 0 ? "PASS" : "FAIL"}
- Network policy: ${networkPolicy}
- Offline lock: ${offlineLock ? "enabled" : "disabled"}
- Allowed hosts: ${allowedHosts.join(", ")}
- Files checked: ${checked.length}
- Issues: ${issues.length}

## Checked Files

${checked.length ? checked.map((item) => `- \`${item}\``).join("\n") : "- None"}

## Issues

${issues.length ? issues.map((issue) => `- \`${issue.file}\`: ${issue.detail}`).join("\n") : "No privacy issues found."}
`;
    fs.writeFileSync(outPath, content);
  }

  return { ok: issues.length === 0, issues, checked, outPath, networkPolicy, offlineLock, allowedHosts };
}

function enforcePrivacyBeforeRagRun(target, command, kind) {
  const config = readPlanningConfig(target);
  const privacy = config.privacy || {};
  if (privacy.network_policy !== "local_only" || privacy.allow_external_rag === true) {
    return { ok: true, issues: [], skipped: true };
  }
  const audit = runPrivacyAudit(target, {
    strictLocal: false,
    writeReport: true,
    command: `${kind}: ${command}`,
  });
  return audit;
}

function enforcePrivacyBeforeToolRun(target, command, kind) {
  const config = readPlanningConfig(target);
  const privacy = config.privacy || {};
  if (privacy.network_policy !== "local_only" || privacy.allow_external_tools === true) {
    return { ok: true, issues: [], skipped: true };
  }
  return runPrivacyAudit(target, {
    strictLocal: Boolean(privacy.offline_lock),
    writeReport: true,
    command: `${kind}: ${command}`,
  });
}

function privacyDir(target) {
  return path.join(target, ".planning", "privacy");
}

function writeOfflineLock(target) {
  const configPath = path.join(target, ".planning", "config.json");
  const config = readPlanningConfig(target);
  config.privacy = {
    ...(config.privacy || {}),
    network_policy: "local_only",
    offline_lock: true,
    allow_external_rag: false,
    allow_external_tools: false,
    allowed_hosts: ["127.0.0.1", "localhost"],
  };
  writeJsonFile(configPath, config);

  const dir = privacyDir(target);
  fs.mkdirSync(dir, { recursive: true });
  const lock = {
    enabled: true,
    generatedAt: new Date().toISOString(),
    policy: "local_only",
    allowedHosts: ["127.0.0.1", "localhost"],
    allowedRuntimes: ALLOWED_RUNTIME_NAMES,
    rule: "Zhulong --run commands must pass privacy audit before executing configured tools.",
  };
  const jsonPath = path.join(dir, "OFFLINE_LOCK.json");
  writeJsonFile(jsonPath, lock);
  const mdPath = path.join(dir, "OFFLINE_LOCK.md");
  fs.writeFileSync(mdPath, `# Zhulong Offline Lock

Generated: ${lock.generatedAt}

## Summary

- Enabled: true
- Network policy: local_only
- Allowed hosts: 127.0.0.1, localhost
- External RAG: disabled
- External tools: disabled

## Allowed Runtime Boundary

Zhulong project data should not be sent outside the local machine by Zhulong commands. The only external tools intentionally outside Zhulong's local boundary are user-selected coding runtimes: Codex, Claude Code, and GitHub Copilot.

## Risk Rule

Do not change this lock, \`.planning/config.json\`, \`graphrag-workspace/settings.yaml\`, or configured \`--run\` commands to external endpoints unless the project has explicit approval for data export.
`);
  return { jsonPath, mdPath, configPath };
}

function outboundAudit(target, options = {}) {
  const config = readPlanningConfig(target);
  const privacy = config.privacy || {};
  const allowedHosts = Array.isArray(privacy.allowed_hosts) && privacy.allowed_hosts.length
    ? privacy.allowed_hosts
    : ["127.0.0.1", "localhost"];
  const issues = [];
  const warnings = [];
  const checked = [];

  const files = [
    ".planning/config.json",
    "project.manifest.yml",
    "package.json",
    "bin/zl.mjs",
    "verification/run-full-validation.mjs",
    "scripts/verify-rag-local.mjs",
    "scripts/verify-rag-commands.mjs",
    "core/planning/config.template.json",
    "core/project.manifest.yml.template",
    "graphrag-workspace/settings.yaml",
    "graphrag-workspace/.env",
  ];
  for (const relativePath of files) {
    const filePath = path.join(target, relativePath);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) continue;
    checked.push(relativePath);
    const fileIssues = [];
    auditTextForExternalRisk(relativePath, fs.readFileSync(filePath, "utf8"), { allowedHosts }, fileIssues);
    const isKitSourceFalsePositive = target === kitRoot && /bin\/zl\.mjs|scripts\/verify-rag-local\.mjs|core\/planning\/config\.template\.json|verification\/run-full-validation\.mjs|package\.json|README\.md|docs\//.test(relativePath);
    if (fileIssues.length > 0 && isKitSourceFalsePositive) {
      for (const issue of fileIssues) {
        warnings.push({ file: issue.file, detail: `non-default implementation, detection rule, negative fixture, or explicit opt-in surface: ${issue.detail}` });
      }
    } else {
      issues.push(...fileIssues);
    }
  }

  const commandValues = [
    config.spec_context?.index_command,
    config.spec_context?.query_command,
    config.code_map?.update_command,
    config.graphify?.update_command,
    config.graphrag?.index_command,
    config.graphrag?.local_query_command,
  ].filter(Boolean);
  for (const command of commandValues) {
    checked.push("<configured command>");
    auditTextForExternalRisk("<configured command>", String(command), { allowedHosts }, issues);
  }

  const dir = target === kitRoot ? path.join(target, "verification", "reports") : privacyDir(target);
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, "OUTBOUND_AUDIT.md");
  const generatedAt = new Date().toISOString();
  const content = `# Zhulong Outbound Audit

Generated: ${generatedAt}

## Summary

- Status: ${issues.length === 0 ? "PASS" : "FAIL"}
- Checked files/commands: ${checked.length}
- Issues: ${issues.length}
- Warnings: ${warnings.length}
- Allowed coding runtimes outside Zhulong boundary: Codex, Claude Code, GitHub Copilot

## Checked Surface

${checked.length ? checked.map((item) => `- \`${item}\``).join("\n") : "- None"}

## Issues

${issues.length ? issues.map((issue) => `- \`${issue.file}\`: ${issue.detail}`).join("\n") : "No default outbound behavior found outside localhost/local commands."}

## Warnings

${warnings.length ? warnings.map((warning) => `- \`${warning.file}\`: ${warning.detail}`).join("\n") : "- None"}

## Boundary Statement

Zhulong commands are local file/CLI operations by default. Data can still leave the machine if the user manually configures external providers, changes command strings to network-capable tools, or pastes project context into Codex, Claude Code, or GitHub Copilot.
`;
  fs.writeFileSync(outPath, content);
  return { ok: issues.length === 0, issues, warnings, checked, outPath };
}

function commandOutput(command, args = [], options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: options.cwd || process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: options.timeout || 60000,
    }).trim();
  } catch {
    return "";
  }
}

function parsePipShow(text) {
  const data = {};
  for (const line of String(text || "").split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) data[match[1].toLowerCase()] = match[2];
  }
  return data;
}

function licenseRisk(license) {
  const value = String(license || "UNKNOWN");
  if (/agpl|gpl|sspl|busl|commons clause|non-?commercial|cc-?by-?nc|polyform|proprietary/i.test(value)) {
    return "restricted-or-review";
  }
  if (/^mit$/i.test(value)) return "mit";
  if (/apache|bsd|isc|mpl|unlicense|0bsd/i.test(value)) return "non-mit-permissive-or-review";
  if (/unknown|not declared|none/i.test(value)) return "unknown";
  return "non-mit-review";
}

function licenseAudit(target) {
  const items = [];
  const packagePath = path.join(target, "package.json");
  if (fs.existsSync(packagePath)) {
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    items.push({
      name: pkg.name || "package",
      version: pkg.version || "",
      source: "package.json",
      license: pkg.license || (pkg.private ? "not declared; private package" : "UNKNOWN"),
    });
    const deps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
      ...(pkg.optionalDependencies || {}),
      ...(pkg.peerDependencies || {}),
    };
    for (const [name, version] of Object.entries(deps)) {
      const depPkgPath = path.join(target, "node_modules", name, "package.json");
      let license = "UNKNOWN";
      if (fs.existsSync(depPkgPath)) {
        try {
          license = JSON.parse(fs.readFileSync(depPkgPath, "utf8")).license || "UNKNOWN";
        } catch {
          license = "UNKNOWN";
        }
      }
      items.push({ name, version, source: "npm dependency", license });
    }
  }

  for (const tool of ["graphrag", "graphify"]) {
    const cliPath = commandOutput("sh", ["-lc", `command -v ${shellQuote(tool)}`]);
    if (!cliPath) {
      items.push({ name: tool, version: "not installed", source: "CLI", license: "UNKNOWN" });
      continue;
    }
    const version = commandOutput(tool, ["--version"]) || "installed";
    const pipMeta = parsePipShow(commandOutput("python3", ["-m", "pip", "show", tool]));
    items.push({
      name: tool,
      version,
      source: pipMeta.name ? "python package metadata" : "CLI available locally",
      license: pipMeta.license || "UNKNOWN",
    });
  }

  if (commandAvailable("ollama")) {
    let license = "UNKNOWN";
    const brewJson = commandOutput("brew", ["info", "--json=v2", "ollama"], { timeout: 120000 });
    if (brewJson) {
      try {
        const data = JSON.parse(brewJson);
        license = data.formulae?.[0]?.license || license;
      } catch {
        // Keep UNKNOWN.
      }
    }
    items.push({
      name: "ollama",
      version: commandOutput("ollama", ["--version"]) || "installed",
      source: "Homebrew metadata / CLI",
      license,
    });
  } else {
    items.push({ name: "ollama", version: "not installed", source: "CLI", license: "UNKNOWN" });
  }

  const evaluated = items.map((item) => ({ ...item, risk: licenseRisk(item.license) }));
  const restricted = evaluated.filter((item) => item.risk === "restricted-or-review");
  const nonMit = evaluated.filter((item) => item.risk !== "mit");
  const unknown = evaluated.filter((item) => item.risk === "unknown");
  const outDir = target === kitRoot ? path.join(target, "verification", "reports") : privacyDir(target);
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "license-audit.md");
  const content = `# Zhulong License Audit

Generated: ${new Date().toISOString()}

## Summary

- Status: ${restricted.length === 0 ? "PASS" : "REVIEW"}
- Items checked: ${evaluated.length}
- Restricted / commercial-review licenses: ${restricted.length}
- Non-MIT or unknown items: ${nonMit.length}
- Unknown license metadata: ${unknown.length}

## Items

| Name | Version | Source | License | Risk |
| --- | --- | --- | --- | --- |
${evaluated.map((item) => `| \`${markdownCell(item.name)}\` | ${markdownCell(item.version)} | ${markdownCell(item.source)} | ${markdownCell(item.license)} | ${item.risk} |`).join("\n")}

## Commercial Use Reading

- \`restricted-or-review\`: do not use for commercial/customer work until legal review is complete.
- \`unknown\`: metadata was not available locally; treat as review-needed, not MIT.
- \`non-mit-permissive-or-review\`: generally permissive families, but still not MIT and should be recorded.
`;
  fs.writeFileSync(outPath, content);
  return { ok: restricted.length === 0, items: evaluated, restricted, nonMit, unknown, outPath };
}

function license(args) {
  const subcommand = args._[0];
  if (subcommand === "audit") {
    const target = path.resolve(args.target || process.cwd());
    requireDir(target, "Target");
    const result = licenseAudit(target);
    console.log(`license audit ${result.ok ? "PASS" : "REVIEW"}`);
    console.log(`write ${result.outPath}`);
    console.log(`items ${result.items.length}`);
    console.log(`non-mit-or-unknown ${result.nonMit.length}`);
    console.log(`restricted ${result.restricted.length}`);
    if (result.restricted.length > 0) process.exitCode = 1;
    return;
  }
  usage();
  process.exitCode = 1;
}

const DEFAULT_POLICIES = [
  {
    id: "privacy.local_only",
    title: "默认本地和离线锁",
    description: "保密项目必须保持 local-only，RAG/Graphify --run 不允许外部 endpoint 或网络命令。",
    command: "zl-offline-lock --target <repo> && zl-privacy-audit --target <repo> --strict && zl-outbound-audit --target <repo>",
  },
  {
    id: "evidence.citations",
    title: "规格回答必须有 citation",
    description: "没有 citation 的回答只能作为 hypothesis，不能作为仕様依据。",
    command: "zl-docs-extract --target <repo> && zl-docs-citations --target <repo> \"<query>\" && zl-citation-audit --target <repo>",
  },
  {
    id: "evidence.rag_goldens",
    title: "RAG golden case 必须可复跑",
    description: "关键业务问题要有 golden case，并在本地抽取文档中命中 expected terms。",
    command: "zl-rag-golden-run --target <repo> && zl-rag-eval --target <repo>",
  },
  {
    id: "trace.matrix",
    title: "规格到代码到证据必须可追踪",
    description: "需要能从文档、代码图、测试、evidence 形成 trace matrix。",
    command: "zl-trace-build --target <repo> && zl-trace-audit --target <repo>",
  },
  {
    id: "graph.freshness",
    title: "stale graph 不能作为完成证据",
    description: "源码比 graph 新时必须重建 Graphify/代码地图。",
    command: "zl-graph-freshness --target <repo> --strict",
  },
  {
    id: "freshness.preflight",
    title: "重刷新必须显式触发",
    description: "普通 workflow 只提醒 GraphRAG/Graphify 落后几个 commit；相关变更需要显式 zl-refresh-run 或 strict policy 失败。",
    command: "zl-preflight --target <repo> --strict",
  },
  {
    id: "license.no_restricted",
    title: "禁止商用风险必须显式记录",
    description: "license unknown 不能当 MIT；restricted/commercial-review 必须阻断交付。",
    command: "zl-license-audit --target <repo>",
  },
];

function policyPaths(target) {
  const policyDir = path.join(target, ".planning", "policies");
  return {
    policyDir,
    listPath: path.join(policyDir, "POLICY_LIST.md"),
    checkPath: path.join(policyDir, "POLICY_CHECK.md"),
    checkJson: path.join(policyDir, "POLICY_CHECK.json"),
    lockJson: path.join(policyDir, "POLICY_LOCK.json"),
    lockMd: path.join(policyDir, "POLICY_LOCK.md"),
    verifyJson: path.join(policyDir, "POLICY_VERIFY.json"),
    verifyMd: path.join(policyDir, "POLICY_VERIFY.md"),
    diffJson: path.join(policyDir, "POLICY_DIFF.json"),
    diffMd: path.join(policyDir, "POLICY_DIFF.md"),
  };
}

function policySnapshot(target) {
  const config = readPlanningConfig(target);
  const profile = activeRefreshProfile(target);
  return stableValue({
    version: 1,
    product: "Zhulong",
    profile: profile.name,
    document_policy: profile.documentPolicy,
    rag_backend: profile.ragBackend,
    execution_budget: {
      profile: config.execution_budget?.profile || profile.name,
      document_policy: config.execution_budget?.document_policy || profile.documentPolicy,
      rag_backend: config.execution_budget?.rag_backend || profile.ragBackend,
      heavy_refresh: config.execution_budget?.heavy_refresh || "explicit_or_policy",
      auto_refresh: config.execution_budget?.auto_refresh === true,
      refresh_state_path: config.execution_budget?.refresh_state_path || ".planning/refresh/REFRESH_STATE.json",
      warn_on_unrelated_commit_distance: config.execution_budget?.warn_on_unrelated_commit_distance !== false,
      profiles: config.execution_budget?.profiles || {},
    },
    privacy: {
      network_policy: config.privacy?.network_policy || "local_only",
      offline_lock: config.privacy?.offline_lock === true,
      allow_external_rag: config.privacy?.allow_external_rag === true ? true : false,
      allow_external_tools: config.privacy?.allow_external_tools === true,
      allowed_hosts: Array.isArray(config.privacy?.allowed_hosts) ? config.privacy.allowed_hosts : ["127.0.0.1", "localhost"],
      forbidden_env_keys: Array.isArray(config.privacy?.forbidden_env_keys) ? config.privacy.forbidden_env_keys : [],
    },
    spec_context: {
      enabled: config.spec_context?.enabled === true,
      provider: config.spec_context?.provider || "none",
      source_paths: Array.isArray(config.spec_context?.source_paths) ? config.spec_context.source_paths : DEFAULT_DOC_SOURCE_PATHS,
      scan_extensions: Array.isArray(config.spec_context?.scan_extensions) ? config.spec_context.scan_extensions : DEFAULT_DOC_EXTENSIONS,
      require_citations: config.spec_context?.require_citations === true,
      index_command: config.spec_context?.index_command || "",
      query_command: config.spec_context?.query_command || "",
    },
    graphrag: {
      enabled: config.graphrag?.enabled === true,
      mode: config.graphrag?.mode || "none",
      requires_api_key: config.graphrag?.requires_api_key === true,
      api_base: config.graphrag?.api_base || "",
      root: config.graphrag?.root || "graphrag-workspace",
      index_command: config.graphrag?.index_command || config.spec_context?.index_command || "",
      local_query_command: config.graphrag?.local_query_command || config.spec_context?.query_command || "",
    },
    code_map: {
      provider: config.code_map?.provider || config.graphify?.provider || "graphify",
      source_paths: Array.isArray(config.code_map?.source_paths) ? config.code_map.source_paths : [],
      update_command: config.code_map?.update_command || config.graphify?.update_command || "",
    },
    graphify: {
      source_paths: Array.isArray(config.graphify?.source_paths) ? config.graphify.source_paths : [],
      update_command: config.graphify?.update_command || config.code_map?.update_command || "",
    },
    policies: DEFAULT_POLICIES.map((policy) => policy.id),
  });
}

function policySnapshotHash(snapshot) {
  return sha256Text(stableJson(snapshot));
}

function readPolicyLock(target) {
  return readJsonIfExists(policyPaths(target).lockJson);
}

function diffValues(before, after, prefix = "") {
  const diffs = [];
  const beforeObj = before && typeof before === "object" && !Array.isArray(before);
  const afterObj = after && typeof after === "object" && !Array.isArray(after);
  if (beforeObj && afterObj) {
    const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
    for (const key of keys) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      diffs.push(...diffValues(before[key], after[key], nextPrefix));
    }
    return diffs;
  }
  const beforeJson = JSON.stringify(stableValue(before));
  const afterJson = JSON.stringify(stableValue(after));
  if (beforeJson !== afterJson) {
    diffs.push({
      path: prefix || "<root>",
      before,
      after,
      beforeText: before === undefined ? "<missing>" : beforeJson,
      afterText: after === undefined ? "<missing>" : afterJson,
    });
  }
  return diffs;
}

function policyState(status, blocking, detail, evidence = "") {
  return { status, blocking: Boolean(blocking), detail, evidence };
}

function preflightPolicyState(target, profile, strict) {
  const assessment = refreshAssessment(target);
  const written = writePreflightReport(target, assessment);
  const stale = assessment.domains.filter((domain) => ["stale-related", "untracked", "unknown"].includes(domain.status));
  const missingRequired = assessment.domains.filter((domain) => domain.status === "missing" && domain.required);
  if (missingRequired.length > 0) {
    return {
      assessment,
      state: policyState("FAIL", true, missingRequired.map((domain) => domain.message).join("; "), written.mdPath),
    };
  }
  if (stale.length > 0 || assessment.status === "WARN") {
    const blocking = strict || profile.strict;
    return {
      assessment,
      state: policyState("STALE_NEEDS_REFRESH", blocking, `preflight ${assessment.status}; heavy refresh executed: no`, written.mdPath),
    };
  }
  if (assessment.status === "FAIL") {
    return {
      assessment,
      state: policyState("FAIL", true, `preflight ${assessment.status}`, written.mdPath),
    };
  }
  return {
    assessment,
    state: policyState("PASS", false, "preflight PASS; heavy refresh executed: no", written.mdPath),
  };
}

function graphFreshnessPolicyState(target, profile, strict) {
  const freshness = graphFreshness(target);
  const outPath = writeGraphFreshnessReport(target, freshness);
  if (freshness.state === "fresh") return policyState("PASS", false, freshness.message, outPath);
  if (freshness.state === "stale") return policyState("STALE_NEEDS_REFRESH", strict || profile.strict, freshness.message, outPath);
  return policyState(profile.graphRequired ? "FAIL" : "WAIVED_WITH_RISK", profile.graphRequired, freshness.message, outPath);
}

function citationPolicyState(target, profile, strict) {
  const result = citationAudit(target);
  if (result.ok) return policyState("PASS", false, "citation audit passed", result.outPath);
  const detail = result.issues.map((issue) => `${issue.citation}: ${issue.detail}`).join("; ") || "citation audit failed";
  const required = strict || profile.strict || profile.ragRequired;
  return policyState(required ? "FAIL" : "WAIVED_WITH_RISK", required, detail, result.outPath);
}

function lightweightPolicyChecks(target, options = {}) {
  const profile = activeRefreshProfile(target);
  const strict = Boolean(options.strict || profile.strict);
  const checks = [];
  const add = (id, state) => checks.push({ id, ...state });

  const privacy = runPrivacyAudit(target, { strictLocal: true, requireOfflineLock: Boolean(options.requireOfflineLock), writeReport: true });
  add("privacy.local_only", policyState(
    privacy.ok ? "PASS" : "FAIL",
    !privacy.ok,
    privacy.ok ? "local-only privacy audit passed" : privacy.issues.map((issue) => `${issue.file}: ${issue.detail}`).join("; "),
    privacy.outPath,
  ));

  const preflight = preflightPolicyState(target, profile, strict);
  add("freshness.preflight", preflight.state);
  add("evidence.citations", citationPolicyState(target, profile, strict));
  add("graph.freshness", graphFreshnessPolicyState(target, profile, strict));

  return {
    generatedAt: new Date().toISOString(),
    profile: profile.name,
    strict,
    status: checks.some((check) => check.blocking) ? "FAIL" : "PASS",
    checks,
    preflight: preflight.assessment,
  };
}

function writePolicyLockMarkdown(target, data) {
  const paths = policyPaths(target);
  const content = `# Zhulong Policy Lock

Generated: ${data.generatedAt}

## Summary

- Status: ${data.status}
- Snapshot hash: \`${data.snapshotHash || "-"}\`
- Profile: \`${data.snapshot?.profile || "-"}\`
- Heavy refresh executed: no

## Rule

- This lock records the local policy contract for the project.
- Run \`zl-policy-diff --target <repo>\` before changing privacy, RAG, Graphify, or execution budget settings.
- Run \`zl-policy-verify --target <repo>\` before completion or release checks.
`;
  fs.writeFileSync(paths.lockMd, content);
  return paths.lockMd;
}

function policyLock(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const paths = policyPaths(target);
  fs.mkdirSync(paths.policyDir, { recursive: true });
  const privacy = runPrivacyAudit(target, { strictLocal: true, requireOfflineLock: true, writeReport: true });
  if (!privacy.ok) {
    const data = {
      generatedAt: new Date().toISOString(),
      status: "FAIL",
      issues: privacy.issues,
      snapshot: null,
      snapshotHash: null,
      heavyRefreshExecuted: false,
    };
    writeJsonFile(paths.lockJson, data);
    writePolicyLockMarkdown(target, data);
    console.log("policy lock FAIL");
    console.log("run zl-offline-lock --target <repo> before locking policy");
    for (const issue of privacy.issues) console.log(`FAIL ${issue.file} ${issue.detail}`);
    console.log(`write ${paths.lockMd}`);
    console.log("heavy refresh executed: no");
    process.exitCode = 1;
    return;
  }

  const snapshot = policySnapshot(target);
  const data = {
    generatedAt: new Date().toISOString(),
    status: "PASS",
    snapshotHash: policySnapshotHash(snapshot),
    snapshot,
    heavyRefreshExecuted: false,
  };
  writeJsonFile(paths.lockJson, data);
  writePolicyLockMarkdown(target, data);
  console.log("policy lock PASS");
  console.log(`hash ${data.snapshotHash}`);
  console.log(`write ${paths.lockMd}`);
  console.log("heavy refresh executed: no");
}

function policyDiffResult(target) {
  const lock = readPolicyLock(target);
  const current = policySnapshot(target);
  if (!lock?.snapshot || !lock?.snapshotHash) {
    return { ok: false, missingLock: true, lock: null, current, currentHash: policySnapshotHash(current), diffs: [] };
  }
  const currentHash = policySnapshotHash(current);
  const diffs = diffValues(lock.snapshot, current);
  return { ok: currentHash === lock.snapshotHash && diffs.length === 0, missingLock: false, lock, current, currentHash, diffs };
}

function writePolicyDiffReports(target, result) {
  const paths = policyPaths(target);
  const status = result.ok ? "CLEAN" : "CHANGED";
  writeJsonFile(paths.diffJson, {
    generatedAt: new Date().toISOString(),
    status,
    missingLock: result.missingLock,
    lockedHash: result.lock?.snapshotHash || null,
    currentHash: result.currentHash,
    diffs: result.diffs,
    heavyRefreshExecuted: false,
  });
  const content = `# Zhulong Policy Diff

Generated: ${new Date().toISOString()}

## Summary

- Status: ${status}
- Missing lock: ${result.missingLock ? "yes" : "no"}
- Locked hash: \`${result.lock?.snapshotHash || "-"}\`
- Current hash: \`${result.currentHash}\`
- Differences: ${result.diffs.length}
- Heavy refresh executed: no

## Differences

${result.missingLock
  ? "- `POLICY_LOCK.json` missing. Run `zl-offline-lock --target <repo>` and `zl-policy-lock --target <repo>`."
  : result.diffs.length
    ? result.diffs.map((diff) => `- \`${diff.path}\`: ${markdownCell(diff.beforeText)} -> ${markdownCell(diff.afterText)}`).join("\n")
    : "No policy drift found."}
`;
  fs.writeFileSync(paths.diffMd, content);
  return { jsonPath: paths.diffJson, mdPath: paths.diffMd, status };
}

function policyDiff(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const written = writePolicyDiffReports(target, policyDiffResult(target));
  console.log(`policy diff ${written.status}`);
  console.log(`write ${written.mdPath}`);
  console.log("heavy refresh executed: no");
  process.exitCode = written.status === "CLEAN" ? 0 : 1;
}

function writePolicyVerifyReports(target, data) {
  const paths = policyPaths(target);
  writeJsonFile(paths.verifyJson, data);
  const content = `# Zhulong Policy Verify

Generated: ${data.generatedAt}

## Summary

- Status: ${data.status}
- Profile: \`${data.profile}\`
- Lock status: ${data.lockStatus}
- Diff status: ${data.diffStatus}
- Blocking checks: ${data.checks.filter((check) => check.blocking).length}
- Heavy refresh executed: no

## Checks

| Policy | Status | Blocking | Detail | Evidence |
| --- | --- | --- | --- | --- |
${data.checks.map((check) => `| \`${check.id}\` | ${check.status} | ${check.blocking ? "yes" : "no"} | ${markdownCell(check.detail || "")} | \`${markdownCell(check.evidence ? path.relative(target, check.evidence) : "")}\` |`).join("\n")}

## Drift

${data.diffs.length
  ? data.diffs.map((diff) => `- \`${diff.path}\`: ${markdownCell(diff.beforeText)} -> ${markdownCell(diff.afterText)}`).join("\n")
  : data.lockStatus === "missing" ? "- `POLICY_LOCK.json` missing." : "No policy drift found."}
`;
  fs.writeFileSync(paths.verifyMd, content);
  return { jsonPath: paths.verifyJson, mdPath: paths.verifyMd };
}

function policyVerify(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const profile = activeRefreshProfile(target);
  const diff = policyDiffResult(target);
  const checks = lightweightPolicyChecks(target, { strict: Boolean(args.strict || profile.strict), requireOfflineLock: true });
  const lockStatus = diff.missingLock ? "missing" : diff.ok ? "clean" : "changed";
  const diffStatus = diff.ok ? "CLEAN" : "CHANGED";
  const blockingChecks = checks.checks.filter((check) => check.blocking);
  const ok = !diff.missingLock && diff.ok && blockingChecks.length === 0;
  const data = {
    generatedAt: new Date().toISOString(),
    status: ok ? "PASS" : "FAIL",
    profile: profile.name,
    lockStatus,
    diffStatus,
    lockedHash: diff.lock?.snapshotHash || null,
    currentHash: diff.currentHash,
    diffs: diff.diffs,
    checks: checks.checks,
    heavyRefreshExecuted: false,
  };
  const written = writePolicyVerifyReports(target, data);
  console.log(`policy verify ${data.status}`);
  console.log(`lock ${lockStatus}`);
  console.log(`diff ${diffStatus}`);
  for (const check of data.checks) console.log(`${check.status} ${check.id} ${check.detail}`);
  console.log(`write ${written.mdPath}`);
  console.log("heavy refresh executed: no");
  process.exitCode = ok ? 0 : 1;
}

function policyList(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const paths = policyPaths(target);
  fs.mkdirSync(paths.policyDir, { recursive: true });
  const content = `# Zhulong Policy List

Generated: ${new Date().toISOString()}

| Policy | Title | Command |
| --- | --- | --- |
${DEFAULT_POLICIES.map((policy) => `| \`${policy.id}\` | ${policy.title} | \`${markdownCell(policy.command)}\` |`).join("\n")}
`;
  fs.writeFileSync(paths.listPath, content);
  for (const policy of DEFAULT_POLICIES) {
    console.log(`${policy.id}: ${policy.title}`);
  }
  console.log(`write ${paths.listPath}`);
}

function explainPolicy(id) {
  return DEFAULT_POLICIES.find((policy) => policy.id === id) || null;
}

function policyExplain(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const id = args._[1] || args.id || "privacy.local_only";
  const policy = explainPolicy(id);
  if (!policy) {
    console.log(`unknown policy ${id}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${policy.id}`);
  console.log(policy.title);
  console.log(policy.description);
  console.log(`command: ${policy.command}`);
}

function policyCheck(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const paths = policyPaths(target);
  fs.mkdirSync(paths.policyDir, { recursive: true });
  const checks = [];
  const add = (id, state) => checks.push({ id, ...state, ok: !state.blocking });

  const privacyResult = runPrivacyAudit(target, { strictLocal: true, requireOfflineLock: Boolean(args.strict), writeReport: true });
  add("privacy.local_only", policyState(
    privacyResult.ok ? "PASS" : "FAIL",
    !privacyResult.ok,
    privacyResult.ok ? "local-only privacy audit passed" : privacyResult.issues.map((issue) => `${issue.file}: ${issue.detail}`).join("; "),
    privacyResult.outPath,
  ));

  const citationResult = citationAudit(target);
  add("evidence.citations", policyState(
    citationResult.ok ? "PASS" : "FAIL",
    !citationResult.ok,
    citationResult.ok ? "citation audit passed" : citationResult.issues.map((issue) => `${issue.citation}: ${issue.detail}`).join("; "),
    citationResult.outPath,
  ));

  const golden = runRagGoldens(target);
  add("evidence.rag_goldens", policyState(golden.ok ? "PASS" : "FAIL", !golden.ok, golden.ok ? "golden cases passed" : "golden cases missing or failing", golden.outPath));

  const traceResult = traceAudit(target);
  add("trace.matrix", policyState(traceResult.ok ? "PASS" : "FAIL", !traceResult.ok, traceResult.ok ? "trace audit passed" : traceResult.issues.join("; "), traceResult.outPath));

  const profile = activeRefreshProfile(target);
  add("graph.freshness", graphFreshnessPolicyState(target, profile, Boolean(args.strict || profile.strict)));

  const preflight = preflightPolicyState(target, profile, Boolean(args.strict || profile.strict));
  add("freshness.preflight", preflight.state);

  const licenseResult = licenseAudit(target);
  add("license.no_restricted", policyState(licenseResult.restricted.length === 0 ? "PASS" : "FAIL", licenseResult.restricted.length > 0, licenseResult.restricted.length === 0 ? "no restricted license found" : `${licenseResult.restricted.length} restricted/review licenses`, licenseResult.outPath));

  const ok = checks.every((check) => !check.blocking);
  writeJsonFile(paths.checkJson, {
    generatedAt: new Date().toISOString(),
    status: ok ? "PASS" : "FAIL",
    checks,
  });
  const content = `# Zhulong Policy Check

Generated: ${new Date().toISOString()}

## Summary

- Status: ${ok ? "PASS" : "FAIL"}
- Checks: ${checks.length}
- Failed: ${checks.filter((check) => !check.ok).length}

## Checks

| Policy | Status | Detail | Evidence |
| --- | --- | --- | --- |
${checks.map((check) => `| \`${check.id}\` | ${check.status} | ${markdownCell(check.detail)} | \`${markdownCell(check.evidence ? path.relative(target, check.evidence) : "")}\` |`).join("\n")}

## Rule

- Heavy refresh executed: no
- Policy checks are lightweight and must not run GraphRAG index or Graphify build.
`;
  fs.writeFileSync(paths.checkPath, content);
  console.log(`policy check ${ok ? "PASS" : "FAIL"}`);
  console.log(`write ${paths.checkPath}`);
  console.log("heavy refresh executed: no");
  process.exitCode = ok ? 0 : 1;
}

const HELP_SKILL_SCENARIOS = [
  {
    id: "文档更新",
    keywords: ["文档", "仕様", "qa", "议事", "議事", "更新", "citation", "引用"],
    commands: [
      "zl-preflight --target <repo>",
      "zl-refresh-plan --target <repo>",
      "zl-docs-sync --target <repo>",
      "zl-docs-citations --target <repo> \"<query>\"",
      "zl-answer-audit --target <repo>",
      "zl-rag-golden-run --target <repo>",
    ],
    reason: "先轻量同步文档，再用 citation/answer audit/golden 确认规格依据。",
  },
  {
    id: "改修影响面",
    keywords: ["影响", "影響", "改修", "代码", "graph", "Graphify", "风险", "risk"],
    commands: [
      "zl-preflight --target <repo>",
      "zl-refresh-plan --target <repo>",
      "zl-graph-freshness --target <repo> --strict",
      "zl-graph-impact --target <repo> --files \"<files>\"",
      "zl-graph-risk --target <repo>",
      "zl-trace-query --target <repo> \"<keyword>\"",
    ],
    reason: "先确认 graph 新鲜，再查影响面和风险节点。",
  },
  {
    id: "完成前检查",
    keywords: ["完成", "提交", "检查", "gate", "workflow", "验证", "検証"],
    commands: [
      "zl-preflight --target <repo> --strict",
      "zl-workflow-audit --target <repo>",
      "zl-policy-check --target <repo>",
      "zl-evidence-status --target <repo>",
      "zl-completion-check --target <repo>",
    ],
    reason: "完成前必须过 workflow gate、policy、evidence 和 completion check。",
  },
  {
    id: "保密项目",
    keywords: ["保密", "安全", "外发", "外部", "privacy", "offline", "license", "商用"],
    commands: [
      "zl-offline-lock --target <repo>",
      "zl-privacy-audit --target <repo> --strict",
      "zl-outbound-audit --target <repo>",
      "zl-license-audit --target <repo>",
    ],
    reason: "先锁本地，再审计外发和 license。",
  },
  {
    id: "新项目接入",
    keywords: ["新项目", "既存", "接入", "初始化", "导入", "init"],
    commands: [
      "zl-init --target <repo> --template brownfield-monorepo --mode existing",
      "zl-codebase-scan --target <repo>",
      "zl-docs-sync --target <repo>",
      "zl-rag-init-local --target <repo>",
      "zl-trace-build --target <repo>",
    ],
    reason: "接入时先建工作台、代码 baseline、文档抽取、本地 RAG 和 trace。",
  },
  {
    id: "机械质量审计",
    keywords: ["质量", "暧昧", "歧义", "结构", "answer", "audit", "审计"],
    commands: [
      "zl-ambiguity-audit --target <repo>",
      "zl-answer-audit --target <repo>",
      "zl-structure-audit --target <repo>",
    ],
    reason: "用纯规则审计暧昧表达、回答接地和关键制品结构，不调用 LLM。",
  },
  {
    id: "缺陷调查",
    keywords: ["缺陷", "bug", "debug", "异常", "调查", "定位"],
    commands: [
      "zl-debug --target <repo> \"<bug description>\"",
      "zl-context-debug --target <repo> \"<bug description>\"",
      "zl-graph-impact --target <repo> --files \"<files>\"",
      "zl-evidence-record --target <repo> \"<finding>\"",
    ],
    reason: "把问题描述、规格证据、代码影响面和验证记录放进同一条调查链。",
  },
  {
    id: "状态演示",
    keywords: ["演示", "汇报", "状态", "leader", "dashboard", "cockpit"],
    commands: [
      "zl-next --target <repo>",
      "zl-cockpit-build --target <repo>",
      "zl-evidence-status --target <repo>",
    ],
    reason: "用 next 给出当前动作，再生成本地 cockpit 展示质量、证据和项目状态。",
  },
  {
    id: "RAG 后端切换",
    keywords: ["rag", "后端", "backend", "切换", "本地模型", "索引"],
    commands: [
      "zl-mode-status --target <repo>",
      "zl-rag-init-local --target <repo>",
      "zl-docs-index --target <repo> --run",
      "zl-privacy-audit --target <repo> --strict",
    ],
    reason: "先确认 mode 与隐私边界，再显式初始化或刷新 RAG；不在普通命令里暗跑重建。",
  },
];

function helpSkills(args) {
  const target = path.resolve(args.target || process.cwd());
  const shouldWrite = Boolean(args.target) || fs.existsSync(path.join(target, ".planning"));
  const question = args.question || args._.slice(args._[0] === "skills" ? 1 : 0).join(" ").trim();
  const text = String(question || "").toLowerCase();
  const scored = HELP_SKILL_SCENARIOS.map((scenario) => {
    const score = scenario.keywords.reduce((count, keyword) => count + (text.includes(String(keyword).toLowerCase()) ? 1 : 0), 0);
    return { ...scenario, score };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const recommendations = (scored.some((item) => item.score > 0) ? scored.filter((item) => item.score > 0) : scored).slice(0, 3);
  const lines = [
    "# Zhulong Help Skills",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Question",
    "",
    question || "(none)",
    "",
    "## Recommendations",
    "",
    ...recommendations.flatMap((item, index) => [
      `### ${index + 1}. ${item.id}`,
      "",
      `- Reason: ${item.reason}`,
      `- Score: ${item.score}`,
      "- Commands:",
      ...item.commands.map((command) => `  - \`${command}\``),
      "",
    ]),
  ];

  for (const item of recommendations) {
    console.log(`${item.id}: ${item.reason}`);
    for (const command of item.commands) console.log(`  ${command}`);
  }

  if (shouldWrite) {
    const outPath = path.join(target, ".planning", "help", "HELP_SKILLS.md");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
    console.log(`write ${outPath}`);
  }
}

function help(args) {
  const subcommand = args._[0];
  if (subcommand === "skills") {
    helpSkills(args);
    return;
  }
  usage();
}

function nextRecommendations(target) {
  const recommendations = [];
  const add = (command, reason) => {
    if (!recommendations.some((item) => item.command === command)) recommendations.push({ command, reason });
  };
  const exists = (relativePath) => fs.existsSync(path.join(target, relativePath));
  if (!exists(".planning/config.json")) add('zl-init --target "$PWD" --template brownfield-monorepo --mode existing', "项目尚未接入 Zhulong。");
  if (!exists(".planning/codebase/CODEBASE_STATUS.md")) add('zl-codebase-scan --target "$PWD"', "代码基线尚未建立。");
  if (!exists(".planning/knowledge/DOCUMENT_INDEX.json")) add('zl-docs-sync --target "$PWD"', "文档索引或同步结果尚未建立。");
  if (exists(".planning/knowledge/DOCUMENT_INDEX.json") && !exists(".planning/quality/AMBIGUITY_AUDIT.json")) add('zl-ambiguity-audit --target "$PWD"', "文档已有索引，但暧昧表达尚未审计。");
  if ((exists(".planning/knowledge/RAG_QUERY_RESULT.md") || exists(".planning/knowledge/DOCS_QUERY_RESULT.md")) && !exists(".planning/quality/ANSWER_AUDIT.json")) add('zl-answer-audit --target "$PWD"', "查询结果尚未完成回答接地审计。");
  const freshness = graphFreshness(target);
  if (freshness.state === "missing") add('zl-graph-build --target "$PWD" --run', "代码图基线缺失；这是显式重命令。");
  else if (freshness.state === "stale") add('zl-refresh-plan --target "$PWD"', "代码图已过期，先生成刷新建议。");
  if (!exists(".planning/trace/TRACE_MATRIX.json")) add('zl-trace-build --target "$PWD"', "规格、代码、测试和证据尚未形成追踪矩阵。");
  if (!exists(".planning/quality/STRUCTURE_AUDIT.json")) add('zl-structure-audit --target "$PWD"', "关键制品结构尚未做确定性校验。");
  if (exists(".planning/workflows")) add('zl-completion-check --target "$PWD"', "已有工作流状态，可执行完成前门禁。");
  add('zl-cockpit-build --target "$PWD"', "聚合当前项目情报和质量指标供检查。");
  add('zl-help-skills --target "$PWD" "描述当前任务"', "按任务场景继续发现命令，而不是背诵完整命令表。");
  return recommendations.slice(0, 3);
}

function nextCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const recommendations = nextRecommendations(target);
  const generatedAt = new Date().toISOString();
  const outPath = path.join(target, ".planning", "help", "NEXT.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const content = `# Zhulong Next\n\nGenerated: ${generatedAt}\n\n## Recommended Commands\n\n${recommendations.map((item, index) => `${index + 1}. \`${item.command}\`\n   - ${item.reason}`).join("\n")}\n\n## Rule\n\n- Only 2-3 next actions are shown.\n- GraphRAG index, Graphify build, and refresh-run remain explicit commands.\n- Heavy refresh executed: no\n`;
  fs.writeFileSync(outPath, content);
  console.log("Zhulong next");
  for (const [index, item] of recommendations.entries()) console.log(`${index + 1}. ${item.command} - ${item.reason}`);
  console.log(`write ${outPath}`);
  console.log("heavy refresh executed: no");
}

function privacy(args) {
  const subcommand = args._[0];
  if (subcommand === "audit") {
    const target = path.resolve(args.target || process.cwd());
    requireDir(target, "Target");
    const audit = runPrivacyAudit(target, {
      strictLocal: true,
      requireOfflineLock: Boolean(args.strict),
      writeReport: true,
    });
    console.log(`privacy audit ${audit.ok ? "PASS" : "FAIL"}`);
    console.log(`write ${audit.outPath}`);
    for (const issue of audit.issues) console.log(`FAIL ${issue.file} ${issue.detail}`);
    process.exitCode = audit.ok ? 0 : 1;
    return;
  }
  if (subcommand === "offline-lock") {
    const target = path.resolve(args.target || process.cwd());
    requireDir(target, "Target");
    const written = writeOfflineLock(target);
    const audit = runPrivacyAudit(target, { strictLocal: true, requireOfflineLock: true, writeReport: true });
    console.log(`write ${written.jsonPath}`);
    console.log(`write ${written.mdPath}`);
    console.log(`write ${written.configPath}`);
    console.log(`privacy audit ${audit.ok ? "PASS" : "FAIL"}`);
    for (const issue of audit.issues) console.log(`FAIL ${issue.file} ${issue.detail}`);
    process.exitCode = audit.ok ? 0 : 1;
    return;
  }
  if (subcommand === "outbound") {
    const target = path.resolve(args.target || process.cwd());
    requireDir(target, "Target");
    const result = outboundAudit(target, { strict: Boolean(args.strict) });
    console.log(`outbound audit ${result.ok ? "PASS" : "FAIL"}`);
    console.log(`write ${result.outPath}`);
    for (const issue of result.issues) console.log(`FAIL ${issue.file} ${issue.detail}`);
    for (const warning of result.warnings) console.log(`WARN ${warning.file} ${warning.detail}`);
    process.exitCode = result.ok ? 0 : 1;
    return;
  }
  usage();
  process.exitCode = 1;
}

function answer(args) {
  const subcommand = args._[0];
  if (subcommand === "audit") {
    answerAuditCommand(args);
    return;
  }
  usage();
  process.exitCode = 1;
}

function ambiguity(args) {
  if (args._[0] === "audit") {
    ambiguityAuditCommand(args);
    return;
  }
  usage();
  process.exitCode = 1;
}

function structure(args) {
  if (args._[0] === "audit") {
    structureAuditCommand(args);
    return;
  }
  usage();
  process.exitCode = 1;
}

function graphArtifactPaths(target) {
  return {
    planningGraph: path.join(target, ".planning", "graphs", "graph.json"),
    planningReport: path.join(target, ".planning", "graphs", "GRAPH_REPORT.md"),
    planningBaseline: path.join(target, ".planning", "graphs", "graph.baseline.json"),
    planningBuildResult: path.join(target, ".planning", "graphs", "GRAPH_BUILD_RESULT.md"),
    planningDiffResult: path.join(target, ".planning", "graphs", "GRAPH_DIFF.md"),
    graphifyGraph: path.join(target, "graphify-out", "graph.json"),
    graphifyReport: path.join(target, "graphify-out", "GRAPH_REPORT.md"),
  };
}

function graphStats(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const edges = Array.isArray(data.edges) ? data.edges : Array.isArray(data.links) ? data.links : [];
    return {
      nodes: Array.isArray(data.nodes) ? data.nodes.length : 0,
      edges: edges.length,
      hyperedges: Array.isArray(data.hyperedges) ? data.hyperedges.length : 0,
      modified: stat.mtime.toISOString(),
      modifiedMs: stat.mtimeMs,
    };
  } catch {
    return {
      nodes: null,
      edges: null,
      hyperedges: null,
      modified: stat.mtime.toISOString(),
      modifiedMs: stat.mtimeMs,
      invalid: true,
    };
  }
}

function graphStatus(target) {
  const paths = graphArtifactPaths(target);
  return {
    planningGraph: graphStats(paths.planningGraph),
    planningReport: fs.existsSync(paths.planningReport) ? fs.statSync(paths.planningReport).mtime.toISOString() : null,
    graphifyGraph: graphStats(paths.graphifyGraph),
    graphifyReport: fs.existsSync(paths.graphifyReport) ? fs.statSync(paths.graphifyReport).mtime.toISOString() : null,
    paths,
  };
}

function newestSourceFile(target) {
  let newest = null;
  for (const filePath of walkFiles(target, CODE_MAP_IGNORE_NAMES)) {
    try {
      const stat = fs.statSync(filePath);
      if (!newest || stat.mtimeMs > newest.modifiedMs) {
        newest = {
          path: path.relative(target, filePath),
          modified: stat.mtime.toISOString(),
          modifiedMs: stat.mtimeMs,
        };
      }
    } catch {
      // Ignore unreadable files during freshness checks.
    }
  }
  return newest;
}

function primaryGraph(status) {
  if (status.planningGraph) {
    return {
      label: ".planning/graphs/graph.json",
      stats: status.planningGraph,
    };
  }
  if (status.graphifyGraph) {
    return {
      label: "graphify-out/graph.json",
      stats: status.graphifyGraph,
    };
  }
  return null;
}

function graphFreshness(target, status = graphStatus(target)) {
  const graph = primaryGraph(status);
  if (!graph) {
    return { state: "missing", message: "No graph data found." };
  }
  if (graph.stats.invalid) {
    return { state: "unknown", message: `${graph.label} is invalid JSON.` };
  }

  const newest = newestSourceFile(target);
  if (!newest) {
    return { state: "unknown", message: "No source files found for freshness comparison." };
  }

  if (newest.modifiedMs > graph.stats.modifiedMs + GRAPH_STALE_GRACE_MS) {
    return {
      state: "stale",
      message: `${graph.label} may be stale; ${newest.path} is newer than the graph.`,
      graph,
      newest,
    };
  }

  return {
    state: "fresh",
    message: `${graph.label} is newer than scanned source files.`,
    graph,
    newest,
  };
}

function formatGraphStats(label, stats) {
  if (!stats) return `- \`${label}\`: missing`;
  if (stats.invalid) return `- \`${label}\`: present but invalid JSON; modified ${stats.modified}`;
  return `- \`${label}\`: ${stats.nodes} nodes, ${stats.edges} edges, ${stats.hyperedges} hyperedges; modified ${stats.modified}`;
}

function formatReportStatus(label, modified) {
  return modified ? `- \`${label}\`: present; modified ${modified}` : `- \`${label}\`: missing`;
}

function formatGraphFreshness(freshness) {
  if (freshness.state === "missing") return `- Freshness: missing. ${freshness.message}`;
  if (freshness.state === "stale") {
    return `- Freshness: STALE. ${freshness.message}`;
  }
  if (freshness.state === "fresh") return `- Freshness: fresh. ${freshness.message}`;
  return `- Freshness: unknown. ${freshness.message}`;
}

function formatGraphStatusMarkdown(target) {
  const status = graphStatus(target);
  const freshness = graphFreshness(target, status);
  const lines = [
    formatGraphStats(".planning/graphs/graph.json", status.planningGraph),
    formatReportStatus(".planning/graphs/GRAPH_REPORT.md", status.planningReport),
    formatGraphStats("graphify-out/graph.json", status.graphifyGraph),
    formatReportStatus("graphify-out/GRAPH_REPORT.md", status.graphifyReport),
    formatGraphFreshness(freshness),
  ];

  if (status.graphifyGraph && !status.planningGraph) {
    lines.push("- Sync: `graphify-out/graph.json` exists but `.planning/graphs/graph.json` is missing.");
  } else if (status.graphifyGraph && status.planningGraph && status.graphifyGraph.modifiedMs > status.planningGraph.modifiedMs + GRAPH_STALE_GRACE_MS) {
    lines.push("- Sync: `graphify-out/graph.json` is newer than `.planning/graphs/graph.json`; copy or rebuild the Zhulong graph cache.");
  }

  return lines.join("\n");
}

function queryGraphArtifacts(target, query) {
  const paths = graphArtifactPaths(target);
  const terms = uniqueList(String(query || "").toLowerCase().split(/\s+/).filter(Boolean));
  const matches = [];

  for (const reportPath of [paths.planningReport, paths.graphifyReport]) {
    if (!fs.existsSync(reportPath)) continue;
    const rel = path.relative(target, reportPath);
    const lines = fs.readFileSync(reportPath, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      const haystack = line.toLowerCase();
      const score = terms.reduce((count, term) => count + (haystack.includes(term) ? 1 : 0), 0);
      if (score > 0) {
        matches.push({ source: rel, line: index + 1, score, text: line.trim() });
      }
    });
  }

  for (const graphPath of [paths.planningGraph, paths.graphifyGraph]) {
    if (!fs.existsSync(graphPath)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(graphPath, "utf8"));
      const nodes = Array.isArray(data.nodes) ? data.nodes : [];
      nodes.forEach((node, index) => {
        const label = JSON.stringify(node);
        const haystack = label.toLowerCase();
        const score = terms.reduce((count, term) => count + (haystack.includes(term) ? 1 : 0), 0);
        if (score > 0) {
          matches.push({
            source: path.relative(target, graphPath),
            line: `node:${index + 1}`,
            score,
            text: label.slice(0, 220),
          });
        }
      });
    } catch {
      // Invalid graph JSON is reported by status; query skips it.
    }
  }

  matches.sort((a, b) => b.score - a.score || String(a.source).localeCompare(String(b.source)));
  return matches;
}

function writeGraphBuildHandoff(target) {
  const graphsDir = path.join(target, ".planning", "graphs");
  fs.mkdirSync(graphsDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const config = readPlanningConfig(target);
  const updateCommand = config.code_map?.update_command || config.graphify?.update_command || "graphify update .";
  const outPath = path.join(graphsDir, "GRAPH_BUILD_HANDOFF.md");
  const content = `# Graph Build Handoff

Generated: ${generatedAt}

## Purpose

Build or refresh the code-map backend for Zhulong.

## Current Backend

- Provider: Graphify
- Replaceable: true

## Suggested Commands

\`\`\`bash
${updateCommand}
mkdir -p .planning/graphs
cp graphify-out/graph.json .planning/graphs/graph.json
cp graphify-out/GRAPH_REPORT.md .planning/graphs/GRAPH_REPORT.md
\`\`\`

## Notes

- This handoff does not run Graphify automatically.
- Review privacy rules before indexing customer or production-sensitive files.
- After building, run \`zl-graph-status --target <repo>\`.
`;
  fs.writeFileSync(outPath, content);
  return outPath;
}

function configuredGraphBuildCommand(target, args = {}) {
  const config = readPlanningConfig(target);
  return args["update-command"]
    || config.code_map?.update_command
    || config.graphify?.update_command
    || "graphify update .";
}

function copyIfExists(sourcePath, targetPath) {
  if (!fs.existsSync(sourcePath)) return false;
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function limitedText(value, maxChars = 4000) {
  const text = String(value || "").trim();
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n... (${text.length - maxChars} more chars)`;
}

function runGraphBuild(target, args = {}) {
  const paths = graphArtifactPaths(target);
  const graphsDir = path.dirname(paths.planningGraph);
  fs.mkdirSync(graphsDir, { recursive: true });

  if (fs.existsSync(paths.planningGraph)) {
    fs.copyFileSync(paths.planningGraph, paths.planningBaseline);
  }

  const command = configuredGraphBuildCommand(target, args);
  const generatedAt = new Date().toISOString();
  let stdout = "";
  let stderr = "";
  let ok = true;
  let errorMessage = "";

  const privacy = enforcePrivacyBeforeToolRun(target, command, "graph-build");
  if (!privacy.ok) {
    ok = false;
    errorMessage = `Local-only privacy audit failed:\n${privacy.issues.map((issue) => `- ${issue.file}: ${issue.detail}`).join("\n")}`;
    const resultContent = `# Graph Build Result

Generated: ${generatedAt}

## Command

\`\`\`bash
${command}
\`\`\`

## Result

- Status: failed
- Privacy audit: failed

## Stderr

\`\`\`text
${limitedText(errorMessage) || "(empty)"}
\`\`\`
`;
    fs.writeFileSync(paths.planningBuildResult, resultContent);
    return {
      ok,
      command,
      copiedGraph: false,
      copiedReport: false,
      resultPath: paths.planningBuildResult,
      status: graphStatus(target),
      errorMessage,
    };
  }

  try {
    stdout = execSync(command, {
      cwd: target,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: Number(args.timeout || 600000),
    });
  } catch (error) {
    ok = false;
    stdout = error.stdout ? String(error.stdout) : "";
    stderr = error.stderr ? String(error.stderr) : "";
    errorMessage = error.message || "Graph build command failed";
  }

  const copiedGraph = copyIfExists(paths.graphifyGraph, paths.planningGraph);
  const copiedReport = copyIfExists(paths.graphifyReport, paths.planningReport);
  if (!copiedGraph || !copiedReport) {
    ok = false;
    if (!errorMessage) {
      errorMessage = "Graphify artifacts were not found under graphify-out/.";
    }
  }
  if (!fs.existsSync(paths.planningBaseline) && copiedGraph) {
    fs.copyFileSync(paths.planningGraph, paths.planningBaseline);
  }

  const status = graphStatus(target);
  const resultContent = `# Graph Build Result

Generated: ${generatedAt}

## Command

\`\`\`bash
${command}
\`\`\`

## Result

- Status: ${ok ? "success" : "failed"}
- Copied graph: ${copiedGraph ? "yes" : "no"}
- Copied report: ${copiedReport ? "yes" : "no"}
- Baseline: ${fs.existsSync(paths.planningBaseline) ? path.relative(target, paths.planningBaseline) : "missing"}

## Graph Status

${formatGraphStatusMarkdown(target)}

## Stdout

\`\`\`text
${limitedText(stdout) || "(empty)"}
\`\`\`

## Stderr

\`\`\`text
${limitedText(stderr || errorMessage) || "(empty)"}
\`\`\`
`;
  fs.writeFileSync(paths.planningBuildResult, resultContent);
  if (ok) {
    markRefreshState(target, "graph", {
      command,
      artifact: path.relative(target, paths.planningBuildResult),
      note: "Updated by zl-graph-build --run or zl-refresh-run --graph.",
    });
  }

  return {
    ok,
    command,
    copiedGraph,
    copiedReport,
    resultPath: paths.planningBuildResult,
    status,
    errorMessage,
  };
}

function graphItemId(item, index) {
  if (item && typeof item === "object") {
    if (item.id || item.key || item.name || item.label) {
      return item.id || item.key || item.name || item.label;
    }
    if (item.source || item.from || item.target || item.to || item.type || item.relation) {
      return `${item.source || item.from || ""}->${item.target || item.to || ""}:${item.type || item.relation || ""}`;
    }
    return JSON.stringify(item);
  }
  return `${index}:${String(item)}`;
}

function graphItemSet(items) {
  const result = new Set();
  if (!Array.isArray(items)) return result;
  items.forEach((item, index) => result.add(String(graphItemId(item, index))));
  return result;
}

function compareSets(before, after) {
  const added = [...after].filter((item) => !before.has(item)).sort();
  const removed = [...before].filter((item) => !after.has(item)).sort();
  return { added, removed };
}

function readGraphJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function compareGraphs(baselinePath, currentPath) {
  const before = readGraphJson(baselinePath);
  const after = readGraphJson(currentPath);
  const beforeEdges = Array.isArray(before.edges) ? before.edges : before.links;
  const afterEdges = Array.isArray(after.edges) ? after.edges : after.links;
  return {
    nodes: compareSets(graphItemSet(before.nodes), graphItemSet(after.nodes)),
    edges: compareSets(graphItemSet(beforeEdges), graphItemSet(afterEdges)),
    hyperedges: compareSets(graphItemSet(before.hyperedges), graphItemSet(after.hyperedges)),
  };
}

function loadPrimaryGraph(target) {
  const status = graphStatus(target);
  const paths = graphArtifactPaths(target);
  const graphPath = status.planningGraph ? paths.planningGraph : status.graphifyGraph ? paths.graphifyGraph : null;
  if (!graphPath) return { graphPath: null, graph: null, status };
  return { graphPath, graph: readGraphJson(graphPath), status };
}

function graphNodeId(node, index) {
  if (node && typeof node === "object") {
    return String(node.id || node.key || node.name || node.label || node.path || node.file || `node:${index + 1}`);
  }
  return String(node || `node:${index + 1}`);
}

function graphNodeText(node, id) {
  return `${id} ${JSON.stringify(node || {})}`.toLowerCase();
}

function graphEdgeEndpoints(edge) {
  if (!edge || typeof edge !== "object") return { source: "", target: "" };
  return {
    source: String(edge.source || edge.from || edge.src || edge.start || ""),
    target: String(edge.target || edge.to || edge.dst || edge.end || ""),
  };
}

function graphData(graph) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : Array.isArray(graph?.links) ? graph.links : [];
  const nodeMap = new Map(nodes.map((node, index) => [graphNodeId(node, index), { node, index, id: graphNodeId(node, index) }]));
  return { nodes, edges, nodeMap };
}

function graphImpact(target, files = []) {
  const loaded = loadPrimaryGraph(target);
  if (!loaded.graph) return { ok: false, reason: "No graph data found.", ...loaded };
  const { nodes, edges, nodeMap } = graphData(loaded.graph);
  const terms = uniqueList(files.flatMap((item) => String(item).split(",")).map((item) => item.trim()).filter(Boolean));
  const matched = [];
  nodes.forEach((node, index) => {
    const id = graphNodeId(node, index);
    const text = graphNodeText(node, id);
    if (terms.some((term) => text.includes(term.toLowerCase()))) {
      matched.push({ id, node, index });
    }
  });

  const matchedIds = new Set(matched.map((item) => item.id));
  const impactedIds = new Set(matchedIds);
  const impactedEdges = [];
  for (const edge of edges) {
    const endpoints = graphEdgeEndpoints(edge);
    if (matchedIds.has(endpoints.source) || matchedIds.has(endpoints.target)) {
      impactedEdges.push(edge);
      if (endpoints.source) impactedIds.add(endpoints.source);
      if (endpoints.target) impactedIds.add(endpoints.target);
    }
  }

  return {
    ok: matched.length > 0,
    graphPath: loaded.graphPath,
    terms,
    matched,
    impacted: [...impactedIds].map((id) => nodeMap.get(id) || { id }).sort((a, b) => a.id.localeCompare(b.id)),
    edges: impactedEdges,
  };
}

function writeGraphImpact(target, result) {
  const paths = graphArtifactPaths(target);
  const outPath = path.join(path.dirname(paths.planningGraph), "GRAPH_IMPACT.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const content = `# Graph Impact

Generated: ${new Date().toISOString()}

## Query

- Files/terms: ${result.terms?.length ? result.terms.map((item) => `\`${item}\``).join(", ") : "none"}
- Graph: \`${result.graphPath ? path.relative(target, result.graphPath) : "missing"}\`

## Summary

- Status: ${result.ok ? "PASS" : "FAIL"}
- Matched seed nodes: ${result.matched?.length || 0}
- Impacted nodes: ${result.impacted?.length || 0}
- Impacted edges: ${result.edges?.length || 0}

## Matched Seed Nodes

${result.matched?.length ? result.matched.slice(0, 20).map((item) => `- \`${item.id}\``).join("\n") : `- ${result.reason || "None"}`}

## Impacted Nodes

${result.impacted?.length ? result.impacted.slice(0, 50).map((item) => `- \`${item.id}\``).join("\n") : "- None"}

## Impacted Edges

${result.edges?.length ? result.edges.slice(0, 50).map((edge) => `- \`${markdownCell(JSON.stringify(edge).slice(0, 240))}\``).join("\n") : "- None"}
`;
  fs.writeFileSync(outPath, content);
  return outPath;
}

function graphRisk(target) {
  const loaded = loadPrimaryGraph(target);
  if (!loaded.graph) return { ok: false, reason: "No graph data found.", ...loaded };
  const { nodes, edges, nodeMap } = graphData(loaded.graph);
  const degree = new Map();
  const incoming = new Map();
  const outgoing = new Map();
  for (const node of nodeMap.values()) {
    degree.set(node.id, 0);
    incoming.set(node.id, 0);
    outgoing.set(node.id, 0);
  }
  for (const edge of edges) {
    const { source, target: edgeTarget } = graphEdgeEndpoints(edge);
    if (source) {
      degree.set(source, (degree.get(source) || 0) + 1);
      outgoing.set(source, (outgoing.get(source) || 0) + 1);
    }
    if (edgeTarget) {
      degree.set(edgeTarget, (degree.get(edgeTarget) || 0) + 1);
      incoming.set(edgeTarget, (incoming.get(edgeTarget) || 0) + 1);
    }
  }
  const highCoupling = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  const entryPoints = [...outgoing.entries()]
    .filter(([id, count]) => count > 0 && (incoming.get(id) || 0) === 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  const testFiles = walkFiles(target, CODE_MAP_IGNORE_NAMES)
    .filter((filePath) => /\.(test|spec)\.[jt]sx?$|__tests__/i.test(filePath))
    .map((filePath) => path.relative(target, filePath));
  return {
    ok: true,
    graphPath: loaded.graphPath,
    nodes: nodes.length,
    edges: edges.length,
    highCoupling,
    entryPoints,
    testFiles,
  };
}

function writeGraphRisk(target, result) {
  const paths = graphArtifactPaths(target);
  const outPath = path.join(path.dirname(paths.planningGraph), "GRAPH_RISK.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const content = `# Graph Risk

Generated: ${new Date().toISOString()}

## Summary

- Status: ${result.ok ? "PASS" : "FAIL"}
- Graph: \`${result.graphPath ? path.relative(target, result.graphPath) : "missing"}\`
- Nodes: ${result.nodes || 0}
- Edges: ${result.edges || 0}
- Test files detected: ${result.testFiles?.length || 0}

## High Coupling Nodes

${result.highCoupling?.length ? result.highCoupling.map(([id, score]) => `- \`${id}\`: degree ${score}`).join("\n") : `- ${result.reason || "None"}`}

## Entry-Like Nodes

${result.entryPoints?.length ? result.entryPoints.map(([id, score]) => `- \`${id}\`: outgoing ${score}, incoming 0`).join("\n") : "- None"}

## Test Surface

${result.testFiles?.length ? result.testFiles.slice(0, 30).map((item) => `- \`${item}\``).join("\n") : "- No test files detected by naming convention."}

## Risk Rule

- High-coupling or entry-like nodes should receive stronger review, focused tests, and citation-backed specification checks before implementation is marked complete.
`;
  fs.writeFileSync(outPath, content);
  return outPath;
}

function writeGraphFreshnessReport(target, freshness) {
  const paths = graphArtifactPaths(target);
  const outPath = path.join(path.dirname(paths.planningGraph), "GRAPH_FRESHNESS.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const content = `# Graph Freshness

Generated: ${new Date().toISOString()}

## Summary

- State: ${freshness.state}
- Message: ${freshness.message}
- Graph: ${freshness.graph?.label || "missing"}
- Newest source: ${freshness.newest ? `\`${freshness.newest.path}\` (${freshness.newest.modified})` : "unknown"}

## Gate Rule

- \`fresh\`: graph evidence can be used.
- \`stale\`: graph evidence cannot be used as completion proof until \`zl-graph-build --run\` refreshes it.
- \`missing\`: run \`zl-graph-build --target <repo>\`.
`;
  fs.writeFileSync(outPath, content);
  return outPath;
}

function cockpitPaths(target) {
  const cockpitDir = path.join(target, ".planning", "cockpit");
  return {
    cockpitDir,
    indexHtml: path.join(cockpitDir, "index.html"),
    dataJson: path.join(cockpitDir, "cockpit-data.json"),
    reportMd: path.join(cockpitDir, "COCKPIT_REPORT.md"),
    assetsDir: path.join(cockpitDir, "assets"),
    graphifyAssetsDir: path.join(cockpitDir, "assets", "graphify"),
  };
}

function cockpitEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cockpitScrubExternalUrls(value) {
  return String(value ?? "")
    .replace(/https?:\/\/[^\s"'<>)]*/gi, "[external-url-redacted]")
    .replace(/\/\/[A-Za-z0-9.-]+\.[A-Za-z]{2,}[^\s"'<>)]*/g, "[external-url-redacted]");
}

function cockpitReadTextIfExists(filePath, maxChars = 2000) {
  if (!filePath || !fs.existsSync(filePath)) return "";
  try {
    return cockpitScrubExternalUrls(limitedText(fs.readFileSync(filePath, "utf8"), maxChars));
  } catch {
    return "";
  }
}

function cockpitArtifact(target, relativePath, options = {}) {
  const filePath = path.join(target, relativePath);
  if (!fs.existsSync(filePath)) {
    return {
      path: relativePath,
      exists: false,
      status: options.missingStatus || "missing",
      summary: options.missingSummary || "missing",
    };
  }
  const stat = fs.statSync(filePath);
  return {
    path: relativePath,
    exists: true,
    status: "present",
    modified: stat.mtime.toISOString(),
    bytes: stat.size,
    summary: cockpitReadTextIfExists(filePath, options.maxChars || 1600),
  };
}

function cockpitJsonArtifact(target, relativePath) {
  const filePath = path.join(target, relativePath);
  const artifact = cockpitArtifact(target, relativePath, { maxChars: 800 });
  if (!artifact.exists) return artifact;
  artifact.data = readJsonIfExists(filePath);
  artifact.status = artifact.data ? "present" : "invalid_json";
  return artifact;
}

function cockpitFindGraphifyHtml(target) {
  const outDir = path.join(target, "graphify-out");
  if (!fs.existsSync(outDir)) return [];
  return walkFiles(outDir, new Set([".DS_Store"]))
    .filter((filePath) => filePath.toLowerCase().endsWith(".html"))
    .sort();
}

function cockpitHtmlExternalRisks(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const risks = [];
  const patterns = [
    { id: "external-url", regex: /https?:\/\/[^\s"'<>]+/gi },
    { id: "protocol-relative-url", regex: /(?:src|href)=["']\/\/[^"']+/gi },
    { id: "remote-script", regex: /<script\b[^>]*\bsrc=["']https?:\/\/[^"']+["'][^>]*>/gi },
    { id: "remote-stylesheet", regex: /<link\b[^>]*\bhref=["']https?:\/\/[^"']+["'][^>]*>/gi },
    { id: "css-import", regex: /@import\s+["']https?:\/\/[^"']+["']/gi },
  ];
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern.regex)].map((match) => cockpitScrubExternalUrls(match[0]).slice(0, 180));
    for (const match of matches) risks.push({ id: pattern.id, match });
  }
  return risks;
}

function cockpitCopySafeGraphifyHtml(target, outDir) {
  const htmlFiles = cockpitFindGraphifyHtml(target);
  const copied = [];
  const blocked = [];
  fs.mkdirSync(outDir, { recursive: true });
  for (const filePath of htmlFiles) {
    const risks = cockpitHtmlExternalRisks(filePath);
    const relativeSource = path.relative(target, filePath);
    if (risks.length > 0) {
      blocked.push({ source: relativeSource, risks });
      continue;
    }
    const destination = path.join(outDir, path.basename(filePath));
    fs.copyFileSync(filePath, destination);
    copied.push({
      source: relativeSource,
      copiedTo: path.relative(target, destination),
      cockpitHref: path.relative(path.join(target, ".planning", "cockpit"), destination),
    });
  }
  return { discovered: htmlFiles.map((filePath) => path.relative(target, filePath)), copied, blocked };
}

function cockpitLoadGraph(target) {
  const candidates = [
    path.join(target, ".planning", "graphs", "graph.json"),
    path.join(target, "graphify-out", "graph.json"),
  ];
  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    try {
      return {
        path: path.relative(target, filePath),
        graph: JSON.parse(fs.readFileSync(filePath, "utf8")),
      };
    } catch {
      return { path: path.relative(target, filePath), graph: null, invalid: true };
    }
  }
  return { path: null, graph: null };
}

function cockpitGraphPreview(target) {
  const loaded = cockpitLoadGraph(target);
  if (!loaded.graph) {
    return {
      available: false,
      mode: "missing",
      graphPath: loaded.path,
      invalid: Boolean(loaded.invalid),
      totalNodes: 0,
      totalEdges: 0,
      nodes: [],
      edges: [],
      legend: [],
    };
  }
  const { nodes, edges } = graphData(loaded.graph);
  const degree = new Map();
  for (const edge of edges) {
    const endpoints = graphEdgeEndpoints(edge);
    if (!endpoints.source || !endpoints.target) continue;
    degree.set(endpoints.source, (degree.get(endpoints.source) || 0) + 1);
    degree.set(endpoints.target, (degree.get(endpoints.target) || 0) + 1);
  }
  const normalizedNodes = nodes.map((node, index) => {
    const id = graphNodeId(node, index);
    return {
      id,
      label: cockpitGraphNodeLabel(node, id),
      kind: cockpitGraphNodeKind(node),
      community: cockpitGraphNodeCommunity(node),
      sourceFile: String(node?.source_file || node?.file || node?.path || ""),
      degree: degree.get(id) || 0,
      summary: cockpitGraphNodeSummary(node),
    };
  });
  if (nodes.length > 80) {
    return cockpitAggregatedGraphPreview(loaded.path, normalizedNodes, edges);
  }
  const limitedNodes = normalizedNodes
    .sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id))
    .slice(0, 36)
    .map((node, index) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, Math.min(nodes.length, 36));
      const radius = index === 0 ? 0 : 132 + ((index % 4) * 22);
      return {
        ...node,
        label: node.label.slice(0, 42),
        x: Math.round(280 + Math.cos(angle) * radius),
        y: Math.round(180 + Math.sin(angle) * radius),
      };
    });
  const nodeIds = new Set(limitedNodes.map((node) => node.id));
  const limitedEdges = edges
    .map((edge) => ({
      ...graphEdgeEndpoints(edge),
      relation: cockpitGraphEdgeRelation(edge),
      confidence: cockpitGraphEdgeConfidence(edge),
    }))
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .slice(0, 90);
  return {
    available: true,
    mode: nodes.length > limitedNodes.length ? "sampled-node" : "node",
    graphPath: loaded.path,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodes: limitedNodes,
    edges: limitedEdges,
    legend: cockpitGraphLegend(limitedNodes),
  };
}

function cockpitGraphNodeLabel(node, id) {
  return String(node?.label || node?.name || node?.qualified_name || node?.title || id);
}

function cockpitGraphNodeKind(node) {
  return String(node?.kind || node?.type || node?.node_type || node?.category || node?.file_type || "node").slice(0, 32);
}

function cockpitGraphNodeCommunity(node) {
  const raw = node?.community_name || node?.community || node?.community_id || node?.cluster || node?.group;
  if (raw !== undefined && raw !== null && raw !== "") return `community:${raw}`;
  const kind = cockpitGraphNodeKind(node);
  if (kind && kind !== "node") return `kind:${kind}`;
  const source = String(node?.source_file || node?.file || node?.path || "");
  const top = source.split(/[\\/]/).filter(Boolean)[0];
  return top ? `path:${top}` : "unknown";
}

function cockpitGraphNodeSummary(node) {
  const parts = [
    node?.source_file || node?.file || node?.path,
    node?.kind || node?.type || node?.node_type || node?.category,
    node?.community_name || node?.community,
  ].filter(Boolean);
  return parts.join(" / ").slice(0, 180);
}

function cockpitGraphEdgeRelation(edge) {
  return String(edge?.relation || edge?.type || edge?.kind || edge?.label || "relates").slice(0, 48);
}

function cockpitGraphEdgeConfidence(edge) {
  return String(edge?.confidence || edge?.evidence || edge?.provenance || "EXTRACTED").toUpperCase().slice(0, 32);
}

function cockpitGraphLegend(nodes) {
  const counts = new Map();
  for (const node of nodes) counts.set(node.community, (counts.get(node.community) || 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([id, count], index) => ({
      id,
      label: id.replace(/^(community|kind|path):/, ""),
      count,
      colorIndex: index % 10,
    }));
}

function cockpitAggregatedGraphPreview(graphPath, nodes, edges) {
  const groups = new Map();
  for (const node of nodes) {
    if (!groups.has(node.community)) {
      groups.set(node.community, {
        id: node.community,
        label: node.community.replace(/^(community|kind|path):/, "").slice(0, 42),
        kind: "community",
        community: node.community,
        sourceFile: "",
        degree: 0,
        summary: "Aggregated community node",
        members: 0,
      });
    }
    const group = groups.get(node.community);
    group.members += 1;
    group.degree += node.degree || 0;
  }
  const nodeCommunity = new Map(nodes.map((node) => [node.id, node.community]));
  const edgeCounts = new Map();
  for (const edge of edges) {
    const endpoints = graphEdgeEndpoints(edge);
    const source = nodeCommunity.get(endpoints.source);
    const target = nodeCommunity.get(endpoints.target);
    if (!source || !target || source === target) continue;
    const key = [source, target].sort().join("::");
    const previous = edgeCounts.get(key) || { source, target, count: 0, relations: new Set(), confidence: "AGGREGATED" };
    previous.count += 1;
    previous.relations.add(cockpitGraphEdgeRelation(edge));
    edgeCounts.set(key, previous);
  }
  const limitedNodes = [...groups.values()]
    .sort((a, b) => b.members - a.members || a.id.localeCompare(b.id))
    .slice(0, 28)
    .map((node, index, list) => {
      const angle = (Math.PI * 2 * index) / Math.max(1, list.length);
      const radius = index === 0 ? 0 : 132 + ((index % 4) * 22);
      return {
        ...node,
        x: Math.round(280 + Math.cos(angle) * radius),
        y: Math.round(180 + Math.sin(angle) * radius),
      };
    });
  const visible = new Set(limitedNodes.map((node) => node.id));
  const limitedEdges = [...edgeCounts.values()]
    .filter((edge) => visible.has(edge.source) && visible.has(edge.target))
    .sort((a, b) => b.count - a.count)
    .slice(0, 70)
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      relation: `${edge.count} links`,
      confidence: edge.confidence,
      relations: [...edge.relations].slice(0, 5),
    }));
  return {
    available: true,
    mode: "aggregated-community",
    graphPath,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodes: limitedNodes,
    edges: limitedEdges,
    legend: cockpitGraphLegend(limitedNodes),
  };
}

function cockpitRenderGraphSvg(preview) {
  if (!preview.available || preview.nodes.length === 0) {
    return `<div class="empty-graph">Graphify graph.json missing. Run <code>zl-graph-build --target "$PWD" --run</code> when a fresh map is needed.</div>`;
  }
  const byId = new Map(preview.nodes.map((node) => [node.id, node]));
  const edgeLines = preview.edges.map((edge) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) return "";
    return `<line x1="${source.x}" y1="${source.y}" x2="${target.x}" y2="${target.y}" />`;
  }).join("\n");
  const nodeGroups = preview.nodes.map((node, index) => {
    const accent = index === 0 ? "main" : index % 3 === 0 ? "risk" : "normal";
    return `<g class="graph-node ${accent}" transform="translate(${node.x} ${node.y})">
      <circle r="${index === 0 ? 13 : 9}"></circle>
      <text x="14" y="4">${cockpitEscapeHtml(node.label)}</text>
    </g>`;
  }).join("\n");
  return `<svg class="cockpit-graph" viewBox="0 0 560 360" role="img" aria-label="Graphify impact graph">
    <g class="graph-edges">${edgeLines}</g>
    <g>${nodeGroups}</g>
  </svg>`;
}

function cockpitStatusFromArtifacts(artifacts, options = {}) {
  const required = options.required || [];
  const missing = required.filter((key) => !artifacts[key]?.exists);
  if (missing.length > 0) return options.missingStatus || "WAIVED_WITH_RISK";
  return "PASS";
}

function cockpitCollectData(target) {
  const paths = cockpitPaths(target);
  const graphStatusValue = graphStatus(target);
  const graphFreshnessValue = graphFreshness(target, graphStatusValue);
  const graphPreview = cockpitGraphPreview(target);
  const graphifyHtml = cockpitCopySafeGraphifyHtml(target, paths.graphifyAssetsDir);
  const graphifyArtifacts = {
    planningGraph: cockpitJsonArtifact(target, ".planning/graphs/graph.json"),
    graphifyGraph: cockpitJsonArtifact(target, "graphify-out/graph.json"),
    planningReport: cockpitArtifact(target, ".planning/graphs/GRAPH_REPORT.md"),
    impact: cockpitArtifact(target, ".planning/graphs/GRAPH_IMPACT.md"),
    risk: cockpitArtifact(target, ".planning/graphs/GRAPH_RISK.md"),
    freshness: cockpitArtifact(target, ".planning/graphs/GRAPH_FRESHNESS.md"),
  };
  const ragArtifacts = {
    docsSync: cockpitArtifact(target, ".planning/knowledge/DOCS_SYNC.md"),
    docsSyncJson: cockpitJsonArtifact(target, ".planning/knowledge/DOCS_SYNC.json"),
    ragIndex: cockpitArtifact(target, ".planning/knowledge/RAG_INDEX_RESULT.md"),
    ragQuery: cockpitArtifact(target, ".planning/knowledge/RAG_QUERY_RESULT.md"),
    docsQuery: cockpitArtifact(target, ".planning/knowledge/DOCS_QUERY_RESULT.md"),
    answerAudit: cockpitArtifact(target, ".planning/quality/ANSWER_AUDIT.md"),
    answerAuditJson: cockpitJsonArtifact(target, ".planning/quality/ANSWER_AUDIT.json"),
    citationAudit: cockpitArtifact(target, ".planning/quality/CITATION_AUDIT.md"),
    citationAuditJson: cockpitJsonArtifact(target, ".planning/quality/CITATION_AUDIT.json"),
  };
  const qualityArtifacts = {
    ambiguityAudit: cockpitJsonArtifact(target, ".planning/quality/AMBIGUITY_AUDIT.json"),
    structureAudit: cockpitJsonArtifact(target, ".planning/quality/STRUCTURE_AUDIT.json"),
    tokenUsage: cockpitJsonArtifact(target, ".planning/metrics/TOKEN_USAGE.json"),
    qualityClosure: cockpitJsonArtifact(target, "verification/reports/quality-closure-check.json"),
    skillsUsability: cockpitJsonArtifact(target, "verification/reports/skills-usability-check.json"),
    workflowClosure: cockpitJsonArtifact(target, "verification/reports/workflow-closure-check.json"),
    docsCompleteness: cockpitJsonArtifact(target, "verification/reports/docs-completeness-check.json"),
    fullCommandSurface: cockpitJsonArtifact(target, "verification/reports/full-command-surface-check.json"),
  };
  const privacyArtifacts = {
    offlineLock: cockpitJsonArtifact(target, ".planning/privacy/OFFLINE_LOCK.json"),
    policyVerify: cockpitJsonArtifact(target, ".planning/policies/POLICY_VERIFY.json"),
    privacyAudit: cockpitArtifact(target, ".planning/knowledge/PRIVACY_AUDIT.md"),
  };
  const workflowStates = fs.existsSync(path.join(target, ".planning", "workflows"))
    ? walkFiles(path.join(target, ".planning", "workflows"), new Set([".DS_Store"]))
      .filter((filePath) => path.basename(filePath) === "WORKFLOW_STATE.json")
      .map((filePath) => ({
        path: path.relative(target, filePath),
        data: readJsonIfExists(filePath),
      }))
      .filter((item) => item.data)
      .slice(-12)
    : [];
  const evidenceIndex = cockpitArtifact(target, ".planning/evidence/INDEX.md");
  const issues = [];
  if (graphifyHtml.blocked.length > 0) {
    issues.push({
      severity: "WARN",
      area: "graphify",
      message: "Graphify HTML contains external URL/CDN references; cockpit did not copy it.",
    });
  }
  if (!graphPreview.available) {
    issues.push({ severity: "WARN", area: "graphify", message: "Graphify graph.json missing; fallback graph cannot render." });
  }
  if (cockpitStatusFromArtifacts(ragArtifacts, { required: ["ragQuery", "docsQuery"], missingStatus: "WAIVED_WITH_RISK" }) !== "PASS") {
    issues.push({ severity: "WARN", area: "rag", message: "RAG query/docs query evidence missing; Knowledge Evidence is WAIVED_WITH_RISK." });
  }
  if (!privacyArtifacts.offlineLock.exists) {
    issues.push({ severity: "WARN", area: "privacy", message: "Offline lock report missing; cockpit can display status but cannot prove local-only lock." });
  }
  const status = issues.some((issue) => issue.severity === "FAIL") ? "FAIL" : issues.length > 0 ? "WARN" : "PASS";
  const answerMetrics = ragArtifacts.answerAuditJson.data?.metrics || {};
  const ambiguityMetrics = qualityArtifacts.ambiguityAudit.data || {};
  const structureMetrics = qualityArtifacts.structureAudit.data || {};
  const tokenMetrics = qualityArtifacts.tokenUsage.data || {};
  return {
    generatedAt: new Date().toISOString(),
    status,
    target,
    heavyRefreshExecuted: false,
    graphify: {
      status: graphPreview.available ? graphFreshnessValue.state === "stale" ? "STALE_NEEDS_REFRESH" : "PASS" : "WAIVED_WITH_RISK",
      html: graphifyHtml,
      freshness: graphFreshnessValue,
      stats: graphStatusValue,
      preview: graphPreview,
      artifacts: graphifyArtifacts,
    },
    rag: {
      status: cockpitStatusFromArtifacts(ragArtifacts, { required: ["ragQuery", "docsQuery"], missingStatus: "WAIVED_WITH_RISK" }),
      artifacts: ragArtifacts,
    },
    workflow: {
      status: workflowStates.length > 0 ? "PASS" : "WAIVED_WITH_RISK",
      states: workflowStates,
      evidenceIndex,
    },
    quality: {
      status: Object.values(qualityArtifacts).some((item) => item.exists && item.data?.status === "FAIL") ? "FAIL" : "PASS",
      artifacts: qualityArtifacts,
      metrics: {
        citationResolveRate: answerMetrics.citation_resolve_rate ?? null,
        valueDriftCount: answerMetrics.value_drift_count ?? null,
        unsupportedSentenceRatio: answerMetrics.unsupported_sentence_ratio ?? null,
        ambiguityHits: ambiguityMetrics.ambiguity_hits ?? null,
        ambiguityDensity: ambiguityMetrics.ambiguity_density ?? null,
        structureComplianceRate: structureMetrics.structure_compliance_rate ?? null,
        tokenUsage: {
          available: qualityArtifacts.tokenUsage.exists,
          input: tokenMetrics.input_tokens ?? null,
          output: tokenMetrics.output_tokens ?? null,
          cacheRead: tokenMetrics.cache_read_tokens ?? null,
          cacheWrite: tokenMetrics.cache_write_tokens ?? null,
        },
      },
    },
    privacy: {
      status: privacyArtifacts.offlineLock.exists ? "PASS" : "WAIVED_WITH_RISK",
      artifacts: privacyArtifacts,
    },
    issues,
  };
}

function cockpitTemplatePath() {
  return path.join(kitRoot, "templates", "cockpit", "index.template.html");
}

function cockpitJsonForHtmlScript(data) {
  return JSON.stringify(data, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function cockpitRenderHtml(data) {
  const templateFile = cockpitTemplatePath();
  requireFile(templateFile, "Cockpit template");
  const template = fs.readFileSync(templateFile, "utf8");
  const html = template.replace("__ZHULONG_COCKPIT_DATA__", cockpitJsonForHtmlScript(data));
  if (html.includes("__ZHULONG_COCKPIT_DATA__")) {
    throw new Error("Cockpit template placeholder was not replaced.");
  }
  return html;
}

function cockpitNextCommands(data) {
  const commands = [];
  if (!data.graphify.preview.available) commands.push('zl-graph-build --target "$PWD" --run');
  if (data.graphify.status === "STALE_NEEDS_REFRESH") commands.push('zl-refresh-plan --target "$PWD" && zl-refresh-run --target "$PWD" --graph');
  if (data.rag.status !== "PASS") commands.push('zl-docs-sync --target "$PWD"');
  if (!data.rag.artifacts.answerAudit.exists) commands.push('zl-answer-audit --target "$PWD"');
  if (!data.privacy.artifacts.offlineLock.exists) commands.push('zl-offline-lock --target "$PWD"');
  if (commands.length === 0) commands.push("# No recovery command required.");
  return uniqueList(commands);
}

function cockpitEvidenceStep(id, label, status, detail, artifact) {
  return {
    id,
    label,
    status,
    detail,
    path: artifact?.path || "",
    exists: Boolean(artifact?.exists),
    summary: artifact?.summary || "",
  };
}

function cockpitArtifactGroup(id, label, artifacts) {
  return {
    id,
    label,
    rows: Object.entries(artifacts || {}).map(([key, artifact]) => ({
      key,
      path: artifact?.exists ? artifact.path : `${artifact?.path || "missing"} (missing)`,
      exists: Boolean(artifact?.exists),
      status: artifact?.exists ? artifact.status || "present" : artifact?.status || "missing",
      summary: artifact?.summary || artifact?.data?.status || "",
    })),
  };
}

function cockpitViewModel(data) {
  const graph = data.graphify.preview;
  return {
    version: "cockpit-viewmodel.v1",
    summary: [
      {
        id: "graphify",
        label: "Graphify Impact",
        status: data.graphify.status,
        detail: `${graph.totalNodes || 0} nodes / ${graph.totalEdges || 0} edges / ${graph.mode || "missing"}`,
      },
      {
        id: "knowledge",
        label: "Knowledge Evidence",
        status: data.rag.status,
        detail: "docs / citation / RAG / answer audit",
      },
      {
        id: "workflow",
        label: "Workflow",
        status: data.workflow.status,
        detail: `${data.workflow.states.length} workflow states`,
      },
      {
        id: "privacy",
        label: "Privacy",
        status: data.privacy.status,
        detail: "local-only / offline lock",
      },
    ],
    qualityMetrics: [
      { label: "Citation Resolve", value: data.quality.metrics.citationResolveRate ?? "N/A", detail: "resolved citations / all citations" },
      { label: "Value Drift", value: data.quality.metrics.valueDriftCount ?? "N/A", detail: "numeric values absent from cited sources" },
      { label: "Unsupported", value: data.quality.metrics.unsupportedSentenceRatio ?? "N/A", detail: "unsupported sentence ratio" },
      { label: "Ambiguity", value: data.quality.metrics.ambiguityHits ?? "N/A", detail: `density ${data.quality.metrics.ambiguityDensity ?? "N/A"}` },
      { label: "Structure", value: data.quality.metrics.structureComplianceRate ?? "N/A", detail: "valid key artifacts / required artifacts" },
      { label: "Token Usage", value: data.quality.metrics.tokenUsage.available ? data.quality.metrics.tokenUsage.input + data.quality.metrics.tokenUsage.output : "N/A", detail: data.quality.metrics.tokenUsage.available ? "input + output tokens" : "optional TOKEN_USAGE.json not present" },
    ],
    impactGraph: graph,
    evidenceChain: [
      cockpitEvidenceStep("docs", "Docs", data.rag.artifacts.docsSync.exists ? "PASS" : "WAIVED_WITH_RISK", "docs sync", data.rag.artifacts.docsSync),
      cockpitEvidenceStep("citation", "Citation", data.rag.artifacts.citationAudit.exists ? "PASS" : "WAIVED_WITH_RISK", "source check", data.rag.artifacts.citationAudit),
      cockpitEvidenceStep("rag", "RAG Query", data.rag.artifacts.ragQuery.exists || data.rag.artifacts.docsQuery.exists ? "PASS" : "WAIVED_WITH_RISK", "retrieval", data.rag.artifacts.ragQuery.exists ? data.rag.artifacts.ragQuery : data.rag.artifacts.docsQuery),
      cockpitEvidenceStep("answer", "Answer Audit", data.rag.artifacts.answerAudit.exists ? "PASS" : "WAIVED_WITH_RISK", "claim support", data.rag.artifacts.answerAudit),
      cockpitEvidenceStep("evidence", "Evidence", data.workflow.evidenceIndex.exists ? "PASS" : "WAIVED_WITH_RISK", "writeback", data.workflow.evidenceIndex),
    ],
    workflowRows: data.workflow.states.map((item) => ({
      id: item.data?.id || item.path || "-",
      workflow: item.data?.workflow || "-",
      status: item.data?.status || "UNKNOWN",
      path: item.path,
    })),
    artifactGroups: [
      cockpitArtifactGroup("graphify", "Graphify Artifacts", data.graphify.artifacts),
      cockpitArtifactGroup("rag", "GraphRAG / RAG", data.rag.artifacts),
      cockpitArtifactGroup("quality", "Quality Closure", data.quality.artifacts),
      cockpitArtifactGroup("privacy", "Privacy", data.privacy.artifacts),
    ],
    issues: data.issues,
    nextCommands: data.nextCommands || cockpitNextCommands(data),
  };
}

function cockpitWriteReport(target, data) {
  const paths = cockpitPaths(target);
  const content = `# Zhulong Project Cockpit

Generated: ${data.generatedAt}

## Summary

- Status: ${data.status}
- Target: \`${target}\`
- Heavy refresh executed: no
- HTML: \`${path.relative(target, paths.indexHtml)}\`
- Data: \`${path.relative(target, paths.dataJson)}\`

## Graphify

- Status: ${data.graphify.status}
- Graph source: \`${data.graphify.preview.graphPath || "missing"}\`
- Preview nodes: ${data.graphify.preview.nodes.length}
- Preview edges: ${data.graphify.preview.edges.length}
- Graphify HTML copied: ${data.graphify.html.copied.length}
- Graphify HTML blocked: ${data.graphify.html.blocked.length}

## GraphRAG / RAG

- Status: ${data.rag.status}
- Docs sync: ${data.rag.artifacts.docsSync.exists ? "present" : "missing"}
- RAG query: ${data.rag.artifacts.ragQuery.exists ? "present" : "missing"}
- Answer audit: ${data.rag.artifacts.answerAudit.exists ? "present" : "missing"}
- Citation audit: ${data.rag.artifacts.citationAudit.exists ? "present" : "missing"}

## Workflow / Quality / Privacy

- Workflow states: ${data.workflow.states.length}
- Quality status: ${data.quality.status}
- Privacy status: ${data.privacy.status}

## Quality & Token Metrics

- Citation resolve rate: ${data.quality.metrics.citationResolveRate ?? "N/A"}
- Value drift count: ${data.quality.metrics.valueDriftCount ?? "N/A"}
- Unsupported sentence ratio: ${data.quality.metrics.unsupportedSentenceRatio ?? "N/A"}
- Ambiguity hits: ${data.quality.metrics.ambiguityHits ?? "N/A"}
- Structure compliance rate: ${data.quality.metrics.structureComplianceRate ?? "N/A"}
- Token usage available: ${data.quality.metrics.tokenUsage.available ? "yes" : "no"}

## Issues

${data.issues.length ? data.issues.map((issue) => `- ${issue.severity} ${issue.area}: ${issue.message}`).join("\n") : "- None"}

## Next Commands

${cockpitNextCommands(data).map((command) => `- \`${command}\``).join("\n")}
`;
  fs.writeFileSync(paths.reportMd, content);
  return paths.reportMd;
}

function cockpitBuild(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const paths = cockpitPaths(target);
  fs.mkdirSync(paths.cockpitDir, { recursive: true });
  fs.mkdirSync(paths.assetsDir, { recursive: true });
  const data = cockpitCollectData(target);
  data.template = {
    mode: "live",
    source: "templates/cockpit/index.template.html",
    sampleData: "templates/cockpit/sample-data.json",
    sampleHtml: "templates/cockpit/sample.html",
  };
  data.nextCommands = cockpitNextCommands(data);
  data.viewModel = cockpitViewModel(data);
  writeJsonFile(paths.dataJson, data);
  fs.writeFileSync(paths.indexHtml, cockpitRenderHtml(data));
  cockpitWriteReport(target, data);
  console.log(`cockpit build ${data.status}`);
  console.log("heavy refresh executed: no");
  console.log(`output ${path.relative(target, paths.indexHtml)}`);
}

function tracePaths(target) {
  const traceDir = path.join(target, ".planning", "trace");
  return {
    traceDir,
    matrixJson: path.join(traceDir, "TRACE_MATRIX.json"),
    matrixMd: path.join(traceDir, "TRACE_MATRIX.md"),
    auditMd: path.join(traceDir, "TRACE_AUDIT.md"),
  };
}

function buildTraceMatrix(target) {
  const paths = tracePaths(target);
  fs.mkdirSync(paths.traceDir, { recursive: true });
  const documentIndex = loadDocumentIndex(target);
  const docs = documentIndex?.documents || [];
  const loadedGraph = loadPrimaryGraph(target);
  const graph = loadedGraph.graph ? graphData(loadedGraph.graph) : { nodes: [], edges: [], nodeMap: new Map() };
  const tests = walkFiles(target, CODE_MAP_IGNORE_NAMES)
    .filter((filePath) => /\.(test|spec)\.[jt]sx?$|__tests__/i.test(filePath))
    .map((filePath) => path.relative(target, filePath));
  const evidenceRecords = evidenceRecordFiles(target).map((filePath) => path.relative(target, filePath));
  const citationText = fs.existsSync(documentIndexPaths(target).citationsPath)
    ? fs.readFileSync(documentIndexPaths(target).citationsPath, "utf8")
    : "";
  const citations = parseCitationRecords(citationText);

  const rows = [];
  const addRow = (kind, id, fields = {}) => rows.push({ kind, id, ...fields });

  for (const doc of docs) {
    addRow("document", doc.path, {
      source: doc.path,
      extracted: Boolean(doc.extracted),
      hash: doc.sha256,
      citations: citations.filter((citation) => citation.sourcePath === doc.path).length,
    });
  }
  for (const node of graph.nodes) {
    const id = graphNodeId(node, rows.length);
    addRow("code", id, {
      source: node.path || node.file || id,
      degree: graph.edges.filter((edge) => {
        const endpoints = graphEdgeEndpoints(edge);
        return endpoints.source === id || endpoints.target === id;
      }).length,
    });
  }
  for (const test of tests) addRow("test", test, { source: test });
  for (const evidence of evidenceRecords) addRow("evidence", evidence, { source: evidence });

  const matrix = {
    generatedAt: new Date().toISOString(),
    rows,
    summary: {
      documents: docs.length,
      citations: citations.length,
      codeNodes: graph.nodes.length,
      graphEdges: graph.edges.length,
      tests: tests.length,
      evidence: evidenceRecords.length,
    },
  };
  writeJsonFile(paths.matrixJson, matrix);
  const content = `# Trace Matrix

Generated: ${matrix.generatedAt}

## Summary

- Documents: ${matrix.summary.documents}
- Citations: ${matrix.summary.citations}
- Code nodes: ${matrix.summary.codeNodes}
- Graph edges: ${matrix.summary.graphEdges}
- Tests: ${matrix.summary.tests}
- Evidence records: ${matrix.summary.evidence}

## Rows

| Kind | ID | Source | Notes |
| --- | --- | --- | --- |
${rows.length ? rows.map((row) => `| ${row.kind} | \`${markdownCell(row.id)}\` | \`${markdownCell(row.source || "")}\` | ${markdownCell(row.extracted !== undefined ? `extracted=${row.extracted}; citations=${row.citations || 0}` : row.degree !== undefined ? `degree=${row.degree}` : "")} |`).join("\n") : "| None | - | - | - |"}
`;
  fs.writeFileSync(paths.matrixMd, content);
  return { matrix, paths };
}

function loadTraceMatrix(target) {
  const paths = tracePaths(target);
  if (!fs.existsSync(paths.matrixJson)) return null;
  try {
    return JSON.parse(fs.readFileSync(paths.matrixJson, "utf8"));
  } catch {
    return null;
  }
}

function traceBuildCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const result = buildTraceMatrix(target);
  console.log(`write ${result.paths.matrixJson}`);
  console.log(`write ${result.paths.matrixMd}`);
  console.log(`trace rows ${result.matrix.rows.length}`);
}

function traceQuery(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const query = args._.slice(1).join(" ").trim();
  if (!query) {
    console.log('missing query. Run: zl-trace-query --target <repo> "<keyword>"');
    process.exitCode = 1;
    return;
  }
  const matrix = loadTraceMatrix(target);
  if (!matrix) {
    console.log("missing .planning/trace/TRACE_MATRIX.json");
    console.log("Run: zl-trace-build --target <repo>");
    process.exitCode = 1;
    return;
  }
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = matrix.rows.filter((row) => {
    const text = JSON.stringify(row).toLowerCase();
    return terms.some((term) => text.includes(term));
  });
  console.log(`Trace query: ${query}`);
  for (const match of matches.slice(0, 20)) {
    console.log(`- ${match.kind} ${match.id} ${match.source || ""}`.trim());
  }
  if (matches.length === 0) console.log("No trace matches.");
}

function traceAudit(target) {
  const paths = tracePaths(target);
  const matrix = loadTraceMatrix(target);
  const issues = [];
  if (!matrix) {
    issues.push("TRACE_MATRIX.json is missing or invalid.");
  } else {
    if ((matrix.summary?.documents || 0) === 0) issues.push("trace matrix has no documents");
    if ((matrix.summary?.codeNodes || 0) === 0) issues.push("trace matrix has no code nodes");
    if ((matrix.summary?.evidence || 0) === 0) issues.push("trace matrix has no evidence records");
  }
  fs.mkdirSync(paths.traceDir, { recursive: true });
  const content = `# Trace Audit

Generated: ${new Date().toISOString()}

## Summary

- Status: ${issues.length === 0 ? "PASS" : "FAIL"}
- Issues: ${issues.length}

## Issues

${issues.length ? issues.map((issue) => `- ${issue}`).join("\n") : "No trace issues found."}
`;
  fs.writeFileSync(paths.auditMd, content);
  return { ok: issues.length === 0, issues, outPath: paths.auditMd };
}

function traceAuditCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const result = traceAudit(target);
  console.log(`trace audit ${result.ok ? "PASS" : "FAIL"}`);
  console.log(`write ${result.outPath}`);
  for (const issue of result.issues) console.log(`FAIL ${issue}`);
  process.exitCode = result.ok ? 0 : 1;
}

function formatGraphDiff(diff, options = {}) {
  const lines = [
    `- Nodes: +${diff.nodes.added.length} / -${diff.nodes.removed.length}`,
    `- Edges: +${diff.edges.added.length} / -${diff.edges.removed.length}`,
    `- Hyperedges: +${diff.hyperedges.added.length} / -${diff.hyperedges.removed.length}`,
  ];
  if (options.details) {
    for (const [label, value] of [["Node", diff.nodes], ["Edge", diff.edges], ["Hyperedge", diff.hyperedges]]) {
      for (const item of value.added.slice(0, 20)) lines.push(`  + ${label}: ${item}`);
      for (const item of value.removed.slice(0, 20)) lines.push(`  - ${label}: ${item}`);
    }
  }
  return lines.join("\n");
}

function writeGraphDiff(target, diff) {
  const paths = graphArtifactPaths(target);
  const generatedAt = new Date().toISOString();
  const content = `# Graph Diff

Generated: ${generatedAt}

Baseline: \`${path.relative(target, paths.planningBaseline)}\`
Current: \`${path.relative(target, paths.planningGraph)}\`

## Summary

${formatGraphDiff(diff, { details: true })}
`;
  fs.writeFileSync(paths.planningDiffResult, content);
  return paths.planningDiffResult;
}

function slugify(input, fallback = "request") {
  const slug = String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

function readOptional(target, relativePath) {
  const filePath = path.join(target, relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return { relativePath, exists: false, text: "" };
  }
  return { relativePath, exists: true, text: fs.readFileSync(filePath, "utf8") };
}

function excerpt(text, maxLines = 40) {
  const lines = text.split(/\r?\n/);
  const shown = lines.slice(0, maxLines).join("\n");
  if (lines.length <= maxLines) return shown;
  return `${shown}\n\n... (${lines.length - maxLines} more lines)`;
}

function packetSourceBlock(title, file, maxLines = 40) {
  if (!file.exists) {
    return `### ${title}\n\n- Missing: \`${file.relativePath}\`\n`;
  }
  return `### ${title}\n\nSource: \`${file.relativePath}\`\n\n\`\`\`markdown\n${excerpt(file.text, maxLines)}\n\`\`\`\n`;
}

function routeForPacketKind(kind) {
  return Object.values(WORKFLOW_COMMANDS).find((item) => item.packetKind === kind) || WORKFLOW_COMMANDS.debug;
}

function referenceInvocation(route, request) {
  if (!route.referenceCommand) return "None";
  return `${route.referenceCommand}${request ? ` ${request}` : ""}`;
}

function writeContextPacket(target, kind, request, route = routeForPacketKind(kind)) {
  const generatedAt = new Date().toISOString();
  const contextDir = path.join(target, ".planning", "context");
  fs.mkdirSync(contextDir, { recursive: true });

  const publicCommand = route.publicCommand;
  const slug = `${kind}-${slugify(request, "request")}`;
  const outPath = path.join(contextDir, `${slug}.md`);

  const state = readOptional(target, ".planning/STATE.md");
  const sources = readOptional(target, ".planning/knowledge/RAG_SOURCES.md");
  const docStatus = readOptional(target, ".planning/knowledge/DOC_RAG_STATUS.md");
  const glossary = readOptional(target, ".planning/knowledge/GLOSSARY.md");
  const trace = readOptional(target, ".planning/knowledge/REQUIREMENT_TRACE.md");
  const graphReport = readOptional(target, ".planning/graphs/GRAPH_REPORT.md");
  const graphStatusBlock = formatGraphStatusMarkdown(target);
  const preflightBlock = formatPreflightPacket(refreshAssessment(target));
  const structure = readOptional(target, ".planning/codebase/STRUCTURE.md");
  const architecture = readOptional(target, ".planning/codebase/ARCHITECTURE.md");
  const testing = readOptional(target, ".planning/codebase/TESTING.md");

  const content = `# Zhulong Context Packet: ${kind}

Generated: ${generatedAt}

## Request

${request || "No request text provided."}

## Command Routing

- Public command: \`${publicCommand}\`
- Workflow kernel: Zhulong native
- Workflow doc: \`${route.workflowDoc || "core/workflows/README.md"}\`
- Reference design: \`${route.referenceCommand || "None"}\` (reference only, not user-facing)

## Workflow State

${packetSourceBlock("State", state, 60)}

## Specification Context

${packetSourceBlock("Document RAG Status", docStatus, 40)}

${packetSourceBlock("RAG Sources", sources, 80)}

${packetSourceBlock("Glossary", glossary, 60)}

${packetSourceBlock("Requirement Trace", trace, 60)}

## Code Map Context

### Freshness Preflight

${preflightBlock}

### Code Map Status

${graphStatusBlock}

${packetSourceBlock("Graph Report", graphReport, 60)}

${packetSourceBlock("Structure", structure, 60)}

${packetSourceBlock("Architecture", architecture, 60)}

## Verification Context

${packetSourceBlock("Testing", testing, 60)}

## Verification Plan

- Confirm relevant specification, QA, minutes, design, API, DB, or test documents before making business-rule claims.
- Confirm impacted source files with direct reads and source search.
- If Graphify/code-map data exists, use it for entry points, call chains, and impact surface before risky edits.
- Run focused build, test, lint, typecheck, API, or manual checks appropriate to the request.
- Write decisions, evidence, risks, and follow-ups back to the relevant \`.planning/\` record.
- For non-trivial work, create a durable record with \`zl-evidence-record\`.

## Open Risks

- This packet is a starting map, not final proof.
- Missing files above indicate context that has not been initialized or scanned yet.
- MVP context packets do not perform semantic RAG or Graphify queries automatically.
`;

  fs.writeFileSync(outPath, content);
  return outPath;
}

function relativeToTarget(target, filePath) {
  return path.relative(target, filePath) || path.basename(filePath);
}

function writeWorkflowHandoff(target, route, request, packetPath) {
  const generatedAt = new Date().toISOString();
  const handoffDir = path.join(target, ".planning", "context", "handoffs");
  fs.mkdirSync(handoffDir, { recursive: true });
  const slug = `${route.handoffPrefix}-${slugify(request, "request")}`;
  const outPath = path.join(handoffDir, `${slug}-HANDOFF.md`);
  const referenceCommand = route.referenceCommand || "None";
  const referenceRun = referenceInvocation(route, request);
  const publicInvocation = `${route.publicCommand}${request ? ` ${request}` : ""}`;

  const content = `# Zhulong Workflow Handoff: ${route.publicCommand}

Generated: ${generatedAt}

## Request

${request || "No request text provided."}

## Routing

- Public command: \`${route.publicCommand}\`
- Workflow kernel: Zhulong native
- Workflow doc: \`${route.workflowDoc || "core/workflows/README.md"}\`
- Reference design: \`${referenceCommand}\` (reference only, not user-facing)
- Context packet: \`${relativeToTarget(target, packetPath)}\`

## User-Facing Command

Use this command name in user-facing notes, summaries, reminders, and follow-up
instructions:

\`\`\`text
${publicInvocation}
\`\`\`

## Historical Reference Command

Zhulong does not require a GSD backend for this workflow. If you are comparing or
porting behavior, this is the historical reference command. Do not present this
as the command the user should run:

\`\`\`text
${referenceRun}
\`\`\`

## Runtime Instructions

1. Read the context packet before starting the workflow.
2. Preserve the public command name \`${route.publicCommand}\` in user-facing notes.
3. Follow the Zhulong native workflow contract in \`${route.workflowDoc || "core/workflows/README.md"}\`.
4. Carry specification evidence, code-map evidence, verification expectations,
   risks, and follow-ups from the context packet into the workflow record.
5. After verification, write durable evidence with \`zl-evidence-record\`
   when the work is non-trivial.
6. When suggesting next commands to the user, suggest \`${route.publicCommand}\`
   or other \`zl-*\` commands, never \`${referenceCommand}\`.

## Notes

- This handoff is deterministic and safe to generate from the CLI.
- It does not execute chat-runtime skills by itself.
- GSD is retained as reference design only; GraphRAG and Graphify enhance the
  Zhulong workflow gates.
`;

  fs.writeFileSync(outPath, content);
  return { outPath, referenceRun, publicInvocation };
}

function workflowsDir(target) {
  return path.join(target, ".planning", "workflows");
}

function workflowStatePath(target, id) {
  return path.join(workflowsDir(target), id, "WORKFLOW_STATE.json");
}

function workflowStateMarkdownPath(target, id) {
  return path.join(workflowsDir(target), id, "WORKFLOW_STATE.md");
}

function activeWorkflowPath(target) {
  return path.join(workflowsDir(target), "ACTIVE.json");
}

function workflowId(route, request) {
  return `${route.handoffPrefix}-${slugify(request, "request")}`;
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function resolveWorkflowState(target, args = {}) {
  const explicit = args.id || args.workflowId || args.workflow;
  const active = readJsonIfExists(activeWorkflowPath(target));
  const id = explicit || active?.id;
  if (!id) return null;
  return readJsonIfExists(workflowStatePath(target, id));
}

function saveWorkflowState(target, state) {
  state.updatedAt = new Date().toISOString();
  const dir = path.dirname(workflowStatePath(target, state.id));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(workflowStatePath(target, state.id), `${JSON.stringify(state, null, 2)}\n`);
  fs.writeFileSync(activeWorkflowPath(target), `${JSON.stringify({ id: state.id, workflow: state.workflow, updatedAt: state.updatedAt }, null, 2)}\n`);
  writeWorkflowStateMarkdown(target, state);
}

function writeWorkflowStateMarkdown(target, state, evaluated = null) {
  const gateRows = evaluated?.gates || evaluateWorkflowGates(target, state).gates;
  const content = `# Zhulong Workflow Guard State: ${state.id}

Generated: ${new Date().toISOString()}

## Workflow

- ID: \`${state.id}\`
- Workflow: \`${state.workflow}\`
- Status: \`${state.status}\`
- Request: ${state.request || "(none)"}
- Context packet: \`${state.contextPacket ? path.relative(target, state.contextPacket) : "missing"}\`
- Handoff: \`${state.handoff ? path.relative(target, state.handoff) : "missing"}\`

## Gates

| Gate | Status | Evidence |
| --- | --- | --- |
${gateRows.map((gate) => `| ${gate.name} | ${gate.status || (gate.ok ? "PASS" : "FAIL")} | ${markdownCell(gate.evidence || gate.reason || "")} |`).join("\n")}

## Manual Marks

${Object.entries(state.manualGates || {}).map(([gate, value]) => `- ${gate}: ${value.evidence || "(no evidence)"} (${value.markedAt})`).join("\n") || "- None"}
`;
  fs.writeFileSync(workflowStateMarkdownPath(target, state.id), content);
}

function readInitMode(target) {
  const initProfile = readOptional(target, ".planning/INIT_PROFILE.md");
  if (/Mode:\s*new/.test(initProfile.text)) return "new";
  if (/Mode:\s*existing/.test(initProfile.text)) return "existing";
  return "existing";
}

function codebaseSourceCount(target) {
  const status = readOptional(target, ".planning/codebase/CODEBASE_STATUS.md");
  const match = status.text.match(/- Source files:\s*(\d+)/);
  return match ? Number(match[1]) : null;
}

function hasSuccessfulResult(filePath) {
  if (!fs.existsSync(filePath)) return false;
  return /Status:\s*success/i.test(fs.readFileSync(filePath, "utf8"));
}

function citationSourceExists(target, text) {
  const citationPattern = /\[((?:docs|documents|仕様書|\.planning\/knowledge)\/[^\]\n]+?)\]/g;
  let match;
  while ((match = citationPattern.exec(text))) {
    const source = match[1].replace(/:\d+(?::\d+)?$/, "");
    if (fs.existsSync(path.join(target, source))) return true;
  }
  return false;
}

function hasDocumentEvidence(target) {
  const knowledgeDir = path.join(target, ".planning", "knowledge");
  const queryResultPath = path.join(knowledgeDir, "RAG_QUERY_RESULT.md");
  if (hasSuccessfulResult(queryResultPath) && citationSourceExists(target, fs.readFileSync(queryResultPath, "utf8"))) return true;

  const sourcesPath = path.join(knowledgeDir, "RAG_SOURCES.md");
  if (fs.existsSync(sourcesPath)) {
    const sources = fs.readFileSync(sourcesPath, "utf8");
    const totalMatch = sources.match(/- Total documents:\s*(\d+)/);
    const total = totalMatch ? Number(totalMatch[1]) : 0;
    if (total > 0 && !/Not scanned yet/i.test(sources)) return true;
  }

  const statusPath = path.join(knowledgeDir, "DOC_RAG_STATUS.md");
  if (fs.existsSync(statusPath)) {
    const status = fs.readFileSync(statusPath, "utf8");
    const totalMatch = status.match(/- Total source documents:\s*(\d+)/);
    const total = totalMatch ? Number(totalMatch[1]) : 0;
    if (total > 0 && !/Not scanned yet/i.test(status)) return true;
  }

  return false;
}

function hasEvidenceRecord(target) {
  const evidenceDir = path.join(target, ".planning", "evidence");
  if (!fs.existsSync(evidenceDir)) return false;
  return walkFiles(evidenceDir, new Set([".DS_Store"]))
    .some((filePath) => filePath.endsWith(".md") && !["INDEX.md", "README.md", "RECORD_TEMPLATE.md"].includes(path.basename(filePath)));
}

function hasWriteback(target) {
  const roots = [
    path.join(target, ".planning", "issues"),
    path.join(target, ".planning", "debug"),
    path.join(target, ".planning", "phases"),
  ];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const filePath of walkFiles(root, new Set([".DS_Store"]))) {
      if (filePath.endsWith(".md") && fs.readFileSync(filePath, "utf8").includes("Zhulong Evidence Writeback")) return true;
    }
  }
  return false;
}

function manualGate(state, name) {
  return state.manualGates?.[name] || null;
}

function workflowGate(name, status, blocking, evidence, reason = "") {
  return {
    name,
    status,
    blocking: Boolean(blocking),
    ok: !blocking,
    evidence,
    reason,
  };
}

function workflowPassGate(name, evidence) {
  return workflowGate(name, "PASS", false, evidence, "");
}

function workflowFailGate(name, evidence, reason) {
  return workflowGate(name, "FAIL", true, evidence, reason);
}

function evaluateWorkflowGates(target, state) {
  const graphStatusValue = graphStatus(target);
  const graphFreshnessValue = graphFreshness(target, graphStatusValue);
  const initMode = readInitMode(target);
  const sourceCount = codebaseSourceCount(target);
  const profile = activeRefreshProfile(target);
  const privacyResult = runPrivacyAudit(target, { strictLocal: true, requireOfflineLock: profile.strict, writeReport: true });
  const gates = [];
  const addBoolean = (name, ok, evidence, reason = "") => gates.push(ok ? workflowPassGate(name, evidence) : workflowFailGate(name, evidence, reason));

  addBoolean("context", Boolean(state.contextPacket && fs.existsSync(state.contextPacket) && state.handoff && fs.existsSync(state.handoff)), ".planning/context + handoff", "Context packet or handoff missing.");
  addBoolean("codebase", fs.existsSync(path.join(target, ".planning", "codebase", "CODEBASE_STATUS.md")) && (initMode === "new" || (sourceCount || 0) > 0), ".planning/codebase/CODEBASE_STATUS.md", initMode === "existing" ? "Existing project needs codebase source inventory." : "Codebase scan missing.");

  if (hasDocumentEvidence(target)) {
    gates.push(workflowPassGate("docs", ".planning/knowledge/RAG_SOURCES.md or RAG_QUERY_RESULT.md"));
  } else if (!profile.ragRequired) {
    gates.push(workflowGate("docs", "WAIVED_WITH_RISK", false, ".planning/knowledge", "Document/RAG evidence missing; reference document policy allows code/graph-only work but completion must record WAIVED_WITH_RISK."));
  } else {
    gates.push(workflowFailGate("docs", ".planning/knowledge/RAG_SOURCES.md or RAG_QUERY_RESULT.md", "Document/RAG evidence missing."));
  }

  const hasGraph = Boolean(graphStatusValue.planningGraph && graphStatusValue.planningReport);
  if (!hasGraph || graphFreshnessValue.state === "missing") {
    gates.push(workflowFailGate("graph", ".planning/graphs", graphFreshnessValue.message));
  } else if (graphFreshnessValue.state === "stale") {
    gates.push(workflowGate("graph", "STALE_NEEDS_REFRESH", profile.strict, ".planning/graphs", graphFreshnessValue.message));
  } else {
    gates.push(workflowPassGate("graph", ".planning/graphs"));
  }

  gates.push(privacyResult.ok
    ? workflowPassGate("privacy", privacyResult.outPath)
    : workflowFailGate("privacy", privacyResult.outPath, privacyResult.issues.map((issue) => `${issue.file}: ${issue.detail}`).join("; ")));

  addBoolean("plan", Boolean(manualGate(state, "plan")), manualGate(state, "plan")?.evidence, "Plan gate not marked.");
  addBoolean("implementation", Boolean(manualGate(state, "implementation")), manualGate(state, "implementation")?.evidence, "Implementation gate not marked.");
  addBoolean("verification", Boolean(manualGate(state, "verification")), manualGate(state, "verification")?.evidence, "Verification gate not marked.");
  addBoolean("evidence", hasEvidenceRecord(target), ".planning/evidence", "No durable evidence record found.");
  addBoolean("writeback", hasWriteback(target), ".planning/issues|debug|phases", "No Zhulong Evidence Writeback marker found.");

  const ok = gates.every((gate) => !gate.blocking);
  return { ok, gates };
}

function nextCommandForGate(gateName) {
  const commands = {
    context: "zl-workflow-run --target <repo> <workflow> \"<request>\"",
    codebase: "zl-codebase-scan --target <repo>",
    docs: "zl-docs-extract --target <repo> && zl-docs-citations --target <repo> \"<query>\"",
    graph: "zl-refresh-plan --target <repo> && zl-refresh-run --target <repo> --graph",
    privacy: "zl-offline-lock --target <repo> && zl-privacy-audit --target <repo> --strict",
    plan: "zl-workflow-continue --target <repo> --gate plan --evidence \"<plan evidence>\"",
    implementation: "zl-workflow-continue --target <repo> --gate implementation --evidence \"<implementation evidence>\"",
    verification: "zl-workflow-continue --target <repo> --gate verification --evidence \"<verification evidence>\"",
    evidence: "zl-evidence-record --target <repo> --title \"<evidence title>\"",
    writeback: "zl-evidence-record --target <repo> --writeback <record-path>",
  };
  return commands[gateName] || "zl-workflow-status --target <repo>";
}

function writeWorkflowAudit(target, state, result) {
  const auditPath = path.join(workflowsDir(target), state.id, "WORKFLOW_AUDIT.md");
  fs.mkdirSync(path.dirname(auditPath), { recursive: true });
  const blocking = result.gates.filter((gate) => gate.blocking);
  const warnings = result.gates.filter((gate) => ["WAIVED_WITH_RISK", "STALE_NEEDS_REFRESH"].includes(gate.status));
  const content = `# Workflow Audit: ${state.id}

Generated: ${new Date().toISOString()}

## Summary

- Workflow: \`${state.workflow}\`
- Status: ${result.ok ? "PASS" : "FAIL"}
- Blocking gates: ${blocking.length}
- Risk/stale gates: ${warnings.length}
- Heavy refresh executed: no

## Gates

| Gate | Status | Blocking | Evidence / Reason | Next command |
| --- | --- | --- | --- | --- |
${result.gates.map((gate) => `| ${gate.name} | ${gate.status || (gate.ok ? "PASS" : "FAIL")} | ${gate.blocking ? "yes" : "no"} | ${markdownCell(gate.evidence || gate.reason || "")} | \`${markdownCell(gate.blocking ? nextCommandForGate(gate.name) : "-")}\` |`).join("\n")}

## Completion Rule

\`zl-completion-check\` remains non-zero while any blocking gate is present. \`WAIVED_WITH_RISK\` is allowed only when the active profile permits it and the report records the risk.
`;
  fs.writeFileSync(auditPath, content);
  return auditPath;
}

function printGateResult(result) {
  for (const gate of result.gates) {
    console.log(`${gate.status || (gate.ok ? "PASS" : "FAIL")} ${gate.name} ${gate.evidence || gate.reason || ""}`.trim());
  }
  console.log(`workflow guard ${result.ok ? "PASS" : "FAIL"}`);
}

function workflowFacadePaths(target, state) {
  const dir = path.join(workflowsDir(target), state.id);
  return {
    jsonPath: path.join(dir, "WORKFLOW_FACADE.json"),
    mdPath: path.join(dir, "WORKFLOW_FACADE.md"),
  };
}

function pendingAnswerAudit(target) {
  const candidates = answerSourceCandidates(target).slice(0, 2).filter((candidate) => fs.existsSync(candidate.path));
  if (candidates.length === 0) return false;
  const latestQueryMs = Math.max(...candidates.map((candidate) => fs.statSync(candidate.path).mtimeMs));
  const auditPath = qualityPaths(target).answerAuditMd;
  if (!fs.existsSync(auditPath)) return true;
  return fs.statSync(auditPath).mtimeMs + GRAPH_STALE_GRACE_MS < latestQueryMs;
}

function workflowFacadeNextCommands(target, gates, preflight) {
  const commands = [];
  for (const gate of gates) {
    if (gate.blocking) commands.push(nextCommandForGate(gate.name));
  }
  for (const domain of preflight.domains || []) {
    if (domain.action === "refresh") commands.push(domain.command);
  }
  if (pendingAnswerAudit(target)) commands.push("zl-answer-audit --target <repo>");
  return uniqueList(commands).filter(Boolean);
}

function writeWorkflowFacade(target, state, route, gateResult) {
  const profile = activeRefreshProfile(target);
  const preflight = refreshAssessment(target);
  const preflightWritten = writePreflightReport(target, preflight);
  const policy = lightweightPolicyChecks(target, { strict: profile.strict, requireOfflineLock: false });
  const paths = workflowFacadePaths(target, state);
  fs.mkdirSync(path.dirname(paths.mdPath), { recursive: true });
  const nextCommands = workflowFacadeNextCommands(target, gateResult.gates, preflight);
  const status = gateResult.ok && policy.status === "PASS" && preflight.status === "PASS"
    ? "PASS"
    : gateResult.ok ? "PASS_WITH_WARNINGS" : "BLOCKED";
  const data = {
    generatedAt: new Date().toISOString(),
    status,
    workflow: state.workflow,
    publicCommand: route.publicCommand,
    profile: profile.name,
    heavyRefreshExecuted: false,
    preflight: {
      status: preflight.status,
      report: path.relative(target, preflightWritten.mdPath),
      domains: preflight.domains.map((domain) => ({
        kind: domain.kind,
        status: domain.status,
        severity: domain.severity,
        action: domain.action,
        command: domain.action === "refresh" ? domain.command : "skip",
      })),
    },
    policy: {
      status: policy.status,
      checks: policy.checks.map((check) => ({
        id: check.id,
        status: check.status,
        blocking: check.blocking,
      })),
    },
    gates: gateResult.gates.map((gate) => ({
      name: gate.name,
      status: gate.status,
      blocking: gate.blocking,
    })),
    nextCommands,
  };
  writeJsonFile(paths.jsonPath, data);
  const content = `# Zhulong Workflow Facade: ${state.id}

Generated: ${data.generatedAt}

## Summary

- Status: ${data.status}
- Workflow: \`${state.workflow}\`
- Public command: \`${route.publicCommand}\`
- Profile: \`${profile.name}\`
- Heavy refresh executed: no

## Facade Rule

This report is the no-surprise command layer. Public workflow commands may run lightweight status checks, but they must not run GraphRAG index, Graphify build, or explicit refresh commands automatically.

## Preflight

- Status: ${preflight.status}
- Report: \`${path.relative(target, preflightWritten.mdPath)}\`

| Domain | Status | Action |
| --- | --- | --- |
${preflight.domains.map((domain) => `| ${domain.kind} | ${domain.status} | ${domain.action === "refresh" ? `\`${domain.command}\`` : "skip"} |`).join("\n")}

## Policy

| Check | Status | Blocking |
| --- | --- | --- |
${policy.checks.map((check) => `| \`${check.id}\` | ${check.status} | ${check.blocking ? "yes" : "no"} |`).join("\n")}

## Workflow Gates

| Gate | Status | Blocking |
| --- | --- | --- |
${gateResult.gates.map((gate) => `| ${gate.name} | ${gate.status} | ${gate.blocking ? "yes" : "no"} |`).join("\n")}

## Next Commands

${nextCommands.length ? nextCommands.map((command) => `- \`${command}\``).join("\n") : "- No manual recovery command required."}
`;
  fs.writeFileSync(paths.mdPath, content);
  return { ...paths, data };
}

function startGuardedWorkflow(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const workflowName = args._[1];
  const route = WORKFLOW_COMMANDS[workflowName];
  if (!route) {
    usage();
    process.exitCode = 1;
    return;
  }
  const request = args._.slice(2).join(" ").trim();
  const id = args.id || workflowId(route, request);
  const packetPath = writeContextPacket(target, route.packetKind, request, route);
  const handoff = writeWorkflowHandoff(target, route, request, packetPath);
  const dir = path.join(workflowsDir(target), id);
  fs.mkdirSync(dir, { recursive: true });
  for (const [fileName, title] of [["PLAN.md", "Plan"], ["IMPLEMENTATION.md", "Implementation"], ["VERIFICATION.md", "Verification"]]) {
    const filePath = path.join(dir, fileName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, `# ${title}: ${id}\n\nStatus: pending\n\nEvidence:\n\n- TBD\n`);
    }
  }
  const state = {
    id,
    workflow: workflowName,
    request,
    status: "running",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    contextPacket: packetPath,
    handoff: handoff.outPath,
    manualGates: {},
  };
  saveWorkflowState(target, state);
  const result = evaluateWorkflowGates(target, state);
  const facade = writeWorkflowFacade(target, state, route, result);
  writeWorkflowStateMarkdown(target, state, result);
  console.log(`workflow ${id}`);
  console.log(`facade ${facade.data.status}`);
  console.log(`write ${packetPath}`);
  console.log(`write ${handoff.outPath}`);
  console.log(`write ${facade.mdPath}`);
  console.log(`write ${workflowStatePath(target, id)}`);
  console.log("heavy refresh executed: no");
  printGateResult(result);
}

function gateCheck(args, completion = false) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const structureResult = completion ? runStructureAudit(target, { strict: Boolean(args.strict) }) : null;
  const state = resolveWorkflowState(target, args);
  if (!state) {
    console.log("FAIL workflow-state missing");
    process.exitCode = 1;
    return;
  }
  const result = evaluateWorkflowGates(target, state);
  const completionOk = result.ok && !structureResult?.blocking;
  state.status = completionOk ? "complete" : "blocked";
  saveWorkflowState(target, state);
  writeWorkflowStateMarkdown(target, state, result);
  printGateResult(result);
  if (completion) {
    console.log(`${structureResult.status} structure ${structureResult.structure_compliance_rate}`);
    console.log(`write ${structureResult.mdPath}`);
    console.log(`completion ${completionOk ? "allowed" : "blocked"}`);
  }
  process.exitCode = completionOk ? 0 : 1;
}

function workflowStatus(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const state = resolveWorkflowState(target, args);
  if (!state) {
    console.log("missing active workflow");
    process.exitCode = 1;
    return;
  }
  const result = evaluateWorkflowGates(target, state);
  console.log(`workflow ${state.id}`);
  console.log(`status ${state.status}`);
  printGateResult(result);
  process.exitCode = result.ok ? 0 : 1;
}

function workflowAudit(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const state = resolveWorkflowState(target, args);
  if (!state) {
    console.log("missing active workflow");
    process.exitCode = 1;
    return;
  }
  const result = evaluateWorkflowGates(target, state);
  const auditPath = writeWorkflowAudit(target, state, result);
  writeWorkflowStateMarkdown(target, state, result);
  console.log(`workflow ${state.id}`);
  printGateResult(result);
  for (const gate of result.gates.filter((item) => !item.ok)) {
    console.log(`next ${gate.name}: ${nextCommandForGate(gate.name)}`);
  }
  console.log(`write ${auditPath}`);
  process.exitCode = result.ok ? 0 : 1;
}

function workflowContinue(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const state = resolveWorkflowState(target, args);
  if (!state) {
    console.log("missing active workflow");
    process.exitCode = 1;
    return;
  }
  const gate = args.gate || args._[1];
  const allowed = new Set(["plan", "implementation", "verification"]);
  if (!allowed.has(gate)) {
    console.log("error: --gate must be one of plan, implementation, verification");
    process.exitCode = 1;
    return;
  }
  const evidence = args.evidence || args._.slice(2).join(" ").trim();
  if (!evidence) {
    console.log("error: --evidence is required");
    process.exitCode = 1;
    return;
  }
  state.manualGates = state.manualGates || {};
  state.manualGates[gate] = { evidence, markedAt: new Date().toISOString() };
  state.status = "running";
  saveWorkflowState(target, state);
  const result = evaluateWorkflowGates(target, state);
  writeWorkflowStateMarkdown(target, state, result);
  console.log(`mark ${gate}`);
  printGateResult(result);
}

function verify(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");

  const required = [
    "AGENTS.md",
    "project.manifest.yml",
    ".planning/PROJECT.md",
    ".planning/STATE.md",
    ".planning/config.json",
    ".planning/issues/ISSUE_TEMPLATE.md",
  ];
  const requiredDirs = [
    ".planning/knowledge",
    ".planning/context",
    ".planning/codebase",
    ".planning/debug",
    ".planning/evidence",
    ".planning/graphs",
    ".planning/issues",
    ".planning/phases",
    ".planning/refresh",
    ".planning/workflows",
  ];

  let ok = true;
  for (const item of required) {
    const exists = fs.existsSync(path.join(target, item));
    console.log(`${exists ? "ok" : "missing"} ${item}`);
    if (!exists) ok = false;
  }
  for (const item of requiredDirs) {
    const dirPath = path.join(target, item);
    const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    console.log(`${exists ? "ok" : "missing"} ${item}/`);
    if (!exists) ok = false;
  }

  if (gitExcludePath(target)) {
    console.log("\nGit ignore check:");
    for (const item of LOCAL_ONLY_PATHS) {
      try {
        const output = execFileSync("git", ["check-ignore", "-v", item], {
          cwd: target,
          encoding: "utf8",
          stdio: ["ignore", "pipe", "pipe"],
        });
        console.log(`ok ${item} ${output.trim()}`);
      } catch {
        console.log(`warn ${item} is not ignored`);
        ok = false;
      }
    }
  }

  const manifest = readManifest(target);
  if (!manifest.text) {
    console.log(`missing ${manifest.path}`);
    ok = false;
  }

  console.log("\nContent checks:");
  for (const item of required) {
    const filePath = path.join(target, item);
    if (!fs.existsSync(filePath)) continue;
    const text = fs.readFileSync(filePath, "utf8");
    const hasPlaceholder = /\{\{[A-Z0-9_]+\}\}/.test(text);
    console.log(`${hasPlaceholder ? "warn" : "ok"} ${item} placeholders`);
    if (hasPlaceholder) ok = false;
  }

  const configPath = path.join(target, ".planning", "config.json");
  if (fs.existsSync(configPath)) {
    try {
      JSON.parse(fs.readFileSync(configPath, "utf8"));
      console.log("ok .planning/config.json json");
    } catch {
      console.log("warn .planning/config.json invalid json");
      ok = false;
    }
  }

  process.exitCode = ok ? 0 : 1;
}

function map(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");

  const ignore = new Set([
    ".DS_Store",
    ".git",
    ".planning",
    ".ai-notes",
    ".ai-work",
    ".codex-work",
    "AGENTS.md",
    "docs/architecture",
    "graphify-corpus",
    "graphify-out",
    "graphrag-workspace",
    "node_modules",
    "project.manifest.yml",
    "target",
    "dist",
    "build",
    "coverage",
    ".idea",
    ".vscode",
  ]);

  const entries = fs
    .readdirSync(target, { withFileTypes: true })
    .filter((entry) => !ignore.has(entry.name))
    .map((entry) => `${entry.isDirectory() ? "dir" : "file"} ${entry.name}`)
    .sort();

  const outPath = path.join(target, ".planning", "codebase", "STRUCTURE.md");
  const content = `# Structure: ${path.basename(target)}

Generated by Zhulong Project Intelligence Kit on ${new Date().toISOString()}.

## Top-Level Entries

${entries.map((line) => `- ${line}`).join("\n")}

## Next Manual Pass

- Identify subsystems and entry points.
- Record build, test, lint, and deploy commands.
- Mark generated, vendor, media, and build output folders.
- Decide Graphify and GraphRAG indexing boundaries.
`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content);
  console.log(`write ${outPath}`);
}

function docsScan(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");

  const { sourcePaths, extensions } = docScanConfig(target);
  const scan = discoverDocuments(target, sourcePaths, extensions);
  const written = writeDocScan(target, scan);

  console.log(`write ${written.sourcesPath}`);
  console.log(`write ${written.statusPath}`);
  console.log(`documents ${scan.files.length}`);
  console.log(`source roots ${scan.sourceRoots.length ? scan.sourceRoots.join(", ") : "none found"}`);
}

function docsStatus(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");

  const statusPath = path.join(target, ".planning", "knowledge", "DOC_RAG_STATUS.md");
  if (!fs.existsSync(statusPath)) {
    console.log("missing .planning/knowledge/DOC_RAG_STATUS.md");
    console.log("Run: zl-docs-scan --target <repo>");
    process.exitCode = 1;
    return;
  }

  const status = fs.readFileSync(statusPath, "utf8");
  const lines = status
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- Last scan:")
      || line.startsWith("- Total source documents:")
      || line.startsWith("- Normalized documents:")
      || line.startsWith("- RAG backend:")
      || line.startsWith("- Index status:"));

  console.log("Document context status");
  for (const line of lines) {
    console.log(line.replace(/^- /, ""));
  }
  console.log(`status ${statusPath}`);
}

function docsNormalize(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const result = normalizeDocuments(target);
  console.log(`write ${result.manifestPath}`);
  console.log(`normalized ${result.normalized.length}`);
  console.log(`skipped ${result.skipped.length}`);
}

function docsExtract(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const result = extractDocuments(target);
  console.log(`write ${result.paths.indexPath}`);
  console.log(`write ${result.paths.reportPath}`);
  console.log(`extracted ${result.index.documents.filter((doc) => doc.extracted).length}`);
  console.log(`documents ${result.index.documents.length}`);
}

function docsDiff(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const result = diffDocuments(target);
  console.log(`write ${result.paths.diffPath}`);
  console.log(`added ${result.added.length}`);
  console.log(`modified ${result.modified.length}`);
  console.log(`removed ${result.removed.length}`);
  if (!result.previous) {
    console.log("missing previous DOCUMENT_INDEX.json; run zl-docs-extract --target <repo>");
  }
}

function docsSyncCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const result = docsSync(target, args);
  console.log(`docs sync ${result.status}`);
  console.log(`added ${result.diff.added.length}`);
  console.log(`modified ${result.diff.modified.length}`);
  console.log(`removed ${result.diff.removed.length}`);
  console.log(`ambiguity audit ${result.ambiguityAudit.status}`);
  console.log(`write ${result.paths.docsSyncMd}`);
  console.log(`heavy refresh executed: ${args.index ? "yes" : "no"}`);
  if (result.index) console.log(`index ${result.index.status}`);
  process.exitCode = result.status === "FAIL" ? 1 : 0;
}

function docsCitations(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const query = args._.slice(1).join(" ").trim();
  if (!query) {
    console.log("missing query");
    console.log('Run: zl-docs-citations --target <repo> "<question or keywords>"');
    process.exitCode = 1;
    return;
  }
  const result = queryExtractedDocuments(target, query);
  if (result.missing) {
    console.log("missing .planning/knowledge/extracted/");
    console.log("Run: zl-docs-extract --target <repo>");
    process.exitCode = 1;
    return;
  }
  const outPath = writeCitations(target, query, result.matches);
  console.log(`Document citations: ${query}`);
  for (const match of result.matches.slice(0, 8)) {
    console.log(`- ${match.sourcePath}:${match.line} ${match.text}`);
  }
  console.log(`write ${outPath}`);
  if (result.matches.length === 0) {
    console.log("No citation matches; answer must be treated as hypothesis.");
    process.exitCode = 1;
  }
}

function docsIndex(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");

  if (args.run) {
    const result = runRagIndex(target, args);
    console.log(`run ${result.command}`);
    console.log(`write ${result.resultPath}`);
    console.log(`status ${result.ok ? "success" : "failed"}`);
    if (!result.ok && result.errorMessage) console.log(result.errorMessage);
    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }

  const outPath = writeRagIndexHandoff(target, args);
  console.log(`write ${outPath}`);
  console.log("backend document RAG handoff");
  console.log("run directly with: zl-docs-index --target <repo> --run");
}

function autoAnswerAuditEnabled(target) {
  return readPlanningConfig(target).knowledge?.auto_answer_audit !== false;
}

function runAutoAnswerAudit(target, sourcePath) {
  if (!autoAnswerAuditEnabled(target)) {
    console.log("answer audit auto-run disabled by knowledge.auto_answer_audit=false");
    return null;
  }
  const result = answerAudit(target, { from: sourcePath });
  const written = writeAnswerAuditReports(target, result);
  console.log(`answer audit auto ${result.status}`);
  console.log(`write ${written.mdPath}`);
  return result;
}

function docsQuery(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const query = args._.slice(1).join(" ").trim();
  if (!query) {
    console.log("missing query");
    console.log('Run: zl-docs-query --target <repo> "<question or keywords>"');
    process.exitCode = 1;
    return;
  }
  if (args.rag || args.backend === "graphrag") {
    const result = runRagQuery(target, query, args);
    console.log(`RAG context query: ${query}`);
    console.log(`run ${result.command}`);
    console.log(`write ${result.resultPath}`);
    if (result.stdout.trim()) {
      console.log(result.stdout.trim());
    }
    console.log(`status ${result.ok ? "success" : "failed"}`);
    if (!result.ok && result.errorMessage) console.log(result.errorMessage);
    if (result.ok) runAutoAnswerAudit(target, path.relative(target, result.resultPath));
    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }
  let backend = "local-extracted-documents";
  let result = queryExtractedDocuments(target, query);
  if (result.missing) {
    backend = "local-normalized-text";
    result = queryNormalizedDocs(target, query);
  }
  const written = writeDocsQueryResult(target, query, result, backend);
  if (result.missing) {
    console.log("missing .planning/knowledge/extracted/ and .planning/knowledge/normalized/");
    console.log("Run: zl-docs-sync --target <repo>");
    console.log(`write ${written.mdPath}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Document context query: ${query}`);
  if (result.matches.length === 0) {
    console.log("No local document text matches.");
    console.log(`write ${written.mdPath}`);
    console.log('next zl-answer-audit --target "$PWD"');
    return;
  }
  for (const match of result.matches.slice(0, 8)) {
    console.log(`- ${match.sourcePath}:${match.line} ${match.text}`);
  }
  console.log(`write ${written.mdPath}`);
  runAutoAnswerAudit(target, path.relative(target, written.mdPath));
}

function graphBuild(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");

  if (args.run) {
    const result = runGraphBuild(target, args);
    console.log(`run ${result.command}`);
    console.log(`write ${result.resultPath}`);
    console.log(`copied graph ${result.copiedGraph ? "yes" : "no"}`);
    console.log(`copied report ${result.copiedReport ? "yes" : "no"}`);
    console.log(`status ${result.ok ? "success" : "failed"}`);
    if (!result.ok) {
      process.exitCode = 1;
    }
    return;
  }

  const outPath = writeGraphBuildHandoff(target);
  console.log(`write ${outPath}`);
  console.log("backend Graphify handoff");
  console.log("next zl-graph-status --target <repo>");
  console.log("run directly with: zl-graph-build --target <repo> --run");
}

function graphStatusCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");

  console.log("Code map status");
  console.log(formatGraphStatusMarkdown(target));
}

function graphQuery(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const query = args._.slice(1).join(" ").trim();
  if (!query) {
    console.log("missing query");
    console.log('Run: zl-graph-query --target <repo> "<entity or keywords>"');
    process.exitCode = 1;
    return;
  }

  const matches = queryGraphArtifacts(target, query);
  console.log(`Code map query: ${query}`);
  if (matches.length === 0) {
    console.log("No local code-map matches.");
    console.log("Run: zl-graph-build --target <repo>");
    return;
  }

  for (const match of matches.slice(0, 12)) {
    console.log(`- ${match.source}:${match.line} ${match.text}`);
  }
}

function graphDiff(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const paths = graphArtifactPaths(target);

  if (!fs.existsSync(paths.planningGraph)) {
    console.log("missing .planning/graphs/graph.json");
    console.log("Run: zl-graph-build --target <repo> --run");
    process.exitCode = 1;
    return;
  }

  if (args["save-baseline"] || args.saveBaseline) {
    fs.mkdirSync(path.dirname(paths.planningBaseline), { recursive: true });
    fs.copyFileSync(paths.planningGraph, paths.planningBaseline);
    console.log(`write ${paths.planningBaseline}`);
    return;
  }

  if (!fs.existsSync(paths.planningBaseline)) {
    console.log("missing .planning/graphs/graph.baseline.json");
    console.log("Run: zl-graph-diff --target <repo> --save-baseline");
    process.exitCode = 1;
    return;
  }

  const diff = compareGraphs(paths.planningBaseline, paths.planningGraph);
  const outPath = writeGraphDiff(target, diff);
  console.log("Code map diff");
  console.log(formatGraphDiff(diff, { details: Boolean(args.details) }));
  console.log(`write ${outPath}`);
}

function graphImpactCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const files = [
    ...(args.files ? String(args.files).split(",") : []),
    ...args._.slice(1),
  ].map((item) => item.trim()).filter(Boolean);
  if (files.length === 0) {
    console.log('missing --files "src/a.js,src/b.js"');
    process.exitCode = 1;
    return;
  }
  const result = graphImpact(target, files);
  const outPath = writeGraphImpact(target, result);
  console.log(`Graph impact: ${files.join(", ")}`);
  console.log(`matched ${result.matched?.length || 0}`);
  console.log(`impacted nodes ${result.impacted?.length || 0}`);
  console.log(`impacted edges ${result.edges?.length || 0}`);
  console.log(`write ${outPath}`);
  if (!result.ok) process.exitCode = 1;
}

function graphRiskCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const result = graphRisk(target);
  const outPath = writeGraphRisk(target, result);
  console.log("Graph risk");
  console.log(`nodes ${result.nodes || 0}`);
  console.log(`edges ${result.edges || 0}`);
  console.log(`high coupling ${result.highCoupling?.length || 0}`);
  console.log(`entry-like ${result.entryPoints?.length || 0}`);
  console.log(`write ${outPath}`);
  if (!result.ok) process.exitCode = 1;
}

function graphFreshnessCommand(args) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const freshness = graphFreshness(target);
  const outPath = writeGraphFreshnessReport(target, freshness);
  console.log(formatGraphFreshness(freshness).replace(/^- /, ""));
  console.log(`write ${outPath}`);
  if (args.strict && freshness.state !== "fresh") process.exitCode = 1;
}

function context(args) {
  const subcommand = args._[0];
  if (subcommand === "debug" || subcommand === "execute") {
    contextPacket(args, subcommand);
  } else {
    usage();
    process.exitCode = 1;
  }
}

function contextPacket(args, kind) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const request = args._.slice(1).join(" ").trim();
  const outPath = writeContextPacket(target, kind, request);
  console.log(`write ${outPath}`);
}

function trace(args) {
  const subcommand = args._[0];
  if (subcommand === "build") {
    traceBuildCommand(args);
    return;
  }
  if (subcommand === "query") {
    traceQuery(args);
    return;
  }
  if (subcommand === "audit") {
    traceAuditCommand(args);
    return;
  }
  usage();
  process.exitCode = 1;
}

function workflowHandoff(args, route) {
  const target = path.resolve(args.target || process.cwd());
  requireDir(target, "Target");
  const request = args._.slice(1).join(" ").trim();
  const packetPath = writeContextPacket(target, route.packetKind, request, route);
  const handoff = writeWorkflowHandoff(target, route, request, packetPath);
  console.log(`write ${packetPath}`);
  console.log(`write ${handoff.outPath}`);
  console.log(`public ${handoff.publicInvocation}`);
  console.log("zl-native workflow handoff recorded");
}

function scanCodebase(target) {
  return scanProjectCodebase(target, (root) => walkFiles(root, CODE_MAP_IGNORE_NAMES));
}

const runCodebaseCommand = createCodebaseCommand({
  listFiles: (target) => walkFiles(target, CODE_MAP_IGNORE_NAMES),
  formatGraphStatus: formatGraphStatusMarkdown,
  usage,
});

const runEvidenceCommand = createEvidenceCommand({
  formatGraphStatus: formatGraphStatusMarkdown,
  markdownCell,
  slugify,
  usage,
});

const runDocsCommand = createDocsCommand({
  scan: docsScan,
  status: docsStatus,
  normalize: docsNormalize,
  extract: docsExtract,
  diff: docsDiff,
  citations: docsCitations,
  sync: docsSyncCommand,
  citationAudit: citationAuditCommand,
  index: docsIndex,
  query: docsQuery,
}, usage);

const runRagCommand = createRagCommand({
  initLocal: ragInitLocal,
  goldenAdd: ragGoldenAdd,
  goldenRun: ragGoldenRun,
  eval: ragEval,
}, usage);

const runGraphCommand = createGraphCommand({
  build: graphBuild,
  status: graphStatusCommand,
  query: graphQuery,
  diff: graphDiff,
  impact: graphImpactCommand,
  risk: graphRiskCommand,
  freshness: graphFreshnessCommand,
}, usage);

const runPolicyCommand = createPolicyCommand({
  list: policyList,
  check: policyCheck,
  explain: policyExplain,
  lock: policyLock,
  verify: policyVerify,
  diff: policyDiff,
}, usage);

const runCockpitCommand = createCockpitCommand({ build: cockpitBuild }, usage);

const runWorkflowCommand = createWorkflowCommand({
  run: startGuardedWorkflow,
  status: workflowStatus,
  continue: workflowContinue,
  audit: workflowAudit,
  gateCheck: (commandArgs) => gateCheck(commandArgs),
  completionCheck: (commandArgs) => gateCheck(commandArgs, true),
  handoff: workflowHandoff,
}, usage);

export async function runCli(argv = process.argv.slice(2), executablePath = process.argv[1]) {
  const args = parseArgs(normalizeArgv(argv, executablePath));
  const output = createOutputSession({
    json: Boolean(args.json),
    quiet: Boolean(args.quiet),
    noColor: Boolean(args["no-color"]),
    command: commandIdentity(args),
  });
  process.exitCode = EXIT_CODES.OK;
  try {
    const result = await dispatchCommand(args, {
      usage,
      init,
      docs: runDocsCommand,
      rag: runRagCommand,
      answer,
      ambiguity,
      structure,
      preflight: preflightCommand,
      refresh,
      mode,
      trace,
      policy: runPolicyCommand,
      help,
      next: nextCommand,
      privacy,
      license,
      graph: runGraphCommand,
      evidence: runEvidenceCommand,
      runtime: (commandArgs) => runRuntimeCommand(commandArgs, { usage }),
      context,
      workflow: runWorkflowCommand,
      cockpit: runCockpitCommand,
      codebase: runCodebaseCommand,
      verify,
      map,
      doctor: doctorCommand,
      completion: completionCommand,
    });
    if (result.exitCode) process.exitCode = result.exitCode;
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = Number.isInteger(error.exitCode) ? error.exitCode : EXIT_CODES.INTERNAL;
  } finally {
    output.finalize(Number(process.exitCode || EXIT_CODES.OK));
  }
}
