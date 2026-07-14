import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  readText,
  rel,
  runCommand,
  shellQuote,
  summarizeIssues,
  tempRoot,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const zlCli = path.join(kitRoot, "bin", "zl.mjs");
const runtimeSpecs = [
  { name: "codex", kind: "skill", glob: "SKILL.md" },
  { name: "claude-code", kind: "skill", glob: "SKILL.md" },
  { name: "github-copilot", kind: "prompt", glob: ".prompt.md" },
];
const temp = tempRoot("zhulong-runtime-");
const issues = [];
const results = [];
const ragConditionalItems = new Set([
  "zl-spec-phase",
  "zl-debug",
  "zl-plan-phase",
  "zl-execute-phase",
]);

function addIssue(runtime, file, detail) {
  issues.push({ runtime, file: file ? rel(file).startsWith("..") ? file : rel(file) : "", detail });
}

function sourceItems(runtime) {
  const root = runtime === "github-copilot"
    ? path.join(kitRoot, "runtime", runtime, "prompts")
    : path.join(kitRoot, "runtime", runtime, "skills");
  if (runtime === "github-copilot") {
    return fs.readdirSync(root)
      .filter((name) => name.endsWith(".prompt.md"))
      .map((name) => ({ name: name.replace(/\.prompt\.md$/, ""), relativePath: name }));
  }
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, relativePath: path.join(entry.name, "SKILL.md") }));
}

function hasUnsafeGsdLine(text) {
  const lines = text.split(/\r?\n/);
  return lines.some((line, index) => {
    if (!/[$/]gsd-/.test(line)) return false;
    const window = [lines[index - 1] || "", line, lines[index + 1] || ""].join(" ");
    return !/(never|not|do not|不要|reference|historical|only)/i.test(window);
  });
}

for (const spec of runtimeSpecs) {
  const dest = path.join(temp, spec.name);
  fs.mkdirSync(dest, { recursive: true });
  const install = runCommand(
    `runtime install ${spec.name}`,
    "node",
    [zlCli, "runtime", "install", "--runtime", spec.name, "--dest", dest, "--force"],
    { timeout: 120000 },
  );
  const status = runCommand(
    `runtime status ${spec.name}`,
    "node",
    [zlCli, "runtime", "status", "--runtime", spec.name, "--dest", dest],
    { timeout: 120000 },
  );

  const items = sourceItems(spec.name);
  const installed = [];
  for (const item of items) {
    const installedPath = path.join(dest, item.relativePath);
    const exists = fs.existsSync(installedPath);
    installed.push({ ...item, path: installedPath, exists });
    if (!exists) {
      addIssue(spec.name, installedPath, "Expected runtime item was not installed.");
      continue;
    }
    const text = readText(installedPath);
    if (text.includes("{{ZL_CLI}}") || text.includes("{{ZL_KIT_ROOT}}") || text.includes("{{ZL_GENERATED_AT}}")) {
      addIssue(spec.name, installedPath, "Runtime template placeholder was not rendered.");
    }
    if (!text.includes("bin/zl.mjs")) addIssue(spec.name, installedPath, "Rendered runtime item does not point at local bin/zl.mjs.");
    if (!/zl-/.test(text)) addIssue(spec.name, installedPath, "Runtime item does not expose zl-* command guidance.");
    for (const expected of ["core/workflows/authorization.md", "suggested next", "bounded-autonomy", "diagnose-only", "--source user-message", "--accept-completion"]) {
      if (!text.toLowerCase().includes(expected.toLowerCase())) addIssue(spec.name, installedPath, `Runtime item missing authorization boundary: ${expected}`);
    }
    if (/workflow run[^\n`]*--source user-message/i.test(text)) {
      addIssue(spec.name, installedPath, "Runtime workflow command unconditionally claims user-message origin.");
    }
    if (item.name === "zl-debug" && !/explicitly asks for a fix|explicit fix/i.test(text)) {
      addIssue(spec.name, installedPath, "Debug runtime does not require explicit fix intent or a Goal grant.");
    }
    if (item.name === "zl-debug" && !/--intent fix/.test(text)) {
      addIssue(spec.name, installedPath, "Debug runtime does not propagate explicit fix intent into workflow state.");
    }
    if (item.name === "zl-discuss-phase" && !/proposed or open/i.test(text)) {
      addIssue(spec.name, installedPath, "Discussion runtime can still self-promote decisions to accepted.");
    }
    if (/Current backend|Internal Backend Invocation/.test(text)) {
      addIssue(spec.name, installedPath, "Runtime item still contains active backend wording.");
    }
    if (ragConditionalItems.has(item.name)) {
      if (!text.includes("rag_backend") || !/not `none`/.test(text)) {
        addIssue(spec.name, installedPath, "Runtime item does not make document RAG conditional on rag_backend != none.");
      }
    }
    if (hasUnsafeGsdLine(text)) {
      addIssue(spec.name, installedPath, "Runtime item contains unsafe gsd-* invocation guidance.");
    }
  }

  const missingRendered = status.output
    .split(/\r?\n/)
    .filter((line) => line.startsWith("ok "))
    .filter((line) => !line.includes(" rendered"));
  for (const line of missingRendered) addIssue(spec.name, "", `Runtime status did not mark item rendered: ${line}`);

  results.push({
    runtime: spec.name,
    dest,
    itemCount: items.length,
    installOutput: install.output.trim(),
    statusOutput: status.output.trim(),
    installed,
  });
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  tempRoot: temp,
  results,
  issues,
};

writeJsonReport("runtime-pack-status.json", data);
writeMarkdownReport("runtime-pack-status.md", "Zhulong Runtime Pack Verification", summarizeIssues(issues), [
  {
    title: "Runtime Installs",
    body: results.flatMap((result) => [
      `- ${result.runtime}: ${result.itemCount} items installed to \`${result.dest}\``,
      "",
      "```text",
      result.statusOutput,
      "```",
    ]),
  },
  {
    title: "Issues",
    body: issues.length === 0
      ? ["No runtime pack issues found."]
      : issues.map((issue) => `- ${issue.runtime} \`${issue.file}\`: ${issue.detail}`),
  },
  {
    title: "Rendered CLI",
    body: [`Expected local command path: \`node ${shellQuote(zlCli)}\``],
  },
]);

console.log(`runtime pack check ${data.status} runtimes=${runtimeSpecs.length} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
