import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function commandVersion(command, args = ["--version"]) {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5000,
    }).trim().split(/\r?\n/)[0];
  } catch {
    return null;
  }
}

function projectRagBackend(target) {
  const configPath = path.join(target, ".planning", "config.json");
  if (!fs.existsSync(configPath)) return "not-configured";
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (config.rag_backend) return String(config.rag_backend);
    if (config.graphrag?.enabled === false) return "none";
    return String(config.graphrag?.mode || "not-configured");
  } catch {
    return "invalid-config";
  }
}

export function collectDoctorChecks(target = process.cwd()) {
  const nodeVersion = process.versions.node;
  const npmVersion = commandVersion("npm");
  const gitVersion = commandVersion("git");
  const ragBackend = projectRagBackend(path.resolve(target));
  const browserAvailable = (() => {
    try {
      import.meta.resolve("playwright");
      return true;
    } catch {
      return false;
    }
  })();
  const checks = [
    { id: "node", required: true, status: Number(nodeVersion.split(".")[0]) >= 24 ? "PASS" : "FAIL", detail: nodeVersion },
    { id: "npm", required: true, status: npmVersion && Number(npmVersion.split(".")[0]) >= 11 ? "PASS" : "FAIL", detail: npmVersion || "not found" },
    { id: "git", required: true, status: gitVersion ? "PASS" : "FAIL", detail: gitVersion || "not found" },
    { id: "browser", required: false, status: browserAvailable ? "PASS" : "WARN", detail: browserAvailable ? "Playwright available" : "optional Playwright not installed" },
    { id: "rag", required: false, status: ragBackend === "invalid-config" ? "WARN" : "PASS", detail: ragBackend },
  ];
  if (ragBackend === "local") {
    checks.push({ id: "ollama", required: false, status: commandVersion("ollama") ? "PASS" : "WARN", detail: commandVersion("ollama") || "optional local RAG command not found" });
    checks.push({ id: "graphrag", required: false, status: commandVersion("graphrag") ? "PASS" : "WARN", detail: commandVersion("graphrag") || "optional local RAG command not found" });
  }
  return checks;
}

export function doctorCommand(args) {
  const checks = collectDoctorChecks(args.target || process.cwd());
  console.log("Zhulong doctor");
  for (const check of checks) console.log(`${check.status} ${check.id}: ${check.detail}`);
  if (checks.some((check) => check.required && check.status === "FAIL")) process.exitCode = 3;
}
