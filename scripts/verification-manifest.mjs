const SHARED_TIERS = ["ci", "release", "local-rag"];

function task(id, script, tiers = SHARED_TIERS, dependsOn = []) {
  return { id, script, tiers, dependsOn };
}

export const VERIFICATION_TASKS = [
  task("syntax", "check"),
  task("unit", "test", SHARED_TIERS, ["syntax"]),
  task("cli-contract", "verify:cli-contract", SHARED_TIERS, ["unit"]),
  task("docs", "verify:docs", SHARED_TIERS, ["syntax"]),
  task("docs-update", "verify:docs-update", SHARED_TIERS, ["docs"]),
  task("rag-matrix", "verify:rag", SHARED_TIERS, ["syntax"]),
  task("docs-extract", "verify:docs-extract", SHARED_TIERS, ["docs"]),
  task("docs-sync", "verify:docs-sync", SHARED_TIERS, ["docs-extract"]),
  task("ambiguity", "verify:ambiguity", SHARED_TIERS, ["syntax"]),
  task("structure", "verify:structure", SHARED_TIERS, ["syntax"]),
  task("answer-audit", "verify:answer-audit", SHARED_TIERS, ["docs-extract"]),
  task("guardrails", "verify:guardrails", SHARED_TIERS, ["syntax"]),
  task("knowledge-reliability", "verify:knowledge-reliability", SHARED_TIERS, ["docs-sync", "answer-audit"]),
  task("graph-hardening", "verify:graph-hardening", SHARED_TIERS, ["syntax"]),
  task("privacy-strict", "verify:privacy-strict", SHARED_TIERS, ["syntax"]),
  task("security-governance", "verify:security-governance", SHARED_TIERS, ["privacy-strict"]),
  task("license", "verify:license", SHARED_TIERS, ["syntax"]),
  task("mvp3", "verify:mvp3", SHARED_TIERS, ["graph-hardening", "answer-audit"]),
  task("mvp35", "verify:mvp35", SHARED_TIERS, ["mvp3"]),
  task("workflow-facade", "verify:workflow-facade", SHARED_TIERS, ["mvp35"]),
  task("workflow-governance", "verify:workflow-governance", SHARED_TIERS, ["workflow-facade"]),
  task("policy-hardening", "verify:policy-hardening", SHARED_TIERS, ["workflow-governance"]),
  task("init-policy", "verify:init-policy", SHARED_TIERS, ["policy-hardening"]),
  task("project-profiles", "verify:project-profiles", SHARED_TIERS, ["init-policy"]),
  task("schema", "verify:schema", SHARED_TIERS, ["syntax"]),
  task("naming", "verify:naming", SHARED_TIERS, ["syntax"]),
  task("runtime", "verify:runtime", SHARED_TIERS, ["naming"]),
  task("taste-adapter", "verify:taste-adapter", SHARED_TIERS, ["runtime"]),
  task("visual", "verify:visual", SHARED_TIERS, ["docs"]),
  task("design", "verify:design", SHARED_TIERS, ["docs"]),
  task("pages", "verify:pages", SHARED_TIERS, ["design"]),
  task("public-release", "verify:public-release", SHARED_TIERS, ["pages", "license"]),
  task("ci-config", "verify:ci-config", SHARED_TIERS, ["syntax"]),
  task("full-command-surface", "verify:full-command-surface", SHARED_TIERS, ["project-profiles"]),
  task("integration", "verify:integration", ["ci", "release"], ["project-profiles"]),
  task("skills-usability", "verify:skills-usability", ["release"], ["runtime"]),
  task("workflow-closure", "verify:workflow-closure", ["release"], ["workflow-governance", "project-profiles"]),
  task("cockpit-build", "verify:cockpit-build", ["release"], ["workflow-closure"]),
  task("docs-completeness", "verify:docs-completeness", ["release"], ["docs"]),
  task("release-readiness", "verify:release-readiness", ["release"], ["public-release", "full-command-surface"]),
  task("install-smoke", "verify:install-smoke", ["release"], ["release-readiness"]),
  task("dev-audit", "dev:audit:full", ["release"], ["full-command-surface", "skills-usability"]),
  task("rag-local", "verify:rag-local", ["local-rag"], ["rag-matrix", "privacy-strict"]),
];

export const VERIFICATION_TIERS = new Set(["ci", "release", "local-rag"]);

export function validateVerificationManifest(tasks = VERIFICATION_TASKS) {
  const issues = [];
  const byId = new Map();
  for (const [index, item] of tasks.entries()) {
    if (byId.has(item.id)) issues.push(`duplicate task id: ${item.id}`);
    byId.set(item.id, { item, index });
    if (!item.script) issues.push(`task ${item.id} has no npm script`);
    for (const tier of item.tiers || []) {
      if (!VERIFICATION_TIERS.has(tier)) issues.push(`task ${item.id} has unknown tier: ${tier}`);
    }
  }
  for (const [index, item] of tasks.entries()) {
    for (const dependency of item.dependsOn || []) {
      const dependencyEntry = byId.get(dependency);
      if (!dependencyEntry) issues.push(`task ${item.id} has unknown dependency: ${dependency}`);
      else if (dependencyEntry.index >= index) issues.push(`task ${item.id} depends on later task: ${dependency}`);
    }
  }
  return issues;
}

export function selectVerificationTasks(tier, tasks = VERIFICATION_TASKS) {
  if (!VERIFICATION_TIERS.has(tier)) throw new Error(`unknown verification tier: ${tier}`);
  const issues = validateVerificationManifest(tasks);
  if (issues.length) throw new Error(`invalid verification manifest:\n${issues.join("\n")}`);
  const selected = tasks.filter((item) => item.tiers.includes(tier));
  const ids = new Set(selected.map((item) => item.id));
  for (const item of selected) {
    for (const dependency of item.dependsOn) {
      if (!ids.has(dependency)) throw new Error(`tier ${tier} omits dependency ${dependency} required by ${item.id}`);
    }
  }
  return selected;
}
