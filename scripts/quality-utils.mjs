import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const reportDir = path.join(kitRoot, "verification", "reports");

export function now() {
  return new Date().toISOString();
}

export function rel(filePath) {
  return path.relative(kitRoot, filePath) || ".";
}

export function ensureReportDir() {
  fs.mkdirSync(reportDir, { recursive: true });
}

export function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

export function portableText(value) {
  return String(value)
    .split(kitRoot).join("<kit-root>")
    .split(os.tmpdir()).join("<tmp>")
    .split(os.homedir()).join("<home>")
    .replace(/\/var\/folders\/[^\s]+$/g, "<tmp>")
    .replace(/\/(?:Users|home)\/[^\s]+$/g, "<local-path>");
}

export function portableValue(value) {
  if (typeof value === "string") return portableText(value);
  if (Array.isArray(value)) return value.map(portableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, portableValue(item)]));
  }
  return value;
}

export function writeJsonReport(name, data) {
  ensureReportDir();
  const outPath = path.join(reportDir, name);
  fs.writeFileSync(outPath, `${JSON.stringify(portableValue(data), null, 2)}\n`);
  return outPath;
}

export function writeMarkdownReport(name, title, summary, sections = []) {
  ensureReportDir();
  const lines = [`# ${title}`, "", `生成时间: ${now()}`, "", "## 摘要", ""];
  for (const item of summary) lines.push(`- ${item}`);
  for (const section of sections) {
    lines.push("", `## ${section.title}`, "");
    if (typeof section.body === "string") lines.push(section.body);
    else for (const line of section.body) lines.push(line);
  }
  const outPath = path.join(reportDir, name);
  fs.writeFileSync(outPath, `${portableText(lines.join("\n"))}\n`);
  return outPath;
}

export function listFiles(root, predicate = () => true, out = []) {
  if (!fs.existsSync(root)) return out;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) listFiles(entryPath, predicate, out);
    else if (entry.isFile() && predicate(entryPath)) out.push(entryPath);
  }
  return out;
}

export function isTextProjectFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return [
    ".css",
    ".html",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".svg",
    ".txt",
    ".yaml",
    ".yml",
  ].includes(ext);
}

export function runCommand(label, command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || kitRoot,
    encoding: "utf8",
    env: { ...process.env, ...(options.env || {}) },
    stdio: ["ignore", "pipe", "pipe"],
    timeout: options.timeout || 120000,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status !== 0 && !options.allowFailure) {
    throw new Error(`${label} failed with exit ${result.status}\n${output}`);
  }
  return {
    label,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    output,
  };
}

export function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

export function tempRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function summarizeIssues(issues) {
  return issues.length === 0
    ? ["状态: PASS", "问题数: 0"]
    : ["状态: FAIL", `问题数: ${issues.length}`];
}
