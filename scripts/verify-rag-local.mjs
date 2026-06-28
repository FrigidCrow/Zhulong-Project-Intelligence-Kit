import fs from "node:fs";
import path from "node:path";
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
const workRoot = tempRoot("aipikit-rag-local-");
const projectRoot = path.join(workRoot, "project");
const unsafeProjectRoot = path.join(workRoot, "unsafe-project");
const aliasBin = path.join(workRoot, "bin");
const issues = [];
const evidence = [];
const commandResults = [];
const model = process.env.AI_PIKIT_LOCAL_LLM_MODEL || "qwen2.5:7b";
const embedding = process.env.AI_PIKIT_LOCAL_EMBEDDING_MODEL || "bge-m3";
const commandTimeoutMs = Number(process.env.AI_PIKIT_RAG_LOCAL_COMMAND_TIMEOUT_MS || 120000);
const indexTimeoutMs = Number(process.env.AI_PIKIT_RAG_LOCAL_INDEX_TIMEOUT_MS || 300000);
const queryTimeoutMs = Number(process.env.AI_PIKIT_RAG_LOCAL_QUERY_TIMEOUT_MS || 90000);
const pullTimeoutMs = Number(process.env.AI_PIKIT_RAG_LOCAL_PULL_TIMEOUT_MS || 1200000);

function addIssue(command, detail) {
  issues.push({ command, detail });
}

function write(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function record(command, result) {
  commandResults.push({
    command,
    status: result.status,
    stdout: result.stdout.trim().slice(0, 3000),
    stderr: result.stderr.trim().slice(0, 3000),
  });
  return result;
}

function localEnv() {
  return {
    GRAPHRAG_API_KEY: "",
    OPENAI_API_KEY: "",
    AZURE_OPENAI_API_KEY: "",
    DEEPSEEK_API_KEY: "",
    ANTHROPIC_API_KEY: "",
    GEMINI_API_KEY: "",
  };
}

function runPik(args, options = {}) {
  const cwd = options.projectRoot || projectRoot;
  const command = `pik ${args.join(" ")}`;
  return record(command, runCommand(command, "node", [pikCli, ...args], {
    cwd,
    timeout: commandTimeoutMs,
    env: localEnv(),
    ...options,
  }));
}

function runAlias(alias, args, options = {}) {
  const aliasPath = path.join(aliasBin, alias);
  const cwd = options.projectRoot || projectRoot;
  const command = `${alias} ${args.join(" ")}`;
  return record(command, runCommand(command, aliasPath, args, {
    cwd,
    timeout: commandTimeoutMs,
    env: localEnv(),
    ...options,
  }));
}

function assertIncludes(command, text, expected) {
  if (!text.includes(expected)) addIssue(command, `missing expected text: ${expected}`);
  else evidence.push(`${command}: found ${expected}`);
}

function assertNotIncludes(command, text, forbidden) {
  if (text.includes(forbidden)) addIssue(command, `contains forbidden text: ${forbidden}`);
  else evidence.push(`${command}: does not contain ${forbidden}`);
}

function assertFileExists(command, filePath) {
  if (!fs.existsSync(filePath)) addIssue(command, `missing file: ${path.relative(projectRoot, filePath)}`);
  else evidence.push(`${command}: file exists ${path.relative(projectRoot, filePath)}`);
}

function assertFileIncludes(command, filePath, expected) {
  assertFileExists(command, filePath);
  if (fs.existsSync(filePath)) assertIncludes(command, read(filePath), expected);
}

function assertFileNotIncludes(command, filePath, forbidden) {
  assertFileExists(command, filePath);
  if (fs.existsSync(filePath)) assertNotIncludes(command, read(filePath), forbidden);
}

function makeAliasBins() {
  fs.mkdirSync(aliasBin, { recursive: true });
  for (const alias of ["pik-rag-init-local", "pik-privacy-audit"]) {
    const aliasPath = path.join(aliasBin, alias);
    if (fs.existsSync(aliasPath)) fs.rmSync(aliasPath);
    fs.symlinkSync(pikCli, aliasPath);
  }
}

function commandExists(name) {
  const result = runCommand(`command -v ${name}`, "sh", ["-lc", `command -v ${shellQuote(name)}`], {
    cwd: kitRoot,
    allowFailure: true,
    timeout: 30000,
  });
  return result.status === 0;
}

function ollamaModelPresent(name) {
  const result = runCommand("ollama list", "ollama", ["list"], {
    cwd: kitRoot,
    allowFailure: true,
    timeout: 30000,
  });
  if (result.status !== 0) return false;
  const wanted = name.replace(/:latest$/, "");
  return result.stdout.split(/\r?\n/).some((line) => line.split(/\s+/)[0]?.replace(/:latest$/, "") === wanted);
}

function ensureOllamaModel(name) {
  if (ollamaModelPresent(name)) {
    evidence.push(`ollama model present: ${name}`);
    return;
  }
  const result = record(`ollama pull ${name}`, runCommand(`ollama pull ${name}`, "ollama", ["pull", name], {
    cwd: kitRoot,
    allowFailure: true,
    timeout: pullTimeoutMs,
  }));
  if (result.status !== 0) addIssue(`ollama pull ${name}`, "model is missing and pull failed");
  else evidence.push(`ollama model pulled: ${name}`);
}

function listTextFiles(root, out = []) {
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const p = path.join(root, entry.name);
    if (entry.isDirectory()) listTextFiles(p, out);
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

function secretAndExternalScan(root) {
  const hits = [];
  const tokenPattern = /\bsk-[A-Za-z0-9_-]{20,}\b/;
  const externalUrlPattern = /https?:\/\/(?!127\.0\.0\.1|localhost)[^\s"'<>]+/;
  for (const filePath of listTextFiles(root)) {
    let text = "";
    try {
      const buf = fs.readFileSync(filePath);
      if (buf.includes(0)) continue;
      text = buf.toString("utf8");
    } catch {
      continue;
    }
    const activeText = text.split(/\r?\n/).map((line) => {
      const comment = line.indexOf("#");
      return comment >= 0 ? line.slice(0, comment) : line;
    }).join("\n");
    if (tokenPattern.test(activeText)) hits.push({ file: path.relative(root, filePath), detail: "secret-shaped token" });
    if (externalUrlPattern.test(activeText)) hits.push({ file: path.relative(root, filePath), detail: "external URL" });
  }
  return hits;
}

function writeFixtureDocs(root) {
  write(path.join(root, "docs", "specs", "proxy-approval.md"), [
    "# AcmeBank Proxy Approval Specification",
    "",
    "AcmeBank FinanceDepartment defines the ProxyApprovalPolicy for the ApprovalService.",
    "Tanaka Taro is the business owner. Sato Hana is the QA reviewer.",
    "",
    "For CR-LOCAL-042, the proxy approval upper limit is exactly 42,420 yen.",
    "The policy keyword is LOCAL_RAG_SENTINEL_42420.",
    "The ApprovalService must reject proxy approvals above 42,420 yen unless FinanceDepartment grants an emergency event exception.",
    "",
  ].join("\n"));
}

if (!commandExists("graphrag")) addIssue("dependency", "graphrag command missing");
if (!commandExists("ollama")) addIssue("dependency", "ollama command missing");
if (issues.length === 0) {
  ensureOllamaModel(model);
  ensureOllamaModel(embedding);
}

fs.mkdirSync(projectRoot, { recursive: true });
makeAliasBins();
writeFixtureDocs(projectRoot);

if (issues.length === 0) {
  runPik(["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "rag_local_fixture", "--mode", "new", "--force"]);
  runAlias("pik-rag-init-local", ["--target", projectRoot, "--force", "--model", model, "--embedding", embedding]);

  const config = JSON.parse(read(path.join(projectRoot, ".planning", "config.json")));
  if (config.spec_context?.provider !== "graphrag-local") addIssue(".planning/config.json", "spec_context.provider is not graphrag-local");
  if (config.graphrag?.mode !== "local") addIssue(".planning/config.json", "graphrag.mode is not local");
  if (config.graphrag?.requires_api_key !== false) addIssue(".planning/config.json", "graphrag.requires_api_key is not false");
  if (config.privacy?.network_policy !== "local_only") addIssue(".planning/config.json", "privacy.network_policy is not local_only");

  const settingsPath = path.join(projectRoot, "graphrag-workspace", "settings.yaml");
  assertFileIncludes("local settings", settingsPath, "model_provider: ollama");
  assertFileIncludes("local settings", settingsPath, "api_base: http://127.0.0.1:11434");
  assertFileIncludes("local settings", settingsPath, "workflows:");
  assertFileIncludes("local settings", settingsPath, "generate_text_embeddings");
  assertFileNotIncludes("local settings", settingsPath, "model_provider: openai");
  assertFileNotIncludes("local settings", settingsPath, "GRAPHRAG_API_KEY");
  if (fs.existsSync(path.join(projectRoot, "graphrag-workspace", ".env"))) addIssue("local settings", "graphrag-workspace/.env should not exist in local mode");
  else evidence.push("local settings: graphrag-workspace/.env absent");

  const auditBefore = runAlias("pik-privacy-audit", ["--target", projectRoot]);
  assertIncludes("pik-privacy-audit before index", auditBefore.output, "privacy audit PASS");

  const indexResult = runPik(["docs", "index", "--target", projectRoot, "--run", "--timeout", String(indexTimeoutMs)], {
    allowFailure: true,
    timeout: indexTimeoutMs + 30000,
  });
  if (indexResult.status !== 0) {
    addIssue("pik docs index --run local", `index failed or timed out within ${indexTimeoutMs}ms`);
  } else {
    assertIncludes("pik docs index --run local", indexResult.output, "status success");
    assertFileIncludes("RAG_INDEX_RESULT", path.join(projectRoot, ".planning", "knowledge", "RAG_INDEX_RESULT.md"), "Status: success");
  }

  const queryResult = runPik(["docs", "query", "--target", projectRoot, "--rag", "What is the proxy approval upper limit for CR-LOCAL-042?", "--timeout", String(queryTimeoutMs)], {
    allowFailure: true,
    timeout: queryTimeoutMs + 30000,
  });
  if (queryResult.status !== 0) {
    addIssue("pik docs query --rag local", `query failed or timed out within ${queryTimeoutMs}ms; inspect RAG_QUERY_RESULT.md and GraphRAG query.log`);
    assertFileExists("RAG_QUERY_RESULT", path.join(projectRoot, ".planning", "knowledge", "RAG_QUERY_RESULT.md"));
  } else {
    assertIncludes("pik docs query --rag local", queryResult.output, "42,420");
    assertFileIncludes("RAG_QUERY_RESULT", path.join(projectRoot, ".planning", "knowledge", "RAG_QUERY_RESULT.md"), "Status: success");
    assertFileIncludes("RAG_QUERY_RESULT", path.join(projectRoot, ".planning", "knowledge", "RAG_QUERY_RESULT.md"), "42,420");
    assertFileIncludes("RAG_QUERY_RESULT", path.join(projectRoot, ".planning", "knowledge", "RAG_QUERY_RESULT.md"), "Data: Sources");
  }

  const auditAfter = runAlias("pik-privacy-audit", ["--target", projectRoot]);
  assertIncludes("pik-privacy-audit after query", auditAfter.output, "privacy audit PASS");

  const privacyReport = path.join(projectRoot, ".planning", "knowledge", "PRIVACY_AUDIT.md");
  assertFileIncludes("PRIVACY_AUDIT", privacyReport, "Status: PASS");

  const riskHits = secretAndExternalScan(projectRoot);
  if (riskHits.length > 0) {
    for (const hit of riskHits) addIssue(hit.file, hit.detail);
  } else {
    evidence.push("secret/external scan: no sk-* tokens or external URLs in fixture project");
  }

  fs.mkdirSync(unsafeProjectRoot, { recursive: true });
  writeFixtureDocs(unsafeProjectRoot);
  runPik(["init", "--target", unsafeProjectRoot, "--template", "greenfield-app", "--name", "unsafe_rag_fixture", "--mode", "new", "--force"], { projectRoot: unsafeProjectRoot });
  runAlias("pik-rag-init-local", ["--target", unsafeProjectRoot, "--force", "--model", model, "--embedding", embedding], { projectRoot: unsafeProjectRoot });
  const unsafeSettingsPath = path.join(unsafeProjectRoot, "graphrag-workspace", "settings.yaml");
  fs.appendFileSync(unsafeSettingsPath, "\n# Deliberate negative test below\nunsafe_external_model:\n  model_provider: openai\n  api_base: https://api.openai.com/v1\n");
  const unsafeAudit = runAlias("pik-privacy-audit", ["--target", unsafeProjectRoot], {
    projectRoot: unsafeProjectRoot,
    allowFailure: true,
  });
  if (unsafeAudit.status === 0) addIssue("negative privacy audit", "unsafe external provider was not rejected");
  else {
    assertIncludes("negative privacy audit", unsafeAudit.output, "privacy audit FAIL");
    assertIncludes("negative privacy audit", unsafeAudit.output, "external URL");
    evidence.push("negative privacy audit: external provider rejected");
  }
  const unsafeQuery = runPik(["docs", "query", "--target", unsafeProjectRoot, "--rag", "Should be blocked"], {
    projectRoot: unsafeProjectRoot,
    allowFailure: true,
  });
  if (unsafeQuery.status === 0) addIssue("negative RAG query guard", "unsafe RAG query was not blocked");
  else {
    assertIncludes("negative RAG query guard", unsafeQuery.output, "status failed");
    assertFileIncludes("negative RAG query guard", path.join(unsafeProjectRoot, ".planning", "knowledge", "RAG_QUERY_RESULT.md"), "Privacy audit: failed");
    evidence.push("negative RAG query guard: unsafe query blocked before external execution");
  }
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  unsafeProjectRoot,
  model,
  embedding,
  timeouts: {
    commandTimeoutMs,
    indexTimeoutMs,
    queryTimeoutMs,
    pullTimeoutMs,
  },
  evidence,
  commandResults,
  issues,
};

writeJsonReport("rag-local-check.json", data);
writeMarkdownReport("rag-local-check.md", "AI-PIKit Local GraphRAG Verification", summarizeIssues(issues), [
  {
    title: "Local Profile",
    body: [
      `- LLM: \`${model}\``,
      `- Embedding: \`${embedding}\``,
      "- Provider: `ollama`",
      "- API base: `http://127.0.0.1:11434`",
      "- Vector store: `lancedb`",
      "- External API key: not required",
      `- Index timeout: ${indexTimeoutMs}ms`,
      `- Query timeout: ${queryTimeoutMs}ms`,
    ],
  },
  {
    title: "Evidence",
    body: evidence.length === 0 ? ["No evidence recorded."] : evidence.map((item) => `- ${item}`),
  },
  {
    title: "Fixture Paths",
    body: [
      `- Work root: \`${workRoot}\``,
      `- Project root: \`${projectRoot}\``,
      `- Reproduce command: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-rag-local.mjs"))}\``,
    ],
  },
  {
    title: "Issues",
    body: issues.length === 0 ? ["No local GraphRAG issues found."] : issues.map((issue) => `- ${issue.command}: ${issue.detail}`),
  },
]);

console.log(`local graphrag check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
