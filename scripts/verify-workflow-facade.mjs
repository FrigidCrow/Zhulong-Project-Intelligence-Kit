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
const workRoot = tempRoot("aipikit-workflow-facade-");
const projectRoot = path.join(workRoot, "project");
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

function pik(args = [], options = {}) {
  const command = `pik ${args.join(" ")}`;
  return record(command, runCommand(command, "node", [pikCli, ...args], {
    cwd: options.cwd || projectRoot,
    timeout: options.timeout || 240000,
    allowFailure: true,
  }), options.expectedStatus ?? 0);
}

function assertIncludes(command, text, expected) {
  if (!text.includes(expected)) addIssue(command, `missing expected text: ${expected}`);
  else evidence.push(`${command}: found ${expected}`);
}

function assertFileIncludes(command, filePath, expected) {
  if (!fs.existsSync(filePath)) {
    addIssue(command, `missing file: ${path.relative(projectRoot, filePath)}`);
    return;
  }
  assertIncludes(command, read(filePath), expected);
}

function newestFacadeFile() {
  const root = path.join(projectRoot, ".planning", "workflows");
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name === "WORKFLOW_FACADE.md") files.push(p);
    }
  }
  walk(root);
  return files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
}

function prepareProject() {
  fs.mkdirSync(projectRoot, { recursive: true });
  write(path.join(projectRoot, "src", "approval.js"), "export const approvalLimit = 42000;\n");
  write(path.join(projectRoot, "test", "approval.test.js"), "console.log('WORKFLOW_FACADE_TEST');\n");
  write(path.join(projectRoot, "docs", "spec.md"), "# Spec\n\nWORKFLOW_FACADE_SPEC citation target.\n");
  pik(["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "workflow_facade_fixture", "--mode", "new", "--force"]);
  pik(["codebase", "scan", "--target", projectRoot]);
  pik(["docs", "scan", "--target", projectRoot]);
  pik(["docs", "extract", "--target", projectRoot]);
  pik(["docs", "citations", "--target", projectRoot, "WORKFLOW_FACADE_SPEC"]);
  const graphDir = path.join(projectRoot, ".planning", "graphs");
  write(path.join(graphDir, "graph.json"), JSON.stringify({
    nodes: [{ id: "src/approval.js", path: "src/approval.js" }],
    edges: [],
  }, null, 2));
  write(path.join(graphDir, "GRAPH_REPORT.md"), "# Graph Report\n\nWORKFLOW_FACADE_GRAPH src/approval.js\n");
  const future = new Date(Date.now() + 5000);
  fs.utimesSync(path.join(graphDir, "graph.json"), future, future);
  fs.utimesSync(path.join(graphDir, "GRAPH_REPORT.md"), future, future);
}

function makeGraphStale() {
  const future = new Date(Date.now() + 10000);
  fs.utimesSync(path.join(projectRoot, "src", "approval.js"), future, future);
}

prepareProject();

const debug = pik(["workflow", "run", "--target", projectRoot, "debug", "WORKFLOW_FACADE debug"]);
assertIncludes("pik-debug facade output", debug.output, "facade");
assertIncludes("pik-debug no heavy refresh", debug.output, "heavy refresh executed: no");
let facade = newestFacadeFile();
assertFileIncludes("debug WORKFLOW_FACADE", facade, "AI-PIKit Workflow Facade");
assertFileIncludes("debug WORKFLOW_FACADE heavy", facade, "Heavy refresh executed: no");
assertFileIncludes("debug WORKFLOW_FACADE policy", facade, "## Policy");

const plan = pik(["workflow", "run", "--target", projectRoot, "plan-phase", "WORKFLOW_FACADE plan"]);
assertIncludes("pik-plan-phase facade output", plan.output, "facade");
facade = newestFacadeFile();
assertFileIncludes("plan WORKFLOW_FACADE", facade, "pik-plan-phase");

makeGraphStale();
const execute = pik(["workflow", "run", "--target", projectRoot, "execute-phase", "WORKFLOW_FACADE execute"]);
assertIncludes("pik-execute-phase stale facade", execute.output, "STALE_NEEDS_REFRESH");
facade = newestFacadeFile();
assertFileIncludes("execute WORKFLOW_FACADE stale", facade, "STALE_NEEDS_REFRESH");
assertFileIncludes("execute WORKFLOW_FACADE no refresh", facade, "Heavy refresh executed: no");
if (fs.existsSync(path.join(projectRoot, ".planning", "refresh", "REFRESH_RUN.md"))) {
  addIssue("workflow facade heavy refresh", "REFRESH_RUN.md should not be created by public workflow facade");
} else {
  evidence.push("public workflow facade did not create REFRESH_RUN.md");
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  evidence,
  commandResults,
  issues,
};

writeJsonReport("workflow-facade-check.json", data);
writeMarkdownReport("workflow-facade-check.md", "AI-PIKit Workflow Facade Verification", summarizeIssues(issues), [
  {
    title: "证据",
    body: evidence.length ? evidence.map((item) => `- ${item}`) : ["未记录证据。"],
  },
  {
    title: "Fixture 路径",
    body: [
      `- Work root: \`${workRoot}\``,
      `- Project root: \`${projectRoot}\``,
      `- 复现命令: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-workflow-facade.mjs"))}\``,
    ],
  },
  {
    title: "问题",
    body: issues.length ? issues.map((issue) => `- \`${issue.command}\`: ${issue.detail}`) : ["未发现 workflow facade 问题。"],
  },
]);

console.log(`workflow facade check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
