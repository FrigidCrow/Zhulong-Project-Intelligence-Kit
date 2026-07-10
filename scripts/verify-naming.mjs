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

function addIssue(filePath, lineNumber, rule, line) {
  issues.push({
    file: rel(filePath),
    line: lineNumber,
    rule,
    text: line.trim(),
  });
}

function checkTextFile(filePath) {
  const relativeFile = rel(filePath);
  scannedFiles.push(relativeFile);
  const lines = readText(filePath).split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (/AI[- ]ZL\b/.test(line)) {
      addIssue(filePath, lineNumber, "Use Zhulong as the product name, not AI ZL.", line);
    }
    if (/(?<!Zhulong )Project Intelligence Kit/.test(line)) {
      addIssue(filePath, lineNumber, "Use the full product name: Zhulong Project Intelligence Kit.", line);
    }
    if (/^# ZL\b/.test(line)) {
      addIssue(filePath, lineNumber, "Use Zhulong in document titles; reserve ZL for commands and technical identifiers.", line);
    }
    if (/Zhulong-native/.test(line)) {
      addIssue(filePath, lineNumber, "Use Zhulong native with a space.", line);
    }
    if (/\ban Zhulong\b/.test(line)) {
      addIssue(filePath, lineNumber, "Use the English article 'a' before Zhulong.", line);
    }
    if (/(suggest|run|invoke|route|ask).{0,80}[$/`]gsd-/i.test(line)
      && !/(never|not|do not|不要|不|reference|historical|only|参考)/i.test(line)) {
      addIssue(filePath, lineNumber, "Do not direct users to invoke reference-only gsd-* commands.", line);
    }
  });
}

const roots = [
  "README.md",
  "adapters",
  "bin",
  "core",
  "docs",
  "examples",
  "runtime",
  "schemas",
  "scripts",
  "templates",
  "verification",
  "package.json",
];

for (const root of roots) {
  const absolute = path.join(kitRoot, root);
  if (path.extname(absolute)) {
    if (path.basename(absolute) !== "verify-naming.mjs") checkTextFile(absolute);
    continue;
  }
  for (const filePath of listFiles(absolute, isTextProjectFile)) {
    const relativeFile = rel(filePath);
    if (path.basename(filePath) === "verify-naming.mjs") continue;
    if (relativeFile === "verification/reports/naming-check.json"
      || relativeFile === "verification/reports/naming-check.md") continue;
    checkTextFile(filePath);
  }
}

const pkgPath = path.join(kitRoot, "package.json");
const pkg = JSON.parse(readText(pkgPath));
const expectedCliPath = "./bin/zl.mjs";

for (const [name, cliPath] of Object.entries(pkg.bin || {})) {
  if (!(name === "zhulong" || name === "zl" || name.startsWith("zl-"))) {
    addIssue(pkgPath, 1, "Every executable must use zhulong, zl, or the zl-* prefix.", `${name}: ${cliPath}`);
  }
  if (cliPath !== expectedCliPath) {
    addIssue(pkgPath, 1, `Every executable must route to ${expectedCliPath}.`, `${name}: ${cliPath}`);
  }
}

for (const required of ["zhulong", "zl"]) {
  if (pkg.bin?.[required] !== expectedCliPath) {
    addIssue(pkgPath, 1, `Missing required CLI entry: ${required}.`, JSON.stringify(pkg.bin || {}));
  }
}

if (pkg.name !== "zhulong-kit") {
  addIssue(pkgPath, 1, "npm package name must be zhulong-kit.", String(pkg.name || ""));
}
if (!String(pkg.description || "").includes("Zhulong Project Intelligence Kit")) {
  addIssue(pkgPath, 1, "Package description must include the full product name.", String(pkg.description || ""));
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  scannedFiles,
  binsChecked: Object.keys(pkg.bin || {}),
  issues,
};

writeJsonReport("naming-check.json", data);
writeMarkdownReport("naming-check.md", "Zhulong Naming Verification", summarizeIssues(issues), [
  {
    title: "命名基线",
    body: [
      "- Product: `Zhulong（烛龙）`",
      "- Full name: `Zhulong Project Intelligence Kit`",
      "- Package: `zhulong-kit`",
      "- CLI: `zhulong`, `zl`, `zl-*`",
      "- CLI file: `bin/zl.mjs`",
    ],
  },
  {
    title: "问题",
    body: issues.length === 0
      ? ["未发现命名问题。"]
      : issues.map((issue) => `- \`${issue.file}:${issue.line}\` [${issue.rule}] ${issue.text}`),
  },
]);

console.log(`naming check ${data.status} files=${scannedFiles.length} bins=${Object.keys(pkg.bin || {}).length} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
