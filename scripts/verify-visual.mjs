import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import {
  kitRoot,
  summarizeIssues,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const require = createRequire(import.meta.url);
const pages = [
  { file: "docs/product.html", name: "product" },
  { file: "docs/commands.html", name: "commands" },
  { file: "docs/technical-guide.html", name: "technical-guide" },
  { file: "docs/quality-dashboard.html", name: "quality-dashboard" },
];
const viewports = [
  { label: "desktop", width: 1440, height: 1100 },
  { label: "mobile", width: 390, height: 1200 },
];
const issues = [];
const results = [];

function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    const bundled = path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules");
    return require(require.resolve("playwright", { paths: [bundled] }));
  }
}

function chromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

function addIssue(page, viewport, detail) {
  issues.push({ page, viewport, detail });
}

const { chromium } = loadPlaywright();
const launchOptions = { headless: true };
const chromePath = chromeExecutable();
if (chromePath) launchOptions.executablePath = chromePath;

const browser = await chromium.launch(launchOptions);
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    for (const item of pages) {
      const url = `file://${path.join(kitRoot, item.file)}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(350);
      const metrics = await page.evaluate(() => {
        const body = document.body;
        const doc = document.documentElement;
        const stageWidths = [...document.querySelectorAll(".stage-flow")]
          .map((flow) => [...flow.querySelectorAll("code")].map((node) => Math.round(node.getBoundingClientRect().width)))
          .filter((widths) => widths.length > 1);
        const unequalStageRows = stageWidths.filter((widths) => Math.max(...widths) - Math.min(...widths) > 2).length;
        return {
          h1: document.querySelector("h1")?.textContent?.trim() || "",
          brand: document.querySelector(".brand-mark")?.textContent?.trim() || "",
          overflow: Math.max(body.scrollWidth, doc.scrollWidth) - doc.clientWidth,
          emptyCards: [...document.querySelectorAll(".control-card, .command-card, .panel")]
            .filter((el) => !el.textContent.trim()).length,
          badTextBoxes: [...document.querySelectorAll("a, button, .tag, .status-pill")]
            .filter((el) => el.scrollWidth - el.clientWidth > 2).length,
          networkNodes: document.querySelectorAll(".network-node").length,
          unequalStageRows,
          scrollWidth: Math.max(body.scrollWidth, doc.scrollWidth),
          clientWidth: doc.clientWidth,
        };
      });
      const screenshot = path.join(kitRoot, "verification", "reports", `${item.name}-${viewport.label}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      const bytes = fs.statSync(screenshot).size;

      if (!metrics.h1) addIssue(item.file, viewport.label, "Missing visible H1.");
      if (metrics.brand !== "AI Project Intelligence Kit") addIssue(item.file, viewport.label, `Unexpected brand text: ${metrics.brand}`);
      if (metrics.overflow > 2) addIssue(item.file, viewport.label, `Horizontal overflow: ${metrics.overflow}px.`);
      if (metrics.emptyCards > 0) addIssue(item.file, viewport.label, `Empty cards found: ${metrics.emptyCards}.`);
      if (metrics.badTextBoxes > 0) addIssue(item.file, viewport.label, `Text boxes with clipped content: ${metrics.badTextBoxes}.`);
      if (metrics.unequalStageRows > 0) addIssue(item.file, viewport.label, `Stage flow rows have uneven node widths: ${metrics.unequalStageRows}.`);
      if (item.name === "product" && metrics.networkNodes < 5) addIssue(item.file, viewport.label, "Product graph visual has too few network nodes.");
      if (bytes < 10000) addIssue(item.file, viewport.label, `Screenshot looks too small: ${bytes} bytes.`);

      results.push({
        page: item.file,
        viewport: viewport.label,
        screenshot,
        bytes,
        metrics,
      });
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  chromePath: chromePath || "playwright-default",
  results,
  issues,
};

writeJsonReport("visual-check.json", data);
writeMarkdownReport("visual-check.md", "AI-PIKit Visual Verification", summarizeIssues(issues), [
  {
    title: "Screenshots",
    body: results.map((result) => `- ${result.page} ${result.viewport}: \`${result.screenshot}\` (${result.bytes} bytes)`),
  },
  {
    title: "Issues",
    body: issues.length === 0
      ? ["No visual issues found."]
      : issues.map((issue) => `- ${issue.page} ${issue.viewport}: ${issue.detail}`),
  },
]);

console.log(`visual check ${data.status} pages=${pages.length} viewports=${viewports.length} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
