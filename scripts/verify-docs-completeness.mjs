import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  readText,
  rel,
  summarizeIssues,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";
import { buildCommandCatalog } from "./command-catalog.mjs";

const pkg = JSON.parse(readText(path.join(kitRoot, "package.json")));
const catalog = buildCommandCatalog(pkg);
const commandDocPath = path.join(kitRoot, "docs", "commands.html");
const readmePath = path.join(kitRoot, "README.md");
const commandDoc = readText(commandDocPath);
const readme = readText(readmePath);
const issues = [];
const evidence = [];

const REQUIRED_FIELDS = [
  "命令物理名",
  "命令逻辑名",
  "用途",
  "什么时候用",
  "基本语法",
  "参数说明",
  "默认行为",
  "是否触发 heavy refresh",
  "输出文件 / 报告路径",
  "成功示例",
  "常见失败示例",
  "关联命令",
  "适用场景",
];

const README_KEY_COMMANDS = [
  "zl-init",
  "zl-codebase-scan",
  "zl-docs-sync",
  "zl-rag-init-local",
  "zl-graph-build",
  "zl-new-milestone",
  "zl-debug",
  "zl-answer-audit",
  "zl-completion-check",
  "zl-cockpit-build",
];

function addIssue(file, detail) {
  issues.push({ file: rel(file), detail });
}

function sectionFor(command) {
  const start = commandDoc.indexOf(`id="cmd-${command}"`);
  if (start < 0) return "";
  const sectionStart = commandDoc.lastIndexOf("<section", start);
  const end = commandDoc.indexOf("</section>", start);
  if (sectionStart < 0 || end < 0) return "";
  return commandDoc.slice(sectionStart, end);
}

function hasUnsafeGsdLine(text) {
  return text.split(/\r?\n/).some((line) => {
    if (!/[$/]gsd-/.test(line)) return false;
    return !/(never|not|do not|不要|不|reference|historical|only|参考)/i.test(line);
  });
}

for (const item of catalog) {
  const anchor = `id="cmd-${item.command}"`;
  if (!commandDoc.includes(anchor)) {
    addIssue(commandDocPath, `Missing detail anchor: ${anchor}`);
    continue;
  }
  evidence.push(`${item.command}: detail anchor exists`);

  const physicalLink = `href="#cmd-${item.command}"><code>${item.command}</code></a>`;
  if (!commandDoc.includes(physicalLink)) addIssue(commandDocPath, `Overview/detail physical link missing: ${item.command}`);
  else evidence.push(`${item.command}: physical link exists`);

  const logicalLink = `data-logical-command="${item.command}" href="#cmd-${item.command}"`;
  if (!commandDoc.includes(logicalLink)) addIssue(commandDocPath, `Overview logical link missing: ${item.command}`);
  else evidence.push(`${item.command}: logical link exists`);

  const section = sectionFor(item.command);
  for (const field of REQUIRED_FIELDS) {
    if (!section.includes(`<dt>${field}</dt>`)) addIssue(commandDocPath, `${item.command} missing field: ${field}`);
  }
  if (!section.includes("code-block")) addIssue(commandDocPath, `${item.command} missing code example block`);
}

for (const command of README_KEY_COMMANDS) {
  const href = `docs/commands.html#cmd-${command}`;
  if (!readme.includes(href)) addIssue(readmePath, `README key command does not link to command detail: ${command}`);
  else evidence.push(`README links ${command}`);
}

for (const [filePath, text] of [
  [commandDocPath, commandDoc],
  [readmePath, readme],
  [path.join(kitRoot, "docs", "technical-guide.html"), readText(path.join(kitRoot, "docs", "technical-guide.html"))],
  [path.join(kitRoot, "docs", "quality-plan.md"), readText(path.join(kitRoot, "docs", "quality-plan.md"))],
]) {
  if (hasUnsafeGsdLine(text)) addIssue(filePath, "Contains unsafe executable gsd-* guidance.");
  if (!text.includes("Zhulong Project Intelligence Kit")) addIssue(filePath, "Missing full product name.");
  if (!text.includes("Zhulong")) addIssue(filePath, "Missing Zhulong abbreviation.");
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  commandsChecked: catalog.map((item) => item.command),
  requiredFields: REQUIRED_FIELDS,
  readmeKeyCommands: README_KEY_COMMANDS,
  evidence,
  issues,
};

writeJsonReport("docs-completeness-check.json", data);
writeMarkdownReport("docs-completeness-check.md", "Zhulong Docs Completeness Verification", summarizeIssues(issues), [
  {
    title: "命令详情覆盖",
    body: [
      `- Commands checked: ${catalog.length}`,
      `- Required fields per command: ${REQUIRED_FIELDS.length}`,
      ...catalog.map((item) => `- PASS \`${item.command}\``),
    ],
  },
  {
    title: "README 关键入口",
    body: README_KEY_COMMANDS.map((command) => `- ${readme.includes(`docs/commands.html#cmd-${command}`) ? "PASS" : "FAIL"} \`${command}\``),
  },
  {
    title: "问题",
    body: issues.length ? issues.map((issue) => `- \`${issue.file}\`: ${issue.detail}`) : ["未发现文档完整性问题。"],
  },
]);

console.log(`docs completeness check ${data.status} commands=${catalog.length} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
