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

const zlCli = path.join(kitRoot, "bin", "zl.mjs");
const workRoot = tempRoot("zhulong-schema-");
const projectRoot = path.join(workRoot, "project");
const issues = [];
const evidence = [];

function addIssue(detail) {
  issues.push({ detail });
}

function write(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function zl(args, options = {}) {
  return runCommand("zl", "node", [zlCli, ...args], {
    cwd: projectRoot,
    timeout: 120000,
    ...options,
  });
}

function assertExists(label, filePath) {
  if (!fs.existsSync(filePath)) {
    addIssue(`${label} missing: ${path.relative(projectRoot, filePath)}`);
    return false;
  }
  evidence.push(`${label}: ${path.relative(projectRoot, filePath)}`);
  return true;
}

function assertOutputIncludes(label, output, expected) {
  if (!output.includes(expected)) addIssue(`${label} missing expected output: ${expected}`);
  else evidence.push(`${label}: found ${expected}`);
}

function assertJsonObject(label, filePath, requiredKeys) {
  if (!assertExists(label, filePath)) return null;
  let data = null;
  try {
    data = JSON.parse(read(filePath));
  } catch (error) {
    addIssue(`${label} is not valid JSON: ${error.message}`);
    return null;
  }
  for (const key of requiredKeys) {
    if (!Object.prototype.hasOwnProperty.call(data, key)) {
      addIssue(`${label} missing required key: ${key}`);
    }
  }
  evidence.push(`${label}: JSON parsed with keys ${requiredKeys.join(", ")}`);
  return data;
}

function assertMarkdownSections(label, filePath, sections) {
  if (!assertExists(label, filePath)) return;
  const text = read(filePath);
  for (const section of sections) {
    const pattern = new RegExp(`^#{1,3}\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$|[:：])`, "m");
    if (!pattern.test(text)) addIssue(`${label} missing markdown section: ${section}`);
  }
  evidence.push(`${label}: markdown sections checked`);
}

function yamlTopLevelKeys(text) {
  const keys = new Set();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (match) keys.add(match[1]);
  }
  return keys;
}

function assertManifestShape() {
  const schemaPath = path.join(kitRoot, "schemas", "project.manifest.schema.json");
  const manifestPath = path.join(projectRoot, "project.manifest.yml");
  const schema = assertJsonObject("project manifest schema", schemaPath, ["$schema", "title", "type", "required", "properties"]);
  if (!assertExists("generated project manifest", manifestPath) || !schema) return;

  const manifest = read(manifestPath);
  const topLevelKeys = yamlTopLevelKeys(manifest);
  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const key of required) {
    if (!topLevelKeys.has(key)) addIssue(`project.manifest.yml missing schema-required top-level key: ${key}`);
  }
  for (const requiredLine of ["project:", "knowledge:", "workflow:", "privacy:", "execution_runtime:", "frontend_design:", "command_facade:"]) {
    if (!manifest.includes(requiredLine)) addIssue(`project.manifest.yml missing expected block: ${requiredLine}`);
  }
  for (const requiredLine of ['strategy: "auto"', 'taste: "auto"']) {
    if (!manifest.includes(requiredLine)) addIssue(`project.manifest.yml missing frontend design default: ${requiredLine}`);
  }
  for (const requiredLine of ['name: "schema_fixture"', 'type: "greenfield-app"', "root:"]) {
    if (!manifest.includes(requiredLine)) addIssue(`project.manifest.yml missing project field: ${requiredLine}`);
  }
  evidence.push(`project.manifest.yml: schema-required top-level keys checked (${required.join(", ")})`);
}

function assertSchemaDocs() {
  assertMarkdownSections("issue record schema", path.join(kitRoot, "schemas", "issue-record.schema.md"), [
    "Issue Record Schema",
  ]);
  assertMarkdownSections("phase record schema", path.join(kitRoot, "schemas", "phase-record.schema.md"), [
    "Phase Record Schema",
  ]);

  const issueText = read(path.join(kitRoot, "schemas", "issue-record.schema.md"));
  for (const required of ["Summary", "Evidence", "Graph / RAG Analysis", "Verification Result", "Zhulong Evidence Writeback"]) {
    if (!issueText.includes(required)) addIssue(`issue-record schema missing required concept: ${required}`);
  }

  const phaseText = read(path.join(kitRoot, "schemas", "phase-record.schema.md"));
  for (const required of ["Objective", "Graph/RAG evidence", "Verification", "Follow-ups"]) {
    if (!phaseText.includes(required)) addIssue(`phase-record schema missing required concept: ${required}`);
  }
}

function assertWorkflowShape() {
  const activePath = path.join(projectRoot, ".planning", "workflows", "ACTIVE.json");
  const active = assertJsonObject("active workflow pointer", activePath, ["id", "workflow", "updatedAt"]);
  if (!active?.id) return;

  const workflowRoot = path.join(projectRoot, ".planning", "workflows", active.id);
  const statePath = path.join(workflowRoot, "WORKFLOW_STATE.json");
  const state = assertJsonObject("workflow state", statePath, [
    "id",
    "workflow",
    "request",
    "status",
    "createdAt",
    "updatedAt",
    "contextPacket",
    "handoff",
    "manualGates",
  ]);
  if (!state) return;

  if (state.id !== active.id) addIssue(`workflow state id does not match ACTIVE.json: ${state.id} !== ${active.id}`);
  if (state.workflow !== "debug") addIssue(`workflow state expected debug workflow, got: ${state.workflow}`);
  if (state.status !== "running") addIssue(`workflow state expected running after manual gates, got: ${state.status}`);
  for (const gate of ["plan", "implementation", "verification"]) {
    if (!state.manualGates?.[gate]?.evidence) addIssue(`workflow manual gate missing evidence: ${gate}`);
  }

  assertExists("workflow state markdown", path.join(workflowRoot, "WORKFLOW_STATE.md"));
  assertExists("workflow plan record", path.join(workflowRoot, "PLAN.md"));
  assertExists("workflow implementation record", path.join(workflowRoot, "IMPLEMENTATION.md"));
  assertExists("workflow verification record", path.join(workflowRoot, "VERIFICATION.md"));
  assertExists("workflow context packet", state.contextPacket);
  assertExists("workflow handoff", state.handoff);
}

function assertEvidenceShape() {
  const evidenceDir = path.join(projectRoot, ".planning", "evidence");
  const indexPath = path.join(evidenceDir, "INDEX.md");
  assertMarkdownSections("evidence index", indexPath, ["Evidence Index", "Records"]);

  const records = fs.existsSync(evidenceDir)
    ? fs.readdirSync(evidenceDir).filter((name) => name.endsWith(".md") && !["INDEX.md", "README.md", "RECORD_TEMPLATE.md"].includes(name))
    : [];
  if (records.length !== 1) {
    addIssue(`expected exactly one evidence record, got ${records.length}`);
    return;
  }

  const recordPath = path.join(evidenceDir, records[0]);
  assertMarkdownSections("evidence record", recordPath, [
    "Evidence Record:",
    "Scope",
    "Specification Evidence",
    "Code Map Evidence",
    "Verification",
    "Remaining Risk",
    "Rollback",
    "Follow-ups",
  ]);
  const recordText = read(recordPath);
  for (const expected of ["schema validation evidence", "node --version", "passed"]) {
    if (!recordText.includes(expected)) addIssue(`evidence record missing expected text: ${expected}`);
  }

  const debugRecord = path.join(projectRoot, ".planning", "debug", "schema-debug.md");
  assertExists("debug writeback target", debugRecord);
  if (!read(debugRecord).includes("Zhulong Evidence Writeback")) {
    addIssue("debug writeback target missing Zhulong Evidence Writeback section");
  }
}

fs.mkdirSync(projectRoot, { recursive: true });
write(path.join(projectRoot, "src", "index.js"), "export function schemaSmoke() { return 'Zhulong schema smoke'; }\n");
write(path.join(projectRoot, "docs", "specs", "schema.md"), [
  "# Schema Smoke 仕様",
  "",
  "- SCHEMA_SENTINEL_20260625",
  "- Zhulong workflow state, evidence, and manifest must be locally inspectable.",
  "",
].join("\n"));

zl(["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "schema_fixture", "--mode", "new", "--force"]);
zl(["codebase", "scan", "--target", projectRoot]);
zl(["docs", "scan", "--target", projectRoot]);
write(path.join(projectRoot, ".planning", "graphs", "graph.json"), `${JSON.stringify({
  nodes: [{ id: "src/index.js", path: "src/index.js" }],
  edges: [],
}, null, 2)}\n`);
write(path.join(projectRoot, ".planning", "graphs", "GRAPH_REPORT.md"), "# Graph Report\n\n- schema fixture graph\n");
const graphTime = new Date(Date.now() + 5000);
fs.utimesSync(path.join(projectRoot, ".planning", "graphs", "graph.json"), graphTime, graphTime);
fs.utimesSync(path.join(projectRoot, ".planning", "graphs", "GRAPH_REPORT.md"), graphTime, graphTime);

write(path.join(projectRoot, ".planning", "debug", "schema-debug.md"), [
  "# Schema Debug Record",
  "",
  "## Summary",
  "",
  "Schema validation smoke fixture.",
  "",
].join("\n"));

zl(["workflow", "run", "debug", "--target", projectRoot, "schema validation smoke"]);
const earlyAudit = zl(["workflow", "audit", "--target", projectRoot], { allowFailure: true });
assertOutputIncludes("workflow audit before gates", earlyAudit.output, "workflow guard FAIL");
assertOutputIncludes("workflow audit next command", earlyAudit.output, "next plan:");
zl(["workflow", "continue", "--target", projectRoot, "--gate", "plan", "--evidence", ".planning/workflows/*/PLAN.md reviewed"]);
zl(["workflow", "continue", "--target", projectRoot, "--gate", "implementation", "--evidence", "schema fixture files generated"]);
zl(["workflow", "continue", "--target", projectRoot, "--gate", "verification", "--evidence", "verify:schema structural checks"]);
zl([
  "evidence",
  "record",
  "--target",
  projectRoot,
  "schema validation evidence",
  "--debug",
  "schema-debug",
  "--source",
  "docs/specs/schema.md",
  "--command",
  "node --version",
  "--result",
  "passed",
  "--risk",
  "schema smoke only",
  "--rollback",
  "remove fixture temp directory",
]);
const finalAudit = zl(["workflow", "audit", "--target", projectRoot]);
assertOutputIncludes("workflow audit after evidence", finalAudit.output, "workflow guard PASS");

assertManifestShape();
assertSchemaDocs();
assertWorkflowShape();
assertEvidenceShape();

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  evidence,
  issues,
};

writeJsonReport("schema-check.json", data);
writeMarkdownReport("schema-check.md", "Zhulong Schema Check", summarizeIssues(issues), [
  {
    title: "Evidence",
    body: evidence.length === 0 ? ["No evidence recorded."] : evidence.map((item) => `- ${item}`),
  },
  {
    title: "Fixture Paths",
    body: [
      `- Work root: \`${workRoot}\``,
      `- Project root: \`${projectRoot}\``,
      `- Reproduce command: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-schema.mjs"))}\``,
    ],
  },
  {
    title: "Issues",
    body: issues.length === 0 ? ["No schema issues found."] : issues.map((issue) => `- ${issue.detail}`),
  },
]);

console.log(`schema check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
