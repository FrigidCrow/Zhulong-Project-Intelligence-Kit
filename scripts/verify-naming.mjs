import path from "node:path";
import {
  isTextProjectFile,
  kitRoot,
  listFiles,
  readText,
  rel,
  summarizeIssues,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const issues = [];
const scannedFiles = [];

function isGeneratedReport(filePath) {
  return rel(filePath).startsWith("verification/reports/");
}

function allowBarePik(relativeFile, line) {
  if (line.includes("PIK_CLI") || line.includes("PIK_ARGS") || line.includes("PIK_KIT_ROOT")) return true;
  if (line.includes("{{PIK_CLI}}")) return true;
  if (relativeFile === "docs/quality-plan.md" && (line.includes("禁止混用") || line.includes("出现 `PIK`"))) return true;
  return false;
}

function allowPolicyExample(relativeFile, line) {
  if (relativeFile !== "docs/quality-plan.md") return false;
  return line.includes("禁止混用")
    || line.includes("对外文档中出现")
    || line.includes("不提示用户使用");
}

function addIssue(filePath, lineNumber, rule, line) {
  issues.push({
    file: rel(filePath),
    line: lineNumber,
    rule,
    text: line.trim(),
  });
}

const files = [
  path.join(kitRoot, "README.md"),
  ...listFiles(path.join(kitRoot, "adapters"), isTextProjectFile),
  ...listFiles(path.join(kitRoot, "bin"), isTextProjectFile),
  ...listFiles(path.join(kitRoot, "core"), isTextProjectFile),
  ...listFiles(path.join(kitRoot, "docs"), isTextProjectFile),
  ...listFiles(path.join(kitRoot, "examples"), isTextProjectFile),
  ...listFiles(path.join(kitRoot, "runtime"), isTextProjectFile),
  ...listFiles(path.join(kitRoot, "schemas"), isTextProjectFile),
  ...listFiles(path.join(kitRoot, "scripts"), isTextProjectFile)
    .filter((file) => path.basename(file) !== "verify-naming.mjs"),
  ...listFiles(path.join(kitRoot, "verification"), isTextProjectFile).filter((file) => !isGeneratedReport(file)),
  path.join(kitRoot, "package.json"),
];

for (const filePath of files) {
  const relativeFile = rel(filePath);
  scannedFiles.push(relativeFile);
  const lines = readText(filePath).split(/\r?\n/);
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (allowPolicyExample(relativeFile, line)) return;
    if (/AI PIK/.test(line)) addIssue(filePath, lineNumber, "Use AI-PIKit, not AI PIK.", line);
    if (/Project Intelligence Kit（PIK）|Project Intelligence Kit \(PIK\)/.test(line)) {
      addIssue(filePath, lineNumber, "Use AI Project Intelligence Kit（AI-PIKit）.", line);
    }
    if (/# PIK\b/.test(line)) addIssue(filePath, lineNumber, "Do not use PIK as a document title.", line);
    if (/(?<!AI )Project Intelligence Kit/.test(line)) {
      addIssue(filePath, lineNumber, "Full product name must include AI prefix.", line);
    }
    if (/\bPIK\b/.test(line) && !allowBarePik(relativeFile, line)) {
      addIssue(filePath, lineNumber, "Bare PIK is not allowed outside compatibility placeholders.", line);
    }
    if (/AI-PIKit-native/.test(line)) addIssue(filePath, lineNumber, "Use AI-PIKit native with a space.", line);
    if (/\ba AI-|a `AI-/.test(line)) addIssue(filePath, lineNumber, "Fix English article before AI-*.", line);
    if (/GSD is the workflow kernel|does not replace GSD yet|Current backend mapping/.test(line)) {
      addIssue(filePath, lineNumber, "GSD must be reference design only, not active backend wording.", line);
    }
    if (/(suggest|run|invoke|route|ask).{0,80}[$/`]gsd-/i.test(line) && !/(never|not|do not|不要|不|reference|historical|only)/i.test(line)) {
      addIssue(filePath, lineNumber, "Do not direct users to invoke gsd-* commands.", line);
    }
  });
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  scannedFiles,
  issues,
};

writeJsonReport("naming-check.json", data);
writeMarkdownReport("naming-check.md", "AI-PIKit Naming Verification", summarizeIssues(issues), [
  {
    title: "Scanned Files",
    body: scannedFiles.map((file) => `- \`${file}\``),
  },
  {
    title: "Issues",
    body: issues.length === 0
      ? ["No naming issues found."]
      : issues.map((issue) => `- \`${issue.file}:${issue.line}\` [${issue.rule}] ${issue.text}`),
  },
]);

console.log(`naming check ${data.status} files=${scannedFiles.length} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
