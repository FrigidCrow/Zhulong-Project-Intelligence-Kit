import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  listFiles,
  readText,
  rel,
  summarizeIssues,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const issues = [];
const checkedLinks = [];
const checkedFiles = [];

function addIssue(file, detail) {
  issues.push({ file: rel(file), detail });
}

function markdownLinks(text) {
  const links = [];
  for (const match of text.matchAll(/!?\[[^\]]*]\(([^)]+)\)/g)) {
    links.push(match[1].trim());
  }
  return links;
}

function htmlLinks(text) {
  return [...text.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1].trim());
}

function normalizeLink(raw) {
  let value = raw.trim();
  if (value.startsWith("<") && value.endsWith(">")) value = value.slice(1, -1);
  if (/^https?:\/\//i.test(value) || value.startsWith("mailto:") || value.startsWith("#")) return null;
  const noTitle = value.match(/^([^"']+?)(?:\s+["'][^"']+["'])?$/)?.[1]?.trim() || value;
  const clean = noTitle.split("#")[0];
  return clean || null;
}

function checkLinks(filePath) {
  const text = readText(filePath);
  const links = filePath.endsWith(".html") ? htmlLinks(text) : markdownLinks(text);
  for (const raw of links) {
    const clean = normalizeLink(raw);
    if (!clean) continue;
    const target = path.resolve(path.dirname(filePath), clean);
    checkedLinks.push({ file: rel(filePath), link: raw, target: rel(target) });
    if (!fs.existsSync(target)) addIssue(filePath, `Missing local link target: ${raw}`);
  }
}

function checkCommandCoverage() {
  const pkg = JSON.parse(readText(path.join(kitRoot, "package.json")));
  const commandDoc = readText(path.join(kitRoot, "docs", "commands.html"));
  const missing = Object.keys(pkg.bin)
    .filter((name) => name === "pik" || name.startsWith("pik-"))
    .filter((name) => !commandDoc.includes(name));
  for (const command of missing) addIssue(path.join(kitRoot, "docs", "commands.html"), `Command not documented: ${command}`);
}

function checkCoreHtmlPages() {
  for (const relPath of ["docs/product.html", "docs/commands.html", "docs/technical-guide.html", "docs/quality-dashboard.html"]) {
    const filePath = path.join(kitRoot, relPath);
    const text = readText(filePath);
    if (!text.includes('href="assets/pik-site.css"')) addIssue(filePath, "HTML page does not include shared CSS.");
    if (!text.includes("AI Project Intelligence Kit")) addIssue(filePath, "HTML page does not expose full product name.");
    if (!/<h1>[\s\S]+<\/h1>/.test(text)) addIssue(filePath, "HTML page is missing an H1.");
  }
}

const docsRoots = [
  path.join(kitRoot, "README.md"),
  ...listFiles(path.join(kitRoot, "docs"), (file) => [".md", ".html"].includes(path.extname(file).toLowerCase())),
  path.join(kitRoot, "verification", "README.md"),
];

for (const filePath of docsRoots) {
  checkedFiles.push(rel(filePath));
  checkLinks(filePath);
}
checkCommandCoverage();
checkCoreHtmlPages();

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  checkedFiles,
  checkedLinks,
  issues,
};

writeJsonReport("docs-check.json", data);
writeMarkdownReport("docs-check.md", "AI-PIKit Docs Verification", summarizeIssues(issues), [
  {
    title: "Checked Files",
    body: checkedFiles.map((file) => `- \`${file}\``),
  },
  {
    title: "Issues",
    body: issues.length === 0 ? ["No issues found."] : issues.map((issue) => `- \`${issue.file}\`: ${issue.detail}`),
  },
]);

console.log(`docs check ${data.status} files=${checkedFiles.length} links=${checkedLinks.length} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
