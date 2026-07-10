import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  kitRoot,
  portableText,
  summarizeIssues,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "zhulong-install-smoke-"));
const installRoot = path.join(tempRoot, "install");
const targetRoot = path.join(tempRoot, "target");
const issues = [];
const commands = [];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || installRoot,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    timeout: options.timeout || 120000,
  });
  const record = {
    command: `${path.basename(command)} ${args.join(" ")}`,
    status: result.status,
    stdout: portableText(result.stdout || "").trim(),
    stderr: portableText(result.stderr || "").trim(),
  };
  commands.push(record);
  if (result.status !== (options.expectedStatus ?? 0)) issues.push(`${record.command}: exit ${result.status}`);
  return record;
}

try {
  fs.mkdirSync(installRoot, { recursive: true });
  fs.mkdirSync(path.join(targetRoot, "src"), { recursive: true });
  fs.writeFileSync(path.join(installRoot, "package.json"), "{\"private\":true}\n");
  fs.writeFileSync(path.join(targetRoot, "package.json"), "{\"name\":\"zhulong-install-smoke-target\",\"type\":\"module\"}\n");
  fs.writeFileSync(path.join(targetRoot, "src", "index.mjs"), "export const ready = true;\n");

  const packed = run("npm", ["pack", "--json", "--pack-destination", tempRoot], { cwd: kitRoot });
  let tarball;
  try {
    tarball = path.join(tempRoot, JSON.parse(packed.stdout)[0].filename);
  } catch (error) {
    issues.push(`pack output could not be parsed: ${error.message}`);
  }
  if (!tarball || !fs.existsSync(tarball)) issues.push("npm tarball was not created");

  if (tarball && fs.existsSync(tarball)) {
    run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", tarball]);
    const binRoot = path.join(installRoot, "node_modules", ".bin");
    const zhulong = path.join(binRoot, "zhulong");
    const zl = path.join(binRoot, "zl");
    const zlInit = path.join(binRoot, "zl-init");
    const zlCodebase = path.join(binRoot, "zl-codebase-scan");
    for (const binary of [zhulong, zl, zlInit, zlCodebase]) {
      if (!fs.existsSync(binary)) issues.push(`installed binary missing: ${path.basename(binary)}`);
    }
    if (fs.existsSync(zhulong)) {
      const help = run(zhulong, ["--help"]);
      if (!help.stdout.includes("Zhulong Project Intelligence Kit")) issues.push("zhulong --help did not identify the kit");
    }
    if (fs.existsSync(zl)) {
      const help = run(zl, ["--help", "--json"]);
      try {
        const envelope = JSON.parse(help.stdout);
        if (envelope.schemaVersion !== "zhulong-cli-output.v1") issues.push("zl --help returned the wrong JSON schema");
      } catch {
        issues.push("zl --help --json did not return JSON");
      }
    }
    if (fs.existsSync(zlInit)) {
      run(zlInit, [
        "--target", targetRoot,
        "--template", "brownfield-monorepo",
        "--name", "install_smoke",
        "--mode", "existing",
        "--doc-policy", "reference",
        "--rag", "none",
        "--force",
      ]);
    }
    if (fs.existsSync(zlCodebase)) run(zlCodebase, ["--target", targetRoot]);
    const configPath = path.join(targetRoot, ".planning", "config.json");
    if (!fs.existsSync(configPath)) issues.push("installed zl-init did not create .planning/config.json");
    else {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (config.rag_backend !== "none") issues.push("installed rag none profile was not preserved");
    }
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

const status = issues.length ? "FAIL" : "PASS";
const data = {
  schemaVersion: "zhulong-install-smoke.v1",
  status,
  issues,
  commands: commands.map((item) => ({ command: item.command, status: item.status })),
};
writeJsonReport("install-smoke-check.json", data);
writeMarkdownReport("install-smoke-check.md", "Zhulong Installed Tarball Smoke", summarizeIssues(issues), [
  { title: "Summary", body: [`- Status: ${status}`, `- Commands: ${commands.length}`, `- Issues: ${issues.length}`] },
  { title: "Commands", body: data.commands.map((item) => `- ${item.status === 0 ? "PASS" : "FAIL"} ` + "`" + item.command + "`") },
]);

console.log(`install smoke ${status} commands=${commands.length} issues=${issues.length}`);
if (issues.length) process.exitCode = 1;
