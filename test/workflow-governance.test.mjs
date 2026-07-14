import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  authorizationPermissionForState,
  authorizationForState,
  boundEvidenceRecords,
  hasBoundWriteback,
  parseManifestWorkflow,
  readEffectiveInteractionPolicy,
  validateWorkflowEvidence,
  writeAuthorization,
} from "../src/workflow/governance.mjs";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "zhulong-governance-"));
  fs.mkdirSync(path.join(root, ".planning"), { recursive: true });
  fs.writeFileSync(path.join(root, "project.manifest.yml"), [
    "project:",
    "  name: fixture",
    "workflow:",
    "  mode: interactive",
    "  auto_advance: false",
    "privacy:",
    "  network_policy: local_only",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(root, ".planning", "config.json"), JSON.stringify({
    mode: "interactive",
    workflow: {
      auto_advance: false,
      require_explicit_user_intent: true,
      allow_goal_authorization: true,
    },
  }, null, 2));
  return root;
}

test("parses the complete manifest workflow block", () => {
  assert.deepEqual(parseManifestWorkflow("project:\n  name: x\nworkflow:\n  mode: interactive\n  auto_advance: false\nprivacy:\n  local: true\n"), {
    mode: "interactive",
    auto_advance: false,
  });
});

test("interactive auto advance conflict fails closed", () => {
  const root = fixture();
  const configPath = path.join(root, ".planning", "config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  config.workflow.auto_advance = true;
  fs.writeFileSync(configPath, JSON.stringify(config));
  const policy = readEffectiveInteractionPolicy(root);
  assert.equal(policy.valid, false);
  assert.equal(policy.autoAdvance, false);
  assert.ok(policy.contradictions.length >= 1);
});

test("manifest and planning config mode disagreements fail closed", () => {
  const root = fixture();
  const manifestPath = path.join(root, "project.manifest.yml");
  fs.writeFileSync(manifestPath, fs.readFileSync(manifestPath, "utf8").replace("mode: interactive", "mode: autonomous"));
  const policy = readEffectiveInteractionPolicy(root);
  assert.equal(policy.valid, false);
  assert.equal(policy.autoAdvance, false);
  assert.match(policy.contradictions.join("\n"), /workflow mode/);
});

test("manifest can disable bounded Goal authorization when config does not override it", () => {
  const root = fixture();
  fs.writeFileSync(path.join(root, "project.manifest.yml"), [
    "project:",
    "  name: fixture",
    "workflow:",
    "  mode: interactive",
    "  auto_advance: false",
    "  allow_goal_authorization: false",
    "",
  ].join("\n"));
  const configPath = path.join(root, ".planning", "config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  delete config.workflow.allow_goal_authorization;
  fs.writeFileSync(configPath, JSON.stringify(config));
  assert.equal(readEffectiveInteractionPolicy(root).allowGoalAuthorization, false);
  assert.throws(() => writeAuthorization(root, {
    goal: "blocked goal",
    milestones: "MVP4.0",
    source: "user-message",
    request: "自动执行 MVP4.0",
  }), /disables goal authorization/);
});

test("legacy milestone-only grants remain non-mutating", () => {
  const root = fixture();
  const { grant } = writeAuthorization(root, {
    goal: "MVP4 delivery",
    milestones: "MVP4.0,MVP4.1",
    actions: "plan,execute,verify,advance",
    source: "user-message",
    request: "自动执行 MVP4.0 到 MVP4.1",
    dependencies: true,
    push: false,
  });
  assert.equal(grant.permissions.dependencies, true);
  assert.equal(grant.permissions.push, false);
  assert.equal(grant.scopeEnforcement, "legacy_milestone_only");
  assert.match(authorizationForState(root, { authorizationRef: grant.id, milestone: "MVP4.0" }, { authorizationAction: "execute" }).reason, /structured milestone contract/);
  assert.equal(authorizationForState(root, { authorizationRef: grant.id, milestone: "MVP4.0" }, { authorizationAction: "plan" }).ok, true);
  assert.match(authorizationPermissionForState(root, { authorizationRef: grant.id, milestone: "MVP4.0" }, { authorizationAction: "plan" }, "dependencies").reason, /structured milestone contract/);
  assert.equal(authorizationForState(root, { authorizationRef: grant.id, milestone: "MVP4.2" }, { authorizationAction: "plan" }).ok, false);
  assert.equal(authorizationForState(root, { authorizationRef: grant.id, milestone: "MVP4.0" }, { authorizationAction: "release" }).ok, false);
});

test("authorization rejects invalid milestone ids and unknown actions", () => {
  const root = fixture();
  const base = {
    goal: "invalid contract",
    source: "user-message",
    request: "自动执行",
  };
  assert.throws(() => writeAuthorization(root, { ...base, milestones: "phase-1" }), /invalid milestone ids/);
  assert.throws(() => writeAuthorization(root, { ...base, milestones: "MVP1.0", actions: "plan,destroy" }), /unknown authorization actions/);
  assert.throws(() => writeAuthorization(root, {
    ...base,
    actions: "plan",
    milestoneContracts: [{ id: "phase-1", objective: "Plan phase one", actions: ["plan"] }],
  }), /invalid milestone contract id/);
  const contractPath = path.join(root, ".planning", "invalid-contract.json");
  fs.writeFileSync(contractPath, JSON.stringify({ schemaVersion: "wrong", milestones: [{ id: "MVP1.0", objective: "Plan" }] }));
  assert.throws(() => writeAuthorization(root, { ...base, contractFile: ".planning/invalid-contract.json" }), /schemaVersion/);
});

test("structured milestone contracts bind action, digest, and exact objective", () => {
  const root = fixture();
  const { grant } = writeAuthorization(root, {
    goal: "N3 delivery",
    actions: "plan,execute,verify",
    source: "user-message",
    request: "自动完成 MVP4.3 的 N3 题库",
    dependencies: true,
    milestoneContracts: [{
      id: "MVP4.3",
      objective: "完成 N3 的 300 道独立母题",
      actions: ["plan", "execute", "verify"],
      allowedPaths: ["content/n3/**"],
      acceptance: ["300 independent questions"],
      permissions: { dependencies: true },
    }],
  });
  const contract = grant.milestoneContracts[0];
  const state = {
    authorizationRef: grant.id,
    milestone: "MVP4.3",
    contractDigest: contract.digest,
    request: contract.objective,
  };
  assert.equal(authorizationForState(root, state, { authorizationAction: "execute" }).ok, true);
  assert.match(authorizationForState(root, { ...state, request: "Delete unrelated billing module" }, { authorizationAction: "execute" }).reason, /does not match/);
  assert.match(authorizationForState(root, { ...state, contractDigest: "forged" }, { authorizationAction: "execute" }).reason, /digest/);
  assert.equal(authorizationPermissionForState(root, state, { authorizationAction: "execute" }, "dependencies").ok, true);
  assert.equal(authorizationPermissionForState(root, state, { authorizationAction: "execute" }, "push").ok, false);
});

test("bounded authorization enforces its declared stop milestone", () => {
  const root = fixture();
  const { grant } = writeAuthorization(root, {
    goal: "partial delivery",
    milestones: "MVP4.0,MVP4.1,MVP4.2",
    stopAfter: "MVP4.1",
    source: "user-message",
    request: "自动执行到 MVP4.1 后停止",
  });
  const route = { authorizationAction: "plan" };
  assert.equal(authorizationForState(root, { authorizationRef: grant.id, milestone: "MVP4.1" }, route).ok, true);
  assert.match(authorizationForState(root, { authorizationRef: grant.id, milestone: "MVP4.2" }, route).reason, /stop boundary/);
  assert.throws(() => writeAuthorization(root, {
    goal: "invalid stop",
    milestones: "MVP4.0,MVP4.1",
    stopAfter: "MVP4.2",
    source: "user-message",
    request: "自动执行",
  }), /stop-after/);
});

test("manual gates reject arbitrary strings and accept current typed artifacts", () => {
  const root = fixture();
  const state = {
    id: "plan-phase-mvp4-0",
    createdAt: new Date(Date.now() - 1000).toISOString(),
  };
  assert.throws(() => validateWorkflowEvidence(root, state, "plan", "plan accepted"), /does not exist/);
  const dir = path.join(root, ".planning", "workflows", state.id);
  fs.mkdirSync(dir, { recursive: true });
  const evidencePath = path.join(dir, "PLAN.md");
  fs.writeFileSync(evidencePath, `# Plan: ${state.id}\n\nStatus: complete\n\nEvidence:\n\n- reviewed\n`);
  const result = validateWorkflowEvidence(root, state, "plan", path.relative(root, evidencePath));
  assert.equal(result.type, "plan");
  assert.equal(result.path, `.planning/workflows/${state.id}/PLAN.md`);
});

test("durable evidence and writeback require current bound verification results", () => {
  const root = fixture();
  const state = { id: "verify-mvp4-0", createdAt: new Date(Date.now() - 1000).toISOString() };
  const evidenceDir = path.join(root, ".planning", "evidence");
  const issueDir = path.join(root, ".planning", "issues");
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.mkdirSync(issueDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, "failed.md"), [
    "# Evidence Record: failed",
    `- Workflow: ${state.id}`,
    "- Evidence type: verification",
    "- Status: failed",
    "- Result: failed",
  ].join("\n"));
  assert.equal(boundEvidenceRecords(root, state).length, 0);
  fs.writeFileSync(path.join(evidenceDir, "passed.md"), [
    "# Evidence Record: passed",
    `- Workflow: ${state.id}`,
    "- Evidence type: verification",
    "- Status: passed",
    "- Result: passed",
  ].join("\n"));
  assert.equal(boundEvidenceRecords(root, state).length, 1);
  fs.writeFileSync(path.join(issueDir, "record.md"), [
    "# Record",
    "## Zhulong Evidence Writeback - now",
    `- Workflow: ${state.id}`,
    "- Evidence type: verification",
    "- Result: passed",
  ].join("\n"));
  assert.equal(hasBoundWriteback(root, state), true);
});
