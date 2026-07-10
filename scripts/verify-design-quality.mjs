import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  summarizeIssues,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const pageFiles = [
  "docs/product.html",
  "docs/commands.html",
  "docs/technical-guide.html",
  "docs/quality-dashboard.html",
];
const cssPath = "docs/assets/zl-site.css";
const jsPath = "docs/assets/zl-site.js";
const cockpitPath = "templates/cockpit/index.template.html";
const commandRendererPath = "scripts/render-commands-doc.mjs";
const issues = [];
const evidence = [];

function read(relativePath) {
  return fs.readFileSync(path.join(kitRoot, relativePath), "utf8");
}

function assert(condition, area, detail) {
  if (condition) evidence.push(`${area}: ${detail}`);
  else issues.push({ area, detail });
}

for (const file of pageFiles) {
  const html = read(file);
  const visibleHtml = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const sectionCount = (html.match(/<section\b/g) || []).length;
  const eyebrowCount = (html.match(/class="[^"]*\beyebrow\b[^"]*"/g) || []).length;
  const h1Count = (html.match(/<h1\b/g) || []).length;
  const images = [...html.matchAll(/<img\b[^>]*>/g)].map((match) => match[0]);
  assert(h1Count === 1, file, "contains one H1");
  assert(html.includes('href="assets/zl-site.css"'), file, "uses the shared visual system");
  assert(html.includes('src="assets/zl-site.js"'), file, "loads shared interactions");
  assert(!/[—–]/.test(html), file, "contains no em dash or en dash");
  assert(!html.includes("console-mock"), file, "contains no fake console window");
  assert(!html.includes("<canvas"), file, "contains no decorative random canvas");
  assert(!/>[^<]*`[^<]*</.test(visibleHtml), file, "contains no visible Markdown backticks");
  assert(eyebrowCount <= Math.ceil(sectionCount / 3), file, `eyebrow count ${eyebrowCount}/${Math.ceil(sectionCount / 3)}`);
  assert(images.every((image) => /\balt="[^"]+"/.test(image)), file, "all images have meaningful alt text");
}

const product = read("docs/product.html");
assert(product.includes('class="hero-emblem"'), "product hero", "uses the selected Zhulong visual asset");
assert(product.includes('src="assets/zhulong-icon.png"'), "product hero", "references the canonical icon");
assert(product.includes("文档密集型与非文档密集型"), "product positioning", "states both supported project modes");
assert(product.includes("rag none") && product.includes("非文档密集型路线"), "product positioning", "presents RAG none as a first-class route");

const readme = read("README.md");
const technicalGuide = read("docs/technical-guide.html");
const brand = read("docs/brand.md");
assert(readme.includes("文档密集型与非文档密集型"), "README positioning", "states both supported project modes");
assert(readme.includes("不是功能不完整的降级模式"), "README positioning", "defines RAG none as a complete mode");
assert(technicalGuide.includes("rag none") && technicalGuide.includes("非文档密集型项目的完整模式"), "technical guide positioning", "documents the no-RAG operating boundary");
for (const [file, text] of [["README.md", readme], ["docs/product.html", product], ["docs/technical-guide.html", technicalGuide], ["docs/brand.md", brand]]) {
  assert(!text.includes("对日"), file, "contains no region-specific product positioning");
}

const css = read(cssPath);
for (const [pattern, label] of [
  [/\bInter\b/i, "Inter font"],
  [/radial-gradient/i, "radial gradient"],
  [/letter-spacing\s*:\s*-/i, "negative letter spacing"],
  [/#[0]{3,6}\b/i, "pure black"],
  [/#[f]{3,6}\b/i, "pure white"],
]) {
  assert(!pattern.test(css), cssPath, `does not use ${label}`);
}
assert(css.includes("prefers-color-scheme: dark"), cssPath, "defines a dark color scheme");
assert(css.includes("prefers-reduced-motion: reduce"), cssPath, "honors reduced motion");
assert(css.includes(":focus-visible"), cssPath, "defines visible keyboard focus");
assert(css.includes("animation-timeline: scroll(root block)"), cssPath, "adds progressive reading progress motion");
assert(css.includes("flow-node-in"), cssPath, "animates execution flow in sequence");

const js = read(jsPath);
assert(!/addEventListener\(["']scroll["']/.test(js), jsPath, "uses no scroll event listener");
assert(js.includes("IntersectionObserver"), jsPath, "uses IntersectionObserver for reveals and TOC state");
assert(js.includes("navigator.clipboard") && js.includes("execCommand"), jsPath, "supports modern and file URL copy flows");
assert(js.includes("installMetricCounters"), jsPath, "animates numeric evidence without changing layout");
assert(js.includes("installHeroMotion"), jsPath, "adds pointer-aware hero feedback");
assert(js.includes("requestAnimationFrame"), jsPath, "batches continuous visual updates");

const cockpit = read(cockpitPath);
assert(!/\bInter\b/i.test(cockpit), cockpitPath, "contains no Inter font dependency");
assert(!/radial-gradient/i.test(cockpit), cockpitPath, "contains no generic glow gradient");
assert(!/[—–]/.test(cockpit), cockpitPath, "contains no em dash or en dash");
assert((cockpit.match(/<style>/g) || []).length === 1, cockpitPath, "contains one consolidated style block");
assert(cockpit.includes("prefers-reduced-motion: reduce"), cockpitPath, "honors reduced motion");
assert(cockpit.includes("__ZHULONG_COCKPIT_DATA__"), cockpitPath, "retains the data injection contract");

const renderer = read(commandRendererPath);
assert(!renderer.includes("console-mock"), commandRendererPath, "does not regenerate a fake console");
assert(renderer.includes('src="assets/zl-site.js"'), commandRendererPath, "regenerates shared interactions");

const data = {
  generated: new Date().toISOString(),
  status: issues.length ? "FAIL" : "PASS",
  pages: pageFiles,
  evidence,
  issues,
};
writeJsonReport("design-quality-check.json", data);
writeMarkdownReport("design-quality-check.md", "Zhulong Design Quality Verification", summarizeIssues(issues), [
  { title: "Evidence", body: evidence.map((item) => `- ${item}`) },
  { title: "Issues", body: issues.length ? issues.map((item) => `- ${item.area}: ${item.detail}`) : ["No design quality issues found."] },
]);
console.log(`design quality check ${data.status} pages=${pageFiles.length + 1} issues=${issues.length}`);
if (issues.length) process.exitCode = 1;
