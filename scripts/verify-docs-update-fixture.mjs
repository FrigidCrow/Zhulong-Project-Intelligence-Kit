import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  runCommand,
  shellQuote,
  summarizeIssues,
  tempRoot,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const pikCli = path.join(kitRoot, "bin", "pik.mjs");
const workRoot = tempRoot("aipikit-docs-update-");
const projectRoot = path.join(workRoot, "project");
const issues = [];
const evidence = [];

function addIssue(detail) {
  issues.push({ detail });
}

function write(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function pik(args, options = {}) {
  return runCommand("pik", "node", [pikCli, ...args], {
    cwd: projectRoot,
    timeout: 120000,
    ...options,
  });
}

function assertIncludes(label, text, expected) {
  if (!text.includes(expected)) addIssue(`${label} missing expected text: ${expected}`);
  else evidence.push(`${label}: found ${expected}`);
}

fs.mkdirSync(projectRoot, { recursive: true });
write(path.join(projectRoot, "src", "index.js"), "export function approvalLimit() { return 10000; }\n");
write(path.join(projectRoot, "docs", "qa", "QA-001_initial.md"), [
  "# QA-001 初期承認ルール",
  "",
  "- 初期承認上限: 10,000円",
  "- Keyword: INITIAL_APPROVAL_RULE",
  "",
].join("\n"));

pik(["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "docs_update_fixture", "--mode", "new", "--force"]);
pik(["docs", "scan", "--target", projectRoot]);
pik(["docs", "normalize", "--target", projectRoot]);

const initialQuery = pik(["docs", "query", "--target", projectRoot, "INITIAL_APPROVAL_RULE"]);
assertIncludes("initial local docs query", initialQuery.output, "INITIAL_APPROVAL_RULE");

const newDoc = path.join(projectRoot, "docs", "minutes", "2026-06-25_update.md");
write(newDoc, [
  "# 2026-06-25 承認仕様更新",
  "",
  "- DOC_UPDATE_SENTINEL_4242",
  "- 追加承認条件: 部長代理承認は 42,420円まで。",
  "",
].join("\n"));

pik(["docs", "scan", "--target", projectRoot]);
pik(["docs", "normalize", "--target", projectRoot]);

const sources = fs.readFileSync(path.join(projectRoot, ".planning", "knowledge", "RAG_SOURCES.md"), "utf8");
assertIncludes("RAG_SOURCES after update", sources, "2026-06-25_update.md");

const updatedQuery = pik(["docs", "query", "--target", projectRoot, "DOC_UPDATE_SENTINEL_4242"]);
assertIncludes("updated local docs query", updatedQuery.output, "DOC_UPDATE_SENTINEL_4242");
assertIncludes("updated local docs query source", updatedQuery.output, "2026-06-25_update");

const normalizedFiles = fs.readdirSync(path.join(projectRoot, ".planning", "knowledge", "normalized"));
if (normalizedFiles.length < 2) addIssue(`Expected at least two normalized files, got ${normalizedFiles.length}`);
else evidence.push(`normalized files: ${normalizedFiles.length}`);

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  evidence,
  issues,
};

writeJsonReport("docs-update-fixture.json", data);
writeMarkdownReport("docs-update-fixture.md", "AI-PIKit Docs Update Fixture", summarizeIssues(issues), [
  {
    title: "Evidence",
    body: evidence.length === 0 ? ["No evidence recorded."] : evidence.map((item) => `- ${item}`),
  },
  {
    title: "Fixture Paths",
    body: [
      `- Work root: \`${workRoot}\``,
      `- Project root: \`${projectRoot}\``,
      `- New document: \`${newDoc}\``,
      `- Reproduce command: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-docs-update-fixture.mjs"))}\``,
    ],
  },
  {
    title: "Issues",
    body: issues.length === 0 ? ["No docs update issues found."] : issues.map((issue) => `- ${issue.detail}`),
  },
]);

console.log(`docs update fixture ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
