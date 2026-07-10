import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  summarizeIssues,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const outputRoot = path.resolve(
  process.env.ZL_PAGES_OUTPUT_DIR || path.join(kitRoot, ".zl-tmp", "pages-site"),
);
const issues = [];
const evidence = [];
const pagesBase = "https://frigidcrow.github.io/Zhulong-Project-Intelligence-Kit/";

function assert(condition, area, detail) {
  if (condition) evidence.push(`${area}: ${detail}`);
  else issues.push({ area, detail });
}

function copy(relativeSource, relativeDestination = relativeSource) {
  const source = path.join(kitRoot, relativeSource);
  const destination = path.join(outputRoot, relativeDestination);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, dereference: false });
}

function walk(root) {
  const entries = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    entries.push(absolute);
    if (entry.isDirectory()) entries.push(...walk(absolute));
  }
  return entries;
}

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });
copy("site/index.html", "index.html");
copy("docs");
for (const relativePath of [
  "docs/assets/zhulong-icon-concept.png",
  "docs/assets/zhulong-icon-variants",
  "docs/assets/zhulong-selected-variants",
]) {
  fs.rmSync(path.join(outputRoot, relativePath), { recursive: true, force: true });
}
copy("templates/cockpit/sample.html");
copy("verification/reports");
copy("LICENSE");

const paths = walk(outputRoot);
const relativeFiles = paths
  .filter((file) => fs.statSync(file, { throwIfNoEntry: false })?.isFile())
  .map((file) => path.relative(outputRoot, file));
const symlinks = paths.filter((file) => fs.lstatSync(file).isSymbolicLink());
const required = [
  "index.html",
  "docs/product.html",
  "docs/commands.html",
  "docs/technical-guide.html",
  "docs/quality-dashboard.html",
  "docs/assets/zl-site.css",
  "docs/assets/zl-site.js",
  "docs/assets/zhulong-icon.png",
  "templates/cockpit/sample.html",
  "verification/reports/latest.md",
  "LICENSE",
];
const forbiddenRoots = ["bin", "core", "runtime", "scripts", "node_modules", ".git"];
const forbiddenAssetPatterns = [/icon-variants/i, /selected-variants/i, /icon-concept/i];
const readme = fs.readFileSync(path.join(kitRoot, "README.md"), "utf8");
const index = fs.readFileSync(path.join(outputRoot, "index.html"), "utf8");

for (const file of required) {
  assert(relativeFiles.includes(file), "site artifact", `includes ${file}`);
}
for (const root of forbiddenRoots) {
  assert(!paths.some((file) => path.relative(outputRoot, file).split(path.sep)[0] === root), "site boundary", `excludes ${root}/`);
}
assert(!relativeFiles.some((file) => forbiddenAssetPatterns.some((pattern) => pattern.test(file))), "site boundary", "excludes icon candidates");
assert(symlinks.length === 0, "site boundary", "contains no symbolic links");
assert(index.includes("url=docs/product.html"), "site entry", "redirects to the rendered product page");
for (const file of ["product.html", "commands.html", "technical-guide.html"]) {
  assert(readme.includes(`${pagesBase}docs/${file}`), "README", `links to rendered ${file}`);
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length ? "FAIL" : "PASS",
  output: path.relative(kitRoot, outputRoot) || ".",
  files: relativeFiles.length,
  evidence,
  issues,
};
writeJsonReport("pages-site-check.json", data);
writeMarkdownReport("pages-site-check.md", "Zhulong GitHub Pages Verification", summarizeIssues(issues), [
  { title: "Evidence", body: evidence.map((item) => `- ${item}`) },
  { title: "Issues", body: issues.length ? issues.map((item) => `- ${item.area}: ${item.detail}`) : ["No Pages issues found."] },
]);
console.log(`pages site check ${data.status} files=${data.files} issues=${issues.length}`);
if (issues.length) process.exitCode = 1;
