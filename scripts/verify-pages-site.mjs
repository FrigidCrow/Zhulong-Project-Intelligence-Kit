import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
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
const packageMetadata = JSON.parse(fs.readFileSync(path.join(kitRoot, "package.json"), "utf8"));

function gitSha() {
  if (process.env.ZL_PAGES_COMMIT_SHA) return process.env.ZL_PAGES_COMMIT_SHA;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: kitRoot, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function fileHash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex").slice(0, 12);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

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
copy("templates/cockpit/sample.html");
copy("verification/baselines");
copy("LICENSE");

const buildInfo = {
  schemaVersion: "zhulong-pages-build.v1",
  version: packageMetadata.version,
  commit: gitSha(),
  deployedAt: process.env.ZL_PAGES_DEPLOYED_AT || new Date().toISOString(),
  assets: {
    css: fileHash(path.join(outputRoot, "docs", "assets", "zl-site.css")),
    js: fileHash(path.join(outputRoot, "docs", "assets", "zl-site.js")),
  },
};
fs.writeFileSync(path.join(outputRoot, "build-info.json"), `${JSON.stringify(buildInfo, null, 2)}\n`);

function decorateHtml(relativeFile) {
  const filePath = path.join(outputRoot, relativeFile);
  let html = fs.readFileSync(filePath, "utf8");
  const canonicalUrl = relativeFile === "index.html" ? pagesBase : new URL(relativeFile, pagesBase).href;
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || "Zhulong Project Intelligence Kit";
  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1]
    || "Zhulong Project Intelligence Kit 通用本地 AI 工程情报框架。";
  const social = [
    `  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">`,
    "  <meta property=\"og:type\" content=\"website\">",
    `  <meta property="og:title" content="${escapeHtml(title)}">`,
    `  <meta property="og:description" content="${escapeHtml(description)}">`,
    `  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">`,
    `  <meta property="og:image" content="${pagesBase}docs/assets/zhulong-icon.png">`,
    "  <meta name=\"twitter:card\" content=\"summary\">",
    `  <meta name="twitter:title" content="${escapeHtml(title)}">`,
    `  <meta name="twitter:description" content="${escapeHtml(description)}">`,
    `  <meta name="twitter:image" content="${pagesBase}docs/assets/zhulong-icon.png">`,
  ].join("\n");
  html = html.replace(/\s*<link rel="canonical"[^>]*>/gi, "");
  html = html.replace("</head>", `${social}\n</head>`);
  html = html.replaceAll("assets/zl-site.css", `assets/zl-site.css?v=${buildInfo.assets.css}`);
  html = html.replaceAll("assets/zl-site.js", `assets/zl-site.js?v=${buildInfo.assets.js}`);
  const buildMeta = `<p class="build-meta" data-version="${escapeHtml(buildInfo.version)}" data-commit="${escapeHtml(buildInfo.commit)}">版本 ${escapeHtml(buildInfo.version)} · commit ${escapeHtml(buildInfo.commit.slice(0, 7))} · 部署 ${escapeHtml(buildInfo.deployedAt)}</p>`;
  if (html.includes("</footer>")) html = html.replace("</footer>", `  ${buildMeta}\n    </footer>`);
  else html = html.replace("</body>", `  ${buildMeta}\n</body>`);
  fs.writeFileSync(filePath, html);
}

for (const relativeFile of [
  "index.html",
  "docs/product.html",
  "docs/commands.html",
  "docs/technical-guide.html",
  "docs/quality-dashboard.html",
  "templates/cockpit/sample.html",
]) decorateHtml(relativeFile);

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
  "verification/baselines/latest.md",
  "LICENSE",
  "build-info.json",
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
assert(!relativeFiles.some((file) => file.startsWith("verification/reports/")), "site boundary", "excludes ephemeral verifier reports");
assert(symlinks.length === 0, "site boundary", "contains no symbolic links");
assert(index.includes("url=docs/product.html"), "site entry", "redirects to the rendered product page");
assert(buildInfo.commit !== "unknown", "build identity", "records a Git commit");
assert(/^[a-f0-9]{7,40}$/i.test(buildInfo.commit), "build identity", "uses a valid Git SHA");
for (const file of ["docs/product.html", "docs/commands.html", "docs/technical-guide.html", "docs/quality-dashboard.html"]) {
  const html = fs.readFileSync(path.join(outputRoot, file), "utf8");
  assert(html.includes(`zl-site.css?v=${buildInfo.assets.css}`), "asset fingerprint", `${file} pins CSS content hash`);
  assert(html.includes(`zl-site.js?v=${buildInfo.assets.js}`), "asset fingerprint", `${file} pins JS content hash`);
  assert(html.includes(`data-commit="${buildInfo.commit}"`), "build identity", `${file} displays deployed commit`);
  assert(html.includes(`<link rel="canonical" href="${new URL(file, pagesBase).href}">`), "metadata", `${file} has canonical URL`);
  assert(html.includes("og:image") && html.includes("twitter:card"), "metadata", `${file} has social metadata`);
}
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
