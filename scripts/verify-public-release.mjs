import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  summarizeIssues,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const issues = [];
const evidence = [];
const pagesBase = "https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/";
const requiredCommunityFiles = [
  "LICENSE",
  "THIRD_PARTY_LICENSES.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  "SUPPORT.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/pull_request_template.md",
  ".github/dependabot.yml",
  ".github/workflows/pages.yml",
];

function assert(condition, area, detail) {
  if (condition) evidence.push(`${area}: ${detail}`);
  else issues.push({ area, detail });
}

function read(relativePath) {
  return fs.readFileSync(path.join(kitRoot, relativePath), "utf8");
}

const pkg = JSON.parse(read("package.json"));
const lock = JSON.parse(read("package-lock.json"));
const readme = read("README.md");
const license = read("LICENSE");
const security = read("SECURITY.md");
const dependabot = read(".github/dependabot.yml");
const pages = read(".github/workflows/pages.yml");

for (const file of requiredCommunityFiles) {
  assert(fs.existsSync(path.join(kitRoot, file)), "community files", `includes ${file}`);
}
assert(pkg.private === false, "package metadata", "private is false");
assert(pkg.license === "Apache-2.0", "package metadata", "uses Apache-2.0 SPDX id");
assert(lock.packages?.[""]?.license === "Apache-2.0", "package lock", "records Apache-2.0");
assert(pkg.homepage === pagesBase, "package metadata", "homepage points to GitHub Pages");
assert(pkg.bugs?.url === "https://github.com/FrigidCrow/Zhulong-Project-Intelligence-Kit/issues", "package metadata", "bugs URL points to GitHub Issues");
assert(pkg.publishConfig?.access === "public", "package metadata", "publishes with public access");
assert(pkg.publishConfig?.provenance === true, "package metadata", "requests npm provenance");
assert(license.includes("Apache License") && license.includes("Version 2.0, January 2004"), "license", "contains the Apache License 2.0 text");
assert(license.includes("Grant of Patent License"), "license", "contains the patent grant");
assert(readme.includes("[Apache License 2.0](LICENSE)"), "README", "links the selected license");
assert(!/\]\(docs\/(?:product|commands|technical-guide)\.html(?:#[^)]+)?\)/.test(readme), "README", "contains no GitHub source-view links for HTML documentation");
for (const file of ["product.html", "commands.html", "technical-guide.html"]) {
  assert(readme.includes(`${pagesBase}docs/${file}`), "README", `links rendered ${file}`);
}
assert(security.includes("Security Advisories") && security.includes("Report a vulnerability"), "security policy", "uses private vulnerability reporting");
assert(dependabot.includes("package-ecosystem: npm") && dependabot.includes("package-ecosystem: github-actions"), "Dependabot", "covers npm and GitHub Actions");
assert(pages.includes("actions/deploy-pages@") && pages.includes("npm run verify:pages"), "Pages", "deploys the allowlisted verified site");

const trackedFiles = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: kitRoot, encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);
const forbiddenNames = trackedFiles.filter((file) => /(^|\/)(?:\.env(?:\..+)?|id_rsa|id_ed25519|credentials?|secrets?)(?:$|\.)/i.test(file));
assert(forbiddenNames.length === 0, "tracked files", "contains no credential-like filenames");

const secretPatterns = [
  /github_pat_[A-Za-z0-9_]{30,}/,
  /gh[pousr]_[A-Za-z0-9]{30,}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /sk-[A-Za-z0-9]{32,}/,
];
const secretHits = [];
const localPathHits = [];
const localPathPatterns = [
  new RegExp(["", "Users", ""].join("/")),
  new RegExp(["", "var", "folders", ""].join("/")),
  new RegExp(["", "home", "runner", ""].join("/")),
];
for (const file of trackedFiles) {
  const absolute = path.join(kitRoot, file);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).size > 1024 * 1024) continue;
  const content = fs.readFileSync(absolute);
  if (content.includes(0)) continue;
  const text = content.toString("utf8");
  if (secretPatterns.some((pattern) => pattern.test(text))) secretHits.push(file);
  if (localPathPatterns.some((pattern) => pattern.test(text))) localPathHits.push(file);
}
assert(secretHits.length === 0, "tracked content", "contains no common live-secret patterns");
assert(localPathHits.length === 0, "tracked content", "contains no personal or runner absolute paths");

const data = {
  generated: new Date().toISOString(),
  status: issues.length ? "FAIL" : "PASS",
  trackedFiles: trackedFiles.length,
  evidence,
  issues,
};
writeJsonReport("public-release-check.json", data);
writeMarkdownReport("public-release-check.md", "Zhulong Public Release Verification", summarizeIssues(issues), [
  { title: "Evidence", body: evidence.map((item) => `- ${item}`) },
  { title: "Issues", body: issues.length ? issues.map((item) => `- ${item.area}: ${item.detail}`) : ["No public release issues found."] },
]);
console.log(`public release check ${data.status} tracked=${data.trackedFiles} issues=${issues.length}`);
if (issues.length) process.exitCode = 1;
