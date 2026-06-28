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

const pikCli = path.join(kitRoot, "bin", "pik.mjs");
const temp = tempRoot("aipikit-skills-usability-");
const coreSkills = [
  "pik-new-milestone",
  "pik-spec-phase",
  "pik-discuss-phase",
  "pik-ui-phase",
  "pik-plan-phase",
  "pik-execute-phase",
  "pik-verify-work",
  "pik-complete-milestone",
  "pik-debug",
  "pik-code-review",
  "pik-cockpit-build",
];
const runtimeSpecs = [
  { name: "codex", kind: "skill", ext: "SKILL.md" },
  { name: "claude-code", kind: "skill", ext: "SKILL.md" },
  { name: "github-copilot", kind: "prompt", ext: ".prompt.md" },
];
const issues = [];
const evidence = [];
const results = [];

function addIssue(runtime, file, detail) {
  issues.push({ runtime, file: file ? rel(file).startsWith("..") ? file : rel(file) : "", detail });
}

function installedPath(dest, runtime, skill) {
  if (runtime === "github-copilot") return path.join(dest, `${skill}.prompt.md`);
  return path.join(dest, skill, "SKILL.md");
}

function hasUnsafeGsdLine(text) {
  const lines = text.split(/\r?\n/);
  return lines.some((line, index) => {
    if (!/[$/]gsd-/.test(line)) return false;
    const window = [lines[index - 1] || "", line, lines[index + 1] || ""].join(" ");
    return !/(never|not|do not|不要|不|reference|historical|only|参考)/i.test(window);
  });
}

for (const spec of runtimeSpecs) {
  const dest = path.join(temp, spec.name);
  fs.mkdirSync(dest, { recursive: true });
  const install = runCommand(
    `runtime install ${spec.name}`,
    "node",
    [pikCli, "runtime", "install", "--runtime", spec.name, "--dest", dest, "--force"],
    { timeout: 120000, allowFailure: true },
  );
  const status = runCommand(
    `runtime status ${spec.name}`,
    "node",
    [pikCli, "runtime", "status", "--runtime", spec.name, "--dest", dest],
    { timeout: 120000, allowFailure: true },
  );
  if (install.status !== 0) addIssue(spec.name, "", `runtime install exited ${install.status}`);
  if (status.status !== 0) addIssue(spec.name, "", `runtime status exited ${status.status}`);

  const installed = [];
  for (const skill of coreSkills) {
    const filePath = installedPath(dest, spec.name, skill);
    const exists = fs.existsSync(filePath);
    installed.push({ skill, filePath, exists });
    if (!exists) {
      addIssue(spec.name, filePath, "Core workflow skill/prompt was not installed.");
      continue;
    }
    const text = readText(filePath);
    if (text.includes("{{PIK_CLI}}") || text.includes("{{PIK_KIT_ROOT}}") || text.includes("{{PIK_GENERATED_AT}}")) {
      addIssue(spec.name, filePath, "Runtime template placeholder was not rendered.");
    }
    if (!text.includes("bin/pik.mjs")) addIssue(spec.name, filePath, "Rendered item does not point at local bin/pik.mjs.");
    if (!text.includes(skill)) addIssue(spec.name, filePath, `Rendered item does not include its public command example: ${skill}`);
    if (skill === "pik-cockpit-build") {
      if (!/cockpit build|pik-cockpit-build/.test(text)) addIssue(spec.name, filePath, "Rendered cockpit item does not call AI-PIKit cockpit build.");
      if (!/leader|驾驶舱|可视化|project health|项目健康度/i.test(text)) addIssue(spec.name, filePath, "Rendered cockpit item does not expose visualization/demo trigger context.");
    } else if (!/workflow run|pik-workflow-run/.test(text)) {
      addIssue(spec.name, filePath, "Rendered item does not call AI-PIKit workflow.");
    }
    if (!/local-only|local_only/i.test(text)) addIssue(spec.name, filePath, "Rendered item does not expose local-only privacy constraint.");
    if (!/heavy refresh/i.test(text)) addIssue(spec.name, filePath, "Rendered item does not expose no heavy refresh constraint.");
    if (!/evidence|writeback/i.test(text)) addIssue(spec.name, filePath, "Rendered item does not expose evidence/writeback constraint.");
    if (hasUnsafeGsdLine(text)) addIssue(spec.name, filePath, "Rendered item contains unsafe gsd-* invocation guidance.");
    evidence.push(`${spec.name}:${skill} installed and inspected`);
  }

  results.push({
    runtime: spec.name,
    dest,
    itemCount: installed.length,
    installOutput: install.output.trim().slice(0, 4000),
    statusOutput: status.output.trim().slice(0, 4000),
    installed,
  });
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  tempRoot: temp,
  expectedRuntimeCount: runtimeSpecs.length,
  expectedSkillsPerRuntime: coreSkills.length,
  expectedRenderedItems: runtimeSpecs.length * coreSkills.length,
  results,
  evidence,
  issues,
};

writeJsonReport("skills-usability-check.json", data);
writeMarkdownReport("skills-usability-check.md", "AI-PIKit Skills Usability Verification", summarizeIssues(issues), [
  {
    title: "覆盖范围",
    body: [
      `- Runtimes: ${runtimeSpecs.map((item) => item.name).join(", ")}`,
      `- Core skills/prompts per runtime: ${coreSkills.length}`,
      `- Expected rendered items: ${data.expectedRenderedItems}`,
      `- Temp install root: \`${temp}\``,
    ],
  },
  {
    title: "安装结果",
    body: results.flatMap((result) => [
      `- ${result.runtime}: ${result.itemCount} items`,
      "",
      "```text",
      result.statusOutput,
      "```",
    ]),
  },
  {
    title: "问题",
    body: issues.length ? issues.map((issue) => `- ${issue.runtime} \`${issue.file}\`: ${issue.detail}`) : ["未发现 skills usability 问题。"],
  },
  {
    title: "复现",
    body: [`- \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-skills-usability.mjs"))}\``],
  },
]);

console.log(`skills usability check ${data.status} rendered=${data.expectedRenderedItems} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
