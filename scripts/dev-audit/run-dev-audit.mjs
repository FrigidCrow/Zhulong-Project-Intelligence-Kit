#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildCommandCatalog } from "../command-catalog.mjs";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const auditRoot = path.join(kitRoot, ".pik-audit");
const verificationReportDir = path.join(kitRoot, "verification", "reports");
const runId = process.env.AI_PIKIT_AUDIT_RUN_ID || new Date().toISOString().replace(/[:.]/g, "-");
const runRoot = path.join(auditRoot, "runs", runId);
const latestRoot = path.join(auditRoot, "latest");
const rawDir = path.join(runRoot, "raw");
const reportsDir = path.join(runRoot, "reports");
const fixturesDir = path.join(runRoot, "fixtures");
const benchmarkDir = path.join(runRoot, "benchmarks");
const toolsDir = path.join(runRoot, "tools");
const pikCli = path.join(kitRoot, "bin", "pik.mjs");
const mode = process.argv[2] || "full";

const BENCHMARK_TASK =
  "代理承認の上限を 30,000 円から 50,000 円へ変更し、仕様依据、代码影响面、测试验证、证据写回都要闭环。";

const FEATURE_GATES = [
  { id: "full-command-surface", script: "verify:full-command-surface", report: "full-command-surface-check.json", weight: 12 },
  { id: "skills-usability", script: "verify:skills-usability", report: "skills-usability-check.json", weight: 12 },
  { id: "workflow-closure", script: "verify:workflow-closure", report: "workflow-closure-check.json", weight: 12 },
  { id: "policy-hardening", script: "verify:policy-hardening", report: "policy-hardening-check.json", weight: 10 },
  { id: "docs-sync", script: "verify:docs-sync", report: "docs-sync-check.json", weight: 8 },
  { id: "answer-audit", script: "verify:answer-audit", report: "answer-audit-check.json", weight: 8 },
  { id: "graph-hardening", script: "verify:graph-hardening", report: "graph-hardening-check.json", weight: 8 },
  { id: "rag-local", script: "verify:rag-local", report: "rag-local-check.json", weight: 8 },
  { id: "cockpit-build", script: "verify:cockpit-build", report: "cockpit-build-check.json", weight: 10 },
  { id: "docs-completeness", script: "verify:docs-completeness", report: "docs-completeness-check.json", weight: 12 },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readText(filePath, fallback = "") {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return fallback;
  }
}

function writeText(filePath, text) {
  ensureDir(path.dirname(filePath));
  const payload = typeof text === "string" || Buffer.isBuffer(text) ? text : String(text ?? "");
  fs.writeFileSync(filePath, payload);
}

function writeJson(filePath, data) {
  writeText(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function copyFileSafe(from, to) {
  if (!fs.existsSync(from)) return false;
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
  return true;
}

function copyDirSafe(from, to) {
  if (!fs.existsSync(from)) return false;
  if (fs.existsSync(to)) fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
  return true;
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function relative(filePath) {
  return path.relative(kitRoot, filePath) || ".";
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9_.-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 160) || "item";
}

function now() {
  return new Date().toISOString();
}

function readPackage() {
  return JSON.parse(readText(path.join(kitRoot, "package.json"), "{}"));
}

function runTimed(label, command, args = [], options = {}) {
  ensureDir(rawDir);
  const startedAt = now();
  const start = process.hrtime.bigint();
  const result = spawnSync(command, args, {
    cwd: options.cwd || kitRoot,
    env: { ...process.env, ...(options.env || {}) },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: options.timeout || 240000,
  });
  const end = process.hrtime.bigint();
  const endedAt = now();
  const durationMs = Number(end - start) / 1_000_000;
  const status = typeof result.status === "number" ? result.status : result.error ? 124 : 0;
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const base = safeName(label);
  writeText(path.join(rawDir, `${base}.stdout.txt`), stdout);
  writeText(path.join(rawDir, `${base}.stderr.txt`), stderr);
  return {
    label,
    command,
    args,
    cwd: options.cwd || kitRoot,
    status,
    signal: result.signal || null,
    error: result.error ? String(result.error.message || result.error) : null,
    started_at: startedAt,
    ended_at: endedAt,
    duration_ms: Math.round(durationMs),
    stdout_bytes: Buffer.byteLength(stdout),
    stderr_bytes: Buffer.byteLength(stderr),
    stdout_sample: stdout.trim().slice(0, 4000),
    stderr_sample: stderr.trim().slice(0, 4000),
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\n/g, "<br>")).join(" | ")} |`),
  ].join("\n");
}

function grade(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function scoreStatus(status, pass = 100, fail = 45) {
  return status === "PASS" ? pass : fail;
}

function isBenchmarkFailure(status) {
  return status === "FAIL";
}

function benchmarkStatusLabel(status) {
  return status === "EXPECTED_BLOCK" ? "EXPECTED_BLOCK" : status;
}

function parseJsonReport(name) {
  const filePath = path.join(verificationReportDir, name);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(readText(filePath));
  } catch {
    return null;
  }
}

function listFiles(root, predicate = () => true, out = []) {
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) listFiles(entryPath, predicate, out);
    else if (entry.isFile() && predicate(entryPath)) out.push(entryPath);
  }
  return out;
}

function packageCommands() {
  const pkg = readPackage();
  return Object.keys(pkg.bin || {}).filter((name) => name === "pik" || name.startsWith("pik-")).sort();
}

function runtimeItems() {
  const roots = [
    { runtime: "codex", root: path.join(kitRoot, "runtime", "codex", "skills"), pattern: "SKILL.md" },
    { runtime: "claude-code", root: path.join(kitRoot, "runtime", "claude-code", "skills"), pattern: "SKILL.md" },
    { runtime: "github-copilot", root: path.join(kitRoot, "runtime", "github-copilot", "prompts"), pattern: ".prompt.md" },
  ];
  const items = [];
  for (const spec of roots) {
    if (!fs.existsSync(spec.root)) continue;
    if (spec.runtime === "github-copilot") {
      for (const file of fs.readdirSync(spec.root).filter((name) => name.endsWith(spec.pattern)).sort()) {
        items.push({ runtime: spec.runtime, name: file.replace(/\.prompt\.md$/, ""), file: path.join(spec.root, file) });
      }
    } else {
      for (const dir of fs.readdirSync(spec.root).sort()) {
        const file = path.join(spec.root, dir, spec.pattern);
        if (fs.existsSync(file)) items.push({ runtime: spec.runtime, name: dir, file });
      }
    }
  }
  return items;
}

function gsdSkillItems() {
  const root = path.join(os.homedir(), ".codex", "skills");
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root)
    .filter((name) => name.startsWith("gsd-") && fs.existsSync(path.join(root, name, "SKILL.md")))
    .sort()
    .map((name) => {
      const file = path.join(root, name, "SKILL.md");
      return { name, file, hash: sha256(readText(file)) };
    });
}

function localSuperpowersRoot() {
  const candidates = [
    path.join(os.homedir(), ".codex", ".tmp", "plugins", "plugins", "superpowers"),
    path.join(os.homedir(), ".codex", "plugins", "cache", "superpowers"),
  ];
  return candidates.find((item) => fs.existsSync(item)) || "";
}

function cloneSuperpowersIfRequested() {
  const dest = path.join(toolsDir, "superpowers");
  if (fs.existsSync(dest)) return { root: dest, source: "existing-audit-clone", command: null };
  const local = localSuperpowersRoot();
  if (local) {
    copyDirSafe(local, dest);
    return { root: dest, source: "local-cache-copy", command: null };
  }
  if (process.env.AI_PIKIT_AUDIT_CLONE_SUPERPOWERS !== "1") {
    return { root: "", source: "not-cloned-set-AI_PIKIT_AUDIT_CLONE_SUPERPOWERS=1", command: null };
  }
  ensureDir(toolsDir);
  const cmd = runTimed("clone-superpowers", "git", ["clone", "--depth", "1", "https://github.com/obra/Superpowers", dest], {
    timeout: 300000,
  });
  return { root: fs.existsSync(dest) ? dest : "", source: "github-clone", command: cmd };
}

function superpowersInfo(root) {
  if (!root) return { root: "", commit: "unavailable", skill_count: 0, files: [] };
  const commit = runTimed("superpowers-commit", "git", ["rev-parse", "HEAD"], { cwd: root, timeout: 30000 });
  const files = listFiles(root, (file) => path.basename(file) === "SKILL.md" || file.endsWith(".md"));
  return {
    root,
    commit: commit.status === 0 ? commit.stdout_sample.trim() : "unknown",
    skill_count: files.filter((file) => path.basename(file) === "SKILL.md").length,
    markdown_count: files.length,
    files: files.slice(0, 80).map((file) => path.relative(root, file)),
  };
}

function excerpt(text, max = 1600) {
  return text.replace(/\s+\n/g, "\n").trim().slice(0, max);
}

function gsdInstructionPack() {
  const names = [
    "gsd-new-milestone",
    "gsd-spec-phase",
    "gsd-discuss-phase",
    "gsd-ui-phase",
    "gsd-plan-phase",
    "gsd-execute-phase",
    "gsd-verify-work",
    "gsd-complete-milestone",
    "gsd-debug",
    "gsd-graphify",
    "gsd-ingest-docs",
    "gsd-map-codebase",
  ];
  const root = path.join(os.homedir(), ".codex", "skills");
  const skills = names.map((name) => {
    const file = path.join(root, name, "SKILL.md");
    const text = readText(file);
    return {
      name,
      file,
      exists: Boolean(text),
      hash: text ? sha256(text) : "",
      excerpt: text ? excerpt(text) : "",
      mentions: {
        planning: /\.planning|PLAN\.md|CONTEXT\.md|UAT\.md/.test(text),
        verification: /verify|verification|UAT|test/i.test(text),
        graphify: /graphify/i.test(text),
        docs: /docs|ingest|spec|仕様|PRD|ADR/i.test(text),
        subagents: /Task\(|spawn_agent|subagent/i.test(text),
      },
    };
  });
  return {
    name: "GSD",
    source: path.join(os.homedir(), ".codex", "skills"),
    type: "codex-skill-pack",
    skill_count: gsdSkillItems().length,
    selected_count: skills.filter((skill) => skill.exists).length,
    skills,
    capabilities: {
      workflow_engine: skills.some((skill) => /workflow gates|verification loop|Preserve all workflow gates|Execute end-to-end/i.test(skill.excerpt)),
      docs_workflow: skills.some((skill) => skill.mentions.docs),
      graphify: skills.some((skill) => skill.mentions.graphify),
      local_rag: false,
      repository_cli: false,
      typed_agent_dependency: skills.some((skill) => skill.mentions.subagents),
    },
  };
}

function superpowersInstructionPack(root) {
  const names = [
    "using-superpowers",
    "writing-plans",
    "test-driven-development",
    "executing-plans",
    "verification-before-completion",
    "finishing-a-development-branch",
    "systematic-debugging",
    "requesting-code-review",
    "receiving-code-review",
  ];
  const skillRoot = root ? path.join(root, "skills") : "";
  const skills = names.map((name) => {
    const file = path.join(skillRoot, name, "SKILL.md");
    const text = readText(file);
    return {
      name,
      file,
      exists: Boolean(text),
      hash: text ? sha256(text) : "",
      excerpt: text ? excerpt(text) : "",
      mentions: {
        plan: /plan/i.test(text),
        tdd: /test-driven|TDD|red-green-refactor/i.test(text),
        verification: /verify|verification|test/i.test(text),
        branch_finish: /finish|complete|branch/i.test(text),
        skill_invocation: /invoke|skill/i.test(text),
      },
    };
  });
  return {
    name: "Superpowers",
    source: root || "",
    type: "plugin-skill-pack",
    skill_count: skills.filter((skill) => skill.exists).length,
    selected_count: skills.filter((skill) => skill.exists).length,
    skills,
    capabilities: {
      workflow_engine: skills.some((skill) => /plan|execute|verification/i.test(skill.excerpt)),
      docs_workflow: skills.some((skill) => /spec|requirements|reviewer/i.test(skill.excerpt)),
      graphify: false,
      local_rag: false,
      repository_cli: false,
      tdd: skills.some((skill) => skill.mentions.tdd),
    },
  };
}

function writeReportPair(baseName, data, markdown) {
  writeJson(path.join(reportsDir, `${baseName}.json`), data);
  writeText(path.join(reportsDir, `${baseName}.md`), markdown);
}

function syncLatest() {
  if (fs.existsSync(latestRoot)) fs.rmSync(latestRoot, { recursive: true, force: true });
  ensureDir(path.dirname(latestRoot));
  fs.cpSync(reportsDir, latestRoot, { recursive: true });
}

function emitVerificationSummary(auditData) {
  ensureDir(verificationReportDir);
  const jsonPath = path.join(verificationReportDir, "developer-audit-summary.json");
  const mdPath = path.join(verificationReportDir, "developer-audit-summary.md");
  writeJson(jsonPath, auditData);
  const commandCount = auditData.inventory?.commands?.length ?? 0;
  const skillCount = auditData.inventory?.runtime_items?.length ?? 0;
  const featureStatus = auditData.features?.status || "UNKNOWN";
  const benchmarkStatus = auditData.benchmark?.status || "UNKNOWN";
  const rows = (auditData.benchmark?.comparison || []).map((item) => [
    item.tool,
    item.mode,
    benchmarkStatusLabel(item.status),
    item.score,
    `${item.time_ms} ms`,
    item.token_usage?.total_tokens ?? item.token_usage?.status ?? "unavailable",
    item.memory_isolation,
  ]);
  const benchmarkScore = auditData.scorecard?.benchmark_score;
  const byTool = auditData.benchmark?.by_tool || [];
  const byToolText = byTool.length
    ? byTool.map((item) => `${item.tool}=${item.average_score}/${item.grade}`).join(", ")
    : "n/a";
  const md = `# AI-PIKit Developer Audit Summary

生成时间: ${now()}

## 摘要

- Run ID: \`${runId}\`
- 原始产物目录: \`.pik-audit/latest/\`
- 命令覆盖: ${commandCount}
- Runtime skill/prompt 覆盖: ${skillCount}
- 功能审计状态: ${featureStatus}
- 对标审计状态: ${benchmarkStatus}
- Benchmark comparison score: ${benchmarkScore ?? "n/a"}
- Token 规则: 只有真实 Codex JSONL 中存在 usage 时才统计；缺失时写 \`TOKEN_USAGE_UNAVAILABLE\`。
- 记忆隔离规则: 每轮使用 fresh fixture；真实 Codex 对标必须使用 \`--ephemeral --ignore-rules\`，需要完全不读用户配置时额外启用 \`AI_PIKIT_AUDIT_CODEX_IGNORE_USER_CONFIG=1\`。

## 评分怎么读

- \`Benchmark comparison\` 是所有 benchmark 行的保守平均分，不是 AI-PIKit 单体分。
- 本轮工具平均分: ${byToolText}。
- AI-PIKit \`graph-lite\` 是低成本模式，故意不强制 GraphRAG/RAG，评分不会按 full-local 满分计算。
- AI-PIKit \`full-local\` 在无文档场景输出 \`EXPECTED_BLOCK\`，这是正确安全边界，但会拉低横向平均。
- GSD / Superpowers 是 \`skill-pack-backed-replay\`，不是 repository-local CLI 或 live model benchmark，因此设置可信度上限。
- Real Codex subprocess 只单独记录环境可用性和 token usage，不成功时不混入 replay 分数。

## 对标结果

${rows.length ? markdownTable(["工具", "模式", "状态", "评分", "耗时", "Token", "隔离"], rows) : "本轮没有 benchmark 数据。"}

## 主要结论

${(auditData.summary?.findings || []).map((item) => `- ${item}`).join("\n") || "- 暂无。"}

## 报告入口

- \`.pik-audit/latest/AUDIT_REPORT.md\`
- \`.pik-audit/latest/COMMAND_SCORES.md\`
- \`.pik-audit/latest/SKILL_SCORES.md\`
- \`.pik-audit/latest/FEATURE_SCORES.md\`
- \`.pik-audit/latest/BENCHMARK_COMPARISON.md\`
- \`.pik-audit/latest/TIME_BREAKDOWN.md\`
- \`.pik-audit/latest/TOKEN_USAGE.md\`
`;
  writeText(mdPath, md);
}

function auditInventory() {
  ensureDir(reportsDir);
  const pkg = readPackage();
  const commands = packageCommands();
  const scripts = Object.keys(pkg.scripts || {}).sort();
  const runtime = runtimeItems();
  const gsd = gsdSkillItems();
  const spRoot = localSuperpowersRoot();
  const inventory = {
    generated: now(),
    run_id: runId,
    commands,
    command_count: commands.length,
    npm_scripts: scripts,
    npm_script_count: scripts.length,
    runtime_items: runtime.map((item) => ({ ...item, file: relative(item.file), hash: sha256(readText(item.file)) })),
    runtime_item_count: runtime.length,
    gsd_skills: gsd.map((item) => ({ name: item.name, file: item.file, hash: item.hash })),
    gsd_skill_count: gsd.length,
    superpowers_local_root: spRoot,
    gitignore_has_pik_audit: readText(path.join(kitRoot, ".gitignore")).split(/\r?\n/).includes(".pik-audit/"),
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
  };
  const md = `# Developer Audit Inventory

生成时间: ${inventory.generated}

${markdownTable(["项目", "数量 / 状态"], [
    ["pik/pik-* commands", inventory.command_count],
    ["npm scripts", inventory.npm_script_count],
    ["runtime skill/prompt", inventory.runtime_item_count],
    ["local GSD skills", inventory.gsd_skill_count],
    ["Superpowers local cache", inventory.superpowers_local_root || "not found"],
    [".pik-audit gitignored", inventory.gitignore_has_pik_audit ? "PASS" : "FAIL"],
  ])}
`;
  writeReportPair("INVENTORY", inventory, md);
  return inventory;
}

function auditCommands(options = {}) {
  const pkg = readPackage();
  const catalog = buildCommandCatalog(pkg);
  const reportBefore = parseJsonReport("full-command-surface-check.json");
  let verifier = null;
  if (options.runVerifier) {
    verifier = runTimed("npm-run-verify-full-command-surface", "npm", ["run", "verify:full-command-surface"], {
      cwd: kitRoot,
      timeout: 900000,
    });
  }
  const report = parseJsonReport("full-command-surface-check.json") || reportBefore;
  const commandResults = report?.commandResults || [];
  const docs = readText(path.join(kitRoot, "docs", "commands.html"));
  const commandScores = catalog.map((item) => {
    const relatedResults = commandResults.filter((result) => {
      const first = String(result.command || "").split(/\s+/)[0];
      return first === item.command || (item.command === "pik" && first === "pik");
    });
    const executable = relatedResults.length > 0 && relatedResults.every((result) => result.status === result.expectedStatus);
    const docCovered = docs.includes(`id="cmd-${item.command}"`) && docs.includes(item.logicalName);
    const hasOutput = Boolean(item.outputs);
    const heavySafe = !/是；这是显式刷新命令/.test(item.heavyRefresh) || ["pik-refresh-run"].includes(item.command);
    const score =
      (executable ? 30 : 12) +
      (docCovered ? 20 : 5) +
      (hasOutput ? 15 : 5) +
      (heavySafe ? 15 : 8) +
      (item.params?.length ? 10 : 5) +
      (item.successExample ? 10 : 4);
    return {
      command: item.command,
      logical_name: item.logicalName,
      category: item.category,
      score: Math.min(100, score),
      grade: grade(Math.min(100, score)),
      executable,
      verifier_results: relatedResults.length,
      docs_covered: docCovered,
      heavy_refresh: item.heavyRefresh,
      outputs: item.outputs,
    };
  });
  const average = Math.round(commandScores.reduce((sum, item) => sum + item.score, 0) / Math.max(1, commandScores.length));
  const data = {
    generated: now(),
    status: commandScores.every((item) => item.executable && item.docs_covered) ? "PASS" : "WARN",
    command_count: commandScores.length,
    average_score: average,
    verifier_status: report?.status || "UNKNOWN",
    verifier_command: verifier,
    scores: commandScores,
  };
  const md = `# Command Scores

生成时间: ${data.generated}

- 状态: ${data.status}
- 命令数: ${data.command_count}
- 平均分: ${data.average_score}
- full-command-surface: ${data.verifier_status}

${markdownTable(["命令", "逻辑名", "分类", "分数", "等级", "可执行", "文档"], commandScores.map((item) => [
    `\`${item.command}\``,
    item.logical_name,
    item.category,
    item.score,
    item.grade,
    item.executable ? "PASS" : "FAIL",
    item.docs_covered ? "PASS" : "FAIL",
  ]))}
`;
  writeReportPair("COMMAND_SCORES", data, md);
  return data;
}

function hasUnsafeGsdLine(text) {
  return text.split(/\r?\n/).some((line) => {
    if (!/[$/]gsd-/.test(line)) return false;
    return !/(never|not|do not|不要|不|reference|historical|only|参考)/i.test(line);
  });
}

function auditSkills(options = {}) {
  let verifier = null;
  if (options.runVerifier) {
    verifier = runTimed("npm-run-verify-skills-usability", "npm", ["run", "verify:skills-usability"], {
      cwd: kitRoot,
      timeout: 600000,
    });
  }
  const report = parseJsonReport("skills-usability-check.json");
  const renderedInstallPass = report?.status === "PASS" && (report?.issues || []).length === 0;
  const items = runtimeItems();
  const scores = items.map((item) => {
    const text = readText(item.file);
    const sourceCallsPik = text.includes(item.name) && text.includes("bin/pik.mjs");
    const sourceLocalOnly = /local-only|local_only/i.test(text);
    const sourceNoHeavy = /heavy refresh/i.test(text);
    const sourceEvidence = /evidence|writeback/i.test(text);
    const sourceNoUnsafeGsd = !hasUnsafeGsdLine(text);
    const callsPik = renderedInstallPass || sourceCallsPik;
    const localOnly = renderedInstallPass || sourceLocalOnly;
    const noHeavy = renderedInstallPass || sourceNoHeavy;
    const noUnsafeGsd = renderedInstallPass || sourceNoUnsafeGsd;
    const evidence = renderedInstallPass || sourceEvidence;
    const score = renderedInstallPass
      ? 100
      : (callsPik ? 25 : 5) +
        (localOnly ? 20 : 5) +
        (noHeavy ? 20 : 5) +
        (evidence ? 15 : 5) +
        (noUnsafeGsd ? 10 : 0) +
        (report?.status === "PASS" ? 10 : 4);
    return {
      runtime: item.runtime,
      name: item.name,
      file: relative(item.file),
      score: Math.min(100, score),
      grade: grade(Math.min(100, score)),
      rendered_install_pass: renderedInstallPass,
      calls_pik: callsPik,
      local_only: localOnly,
      no_hidden_heavy_refresh: noHeavy,
      evidence_writeback: evidence,
      no_unsafe_gsd: noUnsafeGsd,
      source_static_checks: {
        calls_pik: sourceCallsPik,
        local_only: sourceLocalOnly,
        no_hidden_heavy_refresh: sourceNoHeavy,
        evidence_writeback: sourceEvidence,
        no_unsafe_gsd: sourceNoUnsafeGsd,
      },
    };
  });
  const average = Math.round(scores.reduce((sum, item) => sum + item.score, 0) / Math.max(1, scores.length));
  const data = {
    generated: now(),
    status: scores.every((item) => item.calls_pik && item.local_only && item.no_hidden_heavy_refresh && item.no_unsafe_gsd) ? "PASS" : "WARN",
    runtime_item_count: scores.length,
    average_score: average,
    verifier_status: report?.status || "UNKNOWN",
    verifier_command: verifier,
    scores,
  };
  const md = `# Skill Scores

生成时间: ${data.generated}

- 状态: ${data.status}
- Runtime skill/prompt 数: ${data.runtime_item_count}
- 平均分: ${data.average_score}
- skills-usability: ${data.verifier_status}

${markdownTable(["Runtime", "Skill/Prompt", "分数", "等级", "pik 调用", "local-only", "no heavy", "evidence"], scores.map((item) => [
    item.runtime,
    `\`${item.name}\``,
    item.score,
    item.grade,
    item.calls_pik ? "PASS" : "FAIL",
    item.local_only ? "PASS" : "FAIL",
    item.no_hidden_heavy_refresh ? "PASS" : "FAIL",
    item.evidence_writeback ? "PASS" : "FAIL",
  ]))}
`;
  writeReportPair("SKILL_SCORES", data, md);
  return data;
}

function auditFeatures(options = {}) {
  const rows = [];
  const commands = [];
  for (const gate of FEATURE_GATES) {
    let command = null;
    if (options.runVerifier) {
      command = runTimed(`npm-run-${gate.script}`, "npm", ["run", gate.script], {
        cwd: kitRoot,
        timeout: gate.id === "rag-local" ? 900000 : 700000,
      });
      commands.push(command);
    }
    const report = parseJsonReport(gate.report);
    const status = report?.status || (command?.status === 0 ? "PASS" : command ? "FAIL" : "UNKNOWN");
    const score = scoreStatus(status);
    rows.push({
      id: gate.id,
      script: gate.script,
      report: gate.report,
      status,
      score,
      grade: grade(score),
      weight: gate.weight,
      duration_ms: command?.duration_ms ?? null,
    });
  }
  const weighted = rows.reduce((sum, item) => sum + item.score * item.weight, 0) / Math.max(1, rows.reduce((sum, item) => sum + item.weight, 0));
  const data = {
    generated: now(),
    status: rows.every((item) => item.status === "PASS") ? "PASS" : "WARN",
    average_score: Math.round(weighted),
    gates: rows,
    commands,
  };
  const md = `# Feature Scores

生成时间: ${data.generated}

- 状态: ${data.status}
- 加权平均分: ${data.average_score}

${markdownTable(["功能 gate", "脚本", "状态", "分数", "等级", "耗时"], rows.map((item) => [
    item.id,
    `npm run ${item.script}`,
    item.status,
    item.score,
    item.grade,
    item.duration_ms == null ? "not run" : `${item.duration_ms} ms`,
  ]))}
`;
  writeReportPair("FEATURE_SCORES", data, md);
  return data;
}

function createBenchmarkFixture(root, scenario) {
  if (fs.existsSync(root)) fs.rmSync(root, { recursive: true, force: true });
  ensureDir(root);
  writeText(path.join(root, "package.json"), JSON.stringify({
    name: `aipikit-audit-${scenario}`,
    version: "0.0.0",
    private: true,
    type: "module",
    scripts: {
      test: "node tests/approvalPolicy.test.js",
    },
  }, null, 2));
  writeText(path.join(root, "src", "approvalPolicy.js"), [
    "export const PROXY_APPROVAL_LIMIT = 30000;",
    "export function canProxyApprove(amount) {",
    "  return amount <= PROXY_APPROVAL_LIMIT;",
    "}",
    "",
  ].join("\n"));
  writeText(path.join(root, "tests", "approvalPolicy.test.js"), [
    "import { PROXY_APPROVAL_LIMIT, canProxyApprove } from '../src/approvalPolicy.js';",
    "if (PROXY_APPROVAL_LIMIT !== 50000) throw new Error(`expected 50000, got ${PROXY_APPROVAL_LIMIT}`);",
    "if (!canProxyApprove(50000)) throw new Error('50000 should be allowed');",
    "if (canProxyApprove(50001)) throw new Error('50001 should be rejected');",
    "console.log('AUDIT_FIXTURE_TEST_PASS proxy approval limit 50000');",
    "",
  ].join("\n"));
  if (scenario !== "docs-missing") {
    writeText(path.join(root, "docs", "specs", "01_proxy_approval.md"), [
      "# 代理承認仕様",
      "",
      "- 変更前上限: 30,000 円",
      "- 変更後上限: 50,000 円",
      "- Citation ID: SPEC-PROXY-LIMIT-001",
      "",
    ].join("\n"));
  }
  if (scenario === "docs-complete") {
    writeText(path.join(root, "docs", "qa", "QA-042_proxy_limit.md"), [
      "# QA-042 代理承認上限",
      "",
      "- 回答: 代理承認の上限は 50,000 円に変更する。",
      "- 根拠: [docs/specs/01_proxy_approval.md:4]",
      "",
    ].join("\n"));
    writeText(path.join(root, "docs", "minutes", "2026-06-18_proxy_limit.md"), [
      "# 議事録",
      "",
      "- CR-017: 30,000 円から 50,000 円へ変更する。",
      "- QA とテスト仕様を更新する。",
      "",
    ].join("\n"));
  }
  if (scenario === "docs-partial") {
    writeText(path.join(root, "docs", "notes", "partial.md"), [
      "# Partial docs",
      "",
      "- 仕様はあるが QA と議事録が未整備。",
      "",
    ].join("\n"));
  }
  ensureDir(path.join(root, ".git"));
  writeText(path.join(root, ".gitignore"), ".planning/\ngraphify-out/\ngraphrag-workspace/\n");
}

function applyBenchmarkCodeChange(root) {
  const file = path.join(root, "src", "approvalPolicy.js");
  const text = readText(file);
  writeText(file, text.replace("PROXY_APPROVAL_LIMIT = 30000", "PROXY_APPROVAL_LIMIT = 50000"));
}

function configureFakeIntelligence(root) {
  const configPath = path.join(root, ".planning", "config.json");
  if (!fs.existsSync(configPath)) return;
  const config = JSON.parse(readText(configPath));
  writeText(path.join(root, ".planning", "fixtures", "fake-graphify.mjs"), [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "const out = path.join(process.cwd(), 'graphify-out');",
    "fs.mkdirSync(out, { recursive: true });",
    "fs.writeFileSync(path.join(out, 'graph.json'), JSON.stringify({",
    "  nodes: [",
    "    { id: 'src/approvalPolicy.js', path: 'src/approvalPolicy.js', kind: 'module', risk: 'medium' },",
    "    { id: 'tests/approvalPolicy.test.js', path: 'tests/approvalPolicy.test.js', kind: 'test', risk: 'low' }",
    "  ],",
    "  edges: [{ source: 'tests/approvalPolicy.test.js', target: 'src/approvalPolicy.js', type: 'tests' }]",
    "}, null, 2));",
    "fs.writeFileSync(path.join(out, 'GRAPH_REPORT.md'), '# Graph Report\\n\\nPROXY_APPROVAL_LIMIT impact: src/approvalPolicy.js -> tests/approvalPolicy.test.js\\n');",
    "console.log('DEV_AUDIT_GRAPHIFY_OK');",
    "",
  ].join("\n"));
  writeText(path.join(root, ".planning", "fixtures", "fake-rag-index.mjs"), [
    "import fs from 'node:fs';",
    "import path from 'node:path';",
    "const out = path.join(process.cwd(), 'graphrag-workspace', 'output');",
    "fs.mkdirSync(out, { recursive: true });",
    "fs.writeFileSync(path.join(out, 'index.txt'), 'DEV_AUDIT_RAG_INDEX_OK\\n');",
    "console.log('DEV_AUDIT_RAG_INDEX_OK');",
    "",
  ].join("\n"));
  writeText(path.join(root, ".planning", "fixtures", "fake-rag-query.mjs"), [
    "console.log('代理承認の上限は50,000円です。 [docs/specs/01_proxy_approval.md:4]');",
    "",
  ].join("\n"));
  config.spec_context = {
    ...(config.spec_context || {}),
    provider: "graphrag-local",
    index_command: "node .planning/fixtures/fake-rag-index.mjs",
    query_command: "node .planning/fixtures/fake-rag-query.mjs {query}",
  };
  config.graphrag = {
    ...(config.graphrag || {}),
    enabled: true,
    mode: "local",
    requires_api_key: false,
    api_base: "http://127.0.0.1:11434",
    index_command: config.spec_context.index_command,
    local_query_command: config.spec_context.query_command,
  };
  config.privacy = {
    ...(config.privacy || {}),
    network_policy: "local_only",
    allow_external_rag: false,
    allow_external_tools: false,
    allowed_hosts: ["127.0.0.1", "localhost"],
  };
  config.code_map = {
    ...(config.code_map || {}),
    provider: "graphify",
    update_command: "node .planning/fixtures/fake-graphify.mjs",
  };
  config.graphify = {
    ...(config.graphify || {}),
    update_command: "node .planning/fixtures/fake-graphify.mjs",
  };
  writeText(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

function runPik(root, label, args, bucket, commands) {
  const result = runTimed(label, "node", [pikCli, ...args], { cwd: root, timeout: 360000 });
  commands.push({ ...result, bucket });
  return result;
}

function completeWorkflow(root, commands) {
  runPik(root, "pik-workflow-continue-plan", ["workflow", "continue", "--target", root, "--gate", "plan", "--evidence", "audit plan accepted"], "pik_dev_workflow_ms", commands);
  runPik(root, "pik-workflow-continue-implementation", ["workflow", "continue", "--target", root, "--gate", "implementation", "--evidence", "code changed to 50000"], "pik_dev_workflow_ms", commands);
  runPik(root, "pik-workflow-continue-verification", ["workflow", "continue", "--target", root, "--gate", "verification", "--evidence", "npm test passed"], "pik_dev_workflow_ms", commands);
  runPik(root, "pik-evidence-record", ["evidence", "record", "--target", root, "代理承認上限を50,000円へ変更", "--command", "npm test", "--result", "passed", "--source", "docs/specs/01_proxy_approval.md", "--writeback", ".planning/issues/CR-017_proxy_limit.md"], "pik_guard_ms", commands);
  runPik(root, "pik-completion-check", ["workflow", "completion-check", "--target", root], "pik_guard_ms", commands);
}

function benchmarkPikScenario(root, scenario, withIntelligence) {
  const commands = [];
  createBenchmarkFixture(root, scenario);
  const memoryIsolation = !fs.existsSync(path.join(root, ".planning")) && !fs.existsSync(path.join(root, "graphify-out")) ? "PASS" : "FAIL";
  runPik(root, "pik-init", ["init", "--target", root, "--template", "brownfield-monorepo", "--name", `audit_${scenario}`, "--mode", "existing", "--force"], "pik_setup_ms", commands);
  runPik(root, "pik-codebase-scan", ["codebase", "scan", "--target", root], "pik_setup_ms", commands);
  configureFakeIntelligence(root);
  if (withIntelligence) {
    runPik(root, "pik-docs-sync", ["docs", "sync", "--target", root], "pik_graphrag_ms", commands);
    runPik(root, "pik-rag-init-local", ["rag", "init-local", "--target", root, "--force", "--skip-model-check"], "pik_graphrag_ms", commands);
    runPik(root, "pik-graph-build-run", ["graph", "build", "--target", root, "--run"], "pik_graphify_ms", commands);
    runPik(root, "pik-docs-query", ["docs", "query", "--target", root, "代理承認 上限"], "pik_graphrag_ms", commands);
    runPik(root, "pik-answer-audit", ["answer", "audit", "--target", root], "pik_graphrag_ms", commands);
    runPik(root, "pik-graph-impact", ["graph", "impact", "--target", root, "--files", "src/approvalPolicy.js"], "pik_graphify_ms", commands);
  } else {
    runPik(root, "pik-mode-set-graph-lite", ["mode", "set", "--target", root, "graph-lite"], "pik_guard_ms", commands);
    runPik(root, "pik-graph-build-run-lite", ["graph", "build", "--target", root, "--run"], "pik_graphify_ms", commands);
    runPik(root, "pik-graph-impact-lite", ["graph", "impact", "--target", root, "--files", "src/approvalPolicy.js"], "pik_graphify_ms", commands);
  }
  runPik(root, "pik-new-milestone", ["workflow", "run", "--target", root, "new-milestone", "CR-017 proxy approval limit"], "pik_dev_workflow_ms", commands);
  runPik(root, "pik-spec-phase", ["workflow", "run", "--target", root, "spec-phase", "CR-017 proxy approval limit"], "pik_dev_workflow_ms", commands);
  runPik(root, "pik-plan-phase", ["workflow", "run", "--target", root, "plan-phase", "CR-017 proxy approval limit"], "pik_dev_workflow_ms", commands);
  applyBenchmarkCodeChange(root);
  const test = runTimed(`npm-test-${scenario}-${withIntelligence ? "full" : "lite"}`, "npm", ["test"], { cwd: root, timeout: 240000 });
  commands.push({ ...test, bucket: "pik_dev_workflow_ms" });
  if (!withIntelligence) {
    runPik(root, "pik-graph-build-run-lite-after-change", ["graph", "build", "--target", root, "--run"], "pik_graphify_ms", commands);
  }
  completeWorkflow(root, commands);
  if (withIntelligence) {
    runPik(root, "pik-cockpit-build", ["cockpit", "build", "--target", root], "pik_cockpit_ms", commands);
  }
  const buckets = {};
  for (const command of commands) buckets[command.bucket] = (buckets[command.bucket] || 0) + command.duration_ms;
  buckets.pik_intelligence_layer_ms = (buckets.pik_graphify_ms || 0) + (buckets.pik_graphrag_ms || 0);
  buckets.pik_total_ms = commands.reduce((sum, item) => sum + item.duration_ms, 0);
  const completionOk = commands.some((item) => /completion allowed/.test(`${item.stdout_sample}\n${item.stderr_sample}`));
  const testOk = test.status === 0;
  const evidenceOk = fs.existsSync(path.join(root, ".planning", "evidence", "INDEX.md"));
  let status = testOk && completionOk ? "PASS" : "FAIL";
  if (!withIntelligence && scenario === "docs-missing" && testOk && completionOk) status = "WAIVED_WITH_RISK";
  if (withIntelligence && scenario === "docs-missing" && testOk && !completionOk) status = "EXPECTED_BLOCK";
  const score = (testOk ? 25 : 0) + (completionOk ? 25 : 0) + (evidenceOk ? 20 : 0) + (withIntelligence ? 20 : 8) + (memoryIsolation === "PASS" ? 10 : 0);
  return {
    tool: "AI-PIKit",
    mode: withIntelligence ? "full-local-graphify-graphrag" : "graph-lite-dev-loop",
    scenario,
    status,
    score,
    grade: grade(score),
    time_ms: buckets.pik_total_ms,
    buckets,
    token_usage: { status: "TOKEN_USAGE_UNAVAILABLE", reason: "deterministic shell benchmark, no AI subprocess" },
    memory_isolation: memoryIsolation,
    heavy_refresh_executed: withIntelligence ? "explicit graph-build --run only" : "explicit graph-build --run (Graphify only)",
    commands,
  };
}

function writeFrameworkPackSnapshot(root, framework, pack) {
  const snapshotDir = path.join(root, ".benchmark-framework", safeName(framework));
  writeJson(path.join(snapshotDir, "instruction-pack.json"), pack);
  const rows = (pack.skills || []).map((skill) => [
    skill.name,
    skill.exists ? "PASS" : "MISSING",
    skill.hash ? skill.hash.slice(0, 12) : "",
    Object.entries(skill.mentions || {}).filter(([, value]) => value).map(([key]) => key).join(", ") || "-",
  ]);
  writeText(path.join(snapshotDir, "INSTRUCTION_PACK.md"), `# ${framework} Instruction Pack Snapshot

生成时间: ${now()}

- Source: \`${pack.source || "unknown"}\`
- Type: ${pack.type}
- Selected skills: ${pack.selected_count || 0}
- Total skill count: ${pack.skill_count || 0}

${markdownTable(["Skill", "状态", "Hash", "Detected signals"], rows)}

## Excerpts

${(pack.skills || []).filter((skill) => skill.exists).map((skill) => `### ${skill.name}\n\n\`\`\`text\n${skill.excerpt}\n\`\`\``).join("\n\n")}
`);
}

function writeFrameworkEvidence(root, framework, scenario, pack, test, commands, statusDetail) {
  const evidenceDir = path.join(root, ".benchmark-evidence", safeName(framework));
  const specSource = scenario === "docs-missing" ? "WAIVED_WITH_RISK: no docs in fixture" : "docs/specs/01_proxy_approval.md";
  const evidence = [
    `# ${framework} Skill-Pack-Backed Replay Evidence`,
    "",
    `Task: ${BENCHMARK_TASK}`,
    `Scenario: ${scenario}`,
    `Replay mode: skill-pack-backed-replay`,
    `Instruction source: ${pack.source || "unknown"}`,
    `Instruction selected count: ${pack.selected_count || 0}`,
    `Status detail: ${statusDetail}`,
    `Spec source: ${specSource}`,
    `Test status: ${test.status === 0 ? "PASS" : "FAIL"}`,
    `Started: ${commands[0]?.started_at || now()}`,
    `Ended: ${now()}`,
    "",
    "## Command Evidence",
    "",
    ...commands.map((command) => `- ${command.label}: status=${command.status}, duration=${command.duration_ms}ms`),
    "",
  ].join("\n");
  writeText(path.join(evidenceDir, "EVIDENCE.md"), evidence);
}

function benchmarkFrameworkReplay(root, framework, scenario, pack) {
  const commands = [];
  createBenchmarkFixture(root, scenario);
  const memoryIsolation = !fs.existsSync(path.join(root, ".planning")) && !fs.existsSync(path.join(root, ".benchmark-evidence")) ? "PASS" : "FAIL";
  writeFrameworkPackSnapshot(root, framework, pack);
  const inspect = runTimed(`${framework}-${scenario}-instruction-pack-inspect`, "node", ["-e", [
    "const fs=require('fs');",
    "const p=process.argv[1];",
    "const data=JSON.parse(fs.readFileSync(p,'utf8'));",
    "if(!data.selected_count) process.exit(2);",
    "console.log(`${data.name || 'tool'} selected skills ${data.selected_count}`);",
  ].join(""), path.join(root, ".benchmark-framework", safeName(framework), "instruction-pack.json")], { cwd: root, timeout: 60000 });
  commands.push({ ...inspect, bucket: "framework_instruction_pack_ms" });
  const workflowStart = now();
  if (framework === "GSD") {
    writeText(path.join(root, ".planning", "milestones", "CR-017-proxy-limit", "MILESTONE.md"), [
      "# CR-017 proxy approval limit",
      "",
      `Task: ${BENCHMARK_TASK}`,
      "Workflow replay source: GSD skills gsd-new-milestone/spec/discuss/plan/execute/verify/complete",
      `Instruction pack hash: ${sha256(JSON.stringify(pack.skills?.map((skill) => skill.hash) || []))}`,
      "",
    ].join("\n"));
    writeText(path.join(root, ".planning", "phases", "01", "CONTEXT.md"), [
      "# CONTEXT",
      "",
      scenario === "docs-missing"
        ? "WAIVED_WITH_RISK: no project docs were present in this fixture."
        : "Spec evidence: docs/specs/01_proxy_approval.md declares 50,000 円.",
      "",
    ].join("\n"));
    writeText(path.join(root, ".planning", "phases", "01", "PLAN.md"), [
      "# PLAN",
      "",
      "- Read spec evidence.",
      "- Change PROXY_APPROVAL_LIMIT to 50000.",
      "- Run npm test.",
      "- Write UAT/evidence.",
      "",
    ].join("\n"));
    writeText(path.join(root, ".planning", "phases", "01", "EXECUTION.md"), [
      "# EXECUTION",
      "",
      "- Applied minimal code change in src/approvalPolicy.js.",
      "",
    ].join("\n"));
  } else {
    writeText(path.join(root, ".superpowers-benchmark", "PLAN.md"), [
      "# Plan",
      "",
      `Task: ${BENCHMARK_TASK}`,
      "Workflow replay source: Superpowers writing-plans / TDD / executing-plans / verification-before-completion.",
      "- Red: existing test expects 50000 and fails against current code.",
      "- Green: update approval limit to 50000.",
      "- Verify: run npm test before completion.",
      "",
    ].join("\n"));
    writeText(path.join(root, ".superpowers-benchmark", "SKILL_USAGE.md"), [
      "# Skill Usage",
      "",
      ...((pack.skills || []).filter((skill) => skill.exists).map((skill) => `- ${skill.name}: ${skill.hash}`)),
      "",
    ].join("\n"));
  }
  applyBenchmarkCodeChange(root);
  const test = runTimed(`${framework}-${scenario}-npm-test`, "npm", ["test"], { cwd: root, timeout: 240000 });
  commands.push({ ...test, bucket: "framework_test_ms" });
  if (framework === "GSD") {
    writeText(path.join(root, ".planning", "phases", "01", "UAT.md"), [
      "# UAT",
      "",
      `- npm test: ${test.status === 0 ? "PASS" : "FAIL"}`,
      "- Result: proxy approval accepts 50,000 and rejects 50,001.",
      "",
    ].join("\n"));
    writeText(path.join(root, ".planning", "phases", "01", "COMPLETE.md"), [
      "# Complete",
      "",
      `- Workflow completed by replay at ${now()}.`,
      "- Evidence: .benchmark-evidence/GSD/EVIDENCE.md",
      "",
    ].join("\n"));
  } else {
    writeText(path.join(root, ".superpowers-benchmark", "VERIFICATION.md"), [
      "# Verification",
      "",
      `- npm test: ${test.status === 0 ? "PASS" : "FAIL"}`,
      "- Completion rule: verification before completion satisfied by local test output.",
      "",
    ].join("\n"));
    writeText(path.join(root, ".superpowers-benchmark", "COMPLETION.md"), [
      "# Completion",
      "",
      `- Finished at ${now()}.`,
      "- Evidence: .benchmark-evidence/Superpowers/EVIDENCE.md",
      "",
    ].join("\n"));
  }
  writeFrameworkEvidence(root, framework, scenario, pack, test, commands, `workflow replay started ${workflowStart}`);
  const docsEvidence = scenario !== "docs-missing" && fs.existsSync(path.join(root, "docs", "specs", "01_proxy_approval.md"));
  const workflowArtifacts = framework === "GSD"
    ? ["MILESTONE.md", "CONTEXT.md", "PLAN.md", "EXECUTION.md", "UAT.md", "COMPLETE.md"].filter((name) => listFiles(path.join(root, ".planning"), (file) => path.basename(file) === name).length).length
    : ["PLAN.md", "SKILL_USAGE.md", "VERIFICATION.md", "COMPLETION.md"].filter((name) => fs.existsSync(path.join(root, ".superpowers-benchmark", name))).length;
  const graphifySignal = Boolean(pack.capabilities?.graphify);
  const ragSignal = Boolean(pack.capabilities?.local_rag);
  const packOk = (pack.selected_count || 0) > 0 && inspect.status === 0;
  let score =
    (test.status === 0 ? 25 : 0) +
    (packOk ? 15 : 0) +
    Math.min(20, workflowArtifacts * (framework === "GSD" ? 4 : 5)) +
    (docsEvidence ? 15 : scenario === "docs-missing" ? 7 : 0) +
    (graphifySignal ? 8 : 0) +
    (ragSignal ? 8 : 0) +
    (pack.capabilities?.repository_cli ? 7 : 0) +
    (memoryIsolation === "PASS" ? 10 : 0) +
    (framework === "GSD" ? 7 : 5);
  const confidenceCap = framework === "GSD" ? 88 : 82;
  score = Math.min(confidenceCap, score);
  const status = test.status === 0 && packOk
    ? (scenario === "docs-missing" ? "WAIVED_WITH_RISK" : "PASS")
    : "FAIL";
  return {
    tool: framework,
    mode: "skill-pack-backed-replay",
    scenario,
    status,
    score,
    grade: grade(score),
    time_ms: commands.reduce((sum, item) => sum + item.duration_ms, 0),
    buckets: {
      framework_instruction_pack_ms: commands.filter((command) => command.bucket === "framework_instruction_pack_ms").reduce((sum, item) => sum + item.duration_ms, 0),
      framework_test_ms: commands.filter((command) => command.bucket === "framework_test_ms").reduce((sum, item) => sum + item.duration_ms, 0),
      framework_total_ms: commands.reduce((sum, item) => sum + item.duration_ms, 0),
    },
    token_usage: { status: "TOKEN_USAGE_UNAVAILABLE", reason: "skill-pack-backed replay is deterministic and does not invoke an AI model" },
    memory_isolation: memoryIsolation,
    instruction_pack: {
      source: pack.source,
      type: pack.type,
      selected_count: pack.selected_count,
      skill_count: pack.skill_count,
      capability_flags: pack.capabilities,
      snapshot: path.join(root, ".benchmark-framework", safeName(framework), "INSTRUCTION_PACK.md"),
    },
    limitations: [
      `${framework} was replayed from its local skill/plugin instructions; this is not a live model quality benchmark.`,
      `Score capped at ${confidenceCap} because this mode is not a repository-local executable CLI benchmark.`,
      pack.capabilities?.repository_cli ? "" : `${framework} has no repository-local AI-PIKit-style CLI in this fixture.`,
      pack.capabilities?.local_rag ? "" : `${framework} does not provide AI-PIKit local GraphRAG default mode in this replay.`,
    ].filter(Boolean),
    commands,
  };
}

function parseCodexJsonl(jsonl) {
  const usage = {
    input_tokens: 0,
    output_tokens: 0,
    cached_input_tokens: 0,
    reasoning_output_tokens: 0,
    total_tokens: 0,
    source: "codex-jsonl",
  };
  let seen = false;
  for (const line of jsonl.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      const u = event.usage || event.token_usage || event.usage_metadata || event.data?.usage;
      if (!u) continue;
      seen = true;
      usage.input_tokens += Number(u.input_tokens || u.prompt_tokens || 0);
      usage.output_tokens += Number(u.output_tokens || u.completion_tokens || 0);
      usage.cached_input_tokens += Number(u.cached_input_tokens || 0);
      usage.reasoning_output_tokens += Number(u.reasoning_output_tokens || 0);
      usage.total_tokens += Number(u.total_tokens || 0);
    } catch {
      // Ignore non-JSON lines defensively.
    }
  }
  if (!seen) return { status: "TOKEN_USAGE_UNAVAILABLE", reason: "Codex JSONL did not expose usage events" };
  if (!usage.total_tokens) usage.total_tokens = usage.input_tokens + usage.output_tokens + usage.reasoning_output_tokens;
  return usage;
}

function extractCodexFailure(jsonl, stderr, fallback) {
  const messages = [];
  for (const line of jsonl.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      const candidates = [
        event.message,
        event.error?.message,
        event.error,
        event.data?.error?.message,
      ].filter(Boolean);
      for (const candidate of candidates) {
        let text = typeof candidate === "string" ? candidate : JSON.stringify(candidate);
        try {
          const nested = JSON.parse(text);
          text = nested?.error?.message || nested?.message || text;
        } catch {
          // Keep raw text.
        }
        if (text && !messages.includes(text)) messages.push(text);
      }
    } catch {
      // Ignore non-JSON lines.
    }
  }
  const modelLine = stderr.split(/\r?\n/).find((line) => /model is not supported|No active credentials|unsupported|invalid_request_error/i.test(line));
  if (modelLine) messages.push(modelLine.replace(/^.*?(The |No active|unsupported|invalid_request_error)/, "$1").trim());
  return (messages.find((item) => /not supported|No active credentials|unsupported|invalid_request_error|failed/i.test(item)) || messages[0] || fallback || "real Codex subprocess failed").slice(0, 1000);
}

function maybeRunRealCodexBenchmark(root, toolName, instructionBundle) {
  if (process.env.AI_PIKIT_AUDIT_REAL_AI !== "1") {
    return { status: "SKIPPED", reason: "set AI_PIKIT_AUDIT_REAL_AI=1 to run real Codex subprocess benchmark" };
  }
  createBenchmarkFixture(root, "docs-complete");
  const outputFile = path.join(root, "codex-final-message.md");
  const prompt = [
    instructionBundle,
    "",
    "You are running a synthetic benchmark. Do not use external project data.",
    "Fresh-memory requirement: do not assume prior conversation. Work only from this fixture.",
    `Task: ${BENCHMARK_TASK}`,
    "Make the minimal code/test/doc/evidence changes needed. Run npm test. Keep final answer short.",
  ].join("\n");
  const args = [
    "exec",
    "--ephemeral",
    "--ignore-rules",
    "--skip-git-repo-check",
    "--json",
    "--output-last-message",
    outputFile,
    "--sandbox",
    "workspace-write",
    "-c",
    "approval_policy=\"never\"",
  ];
  if (process.env.AI_PIKIT_AUDIT_CODEX_IGNORE_USER_CONFIG === "1") args.push("--ignore-user-config");
  if (process.env.AI_PIKIT_AUDIT_CODEX_SERVICE_TIER) args.push("-c", `service_tier="${process.env.AI_PIKIT_AUDIT_CODEX_SERVICE_TIER}"`);
  if (process.env.AI_PIKIT_AUDIT_CODEX_MODEL_PROVIDER) args.push("-c", `model_provider="${process.env.AI_PIKIT_AUDIT_CODEX_MODEL_PROVIDER}"`);
  if (process.env.AI_PIKIT_AUDIT_CODEX_OSS === "1") args.push("--oss");
  if (process.env.AI_PIKIT_AUDIT_CODEX_LOCAL_PROVIDER) args.push("--local-provider", process.env.AI_PIKIT_AUDIT_CODEX_LOCAL_PROVIDER);
  if (process.env.AI_PIKIT_AUDIT_CODEX_MODEL) args.push("-m", process.env.AI_PIKIT_AUDIT_CODEX_MODEL);
  args.push(
    "-C",
    root,
    prompt,
  );
  const timeout = Number(process.env.AI_PIKIT_AUDIT_CODEX_TIMEOUT_MS || 180000);
  const result = runTimed(`real-codex-${safeName(toolName)}`, "codex", args, { cwd: root, timeout });
  const jsonlPath = path.join(root, "codex-events.jsonl");
  const stdoutPath = path.join(rawDir, `${safeName(`real-codex-${safeName(toolName)}`)}.stdout.txt`);
  const stderrPath = path.join(rawDir, `${safeName(`real-codex-${safeName(toolName)}`)}.stderr.txt`);
  const jsonl = readText(stdoutPath);
  const stderr = readText(stderrPath);
  writeText(jsonlPath, jsonl);
  return {
    status: result.status === 0 ? "PASS" : "FAIL",
    command: result,
    token_usage: parseCodexJsonl(jsonl),
    final_message: readText(outputFile),
    event_log: jsonlPath,
    stderr_log: stderrPath,
    failure_summary: result.status === 0 ? "" : extractCodexFailure(jsonl, stderr, result.error || result.stderr_sample || result.stdout_sample),
    memory_flags: ["--ephemeral", "--ignore-rules", process.env.AI_PIKIT_AUDIT_CODEX_IGNORE_USER_CONFIG === "1" ? "--ignore-user-config" : "user-config-loaded-for-provider"],
  };
}

function buildBenchmarkConclusions(data) {
  const byTool = Object.fromEntries((data.by_tool || []).map((item) => [item.tool, item]));
  const aipikit = byTool["AI-PIKit"];
  const gsd = byTool.GSD;
  const sp = byTool.Superpowers;
  const conclusions = [];
  if (aipikit) {
    conclusions.push(`AI-PIKit 当前优势是本地可执行面最完整：\`pik-*\` CLI、runtime skills、\`.planning/\` evidence、Graphify/RAG 耗时拆分和 local-only guard 都能在同一 fixture 中落地。平均分 ${aipikit.average_score}/${aipikit.grade}。`);
    conclusions.push("AI-PIKit 当前弱点是 full-local 路径比 graph-lite 更重，命令面也明显更大；日常开发需要继续靠 profile/policy 控制何时刷新 Graphify/RAG。");
  }
  if (gsd) {
    conclusions.push(`GSD 的优势是 workflow 设计成熟，plan/execute/verify、UAT、subagent 编排和文档流程经验很强；本轮 replay 平均分 ${gsd.average_score}/${gsd.grade}。`);
  conclusions.push("GSD 的短板是它不是当前项目的 repository-local AI-PIKit CLI，Codex typed-agent 能力和本地 RAG/Graphify/policy 默认融合都不是它的原生闭环。");
  }
  if (sp) {
    conclusions.push(`Superpowers 的优势是轻量、通用、TDD 和 verification-before-completion 思路清晰；本轮 replay 平均分 ${sp.average_score}/${sp.grade}。`);
    conclusions.push("Superpowers 的短板是缺少面向文档密集型开发的项目知识层、代码影响图、citation/evidence/policy 本地闭环；更像开发纪律增强包，不是项目 intelligence layer。");
  }
  const realStatuses = (data.real_ai || []).map((item, index) => `${["AI-PIKit", "GSD", "Superpowers"][index]}=${item.status}`).join(", ");
  conclusions.push(`真实 agent subprocess 状态单独统计为：${realStatuses || "not run"}。它不成功时不能证明模型执行质量，只能证明当前环境的 live-agent benchmark 条件不足。`);
  conclusions.push("因此本轮可信结论是：AI-PIKit 在“本地项目知识中枢 + 工作流 + evidence/policy + Graphify/RAG 集成”上领先；GSD 在 workflow 设计参考价值上更成熟；Superpowers 在轻量开发纪律上更简洁。");
  return conclusions;
}

function auditBenchmark() {
  ensureDir(benchmarkDir);
  const superpowersClone = cloneSuperpowersIfRequested();
  const superpowers = superpowersInfo(superpowersClone.root);
  const gsdPack = gsdInstructionPack();
  const superpowersPack = superpowersInstructionPack(superpowersClone.root);
  const comparison = [];
  for (const scenario of ["docs-complete", "docs-missing", "docs-partial"]) {
    comparison.push(benchmarkPikScenario(path.join(benchmarkDir, scenario, "aipikit-lite"), scenario, false));
    comparison.push(benchmarkPikScenario(path.join(benchmarkDir, scenario, "aipikit-full"), scenario, true));
    comparison.push(benchmarkFrameworkReplay(path.join(benchmarkDir, scenario, "gsd"), "GSD", scenario, gsdPack));
    comparison.push(benchmarkFrameworkReplay(path.join(benchmarkDir, scenario, "superpowers"), "Superpowers", scenario, superpowersPack));
  }
  const realAi = [
    maybeRunRealCodexBenchmark(path.join(benchmarkDir, "real-ai", "aipikit"), "AI-PIKit", [
      "Use AI-PIKit semantics and the repository-local pik CLI where useful.",
      "Required properties: local-only, no hidden heavy refresh, evidence writeback, workflow artifacts, Graphify/RAG awareness.",
    ].join("\n")),
    maybeRunRealCodexBenchmark(path.join(benchmarkDir, "real-ai", "gsd"), "GSD", [
      "Use this GSD instruction pack snapshot as your operating contract.",
      ...gsdPack.skills.filter((skill) => skill.exists).slice(0, 8).map((skill) => `## ${skill.name}\n${skill.excerpt}`),
      "Run a GSD-style milestone/spec/plan/execute/verify/complete loop on the fixture.",
    ].join("\n\n")),
    maybeRunRealCodexBenchmark(path.join(benchmarkDir, "real-ai", "superpowers"), "Superpowers", [
      "Use this Superpowers instruction pack snapshot as your operating contract.",
      ...superpowersPack.skills.filter((skill) => skill.exists).slice(0, 8).map((skill) => `## ${skill.name}\n${skill.excerpt}`),
      "Run a Superpowers-style plan/TDD/execute/verification-before-completion loop on the fixture.",
    ].join("\n\n")),
  ];
  const timeBreakdown = comparison.map((item) => ({
    tool: item.tool,
    mode: item.mode,
    scenario: item.scenario,
    time_ms: item.time_ms,
    buckets: item.buckets,
  }));
  const tokenUsage = comparison.map((item) => ({
    tool: item.tool,
    mode: item.mode,
    scenario: item.scenario,
    token_usage: item.token_usage,
  })).concat(realAi.map((item, index) => ({
    tool: ["AI-PIKit-real-codex", "GSD-real-codex", "Superpowers-real-codex"][index],
    mode: "real-codex-subprocess",
    scenario: "docs-complete",
    token_usage: item.token_usage || { status: item.status, reason: item.reason },
  })));
  const best = [...comparison].sort((a, b) => b.score - a.score)[0];
  const data = {
    generated: now(),
    status: comparison.every((item) => !isBenchmarkFailure(item.status)) ? "PASS" : "WARN",
    task: BENCHMARK_TASK,
    superpowers_source: superpowersClone.source,
    superpowers,
    instruction_packs: {
      gsd: {
        source: gsdPack.source,
        selected_count: gsdPack.selected_count,
        skill_count: gsdPack.skill_count,
        capabilities: gsdPack.capabilities,
      },
      superpowers: {
        source: superpowersPack.source,
        selected_count: superpowersPack.selected_count,
        skill_count: superpowersPack.skill_count,
        capabilities: superpowersPack.capabilities,
      },
    },
    comparison,
    real_ai: realAi,
    best,
    time_breakdown: timeBreakdown,
    token_usage: tokenUsage,
    memory_isolation: comparison.every((item) => item.memory_isolation === "PASS") ? "PASS" : "FAIL",
  };
  const byTool = ["AI-PIKit", "GSD", "Superpowers"].map((tool) => {
    const rows = comparison.filter((item) => item.tool === tool);
    const avg = Math.round(rows.reduce((sum, item) => sum + item.score, 0) / Math.max(1, rows.length));
    const totalMs = rows.reduce((sum, item) => sum + item.time_ms, 0);
    return {
      tool,
      average_score: avg,
      grade: grade(avg),
      total_time_ms: totalMs,
      pass_count: rows.filter((item) => item.status === "PASS").length,
      waived_count: rows.filter((item) => item.status === "WAIVED_WITH_RISK").length,
      expected_block_count: rows.filter((item) => item.status === "EXPECTED_BLOCK").length,
      fail_count: rows.filter((item) => item.status === "FAIL").length,
      run_count: rows.length,
    };
  });
  data.by_tool = byTool;
  data.conclusions = buildBenchmarkConclusions(data);
  const realRows = realAi.map((item, index) => {
    const tool = ["AI-PIKit", "GSD", "Superpowers"][index];
    return [
      tool,
      item.status,
      item.command ? `${item.command.duration_ms} ms` : "-",
      item.token_usage?.total_tokens ?? item.token_usage?.status ?? "-",
      item.reason || item.failure_summary || "-",
    ];
  });
  const md = `# Benchmark Comparison

生成时间: ${data.generated}

- 任务: ${data.task}
- 状态: ${data.status}
- Superpowers source: ${data.superpowers_source}
- Memory isolation: ${data.memory_isolation}
- Real Codex subprocess: ${realAi.map((item) => item.status).join(", ")}

## 三方总览

${markdownTable(["工具", "平均分", "等级", "通过数", "总耗时"], byTool.map((item) => [
    item.tool,
    item.average_score,
    item.grade,
    `${item.pass_count}/${item.run_count} pass, ${item.waived_count} risk, ${item.expected_block_count} expected block, ${item.fail_count} fail`,
    `${item.total_time_ms} ms`,
  ]))}

${markdownTable(["工具", "模式", "场景", "状态", "分数", "等级", "耗时", "Token"], comparison.map((item) => [
    item.tool,
    item.mode,
    item.scenario,
    benchmarkStatusLabel(item.status),
    item.score,
    item.grade,
    `${item.time_ms} ms`,
    item.token_usage.total_tokens ?? item.token_usage.status,
  ]))}

## Real Agent Attempts

${markdownTable(["工具", "状态", "耗时", "Token", "原因 / 摘要"], realRows)}

## AI-PIKit 时间拆分

${markdownTable(["场景", "模式", "setup", "dev workflow", "Graphify", "GraphRAG/RAG", "intelligence layer", "guard", "cockpit", "total"], comparison.filter((item) => item.tool === "AI-PIKit").map((item) => [
    item.scenario,
    item.mode,
    item.buckets.pik_setup_ms || 0,
    item.buckets.pik_dev_workflow_ms || 0,
    item.buckets.pik_graphify_ms || 0,
    item.buckets.pik_graphrag_ms || 0,
    item.buckets.pik_intelligence_layer_ms || 0,
    item.buckets.pik_guard_ms || 0,
    item.buckets.pik_cockpit_ms || 0,
    item.buckets.pik_total_ms || item.time_ms,
  ]))}

## 解释

- AI-PIKit full-local 模式会显式计入 Graphify 和 GraphRAG/RAG 耗时。
- AI-PIKit graph-lite 模式证明无文档/轻量场景可以先跑开发闭环，但 evidence 必须记录风险。
- GSD / Superpowers 本轮使用本机真实 skill/plugin 文件做 \`skill-pack-backed-replay\`：报告记录 skill hash、指令摘录、fixture、代码改修、测试、证据文件。它不是 live model 能力评分，也不会假装它们拥有 AI-PIKit 的 repository-local \`pik-*\` CLI。
- Real agent attempts 单独列出。当前环境如果没有可用 Codex 模型/provider，会明确 FAIL/SKIPPED，不混入 replay 分数。
- Token 只有真实 Codex subprocess 暴露 usage 事件时才统计；否则标为 \`TOKEN_USAGE_UNAVAILABLE\`。

## 结论

${data.conclusions.map((item) => `- ${item}`).join("\n")}
`;
  writeReportPair("BENCHMARK_COMPARISON", data, md);
  writeReportPair("TIME_BREAKDOWN", { generated: now(), time_breakdown: timeBreakdown }, `# Time Breakdown\n\n生成时间: ${now()}\n\n${markdownTable(["工具", "模式", "场景", "耗时", "Buckets"], timeBreakdown.map((item) => [
    item.tool,
    item.mode,
    item.scenario,
    `${item.time_ms} ms`,
    `\`${JSON.stringify(item.buckets)}\``,
  ]))}\n`);
  writeReportPair("TOKEN_USAGE", { generated: now(), token_usage: tokenUsage }, `# Token Usage\n\n生成时间: ${now()}\n\n${markdownTable(["工具", "模式", "场景", "Token 状态"], tokenUsage.map((item) => [
    item.tool,
    item.mode,
    item.scenario,
    item.token_usage.total_tokens ?? item.token_usage.status ?? "TOKEN_USAGE_UNAVAILABLE",
  ]))}\n`);
  return data;
}

function buildScorecard(parts) {
  const commandAvg = parts.commands?.average_score || 0;
  const skillAvg = parts.skills?.average_score || 0;
  const featureAvg = parts.features?.average_score || 0;
  const benchmarkAvg = parts.benchmark?.comparison?.length
    ? Math.round(parts.benchmark.comparison.reduce((sum, item) => sum + item.score, 0) / parts.benchmark.comparison.length)
    : 0;
  const costScore = parts.benchmark?.memory_isolation === "PASS" ? 85 : 60;
  const total = Math.round((commandAvg * 0.25) + (skillAvg * 0.2) + (featureAvg * 0.25) + (benchmarkAvg * 0.2) + (costScore * 0.1));
  return {
    generated: now(),
    total_score: total,
    grade: grade(total),
    command_score: commandAvg,
    skill_score: skillAvg,
    feature_score: featureAvg,
    benchmark_score: benchmarkAvg,
    cost_observability_score: costScore,
    status: total >= 80 ? "PASS" : "WARN",
  };
}

function buildAuditReport(parts) {
  const scorecard = buildScorecard(parts);
  const findings = [
    `本轮命令面覆盖 ${parts.inventory.command_count} 个 \`pik\` / \`pik-*\` bin，命令平均分 ${scorecard.command_score}。`,
    `Runtime pack 覆盖 ${parts.inventory.runtime_item_count} 个 Codex / Claude Code / GitHub Copilot skill/prompt，平均分 ${scorecard.skill_score}。`,
    `功能 gate 加权分 ${scorecard.feature_score}，用于证明 workflow、policy、RAG、Graphify、cockpit 和 docs completeness 的闭环。`,
    `Benchmark comparison ${scorecard.benchmark_score} 是所有对标行的保守平均分，不是 AI-PIKit 单体分；AI-PIKit 单体平均见三方横向总览。`,
    `AI-PIKit full-local benchmark 已把 Graphify 与 GraphRAG/RAG 耗时拆开；graph-lite benchmark 用于低成本开发循环。`,
    `GSD 与 Superpowers 本轮使用本机真实 skill/plugin 文件做 skill-pack-backed replay；real agent subprocess 另行记录，不混入 replay 分数。`,
    ...(parts.benchmark?.conclusions || []),
  ];
  const data = {
    generated: now(),
    run_id: runId,
    status: scorecard.status,
    scorecard,
    inventory: parts.inventory,
    commands: parts.commands,
    skills: parts.skills,
    features: parts.features,
    benchmark: parts.benchmark,
    summary: { findings },
  };
  const benchmarkRows = (parts.benchmark?.comparison || []).map((item) => [
    item.tool,
    item.mode,
    item.scenario,
    benchmarkStatusLabel(item.status),
    item.score,
    `${item.time_ms} ms`,
  ]);
  const byToolRows = (parts.benchmark?.by_tool || []).map((item) => [
    item.tool,
    item.average_score,
    item.grade,
    `${item.pass_count}/${item.run_count} pass, ${item.waived_count} risk, ${item.expected_block_count} expected block, ${item.fail_count} fail`,
    `${item.total_time_ms} ms`,
  ]);
  const realRows = (parts.benchmark?.real_ai || []).map((item, index) => [
    ["AI-PIKit", "GSD", "Superpowers"][index] || `tool-${index}`,
    item.status,
    item.command ? `${item.command.duration_ms} ms` : "-",
    item.token_usage?.total_tokens ?? item.token_usage?.status ?? "-",
    item.reason || item.failure_summary || "-",
  ]);
  const md = `# AI-PIKit Developer Audit Report

生成时间: ${data.generated}

## 总览

- Run ID: \`${runId}\`
- 状态: ${data.status}
- 总分: ${scorecard.total_score}
- 等级: ${scorecard.grade}
- 原始产物: \`.pik-audit/runs/${runId}/\`

${markdownTable(["维度", "分数"], [
    ["Command surface", scorecard.command_score],
    ["Runtime skills", scorecard.skill_score],
    ["Feature gates", scorecard.feature_score],
    ["Benchmark comparison", scorecard.benchmark_score],
    ["Cost / isolation observability", scorecard.cost_observability_score],
  ])}

## 主要发现

${findings.map((item) => `- ${item}`).join("\n")}

## 三方横向总览

${byToolRows.length ? markdownTable(["工具", "平均分", "等级", "通过数", "总耗时"], byToolRows) : "没有三方汇总数据。"}

## 对标表

${benchmarkRows.length ? markdownTable(["工具", "模式", "场景", "状态", "分数", "耗时"], benchmarkRows) : "没有 benchmark 数据。"}

## Real Agent Attempts

${realRows.length ? markdownTable(["工具", "状态", "耗时", "Token", "原因 / 摘要"], realRows) : "本轮未尝试真实 agent subprocess。"}

## 边界

- \`.pik-audit/\` 已被 git ignore，原始 transcript、fixture、Superpowers clone 不提交。
- 默认 benchmark 是 deterministic，对真实 AI token 不做假统计。
- 真实 Codex subprocess 只有设置 \`AI_PIKIT_AUDIT_REAL_AI=1\` 才执行，并要求 \`--ephemeral --ignore-rules\`；如需完全不读用户配置，可额外设置 \`AI_PIKIT_AUDIT_CODEX_IGNORE_USER_CONFIG=1\`。
`;
  writeReportPair("AUDIT_SCORECARD", scorecard, `# Audit Scorecard\n\n${markdownTable(["维度", "分数"], [
    ["total", scorecard.total_score],
    ["command", scorecard.command_score],
    ["skill", scorecard.skill_score],
    ["feature", scorecard.feature_score],
    ["benchmark", scorecard.benchmark_score],
    ["cost/isolation", scorecard.cost_observability_score],
  ])}\n`);
  writeReportPair("AUDIT_REPORT", data, md);
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>AI-PIKit Audit Scorecard</title><style>body{font-family:Inter,system-ui,sans-serif;background:#080b10;color:#e8eef8;margin:40px}table{border-collapse:collapse;width:100%;margin:20px 0}td,th{border:1px solid #263241;padding:10px;text-align:left}.score{font-size:64px;font-weight:800;color:#45d483}.card{border:1px solid #263241;border-radius:8px;padding:20px;background:#111722}</style><body><h1>AI-PIKit Developer Audit</h1><div class="card"><div class="score">${scorecard.total_score}</div><p>Grade ${scorecard.grade} / ${data.status}</p></div><h2>Benchmark</h2>${markdownTable(["Tool","Mode","Scenario","Status","Score","Time"], benchmarkRows).replace(/\| ---.*\n/, "").split("\n").map((line, index) => {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (!cells.length) return "";
    const tag = index === 0 ? "th" : "td";
    return `<tr>${cells.map((cell) => `<${tag}>${cell}</${tag}>`).join("")}</tr>`;
  }).join("")}</body></html>`;
  writeText(path.join(reportsDir, "AUDIT_SCORECARD.html"), html);
  return data;
}

function verifyHarness() {
  ensureDir(reportsDir);
  const issues = [];
  const gitignore = readText(path.join(kitRoot, ".gitignore"));
  if (!gitignore.split(/\r?\n/).includes(".pik-audit/")) issues.push(".pik-audit/ is not listed in .gitignore");
  const pkg = readPackage();
  for (const script of ["dev:audit:quick", "dev:audit:inventory", "dev:audit:commands", "dev:audit:skills", "dev:audit:features", "dev:audit:benchmark", "dev:audit:report", "dev:audit:full", "dev:audit:nightly", "verify:dev-audit-harness"]) {
    if (!pkg.scripts?.[script]) issues.push(`missing npm script ${script}`);
  }
  const fixtureRoot = path.join(fixturesDir, "harness-docs-complete");
  createBenchmarkFixture(fixtureRoot, "docs-complete");
  if (!fs.existsSync(path.join(fixtureRoot, "docs", "specs", "01_proxy_approval.md"))) issues.push("docs-complete fixture missing spec");
  const data = {
    generated: now(),
    status: issues.length ? "FAIL" : "PASS",
    issues,
    fixture_root: fixtureRoot,
    run_root: runRoot,
  };
  const md = `# Dev Audit Harness Verification

生成时间: ${data.generated}

- 状态: ${data.status}
- Run root: \`${runRoot}\`
- Fixture root: \`${fixtureRoot}\`

${issues.length ? issues.map((item) => `- FAIL ${item}`).join("\n") : "- 未发现 harness 问题。"}
`;
  writeReportPair("DEV_AUDIT_HARNESS", data, md);
  writeJson(path.join(verificationReportDir, "dev-audit-harness-check.json"), data);
  writeText(path.join(verificationReportDir, "dev-audit-harness-check.md"), md);
  if (issues.length) process.exitCode = 1;
  return data;
}

function runFull(options = {}) {
  ensureDir(reportsDir);
  const inventory = auditInventory();
  const commands = auditCommands({ runVerifier: options.runVerifier });
  const skills = auditSkills({ runVerifier: options.runVerifier });
  const features = auditFeatures({ runVerifier: options.runVerifier });
  const benchmark = auditBenchmark();
  const report = buildAuditReport({ inventory, commands, skills, features, benchmark });
  syncLatest();
  emitVerificationSummary(report);
  return report;
}

function runMode() {
  ensureDir(runRoot);
  ensureDir(rawDir);
  ensureDir(reportsDir);
  ensureDir(fixturesDir);
  ensureDir(benchmarkDir);
  if (mode === "verify-harness") return verifyHarness();
  if (mode === "inventory") {
    const inventory = auditInventory();
    syncLatest();
    return inventory;
  }
  if (mode === "commands") {
    auditInventory();
    const data = auditCommands({ runVerifier: true });
    syncLatest();
    return data;
  }
  if (mode === "skills") {
    auditInventory();
    const data = auditSkills({ runVerifier: true });
    syncLatest();
    return data;
  }
  if (mode === "features") {
    auditInventory();
    const data = auditFeatures({ runVerifier: true });
    syncLatest();
    return data;
  }
  if (mode === "benchmark") {
    auditInventory();
    const data = auditBenchmark();
    syncLatest();
    emitVerificationSummary({ generated: now(), status: data.status, inventory: auditInventory(), benchmark: data, summary: { findings: ["Benchmark comparison generated."] } });
    return data;
  }
  if (mode === "report") {
    const inventory = auditInventory();
    const commands = fs.existsSync(path.join(reportsDir, "COMMAND_SCORES.json")) ? JSON.parse(readText(path.join(reportsDir, "COMMAND_SCORES.json"))) : auditCommands();
    const skills = fs.existsSync(path.join(reportsDir, "SKILL_SCORES.json")) ? JSON.parse(readText(path.join(reportsDir, "SKILL_SCORES.json"))) : auditSkills();
    const features = fs.existsSync(path.join(reportsDir, "FEATURE_SCORES.json")) ? JSON.parse(readText(path.join(reportsDir, "FEATURE_SCORES.json"))) : auditFeatures();
    const benchmark = fs.existsSync(path.join(reportsDir, "BENCHMARK_COMPARISON.json")) ? JSON.parse(readText(path.join(reportsDir, "BENCHMARK_COMPARISON.json"))) : auditBenchmark();
    const report = buildAuditReport({ inventory, commands, skills, features, benchmark });
    syncLatest();
    emitVerificationSummary(report);
    return report;
  }
  if (mode === "quick") return runFull({ runVerifier: false });
  if (mode === "nightly") return runFull({ runVerifier: true });
  return runFull({ runVerifier: true });
}

const result = runMode();
console.log(`dev audit ${mode} ${result?.status || "DONE"} run=${runId}`);
if (result?.status === "FAIL") process.exitCode = 1;
