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
const workRoot = tempRoot("zhulong-workflow-governance-");
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

function record(label, result, expectedStatus = 0) {
  commandResults.push({
    label,
    status: result.status,
    expectedStatus,
    stdout: result.stdout.trim().slice(0, 4000),
    stderr: result.stderr.trim().slice(0, 4000),
  });
  if (result.status === expectedStatus) evidence.push(`${label}: exit ${expectedStatus}`);
  else issues.push({ label, detail: `exit ${result.status}, expected ${expectedStatus}` });
  return result;
}

function zl(label, args, expectedStatus = 0) {
  return record(label, runCommand(label, "node", [zlCli, ...args], {
    cwd: projectRoot,
    timeout: 240000,
    allowFailure: true,
  }), expectedStatus);
}

function assertIncludes(label, text, expected) {
  if (text.includes(expected)) evidence.push(`${label}: found ${expected}`);
  else issues.push({ label, detail: `missing expected text: ${expected}` });
}

function activeState() {
  const active = JSON.parse(read(path.join(projectRoot, ".planning", "workflows", "ACTIVE.json")));
  const statePath = path.join(projectRoot, ".planning", "workflows", active.id, "WORKFLOW_STATE.json");
  return { active, statePath, state: JSON.parse(read(statePath)) };
}

function prepareProject() {
  write(path.join(projectRoot, "src", "index.js"), "export const governanceFixture = true;\n");
  write(path.join(projectRoot, "test", "index.test.js"), "console.log('GOVERNANCE_FIXTURE');\n");
  zl("init", ["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "workflow_governance", "--mode", "new", "--force"]);
  zl("codebase", ["codebase", "scan", "--target", projectRoot]);
  write(path.join(projectRoot, ".planning", "graphs", "graph.json"), JSON.stringify({ nodes: [{ id: "src/index.js", path: "src/index.js" }], edges: [] }, null, 2));
  write(path.join(projectRoot, ".planning", "graphs", "GRAPH_REPORT.md"), "# Graph Report\n\nworkflow governance fixture\n");
  const future = new Date(Date.now() + 5000);
  fs.utimesSync(path.join(projectRoot, ".planning", "graphs", "graph.json"), future, future);
  fs.utimesSync(path.join(projectRoot, ".planning", "graphs", "GRAPH_REPORT.md"), future, future);
  zl("offline lock", ["privacy", "offline-lock", "--target", projectRoot]);
}

function markArtifacts(gates) {
  const { active } = activeState();
  const names = { plan: "PLAN.md", implementation: "IMPLEMENTATION.md", verification: "VERIFICATION.md" };
  for (const gate of gates) {
    const artifact = path.join(projectRoot, ".planning", "workflows", active.id, names[gate]);
    write(artifact, `# ${gate}: ${active.id}\n\nStatus: complete\n\nEvidence:\n\n- governance fixture passed\n`);
    zl(`${gate} gate`, ["workflow", "continue", "--target", projectRoot, "--gate", gate, "--evidence", path.relative(projectRoot, artifact)]);
  }
}

function durableEvidence(label) {
  zl(`${label} evidence`, [
    "evidence", "record", "--target", projectRoot,
    `${label} evidence`, "--type", "verification",
    "--command", "fixture", "--result", "passed",
    "--writeback", `.planning/issues/${label}.md`,
  ]);
}

function interactiveScenario() {
  zl("interactive workflow", ["workflow", "run", "--target", projectRoot, "plan-phase", "Plan interactive governance"]);
  const arbitrary = zl("reject arbitrary evidence", ["workflow", "continue", "--target", projectRoot, "--gate", "plan", "--evidence", "plan accepted"], 1);
  assertIncludes("arbitrary evidence is rejected", arbitrary.output, "evidence file does not exist");
  markArtifacts(["plan", "verification"]);
  durableEvidence("interactive-governance");
  const blocked = zl("completion without acceptance", ["workflow", "completion-check", "--target", projectRoot], 1);
  assertIncludes("interactive acceptance gate", blocked.output, "FAIL authorization");
  const before = activeState();
  if (before.state.status === "complete") issues.push({ label: "read-only completion", detail: "completion-check mutated status" });
  else evidence.push("completion-check is read-only while blocked");
  const forgedAcceptance = zl("reject unbound acceptance", [
    "workflow", "accept", "--target", projectRoot, "--request", "agent says accepted",
  ], 1);
  assertIncludes("acceptance requires explicit source", forgedAcceptance.output, "--source user-message");
  zl("accept current workflow", ["workflow", "accept", "--target", projectRoot, "--source", "user-message", "--request", "approve this plan workflow"]);
  const eligible = zl("eligible completion", ["workflow", "completion-check", "--target", projectRoot]);
  assertIncludes("completion is eligible", eligible.output, "completion eligible");
  if (activeState().state.status === "complete") issues.push({ label: "read-only eligibility", detail: "completion-check set complete" });
  else evidence.push("eligible completion-check remains read-only");
  zl("explicit complete", ["workflow", "complete", "--target", projectRoot]);
  if (activeState().state.status === "complete") evidence.push("workflow complete is the explicit state mutation");
  else issues.push({ label: "explicit complete", detail: "status was not complete" });
}

function directUserIntentScenario() {
  zl("direct user workflow", [
    "workflow", "run", "--target", projectRoot, "plan-phase",
    "Plan the explicitly requested change", "--source", "user-message",
  ]);
  markArtifacts(["plan", "verification"]);
  durableEvidence("direct-user-intent");
  const blocked = zl("direct intent is not acceptance", ["workflow", "completion-check", "--target", projectRoot], 1);
  assertIncludes("direct user message authorizes current work", blocked.output, "PASS authorization current user request");
  assertIncludes("direct request does not pre-accept result", blocked.output, "FAIL acceptance");
  zl("accept direct intent result", [
    "workflow", "accept", "--target", projectRoot, "--source", "user-message",
    "--request", "reviewed and accept this plan result",
  ]);
  const eligible = zl("direct intent completion", ["workflow", "completion-check", "--target", projectRoot]);
  assertIncludes("reviewed result is eligible", eligible.output, "PASS acceptance current workflow user acceptance");
  zl("complete direct intent", ["workflow", "complete", "--target", projectRoot]);
}

function explicitCompletionIntentScenario() {
  zl("explicit completion intent", [
    "workflow", "run", "--target", projectRoot, "verify-work",
    "verify and close this workflow", "--source", "user-message", "--accept-completion",
  ]);
  markArtifacts(["verification"]);
  durableEvidence("explicit-completion-intent");
  const eligible = zl("pre-authorized completion", ["workflow", "completion-check", "--target", projectRoot]);
  assertIncludes("explicit close intent passes authorization", eligible.output, "PASS authorization current user request");
  assertIncludes("explicit close intent passes acceptance", eligible.output, "PASS acceptance current workflow user acceptance");
  zl("complete pre-authorized result", ["workflow", "complete", "--target", projectRoot]);
}

function boundedGoalScenario() {
  const contractPath = path.join(projectRoot, ".planning", "goals", "MVP4_CONTRACTS.json");
  write(contractPath, `${JSON.stringify({
    schemaVersion: "zhulong.milestone-contracts.v1",
    milestones: [
      { id: "MVP4.0", objective: "UI contract MVP4.0", actions: ["ui"], acceptance: ["UI decision recorded"] },
      { id: "MVP4.1", objective: "Plan MVP4.1", actions: ["plan", "execute"], acceptance: ["plan verified"], permissions: { commit: true } },
    ],
  }, null, 2)}\n`);
  const authorization = zl("authorize bounded goal", [
    "workflow", "authorize", "--target", projectRoot,
    "--goal", "MVP4 delivery", "--contract-file", path.relative(projectRoot, contractPath), "--commit",
    "--source", "user-message", "--request", "自动执行 MVP4.0 到 MVP4.1 并设为持续 Goal",
  ]);
  const grantId = authorization.output.match(/authorization\s+(\S+)/)?.[1];
  const contractDigests = new Map([...authorization.output.matchAll(/^contract\s+(\S+)\s+(\S+)\s+/gm)].map((match) => [match[1], match[2]]));
  if (!grantId) {
    issues.push({ label: "bounded goal", detail: "authorization id missing" });
    return;
  }
  if (!contractDigests.get("MVP4.0") || !contractDigests.get("MVP4.1")) {
    issues.push({ label: "bounded goal", detail: "milestone contract digest missing" });
    return;
  }
  zl("authorization status", ["workflow", "authorization-status", "--target", projectRoot, "--authorization", grantId]);
  zl("MVP4.0 UI", ["workflow", "run", "--target", projectRoot, "ui-phase", "UI contract MVP4.0", "--authorization", grantId, "--milestone", "MVP4.0", "--contract-digest", contractDigests.get("MVP4.0")]);
  zl("UI decisions open", ["workflow", "decisions", "--target", projectRoot, "--confirmed", "existing tokens", "--open-questions", "product direction"]);
  markArtifacts(["plan", "verification"]);
  durableEvidence("mvp4-0-ui");
  const decisionBlocked = zl("material decision blocks", ["workflow", "completion-check", "--target", projectRoot], 1);
  assertIncludes("open decision blocks", decisionBlocked.output, "FAIL decisions");
  zl("UI decisions resolved", ["workflow", "decisions", "--target", projectRoot, "--confirmed", "existing tokens,user-approved direction"]);
  const eligible = zl("Goal-authorized UI eligible", ["workflow", "completion-check", "--target", projectRoot]);
  assertIncludes("Goal authorization passes", eligible.output, "PASS authorization");
  zl("complete MVP4.0 UI", ["workflow", "complete", "--target", projectRoot]);

  zl("MVP4.1 plan", ["workflow", "run", "--target", projectRoot, "plan-phase", "Plan MVP4.1", "--authorization", grantId, "--milestone", "MVP4.1", "--contract-digest", contractDigests.get("MVP4.1")]);
  markArtifacts(["plan", "verification"]);
  durableEvidence("mvp4-1-plan");
  const nextEligible = zl("same Goal reused", ["workflow", "completion-check", "--target", projectRoot]);
  assertIncludes("same Goal authorizes next milestone", nextEligible.output, "PASS authorization");
  const commitAllowed = zl("contract commit permission", ["workflow", "permission-check", "--target", projectRoot, "--permission", "commit"]);
  assertIncludes("contract permission is consumed", commitAllowed.output, "PASS permission commit");
  const pushBlocked = zl("contract push denied", ["workflow", "permission-check", "--target", projectRoot, "--permission", "push"], 1);
  assertIncludes("ungranted permission is denied", pushBlocked.output, "FAIL permission push");

  zl("mismatched objective", ["workflow", "run", "--target", projectRoot, "execute-phase", "Delete unrelated billing module", "--authorization", grantId, "--milestone", "MVP4.1", "--contract-digest", contractDigests.get("MVP4.1")]);
  const mismatch = zl("mismatched objective blocked", ["workflow", "completion-check", "--target", projectRoot], 1);
  assertIncludes("contract objective boundary enforced", mismatch.output, "does not match the authorized objective");

  zl("out-of-scope plan", ["workflow", "run", "--target", projectRoot, "plan-phase", "Plan MVP4.2", "--authorization", grantId, "--milestone", "MVP4.2"]);
  const outside = zl("out-of-scope blocked", ["workflow", "completion-check", "--target", projectRoot], 1);
  assertIncludes("milestone boundary enforced", outside.output, "outside the authorized milestones");

  zl("revoke goal", ["workflow", "revoke", "--target", projectRoot, "--authorization", grantId, "--reason", "user stopped automatic execution"]);
  const revoked = zl("revoked authorization status", ["workflow", "authorization-status", "--target", projectRoot, "--authorization", grantId]);
  assertIncludes("revocation persisted", revoked.output, "status revoked");
}

prepareProject();
interactiveScenario();
directUserIntentScenario();
explicitCompletionIntentScenario();
boundedGoalScenario();

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  evidence,
  commandResults,
  issues,
};

writeJsonReport("workflow-governance-check.json", data);
writeMarkdownReport("workflow-governance-check.md", "Zhulong Workflow Governance Verification", summarizeIssues(issues), [
  { title: "Coverage", body: [
    "- Interactive workflow separates current-work authorization from result acceptance.",
    "- Explicit complete/close intent may pre-authorize completion; ordinary work requests may not.",
    "- Arbitrary strings and historical evidence cannot satisfy gates.",
    "- Completion checks are read-only; explicit completion mutates state.",
    "- One natural-language bounded Goal authorization is reused across listed MVPs.",
    "- Open decisions, out-of-scope milestones, and revoked grants block progression.",
  ] },
  { title: "Fixture", body: [`- Work root: \`${workRoot}\``, `- Reproduce: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-workflow-governance.mjs"))}\``] },
  { title: "Issues", body: issues.length ? issues.map((item) => `- ${item.label}: ${item.detail}`) : ["No governance issues found."] },
]);

console.log(`workflow governance check ${data.status} issues=${issues.length}`);
if (issues.length) process.exitCode = 1;
