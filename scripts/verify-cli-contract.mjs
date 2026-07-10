import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  summarizeIssues,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const root = process.cwd();
const schema = JSON.parse(fs.readFileSync(path.join(root, "schemas", "cli-output.schema.json"), "utf8"));
const issues = [];
const results = [];

function run(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, ["bin/zl.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  results.push({ args, status: result.status, stdout: result.stdout, stderr: result.stderr });
  if (result.status !== expectedStatus) issues.push(`${args.join(" ")}: exit ${result.status}, expected ${expectedStatus}`);
  return result;
}

function parseEnvelope(label, result) {
  let value;
  try {
    value = JSON.parse(result.stdout);
  } catch (error) {
    issues.push(`${label}: stdout is not one JSON document (${error.message})`);
    return null;
  }
  const allowed = new Set(Object.keys(schema.properties));
  for (const key of schema.required) {
    if (!(key in value)) issues.push(`${label}: missing ${key}`);
  }
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issues.push(`${label}: unexpected property ${key}`);
  }
  if (value.schemaVersion !== schema.properties.schemaVersion.const) issues.push(`${label}: wrong schemaVersion`);
  if (!schema.properties.status.enum.includes(value.status)) issues.push(`${label}: invalid status`);
  if (!Number.isInteger(value.exitCode)) issues.push(`${label}: exitCode is not an integer`);
  if (!Array.isArray(value.stdout) || !value.stdout.every((item) => typeof item === "string")) issues.push(`${label}: stdout is not a string array`);
  if (!Array.isArray(value.stderr) || !value.stderr.every((item) => typeof item === "string")) issues.push(`${label}: stderr is not a string array`);
  if (result.stderr) issues.push(`${label}: JSON mode leaked process stderr`);
  return value;
}

const help = parseEnvelope("help JSON", run(["--help", "--json"]));
if (help?.command !== "help" || help?.status !== "ok" || help?.exitCode !== 0) issues.push("help JSON: wrong success contract");

const unknown = parseEnvelope("unknown JSON", run(["unknown-command", "--json"], 2));
if (unknown?.status !== "error" || unknown?.exitCode !== 2 || !unknown?.stderr?.length) issues.push("unknown JSON: wrong usage-error contract");

const doctor = parseEnvelope("doctor JSON", run(["doctor", "--json"]));
if (!doctor?.stdout?.some((line) => line.includes("PASS node:"))) issues.push("doctor JSON: missing Node check");

const quiet = run(["--help", "--quiet"]);
if (quiet.stdout !== "") issues.push("quiet: normal stdout was not suppressed");

const noColor = run(["--help", "--no-color"]);
if (/\u001b\[[0-9;]*m/.test(`${noColor.stdout}${noColor.stderr}`)) issues.push("no-color: ANSI sequence remained");

for (const shell of ["bash", "zsh", "fish"]) {
  const completion = run(["completion", shell, "--no-color"]);
  if (!completion.stdout.includes("zhulong") || !completion.stdout.includes("zl-docs-sync")) issues.push(`${shell} completion: command catalog missing`);
}

const badShell = parseEnvelope("completion usage JSON", run(["completion", "powershell", "--json"], 2));
if (badShell?.exitCode !== 2 || !badShell?.stderr?.some((line) => line.includes("unsupported completion shell"))) issues.push("completion usage JSON: wrong error contract");

const status = issues.length ? "FAIL" : "PASS";
const report = {
  schemaVersion: "zhulong-cli-contract-check.v1",
  status,
  issues,
  checks: results.length,
  exitCodes: { success: 0, commandFailure: 1, usage: 2, environment: 3, internal: 70 },
};
writeJsonReport("cli-contract-check.json", report);
writeMarkdownReport("cli-contract-check.md", "Zhulong CLI Contract Check", summarizeIssues(issues), [
  { title: "Summary", body: [`- Status: ${status}`, `- Checks: ${results.length}`, `- Issues: ${issues.length}`] },
  { title: "Contract", body: ["- JSON schema: `schemas/cli-output.schema.json`", "- stdout: normal result", "- stderr: diagnostics and usage errors", "- `--quiet`: suppress normal stdout", "- `--no-color`: strip ANSI output"] },
]);

console.log(`CLI contract check ${status} checks=${results.length} issues=${issues.length}`);
if (issues.length) process.exitCode = 1;
