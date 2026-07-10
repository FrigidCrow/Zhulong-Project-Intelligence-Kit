import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { environmentFailure } from "../cli/output.mjs";
import { fileURLToPath } from "node:url";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TEMPLATE_SKIP_NAMES = new Set([".DS_Store"]);
const RUNTIME_PACKS = {
  codex: {
    sourceSubdir: "skills",
    itemKind: "skill",
    defaultDest: () => path.join(process.env.CODEX_HOME || path.join(os.homedir(), ".codex"), "skills"),
    restartNote: "Restart Codex after installing new skills.",
  },
  "claude-code": {
    sourceSubdir: "skills",
    itemKind: "skill",
    defaultDest: () => path.join(os.homedir(), ".claude", "skills"),
    restartNote: "Restart Claude Code if the top-level skills directory was newly created.",
  },
  "github-copilot": {
    sourceSubdir: "prompts",
    itemKind: "prompt",
    defaultDest: () => path.join(process.cwd(), ".github", "prompts"),
    restartNote: "Reload VS Code or run the chat customization diagnostics if prompts do not appear.",
  },
};

function render(content, values) {
  return content.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) => values[key] ?? "");
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function requireDir(dir, label) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw environmentFailure(`${label} does not exist or is not a directory: ${dir}`);
  }
}

function runtimeName(args) {
  const name = String(args.runtime || "codex").toLowerCase();
  if (name === "claude") return "claude-code";
  if (name === "copilot" || name === "github") return "github-copilot";
  return name;
}

function runtimePack(name) {
  return RUNTIME_PACKS[name] || null;
}

function runtimePackDir(name) {
  const pack = runtimePack(name);
  if (!pack) return null;
  return path.join(kitRoot, "runtime", name, pack.sourceSubdir);
}

function defaultRuntimeDest(name) {
  const pack = runtimePack(name);
  return pack ? pack.defaultDest() : null;
}

function runtimeInstallValues() {
  const zlBin = path.join(kitRoot, "bin", "zl.mjs");
  return {
    ZL_KIT_ROOT: kitRoot,
    ZL_CLI: `node ${shellQuote(zlBin)}`,
    ZL_GENERATED_AT: new Date().toISOString(),
  };
}

function runtimeLocalContract(values) {
  return `\n\n## Zhulong Local Runtime Contract\n\n- Use the local Zhulong CLI: \`${values.ZL_CLI}\`.\n- Keep project data local-only by default. Do not route document content to external providers unless the project explicitly opts in.\n- Public workflow commands may run lightweight status checks, but they must not trigger hidden heavy refresh. GraphRAG index, Graphify build, and refresh-run require explicit \`--run\`, \`--index\`, or \`zl-refresh-run\` approval.\n- Preserve evidence writeback: record meaningful verification with \`zl-evidence-record\` and use \`--writeback\` when closing workflow work.\n`;
}

function renderRuntimeContent(sourcePath, text, values) {
  const rendered = render(text, values);
  if (!sourcePath.endsWith(".md")) return rendered;
  if (rendered.includes("Zhulong Local Runtime Contract")) return rendered;
  return `${rendered.trimEnd()}${runtimeLocalContract(values)}`;
}

function copyRuntimePack(sourceDir, destDir, values, options = {}) {
  const actions = [];
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (TEMPLATE_SKIP_NAMES.has(entry.name)) continue;
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      if (!options.dryRun) fs.mkdirSync(targetPath, { recursive: true });
      actions.push(...copyRuntimePack(sourcePath, targetPath, values, options));
      continue;
    }
    if (fs.existsSync(targetPath) && !options.force) {
      actions.push({ action: "skip", path: targetPath });
      continue;
    }
    const content = renderRuntimeContent(sourcePath, fs.readFileSync(sourcePath, "utf8"), values);
    if (!options.dryRun) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, content);
    }
    actions.push({ action: options.dryRun ? "would-write" : "write", path: targetPath });
  }
  return actions;
}

function runtimePackItems(name) {
  const sourceDir = runtimePackDir(name);
  const pack = runtimePack(name);
  if (!sourceDir || !pack || !fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) return [];
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  if (pack.itemKind === "skill") {
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({ name: entry.name, relativePath: path.join(entry.name, "SKILL.md") }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".prompt.md"))
    .map((entry) => ({ name: entry.name.replace(/\.prompt\.md$/, ""), relativePath: entry.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function runtimeInstall(args) {
  const name = runtimeName(args);
  const pack = runtimePack(name);
  if (!pack) {
    console.log(`runtime ${name} is not installable`);
    console.log(`Available: ${Object.keys(RUNTIME_PACKS).join(", ")}`);
    process.exitCode = 1;
    return;
  }
  const sourceDir = runtimePackDir(name);
  requireDir(sourceDir, "Runtime pack");
  const dest = path.resolve(args.dest || defaultRuntimeDest(name));
  const actions = copyRuntimePack(sourceDir, dest, runtimeInstallValues(), {
    force: Boolean(args.force),
    dryRun: Boolean(args["dry-run"] || args.dryRun),
  });
  console.log(`runtime ${name}`);
  console.log(`source ${sourceDir}`);
  console.log(`dest ${dest}`);
  for (const item of actions) console.log(`${item.action} ${item.path}`);
  console.log(pack.restartNote);
}

function runtimeStatusCommand(args) {
  const name = runtimeName(args);
  const sourceDir = runtimePackDir(name);
  const pack = runtimePack(name);
  if (!pack || !sourceDir || !fs.existsSync(sourceDir)) {
    console.log(`runtime ${name} pack missing`);
    process.exitCode = 1;
    return;
  }
  const dest = path.resolve(args.dest || defaultRuntimeDest(name) || ".");
  const items = runtimePackItems(name);
  console.log(`runtime ${name}`);
  console.log(`source ${sourceDir}`);
  console.log(`dest ${dest}`);
  for (const item of items) {
    const installedPath = path.join(dest, item.relativePath);
    const installed = fs.existsSync(installedPath);
    const rendered = installed && !fs.readFileSync(installedPath, "utf8").includes("{{ZL_CLI}}");
    console.log(`${installed ? "ok" : "missing"} ${item.name}${installed && rendered ? " rendered" : ""}`);
  }
}

export function runtime(args, options = {}) {
  const subcommand = args._[0];
  if (subcommand === "install") return runtimeInstall(args);
  if (subcommand === "status") return runtimeStatusCommand(args);
  options.usage?.();
  process.exitCode = 1;
}

export function runtimeCatalog() {
  return Object.keys(RUNTIME_PACKS);
}
