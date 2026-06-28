import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pikCli = path.join(kitRoot, "bin", "pik.mjs");
const fixtureRoot = path.join(kitRoot, "examples", "japanese-doc-dev-fixture");
const reportDir = path.join(kitRoot, "verification", "reports");
const reportPath = path.join(reportDir, "latest.md");
const reportJsonPath = path.join(reportDir, "latest.json");
const args = new Set(process.argv.slice(2));
const liveGraphRag = args.has("--live-graphrag");
const keepWorkdir = args.has("--keep-workdir");
const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pik-full-validation-"));
const checks = [];
const artifacts = [];

function now() {
  return new Date().toISOString();
}

function rel(filePath) {
  return path.relative(kitRoot, filePath) || ".";
}

function record(name, status, evidence, detail = "") {
  checks.push({ name, status, evidence, detail });
}

function fail(name, evidence, detail = "") {
  record(name, "FAIL", evidence, detail);
}

function pass(name, evidence, detail = "") {
  record(name, "PASS", evidence, detail);
}

function warn(name, evidence, detail = "") {
  record(name, "WARN", evidence, detail);
}

function run(label, command, options = {}) {
  const result = spawnSync("bash", ["-lc", command], {
    cwd: options.cwd || kitRoot,
    encoding: "utf8",
    env: { ...process.env, ...(options.env || {}) },
    timeout: options.timeout || 1200000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${label} failed with exit ${result.status}\n${output}`);
  }
  return { status: result.status, stdout: result.stdout || "", stderr: result.stderr || "", output };
}

function pik(projectRoot, command, options = {}) {
  return run(`pik ${command}`, `node ${shell(pikCli)} ${command}`, {
    cwd: projectRoot,
    timeout: options.timeout || 1200000,
    allowFailure: options.allowFailure,
  });
}

function pikAlias(projectRoot, aliasName, args = "", options = {}) {
  const aliasPath = path.join(workRoot, aliasName);
  if (!fs.existsSync(aliasPath)) fs.symlinkSync(pikCli, aliasPath);
  return run(aliasName, `node ${shell(aliasPath)} ${args}`, {
    cwd: projectRoot,
    timeout: options.timeout || 1200000,
    allowFailure: options.allowFailure,
  });
}

function shell(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function assertIncludes(name, text, expected, evidence) {
  if (!text.includes(expected)) {
    fail(name, evidence, `Missing expected text: ${expected}`);
    return false;
  }
  pass(name, evidence, `Found: ${expected}`);
  return true;
}

function assertNotIncludes(name, text, forbidden, evidence) {
  if (text.includes(forbidden)) {
    fail(name, evidence, `Found forbidden text: ${forbidden}`);
    return false;
  }
  pass(name, evidence, `Absent: ${forbidden}`);
  return true;
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function copyFixture(dest) {
  fs.cpSync(fixtureRoot, dest, {
    recursive: true,
    filter: (source) => !source.includes(`${path.sep}node_modules${path.sep}`),
  });
}

function copySeed(projectRoot, relativePath) {
  const source = path.join(projectRoot, "pik-seed", relativePath);
  const dest = path.join(projectRoot, ".planning", relativePath);
  fs.cpSync(source, dest, { recursive: true });
}

function graphEdgeList(graph) {
  if (Array.isArray(graph.edges)) return graph.edges;
  if (Array.isArray(graph.links)) return graph.links;
  return [];
}

function listFiles(dir, predicate = () => true, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(entryPath, predicate, out);
    else if (entry.isFile() && predicate(entryPath)) out.push(entryPath);
  }
  return out;
}

function createFixtureProject(name) {
  const projectRoot = path.join(workRoot, name);
  copyFixture(projectRoot);
  pik(projectRoot, `init --target ${shell(projectRoot)} --template backend-service --name ${shell(name)} --force`);
  fs.copyFileSync(path.join(projectRoot, "pik.fixture.config.json"), path.join(projectRoot, ".planning", "config.json"));
  copySeed(projectRoot, "issues");
  copySeed(projectRoot, path.join("phases", "admin-approval"));
  return projectRoot;
}

function validateDeterministicPik() {
  const projectRoot = createFixtureProject("fixture-pik-native");
  artifacts.push(projectRoot);

  run("fixture default tests", "npm test", { cwd: projectRoot });
  const expectedFailure = run("fixture task fails before implementation", "npm run test:task", {
    cwd: projectRoot,
    allowFailure: true,
  });
  if (expectedFailure.status !== 0) pass("Fixture starts with failing CR-017 acceptance test", "npm run test:task");
  else fail("Fixture starts with failing CR-017 acceptance test", "npm run test:task", "Expected pre-fix task test to fail.");

  pik(projectRoot, `verify --target ${shell(projectRoot)}`);
  pik(projectRoot, `docs scan --target ${shell(projectRoot)}`);
  pik(projectRoot, `docs normalize --target ${shell(projectRoot)}`);
  pik(projectRoot, `docs index --target ${shell(projectRoot)} --run`);
  const localQuery = pik(projectRoot, `docs query --target ${shell(projectRoot)} ${shell("代理承認 30,000")}`);
  assertIncludes("AI-PIKit local document query finds QA evidence", localQuery.output, "QA-042", "pik docs query");

  const ragQuery = pik(projectRoot, `docs query --target ${shell(projectRoot)} --rag ${shell("代理承認の上限金額")}`);
  assertIncludes("AI-PIKit configured RAG query returns 30,000 evidence", ragQuery.output, "30,000", "pik docs query --rag");

  pik(projectRoot, `graph build --target ${shell(projectRoot)} --run`);
  const graphQuery = pik(projectRoot, `graph query --target ${shell(projectRoot)} ${shell("PROXY_APPROVAL_LIMIT")}`);
  assertIncludes("AI-PIKit Graphify adapter query finds PROXY_APPROVAL_LIMIT", graphQuery.output, "PROXY_APPROVAL_LIMIT", "pik graph query");

  const policyPath = path.join(projectRoot, "src", "approvalPolicy.js");
  const before = read(policyPath);
  fs.writeFileSync(policyPath, before.replace("PROXY_APPROVAL_LIMIT = 50000", "PROXY_APPROVAL_LIMIT = 30000"));
  run("task passes after implementation", "npm run test:task", { cwd: projectRoot });
  run("default tests pass after implementation", "npm test", { cwd: projectRoot });

  pik(projectRoot, `graph build --target ${shell(projectRoot)} --run`);
  const graphDiff = pik(projectRoot, `graph diff --target ${shell(projectRoot)} --details`);
  assertIncludes("AI-PIKit graph diff captures implementation change", graphDiff.output, "30000", "pik graph diff --details");

  pik(projectRoot, [
    "evidence record",
    `--target ${shell(projectRoot)}`,
    shell("CR-017 proxy approval limit verified"),
    "--command",
    shell("npm test && npm run test:task"),
    "--result",
    shell("passed"),
    "--source",
    shell("docs/qa/QA-042_代理承認上限.md,docs/change-requests/CR-017_代理承認上限.md"),
    "--writeback",
    shell(".planning/issues/CR-017_proxy_approval_limit.md"),
  ].join(" "));
  const issueText = read(path.join(projectRoot, ".planning", "issues", "CR-017_proxy_approval_limit.md"));
  assertIncludes("AI-PIKit evidence writeback reaches issue record", issueText, "AI-PIKit Evidence Writeback", ".planning/issues/CR-017_proxy_approval_limit.md");

  const workflowNames = [
    "new-milestone",
    "spec-phase",
    "discuss-phase",
    "ui-phase",
    "debug",
    "plan-phase",
    "execute-phase",
    "code-review",
    "verify-work",
    "complete-milestone",
  ];
  for (const workflow of workflowNames) {
    pik(projectRoot, `workflow ${workflow} --target ${shell(projectRoot)} ${shell(`CR-017 ${workflow}`)}`);
  }

  const handoffs = listFiles(path.join(projectRoot, ".planning", "context", "handoffs"), (file) => file.endsWith("-HANDOFF.md"));
  if (handoffs.length >= workflowNames.length) pass("All core AI-PIKit workflows create handoffs", ".planning/context/handoffs", `${handoffs.length} handoff files`);
  else fail("All core AI-PIKit workflows create handoffs", ".planning/context/handoffs", `Expected at least ${workflowNames.length}, got ${handoffs.length}`);

  for (const handoff of handoffs) {
    const text = read(handoff);
    assertIncludes(`AI-PIKit native handoff marker: ${path.basename(handoff)}`, text, "Workflow kernel: AI-PIKit native", rel(handoff));
    assertIncludes(`Workflow doc marker: ${path.basename(handoff)}`, text, "Workflow doc:", rel(handoff));
    assertNotIncludes(`No active GSD backend wording: ${path.basename(handoff)}`, text, "Current backend", rel(handoff));
    assertNotIncludes(`No internal backend invocation title: ${path.basename(handoff)}`, text, "Internal Backend Invocation", rel(handoff));
  }

  const contextPackets = listFiles(path.join(projectRoot, ".planning", "context"), (file) => file.endsWith(".md") && !file.includes(`${path.sep}handoffs${path.sep}`));
  const debugPacket = contextPackets.find((file) => path.basename(file).startsWith("debug-"));
  if (debugPacket) {
    const text = read(debugPacket);
    assertIncludes("Context packet includes document RAG status", text, "Document RAG Status", rel(debugPacket));
    assertIncludes("Context packet includes code map status", text, "Code Map Status", rel(debugPacket));
    assertIncludes("Context packet includes Graphify output", text, "Graph Report", rel(debugPacket));
  } else {
    fail("Context packet includes RAG/Graphify sections", ".planning/context", "No debug packet found.");
  }

  return projectRoot;
}

function validateInitAndCodebaseModes() {
  const newProjectRoot = path.join(workRoot, "init-new-project");
  fs.mkdirSync(newProjectRoot, { recursive: true });
  artifacts.push(newProjectRoot);
  pikAlias(newProjectRoot, "pik-init", `--target ${shell(newProjectRoot)} --template greenfield-app --name init_new_project --mode new --force`);
  const newProfile = read(path.join(newProjectRoot, ".planning", "INIT_PROFILE.md"));
  assertIncludes("AI-PIKit init records new project mode", newProfile, "Mode: new", ".planning/INIT_PROFILE.md");
  pikAlias(newProjectRoot, "pik-codebase-scan", `--target ${shell(newProjectRoot)}`);
  const newCodebaseStatus = pikAlias(newProjectRoot, "pik-codebase-status", `--target ${shell(newProjectRoot)}`);
  assertIncludes("AI-PIKit codebase status works for new project mode", newCodebaseStatus.output, "ok .planning/codebase/CODEBASE_STATUS.md", "pik codebase status");

  const existingProjectRoot = createFixtureProject("init-existing-project");
  artifacts.push(existingProjectRoot);
  pikAlias(existingProjectRoot, "pik-init", `--target ${shell(existingProjectRoot)} --template brownfield-monorepo --name init_existing_project --mode existing --force`);
  const existingProfile = read(path.join(existingProjectRoot, ".planning", "INIT_PROFILE.md"));
  assertIncludes("AI-PIKit init records existing project mode", existingProfile, "Mode: existing", ".planning/INIT_PROFILE.md");
  pikAlias(existingProjectRoot, "pik-codebase-scan", `--target ${shell(existingProjectRoot)}`);
  const statusText = read(path.join(existingProjectRoot, ".planning", "codebase", "CODEBASE_STATUS.md"));
  const sourceMatch = statusText.match(/- Source files:\s*(\d+)/);
  const sourceCount = sourceMatch ? Number(sourceMatch[1]) : 0;
  if (sourceCount > 0) pass("AI-PIKit codebase scan inventories existing project sources", ".planning/codebase/CODEBASE_STATUS.md", `${sourceCount} source files`);
  else fail("AI-PIKit codebase scan inventories existing project sources", ".planning/codebase/CODEBASE_STATUS.md", "Expected source files > 0.");
}

function validateWorkflowGuard() {
  const projectRoot = createFixtureProject("workflow-guard");
  artifacts.push(projectRoot);

  const start = pikAlias(projectRoot, "pik-workflow-run", `--target ${shell(projectRoot)} debug ${shell("CR-017 guard")}`);
  assertIncludes("AI-PIKit workflow-run alias starts guarded state", start.output, "workflow guard FAIL", "pik-workflow-run");
  assertIncludes("AI-PIKit workflow-run alias marks docs gate as risk before document scan", start.output, "WAIVED_WITH_RISK docs", "pik-workflow-run");
  assertIncludes("AI-PIKit workflow-run alias fails codebase gate before codebase scan", start.output, "FAIL codebase", "pik-workflow-run");
  assertIncludes("AI-PIKit workflow-run alias fails graph gate before graph build", start.output, "FAIL graph", "pik-workflow-run");

  const blocked = pikAlias(projectRoot, "pik-completion-check", `--target ${shell(projectRoot)}`, { allowFailure: true });
  if (blocked.status !== 0) pass("AI-PIKit completion-check alias blocks incomplete workflow", "pik-completion-check", "Non-zero exit before required gates.");
  else fail("AI-PIKit completion-check alias blocks incomplete workflow", "pik-completion-check", "Expected non-zero exit before required gates.");
  assertIncludes("AI-PIKit completion-check alias reports blocked completion", blocked.output, "completion blocked", "pik-completion-check");

  pikAlias(projectRoot, "pik-codebase-scan", `--target ${shell(projectRoot)}`);
  pik(projectRoot, `docs scan --target ${shell(projectRoot)}`);
  pik(projectRoot, `docs normalize --target ${shell(projectRoot)}`);
  pik(projectRoot, `docs query --target ${shell(projectRoot)} --rag ${shell("代理承認の上限金額")}`);
  pik(projectRoot, `graph build --target ${shell(projectRoot)} --run`);
  pikAlias(projectRoot, "pik-workflow-continue", `--target ${shell(projectRoot)} --gate plan --evidence ${shell("PLAN.md reviewed with CR-017 scope")}`);
  pikAlias(projectRoot, "pik-workflow-continue", `--target ${shell(projectRoot)} --gate implementation --evidence ${shell("src/approvalPolicy.js implementation reviewed")}`);
  pikAlias(projectRoot, "pik-workflow-continue", `--target ${shell(projectRoot)} --gate verification --evidence ${shell("npm test and npm run test:task recorded")}`);
  pik(projectRoot, [
    "evidence record",
    `--target ${shell(projectRoot)}`,
    shell("Workflow guard CR-017 evidence"),
    "--command",
    shell("npm test && npm run test:task"),
    "--result",
    shell("recorded"),
    "--source",
    shell("docs/qa/QA-042_代理承認上限.md,.planning/graphs/GRAPH_REPORT.md"),
    "--writeback",
    shell(".planning/issues/CR-017_proxy_approval_limit.md"),
  ].join(" "));

  const gateCheck = pikAlias(projectRoot, "pik-gate-check", `--target ${shell(projectRoot)}`);
  assertIncludes("AI-PIKit gate-check alias passes complete workflow", gateCheck.output, "workflow guard PASS", "pik-gate-check");
  const completed = pikAlias(projectRoot, "pik-completion-check", `--target ${shell(projectRoot)}`);
  assertIncludes("AI-PIKit completion-check alias allows complete workflow", completed.output, "completion allowed", "pik-completion-check");
  for (const gate of ["context", "codebase", "docs", "graph", "plan", "implementation", "verification", "evidence", "writeback"]) {
    assertIncludes(`AI-PIKit workflow guard passes ${gate} gate`, completed.output, `PASS ${gate}`, "pik-completion-check");
  }

  const status = pikAlias(projectRoot, "pik-workflow-status", `--target ${shell(projectRoot)}`, { allowFailure: true });
  assertIncludes("AI-PIKit workflow-status alias reports guard pass", status.output, "workflow guard PASS", "pik-workflow-status");
  const activeState = JSON.parse(read(path.join(projectRoot, ".planning", "workflows", "ACTIVE.json")));
  if (activeState.id && fs.existsSync(path.join(projectRoot, ".planning", "workflows", activeState.id, "WORKFLOW_STATE.json"))) {
    pass("AI-PIKit workflow guard writes durable state", ".planning/workflows/<id>/WORKFLOW_STATE.json", activeState.id);
  } else {
    fail("AI-PIKit workflow guard writes durable state", ".planning/workflows/<id>/WORKFLOW_STATE.json", "Missing active workflow state.");
  }

  try {
    const aliasProjectRoot = createFixtureProject("workflow-alias");
    artifacts.push(aliasProjectRoot);
    const aliasRun = pikAlias(aliasProjectRoot, "pik-debug", `--target ${shell(aliasProjectRoot)} ${shell("CR-017 alias guard")}`);
    assertIncludes("Public pik-debug alias enters workflow guard", aliasRun.output, "workflow guard FAIL", "pik-debug");
    assertIncludes("Public pik-debug alias creates workflow state", aliasRun.output, "WORKFLOW_STATE.json", "pik-debug");
  } catch (error) {
    fail("Public pik-debug alias enters workflow guard", "pik-debug", error.message || String(error));
  }
}

function validateRealGraphify() {
  const projectRoot = createFixtureProject("real-graphify");
  artifacts.push(projectRoot);
  const configPath = path.join(projectRoot, ".planning", "config.json");
  const config = JSON.parse(read(configPath));
  config.code_map.enabled = true;
  config.code_map.provider = "graphify";
  config.code_map.update_command = "graphify update .";
  config.graphify.enabled = true;
  config.graphify.update_command = "graphify update .";
  writeJson(configPath, config);

  pik(projectRoot, `graph build --target ${shell(projectRoot)} --run`, { timeout: 1200000 });
  const graphPath = path.join(projectRoot, ".planning", "graphs", "graph.json");
  const reportPath = path.join(projectRoot, ".planning", "graphs", "GRAPH_REPORT.md");
  if (!fs.existsSync(graphPath) || !fs.existsSync(reportPath)) {
    fail("Real Graphify artifacts copied into AI-PIKit graph cache", ".planning/graphs", "graph.json or GRAPH_REPORT.md missing.");
    return projectRoot;
  }
  const graph = JSON.parse(read(graphPath));
  const nodes = Array.isArray(graph.nodes) ? graph.nodes.length : 0;
  const edges = graphEdgeList(graph).length;
  if (nodes > 0 && edges > 0) pass("Real Graphify graph has nodes and edges/links", rel(graphPath), `${nodes} nodes, ${edges} edges/links`);
  else fail("Real Graphify graph has nodes and edges/links", rel(graphPath), `${nodes} nodes, ${edges} edges/links`);

  const status = pik(projectRoot, `graph status --target ${shell(projectRoot)}`);
  assertIncludes("AI-PIKit graph status reads real Graphify graph", status.output, "edges", "pik graph status");
  const query = pik(projectRoot, `graph query --target ${shell(projectRoot)} ${shell("approvalPolicy")}`);
  assertIncludes("AI-PIKit graph query reads real Graphify report/nodes", query.output, "approvalPolicy", "pik graph query approvalPolicy");
  return projectRoot;
}

function configureGraphRagWorkspace(projectRoot) {
  const workspace = path.join(projectRoot, "graphrag-workspace");
  const inputDir = path.join(workspace, "input");
  fs.mkdirSync(inputDir, { recursive: true });
  let i = 0;
  for (const file of listFiles(path.join(projectRoot, "docs"), (item) => item.endsWith(".md")).sort()) {
    i += 1;
    fs.copyFileSync(file, path.join(inputDir, `doc-${i}.txt`));
  }

  run("graphrag init", `graphrag init --root ${shell(workspace)} --model deepseek-chat --embedding nomic-embed-text --force`, {
    cwd: projectRoot,
    env: { GRAPHRAG_API_KEY: process.env.GRAPHRAG_API_KEY || "" },
  });

  const settingsPath = path.join(workspace, "settings.yaml");
  let settings = read(settingsPath);
  settings = settings.replace("model_provider: openai\n    model: deepseek-chat", "model_provider: deepseek\n    model: deepseek-chat");
  settings = settings.replace(
    "api_key: ${GRAPHRAG_API_KEY} # set this in the generated .env file, or remove if managed identity\n    retry:",
    "api_key: ${GRAPHRAG_API_KEY}\n    api_base: https://api.deepseek.com\n    retry:",
  );
  settings = settings.replace("model_provider: openai\n    model: nomic-embed-text", "model_provider: ollama\n    model: nomic-embed-text");
  settings = settings.replace(
    "api_key: ${GRAPHRAG_API_KEY}\n    retry:",
    "api_key: ollama\n    api_base: http://localhost:11434\n    retry:",
  );
  fs.writeFileSync(settingsPath, settings);
  fs.writeFileSync(path.join(workspace, ".env"), `GRAPHRAG_API_KEY=${process.env.GRAPHRAG_API_KEY || ""}\n`);

  const configPath = path.join(projectRoot, ".planning", "config.json");
  const config = JSON.parse(read(configPath));
  config.spec_context.provider = "graphrag";
  config.spec_context.index_command = "graphrag index --root graphrag-workspace --method fast --verbose";
  config.spec_context.query_command = 'graphrag query --root graphrag-workspace --method basic --response-type "List of 3 concise points with data references" {query}';
  config.graphrag.enabled = true;
  config.graphrag.root = "graphrag-workspace";
  config.graphrag.index_command = config.spec_context.index_command;
  config.graphrag.local_query_command = config.spec_context.query_command;
  writeJson(configPath, config);
  return workspace;
}

function validateLiveGraphRag() {
  if (!liveGraphRag) {
    warn("Live GraphRAG validation skipped", "--live-graphrag", "Run with GRAPHRAG_API_KEY and --live-graphrag to validate real GraphRAG through AI-PIKit.");
    return null;
  }
  if (!process.env.GRAPHRAG_API_KEY) {
    fail("Live GraphRAG validation requested", "GRAPHRAG_API_KEY", "Environment variable is missing.");
    return null;
  }

  const projectRoot = createFixtureProject("live-graphrag");
  artifacts.push(projectRoot);
  const workspace = configureGraphRagWorkspace(projectRoot);
  try {
    pik(projectRoot, `docs index --target ${shell(projectRoot)} --run --timeout 1200000`, { timeout: 1200000 });
    const indexResult = read(path.join(projectRoot, ".planning", "knowledge", "RAG_INDEX_RESULT.md"));
    assertIncludes("AI-PIKit ran real GraphRAG index successfully", indexResult, "Status: success", ".planning/knowledge/RAG_INDEX_RESULT.md");
    assertIncludes("AI-PIKit real GraphRAG output exists", indexResult, "Output: present", ".planning/knowledge/RAG_INDEX_RESULT.md");

    const queryResult = pik(projectRoot, `docs query --target ${shell(projectRoot)} --rag ${shell("代理承認の上限金額はいくらですか？")}`, { timeout: 1200000 });
    assertIncludes("AI-PIKit real GraphRAG query returns expected limit", queryResult.output, "30,000", "pik docs query --rag");
    const ragResultText = read(path.join(projectRoot, ".planning", "knowledge", "RAG_QUERY_RESULT.md"));
    assertIncludes("AI-PIKit wrote real GraphRAG query result", ragResultText, "Status: success", ".planning/knowledge/RAG_QUERY_RESULT.md");
  } finally {
    const envPath = path.join(workspace, ".env");
    if (fs.existsSync(envPath)) fs.rmSync(envPath);
  }
  return projectRoot;
}

function validateRuntimePacks() {
  const runtimeRoot = path.join(workRoot, "runtime");
  for (const runtime of ["codex", "claude-code", "github-copilot"]) {
    const dest = path.join(runtimeRoot, runtime);
    pik(kitRoot, `runtime install --runtime ${runtime} --dest ${shell(dest)}`);
    const status = pik(kitRoot, `runtime status --runtime ${runtime} --dest ${shell(dest)}`);
    for (const command of ["pik-new-milestone", "pik-spec-phase", "pik-discuss-phase", "pik-ui-phase", "pik-debug", "pik-plan-phase", "pik-execute-phase", "pik-code-review", "pik-verify-work", "pik-complete-milestone"]) {
      assertIncludes(`Runtime ${runtime} renders ${command}`, status.output, `ok ${command} rendered`, `pik-runtime-status ${runtime}`);
    }
    const renderedFiles = listFiles(dest, (file) => file.endsWith(".md")).map((file) => read(file)).join("\n");
    assertIncludes(`Runtime ${runtime} routes workflows through guard runner`, renderedFiles, "workflow run", `runtime/${runtime}`);
  }
}

function validateGsdReplacement() {
  const packageJson = JSON.parse(read(path.join(kitRoot, "package.json")));
  const binNames = Object.keys(packageJson.bin || {});
  const gsdBins = binNames.filter((name) => name.startsWith("gsd"));
  if (gsdBins.length === 0) pass("No public GSD binaries are exposed", "package.json bin");
  else fail("No public GSD binaries are exposed", "package.json bin", gsdBins.join(", "));

  const runtimeFiles = [
    ...listFiles(path.join(kitRoot, "runtime", "codex")),
    ...listFiles(path.join(kitRoot, "runtime", "claude-code")),
    ...listFiles(path.join(kitRoot, "runtime", "github-copilot")),
  ];
  const activeRoutingHits = [];
  const activePatterns = [
    /continue with [`/]?\$?gsd-/i,
    /invoke\s+[`/]?\$?gsd-/i,
    /route to\s+[`/]?\$?gsd-/i,
    /use\s+[`/]?\$?gsd-[a-z-]+\s+\$?ARGUMENTS/i,
  ];
  for (const file of runtimeFiles) {
    const text = read(file);
    const activeLines = text.split(/\r?\n/).filter((line) => {
      const normalized = line.toLowerCase();
      if (normalized.includes("do not") || normalized.includes("never") || normalized.includes("reference design only")) return false;
      return activePatterns.some((pattern) => pattern.test(line));
    });
    if (activeLines.length > 0) activeRoutingHits.push(`${rel(file)} :: ${activeLines.join(" | ")}`);
  }
  if (activeRoutingHits.length === 0) pass("Runtime packs do not actively route to GSD", "runtime/*");
  else fail("Runtime packs do not actively route to GSD", "runtime/*", activeRoutingHits.join(", "));

  const workflowFiles = listFiles(path.join(kitRoot, "core", "workflows"), (file) => file.endsWith(".md"));
  const workflowNames = new Set(workflowFiles.map((file) => path.basename(file, ".md")));
  for (const name of ["new-milestone", "spec-phase", "discuss-phase", "ui-phase", "debug", "plan-phase", "execute-phase", "code-review", "verify-work", "complete-milestone"]) {
    if (workflowNames.has(name)) pass(`AI-PIKit workflow exists for ${name}`, `core/workflows/${name}.md`);
    else fail(`AI-PIKit workflow exists for ${name}`, `core/workflows/${name}.md`, "Missing workflow contract.");
  }

  const gsdSkillRoot = path.join(os.homedir(), ".codex", "skills");
  const comparisonRows = [
    ["new-milestone", "gsd-new-milestone"],
    ["spec-phase", "gsd-spec-phase"],
    ["discuss-phase", "gsd-discuss-phase"],
    ["ui-phase", "gsd-ui-phase"],
    ["debug", "gsd-debug"],
    ["plan-phase", "gsd-plan-phase"],
    ["execute-phase", "gsd-execute-phase"],
    ["verify-work", "gsd-verify-work"],
    ["complete-milestone", "gsd-complete-milestone"],
  ];
  for (const [pikName, gsdName] of comparisonRows) {
    const gsdPath = path.join(gsdSkillRoot, gsdName, "SKILL.md");
    const pikPath = path.join(kitRoot, "core", "workflows", `${pikName}.md`);
    if (!fs.existsSync(gsdPath)) {
      warn(`GSD reference unavailable for ${pikName}`, gsdPath, "Cannot compare local GSD skill text.");
      continue;
    }
    const gsdText = read(gsdPath);
    const pikText = read(pikPath);
    const pikHasDocs = /RAG|document|specification|仕様|source evidence/i.test(pikText);
    const pikHasGraph = /Graphify|code-map|impact|graph/i.test(pikText);
    const gsdHasDocs = /RAG|document|specification|仕様|source evidence/i.test(gsdText);
    const gsdHasGraph = /Graphify|code-map|impact|graph/i.test(gsdText);
    if (pikHasDocs && pikHasGraph) {
      const lift = `${pikName}: AI-PIKit docs gate=${pikHasDocs}, graph gate=${pikHasGraph}; GSD docs mention=${gsdHasDocs}, graph mention=${gsdHasGraph}`;
      pass(`AI-PIKit adds docs/graph gates for ${pikName}`, `core/workflows/${pikName}.md`, lift);
    } else {
      fail(`AI-PIKit adds docs/graph gates for ${pikName}`, `core/workflows/${pikName}.md`, "Missing docs or graph gate.");
    }
  }
}

function reportStatusSummary() {
  return {
    pass: checks.filter((item) => item.status === "PASS").length,
    fail: checks.filter((item) => item.status === "FAIL").length,
    warn: checks.filter((item) => item.status === "WARN").length,
  };
}

function writeReport() {
  fs.mkdirSync(reportDir, { recursive: true });
  const summary = reportStatusSummary();
  const generated = now();
  const lines = [
    "# AI-PIKit Full Validation Report",
    "",
    `Generated: ${generated}`,
    "",
    "## Summary",
    "",
    `- PASS: ${summary.pass}`,
    `- FAIL: ${summary.fail}`,
    `- WARN: ${summary.warn}`,
    `- Work root: \`${workRoot}\`${keepWorkdir ? "" : " (removed after run)"}`,
    `- Live GraphRAG: ${liveGraphRag ? "requested" : "not requested"}`,
    "",
    "## Verdict",
    "",
  ];
  if (summary.fail === 0) {
    lines.push("AI-PIKit validation passed for the checked scope. AI-PIKit is the active command/workflow surface; Graphify and configured RAG/GraphRAG are exercised as AI-PIKit enhancement gates.");
  } else {
    lines.push("AI-PIKit validation did not fully pass. See failed checks below; do not claim full replacement or enhancement coverage until those checks pass.");
  }
  lines.push("", "## Checks", "");
  for (const item of checks) {
    lines.push(`- [${item.status}] ${item.name}`);
    lines.push(`  - Evidence: \`${item.evidence}\``);
    if (item.detail) lines.push(`  - Detail: ${item.detail.replace(/\n/g, " ")}`);
  }
  lines.push("", "## AI-PIKit vs GSD Assessment", "");
  lines.push("| Area | GSD Reference | AI-PIKit Current Evidence | Assessment |");
  lines.push("| --- | --- | --- | --- |");
  lines.push("| Public command surface | `gsd-*` skills | package bin exposes `pik-*`; runtime packs render `pik-*` | AI-PIKit replaces GSD for user invocation |");
  lines.push("| Workflow contract | GSD skill/workflow text | `core/workflows/*.md`, `.planning/workflows/<id>/WORKFLOW_STATE.json`, guard checks | AI-PIKit has native contracts and a CLI guard state machine |");
  lines.push("| Document evidence | Not uniformly native to every GSD flow | `pik-docs-*`, RAG result files, workflow docs gate spec evidence | AI-PIKit improves document-heavy development |");
  lines.push("| Code impact | GSD may rely on separate Graphify skill/use | `pik-graph-*`, Graphify artifact sync, graph status/query/diff | AI-PIKit makes Graphify an explicit workflow gate |");
  lines.push("| Evidence writeback | GSD records workflow outputs | `pik-evidence-record --writeback` verified | AI-PIKit provides reusable evidence loop |");
  lines.push("| Hard enforcement | Mostly agent instruction based | `pik-workflow-run`, `pik-gate-check`, `pik-completion-check` verified with block/pass behavior | AI-PIKit adds artifact-level enforcement beyond prompt guidance |");
  lines.push("", "## Artifact Roots", "");
  for (const artifact of artifacts) lines.push(`- \`${artifact}\``);
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`);
  fs.writeFileSync(reportJsonPath, `${JSON.stringify({
    generated,
    summary,
    verdict: summary.fail === 0 ? "pass" : "fail",
    workRoot,
    workRootRemovedAfterRun: !keepWorkdir,
    liveGraphRag: liveGraphRag ? "requested" : "not requested",
    checks,
    artifacts,
    assessment: [
      {
        area: "Public command surface",
        evidence: "package bin exposes pik-*; runtime packs render pik-*",
        assessment: "AI-PIKit replaces GSD for user invocation",
      },
      {
        area: "Workflow contract",
        evidence: "core/workflows/*.md, .planning/workflows/<id>/WORKFLOW_STATE.json, guard checks",
        assessment: "AI-PIKit has native contracts and a CLI guard state machine",
      },
      {
        area: "Document evidence",
        evidence: "pik-docs-*, RAG result files, workflow docs gate spec evidence",
        assessment: "AI-PIKit improves document-heavy development",
      },
      {
        area: "Code impact",
        evidence: "pik-graph-*, Graphify artifact sync, graph status/query/diff",
        assessment: "AI-PIKit makes Graphify an explicit workflow gate",
      },
      {
        area: "Evidence writeback",
        evidence: "pik-evidence-record --writeback verified",
        assessment: "AI-PIKit provides reusable evidence loop",
      },
      {
        area: "Hard enforcement",
        evidence: "pik-workflow-run, pik-gate-check, pik-completion-check verified",
        assessment: "AI-PIKit adds artifact-level enforcement beyond prompt guidance",
      },
    ],
  }, null, 2)}\n`);
}

try {
  validateInitAndCodebaseModes();
  validateDeterministicPik();
  validateWorkflowGuard();
  validateRealGraphify();
  validateRuntimePacks();
  validateGsdReplacement();
  validateLiveGraphRag();
} catch (error) {
  fail("Validation script crashed", "verification/run-full-validation.mjs", error.stack || error.message);
} finally {
  writeReport();
  if (!keepWorkdir && fs.existsSync(workRoot)) fs.rmSync(workRoot, { recursive: true, force: true });
}

const summary = reportStatusSummary();
console.log(`report ${reportPath}`);
console.log(`PASS ${summary.pass} FAIL ${summary.fail} WARN ${summary.warn}`);
if (summary.fail > 0) process.exitCode = 1;
