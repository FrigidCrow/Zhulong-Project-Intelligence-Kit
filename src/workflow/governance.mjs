import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_AUTONOMY_ACTIONS = Object.freeze([
  "milestone",
  "spec",
  "discuss",
  "ui",
  "plan",
  "execute",
  "debug_fix",
  "review",
  "verify",
  "complete_milestone",
  "advance",
]);

export const AUTONOMY_PERMISSIONS = Object.freeze([
  "dependencies",
  "commit",
  "push",
  "merge",
  "release",
]);

const MUTATING_AUTONOMY_ACTIONS = new Set([
  "execute",
  "debug_fix",
  "complete_milestone",
  "advance",
]);
const AUTONOMY_ACTION_SET = new Set(DEFAULT_AUTONOMY_ACTIONS);
const MILESTONE_ID = /^MVP\d+(?:\.\d+)?$/;

const COMPLETED_STATUS = /Status:\s*(?:complete|completed|passed|accepted|verified|implemented|planned)\b/i;
const INCOMPLETE_MARKER = /Status:\s*pending\b|(?:^|\n)\s*-\s*TBD\s*(?:\n|$)/i;

function splitList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (!value) return [];
  return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function uniqueList(items) {
  return [...new Set(items.filter(Boolean))];
}

function parseScalar(value) {
  const clean = String(value || "").trim().replace(/^['"]|['"]$/g, "");
  if (/^(true|false)$/i.test(clean)) return clean.toLowerCase() === "true";
  if (/^(null|~)$/i.test(clean)) return null;
  return clean;
}

export function parseManifestWorkflow(text) {
  const lines = String(text || "").split(/\r?\n/);
  const workflow = {};
  let baseIndent = null;
  for (const line of lines) {
    if (baseIndent === null) {
      const match = line.match(/^(\s*)workflow:\s*(?:#.*)?$/);
      if (match) baseIndent = match[1].length;
      continue;
    }
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const indent = line.match(/^\s*/)?.[0].length || 0;
    if (indent <= baseIndent) break;
    const match = line.match(/^\s+([A-Za-z0-9_-]+):\s*(.*?)\s*(?:#.*)?$/);
    if (!match || match[2] === "") continue;
    workflow[match[1]] = parseScalar(match[2]);
  }
  return workflow;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function workflowMode(value) {
  const mode = String(value || "").trim().toLowerCase().replace(/-/g, "_");
  if (["autonomous", "automatic", "fully_autonomous"].includes(mode)) return "autonomous";
  if (["bounded", "bounded_autonomous"].includes(mode)) return "bounded_autonomous";
  return "interactive";
}

export function readEffectiveInteractionPolicy(target) {
  const manifestPath = path.join(target, "project.manifest.yml");
  const configPath = path.join(target, ".planning", "config.json");
  const manifestText = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, "utf8") : "";
  const manifestWorkflow = parseManifestWorkflow(manifestText);
  const config = readJson(configPath) || {};
  const configWorkflow = config.workflow || {};
  const manifestAuto = typeof manifestWorkflow.auto_advance === "boolean" ? manifestWorkflow.auto_advance : null;
  const configAuto = typeof configWorkflow.auto_advance === "boolean" ? configWorkflow.auto_advance : null;
  const contradictions = [];
  const manifestMode = manifestWorkflow.mode ? workflowMode(manifestWorkflow.mode) : null;
  const configModeValue = configWorkflow.default_mode || config.mode;
  const configMode = configModeValue ? workflowMode(configModeValue) : null;
  if (manifestMode && configMode && manifestMode !== configMode) {
    contradictions.push("project.manifest.yml and .planning/config.json disagree on workflow mode");
  }
  if (manifestAuto !== null && configAuto !== null && manifestAuto !== configAuto) {
    contradictions.push("project.manifest.yml and .planning/config.json disagree on workflow.auto_advance");
  }
  const mode = configMode || manifestMode || "interactive";
  const requestedAutoAdvance = configAuto ?? manifestAuto ?? false;
  if (mode === "interactive" && requestedAutoAdvance) {
    contradictions.push("interactive workflow mode conflicts with auto_advance=true");
  }
  const autoAdvance = contradictions.length === 0 ? requestedAutoAdvance : false;
  return {
    mode,
    autoAdvance,
    requestedAutoAdvance,
    requireExplicitUserIntent: (configWorkflow.require_explicit_user_intent
      ?? manifestWorkflow.require_explicit_user_intent) !== false,
    allowGoalAuthorization: (configWorkflow.allow_goal_authorization
      ?? manifestWorkflow.allow_goal_authorization) !== false,
    contradictions,
    valid: contradictions.length === 0,
    sources: [
      ...(fs.existsSync(manifestPath) ? ["project.manifest.yml"] : []),
      ...(fs.existsSync(configPath) ? [".planning/config.json"] : []),
    ],
  };
}

function safeSlug(value, fallback = "goal") {
  const slug = String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return slug || fallback;
}

function goalsDir(target) {
  return path.join(target, ".planning", "goals");
}

function authorizationPath(target, id) {
  return path.join(goalsDir(target), safeSlug(id, "authorization"), "AUTHORIZATION.json");
}

function activeAuthorizationPath(target) {
  return path.join(goalsDir(target), "ACTIVE.json");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeObjective(value) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizePermissions(value = {}) {
  return Object.fromEntries(AUTONOMY_PERMISSIONS.map((permission) => [permission, Boolean(value[permission])]));
}

function authorizationContractFile(target, value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const filePath = path.resolve(target, raw);
  const relative = path.relative(target, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("--contract-file must stay inside the project");
  }
  const payload = readJson(filePath);
  if (!payload) throw new Error("--contract-file must contain valid JSON");
  if (!Array.isArray(payload) && payload.schemaVersion !== "zhulong.milestone-contracts.v1") {
    throw new Error("--contract-file must use schemaVersion zhulong.milestone-contracts.v1");
  }
  const contracts = Array.isArray(payload) ? payload : payload.milestones;
  if (!Array.isArray(contracts) || contracts.length === 0) {
    throw new Error("--contract-file must contain a non-empty milestones array");
  }
  return { contracts, relative };
}

function normalizeMilestoneContracts(target, options, grantActions, grantPermissions) {
  const source = Array.isArray(options.milestoneContracts)
    ? { contracts: options.milestoneContracts, relative: null }
    : authorizationContractFile(target, options.contractFile);
  if (!source) return { contracts: [], source: null };
  const seen = new Set();
  const contracts = source.contracts.map((value, index) => {
    const id = String(value?.id || "").trim().toUpperCase();
    const objective = normalizeObjective(value?.objective);
    if (!id) throw new Error(`milestone contract ${index + 1} requires id`);
    if (!MILESTONE_ID.test(id)) throw new Error(`invalid milestone contract id: ${id}`);
    if (!objective) throw new Error(`milestone contract ${id} requires objective`);
    if (seen.has(id)) throw new Error(`duplicate milestone contract: ${id}`);
    seen.add(id);
    const requestedActions = uniqueList(splitList(value.actions).length ? splitList(value.actions) : grantActions);
    const unknownActions = requestedActions.filter((action) => !AUTONOMY_ACTION_SET.has(action));
    if (unknownActions.length) throw new Error(`milestone contract ${id} contains unknown actions: ${unknownActions.join(", ")}`);
    const outsideGrant = requestedActions.filter((action) => !grantActions.includes(action));
    if (outsideGrant.length) throw new Error(`milestone contract ${id} requests unauthorized actions: ${outsideGrant.join(", ")}`);
    const requestedPermissions = normalizePermissions(value.permissions || {});
    const permissions = Object.fromEntries(AUTONOMY_PERMISSIONS.map((permission) => [
      permission,
      Boolean(grantPermissions[permission] && requestedPermissions[permission]),
    ]));
    const contract = {
      id,
      objective,
      actions: requestedActions,
      allowedPaths: uniqueList(splitList(value.allowedPaths ?? value.allowed_paths)),
      acceptance: uniqueList(splitList(value.acceptance)),
      permissions,
    };
    return { ...contract, digest: sha256(JSON.stringify(contract)) };
  });
  return { contracts, source: source.relative };
}

export function writeAuthorization(target, options = {}) {
  const goal = String(options.goal || "").trim();
  if (!goal) throw new Error("--goal is required");
  const policy = readEffectiveInteractionPolicy(target);
  if (!policy.allowGoalAuthorization) throw new Error("project policy disables goal authorization");
  const sourceKind = String(options.source || "").trim().toLowerCase().replace(/_/g, "-");
  if (sourceKind !== "user-message") throw new Error("--source user-message is required for an autonomy grant");
  const sourceExcerpt = String(options.sourceExcerpt || options.request || "").trim();
  if (!sourceExcerpt) throw new Error("--request must preserve the explicit user authorization excerpt");
  const actions = uniqueList(splitList(options.actions).length ? splitList(options.actions) : DEFAULT_AUTONOMY_ACTIONS);
  const unknownActions = actions.filter((action) => !AUTONOMY_ACTION_SET.has(action));
  if (unknownActions.length) throw new Error(`unknown authorization actions: ${unknownActions.join(", ")}`);
  const permissions = normalizePermissions(options);
  const normalizedContracts = normalizeMilestoneContracts(target, options, actions, permissions);
  const declaredMilestones = uniqueList(splitList(options.milestones).map((item) => item.toUpperCase()));
  const invalidMilestones = declaredMilestones.filter((item) => !MILESTONE_ID.test(item));
  if (invalidMilestones.length) throw new Error(`invalid milestone ids: ${invalidMilestones.join(", ")}`);
  const milestones = normalizedContracts.contracts.length
    ? normalizedContracts.contracts.map((contract) => contract.id)
    : declaredMilestones;
  if (milestones.length === 0) throw new Error("--milestones or --contract-file must contain at least one bounded milestone");
  if (normalizedContracts.contracts.length && declaredMilestones.length
    && JSON.stringify(declaredMilestones) !== JSON.stringify(milestones)) {
    throw new Error("--milestones must exactly match the ordered milestone contracts");
  }
  const stopAfter = String(options.stopAfter || milestones.at(-1)).trim().toUpperCase();
  if (!milestones.includes(stopAfter)) throw new Error("--stop-after must name one of the authorized milestones");
  const createdAt = new Date().toISOString();
  const baseId = safeSlug(options.id || goal, "goal");
  const digestInput = JSON.stringify({ goal, milestones, actions, permissions, milestoneContracts: normalizedContracts.contracts, sourceExcerpt, createdAt });
  const id = `${baseId}-${sha256(digestInput).slice(0, 10)}`;
  const grant = {
    schemaVersion: "zhulong.authorization.v2",
    id,
    mode: "bounded_autonomous",
    status: "active",
    goal,
    scope: String(options.scope || goal),
    milestones,
    actions,
    permissions,
    scopeEnforcement: normalizedContracts.contracts.length ? "milestone_contract" : "legacy_milestone_only",
    milestoneContracts: normalizedContracts.contracts,
    contractSource: normalizedContracts.source,
    stopAfter,
    source: {
      kind: "user_message",
      excerpt: sourceExcerpt.slice(0, 2000),
      messageId: options.sourceMessageId || null,
      digest: sha256(sourceExcerpt),
    },
    createdAt,
    updatedAt: createdAt,
  };
  const outPath = authorizationPath(target, id);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(grant, null, 2)}\n`);
  fs.writeFileSync(activeAuthorizationPath(target), `${JSON.stringify({ id, updatedAt: createdAt }, null, 2)}\n`);
  return { grant, outPath };
}

export function loadAuthorization(target, id) {
  const requested = String(id || "").trim();
  const active = readJson(activeAuthorizationPath(target));
  const resolvedId = requested || active?.id;
  if (!resolvedId) return null;
  return readJson(authorizationPath(target, resolvedId));
}

export function revokeAuthorization(target, id, reason = "user requested revocation") {
  const grant = loadAuthorization(target, id);
  if (!grant) throw new Error("authorization not found");
  grant.status = "revoked";
  grant.revokedAt = new Date().toISOString();
  grant.updatedAt = grant.revokedAt;
  grant.revokeReason = String(reason || "user requested revocation");
  const outPath = authorizationPath(target, grant.id);
  fs.writeFileSync(outPath, `${JSON.stringify(grant, null, 2)}\n`);
  const active = readJson(activeAuthorizationPath(target));
  if (active?.id === grant.id) fs.rmSync(activeAuthorizationPath(target), { force: true });
  return { grant, outPath };
}

export function extractMilestone(request) {
  const values = String(request || "").match(/\bMVP\d+(?:\.\d+)?\b/gi) || [];
  return uniqueList(values.map((item) => item.toUpperCase())).length === 1
    ? values[0].toUpperCase()
    : null;
}

export function authorizationForState(target, state, route) {
  if (!state.authorizationRef) return { ok: false, reason: "No bounded-autonomy authorization is attached.", grant: null };
  const grant = loadAuthorization(target, state.authorizationRef);
  if (!grant) return { ok: false, reason: "Attached authorization does not exist.", grant: null };
  if (grant.status !== "active") return { ok: false, reason: `Authorization is ${grant.status}.`, grant };
  const action = route?.authorizationAction;
  const stateMilestone = String(state.milestone || "").trim().toUpperCase();
  if (action && !grant.actions.includes(action)) return { ok: false, reason: `Authorization does not allow ${action}.`, grant };
  if (grant.milestones.length > 0) {
    if (!stateMilestone) return { ok: false, reason: "A milestone is required for this bounded authorization.", grant };
    if (!grant.milestones.includes(stateMilestone)) return { ok: false, reason: `${stateMilestone} is outside the authorized milestones.`, grant };
    const stopIndex = grant.milestones.indexOf(grant.stopAfter);
    const currentIndex = grant.milestones.indexOf(stateMilestone);
    if (stopIndex >= 0 && currentIndex > stopIndex) {
      return { ok: false, reason: `${stateMilestone} is after the authorization stop boundary ${grant.stopAfter}.`, grant };
    }
  }
  const contracts = Array.isArray(grant.milestoneContracts) ? grant.milestoneContracts : [];
  if (contracts.length === 0) {
    if (action && MUTATING_AUTONOMY_ACTIONS.has(action)) {
      return { ok: false, reason: `${action} requires a structured milestone contract; legacy milestone-only grants are non-mutating.`, grant };
    }
    return { ok: true, reason: "Legacy bounded authorization matches this non-mutating workflow.", grant, contract: null };
  }
  const contract = contracts.find((item) => item.id === stateMilestone);
  if (!contract) return { ok: false, reason: `${stateMilestone} has no structured milestone contract.`, grant };
  if (action && !contract.actions.includes(action)) {
    return { ok: false, reason: `Milestone contract ${contract.id} does not allow ${action}.`, grant, contract };
  }
  if (!state.contractDigest || state.contractDigest !== contract.digest) {
    return { ok: false, reason: `Milestone contract digest is missing or does not match ${contract.id}.`, grant, contract };
  }
  if (normalizeObjective(state.request) !== normalizeObjective(contract.objective)) {
    return { ok: false, reason: `Workflow request does not match the authorized objective for ${contract.id}.`, grant, contract };
  }
  return { ok: true, reason: "Structured bounded-autonomy contract matches this workflow.", grant, contract };
}

export function authorizationPermissionForState(target, state, route, permission) {
  const name = String(permission || "").trim().toLowerCase();
  if (!AUTONOMY_PERMISSIONS.includes(name)) {
    return { ok: false, reason: `Unknown authorization permission: ${name || "missing"}.`, grant: null, contract: null };
  }
  const authorization = authorizationForState(target, state, route);
  if (!authorization.ok) return authorization;
  if (!authorization.contract) {
    return { ...authorization, ok: false, reason: `${name} requires a structured milestone contract.` };
  }
  const grantAllowed = authorization.grant?.permissions?.[name] === true;
  const contractAllowed = authorization.contract.permissions?.[name] === true;
  if (!grantAllowed || !contractAllowed) {
    return { ...authorization, ok: false, reason: `Authorization does not permit ${name}.` };
  }
  return { ...authorization, ok: true, reason: `Authorization permits ${name}.` };
}

function resolveProjectFile(target, value) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("evidence must be a project-relative file path");
  const filePath = path.resolve(target, raw);
  const relative = path.relative(target, filePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("evidence must stay inside the project");
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) throw new Error(`evidence file does not exist: ${raw}`);
  return { filePath, relative };
}

export function validateWorkflowEvidence(target, state, gate, value) {
  const { filePath, relative } = resolveProjectFile(target, value);
  const stat = fs.statSync(filePath);
  const createdMs = Date.parse(state.createdAt || "");
  if (Number.isFinite(createdMs) && stat.mtimeMs + 1000 < createdMs) {
    throw new Error("evidence predates the current workflow");
  }
  const text = fs.readFileSync(filePath, "utf8");
  if (!text.includes(state.id)) throw new Error("evidence is not bound to the current workflow id");
  const namedType = text.match(/Evidence type:\s*`?([A-Za-z_-]+)`?/i)?.[1]?.toLowerCase().replace(/_/g, "-");
  const expectedType = gate === "implementation" ? "implementation" : gate;
  const localArtifact = path.dirname(filePath) === path.join(target, ".planning", "workflows", state.id)
    && path.basename(filePath).toLowerCase().startsWith(expectedType === "plan" ? "plan" : expectedType === "verification" ? "verification" : "implementation");
  if (!localArtifact && namedType !== expectedType) throw new Error(`evidence type must be ${expectedType}`);
  if (INCOMPLETE_MARKER.test(text) || !COMPLETED_STATUS.test(text)) {
    throw new Error("evidence file must record a completed/passed status and contain no TBD marker");
  }
  return {
    type: expectedType,
    workflowId: state.id,
    path: relative,
    sha256: sha256(fs.readFileSync(filePath)),
    modifiedAt: stat.mtime.toISOString(),
    markedAt: new Date().toISOString(),
  };
}

export function boundEvidenceRecords(target, state) {
  const dir = path.join(target, ".planning", "evidence");
  if (!fs.existsSync(dir)) return [];
  const createdMs = Date.parse(state.createdAt || "");
  return fs.readdirSync(dir)
    .filter((name) => name.endsWith(".md") && !["README.md", "INDEX.md", "RECORD_TEMPLATE.md"].includes(name))
    .map((name) => path.join(dir, name))
    .filter((filePath) => {
      if (Number.isFinite(createdMs) && fs.statSync(filePath).mtimeMs + 1000 < createdMs) return false;
      const text = fs.readFileSync(filePath, "utf8");
      return text.includes(`- Workflow: ${state.id}`)
        && /- Evidence type:\s*verification\b/i.test(text)
        && /- Status:\s*(?:passed|complete|completed|verified|accepted)\b/i.test(text)
        && !/Result:\s*Not recorded/i.test(text);
    });
}

export function hasBoundWriteback(target, state) {
  const createdMs = Date.parse(state.createdAt || "");
  for (const kind of ["issues", "debug", "phases"]) {
    const root = path.join(target, ".planning", kind);
    if (!fs.existsSync(root)) continue;
    const stack = [root];
    while (stack.length) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const filePath = path.join(current, entry.name);
        if (entry.isDirectory()) stack.push(filePath);
        else if (entry.name.endsWith(".md")) {
          if (Number.isFinite(createdMs) && fs.statSync(filePath).mtimeMs + 1000 < createdMs) continue;
          const text = fs.readFileSync(filePath, "utf8");
          const sections = text.split(/(?=^## Zhulong Evidence Writeback\b)/m);
          if (sections.some((section) => section.startsWith("## Zhulong Evidence Writeback")
            && section.includes(`- Workflow: ${state.id}`)
            && /- Evidence type:\s*verification\b/i.test(section)
            && /- Result:\s*(?!Not recorded\b).+/i.test(section))) return true;
        }
      }
    }
  }
  return false;
}

export function normalizeDecisionPayload(payload = {}) {
  const list = (value) => uniqueList(splitList(value));
  return {
    confirmed: list(payload.confirmed),
    assumptions: list(payload.assumptions),
    contradictions: list(payload.contradictions),
    openQuestions: list(payload.openQuestions ?? payload["open-questions"]),
    materialDecisionRequired: payload.materialDecisionRequired === true || String(payload["material-decision-required"] || "").toLowerCase() === "true",
    recordedAt: new Date().toISOString(),
  };
}

export function readDecisionPayload(target, args = {}) {
  if (!args.file) return normalizeDecisionPayload(args);
  const { filePath } = resolveProjectFile(target, args.file);
  const value = readJson(filePath);
  if (!value) throw new Error("decision file must contain valid JSON");
  return normalizeDecisionPayload(value);
}
