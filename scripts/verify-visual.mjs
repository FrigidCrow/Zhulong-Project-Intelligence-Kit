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
  { file: "docs/product.html", name: "product", checkBrand: true },
  { file: "docs/commands.html", name: "commands", checkBrand: true },
  { file: "docs/technical-guide.html", name: "technical-guide", checkBrand: true },
  { file: "docs/quality-dashboard.html", name: "quality-dashboard", checkBrand: true },
  { file: "templates/cockpit/sample.html", name: "cockpit-sample", checkBrand: false },
];
const viewports = [
  { label: "desktop", width: 1440, height: 1100, colorScheme: "light" },
  { label: "mobile", width: 390, height: 1200, colorScheme: "light" },
  { label: "desktop-dark", width: 1440, height: 1100, colorScheme: "dark" },
];
const issues = [];
const results = [];
const screenshotRoot = path.resolve(
  process.env.ZL_VISUAL_OUTPUT_DIR || path.join(kitRoot, ".zl-tmp", "visual"),
);
fs.mkdirSync(screenshotRoot, { recursive: true });

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
      colorScheme: viewport.colorScheme,
    });
    for (const item of pages) {
      const page = await context.newPage();
      const url = `file://${path.join(kitRoot, item.file)}`;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(350);
      const foldScreenshot = path.join(screenshotRoot, `${item.name}-${viewport.label}-fold.png`);
      await page.screenshot({ path: foldScreenshot, fullPage: false });
      const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < documentHeight; y += Math.max(900, viewport.height)) {
        await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
        await page.waitForTimeout(20);
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.evaluate(() => {
        document.querySelectorAll(".reveal-ready").forEach((element) => element.classList.add("is-visible"));
      });
      await page.waitForTimeout(620);
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
          brandVisible: (() => {
            const element = document.querySelector(".brand-mark");
            if (!element) return false;
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0 && rect.width > 20 && rect.height > 20;
          })(),
          navLinks: document.querySelectorAll(".nav a").length,
          overflow: Math.max(body.scrollWidth, doc.scrollWidth) - doc.clientWidth,
          emptyCards: [...document.querySelectorAll(".control-card, .command-card, .panel")]
            .filter((el) => !el.textContent.trim()).length,
          badTextBoxes: [...document.querySelectorAll("a, button, .tag, .status-pill")]
            .filter((el) => el.scrollWidth - el.clientWidth > 2).length,
          networkNodes: document.querySelectorAll(".network-node").length,
          heroAssetWidth: document.querySelector(".hero-emblem img")?.naturalWidth || 0,
          cockpitGraph: document.querySelectorAll(".cockpit-graph .graph-node").length,
          unequalStageRows,
          scrollWidth: Math.max(body.scrollWidth, doc.scrollWidth),
          clientWidth: doc.clientWidth,
        };
      });
      const screenshot = path.join(screenshotRoot, `${item.name}-${viewport.label}.png`);
      await page.evaluate(() => document.documentElement.classList.add("visual-capture"));
      await page.screenshot({ path: screenshot, fullPage: true });
      const bytes = fs.statSync(screenshot).size;

      if (!metrics.h1) addIssue(item.file, viewport.label, "Missing visible H1.");
      if (item.checkBrand && metrics.brand !== "Zhulong Project Intelligence Kit") addIssue(item.file, viewport.label, `Unexpected brand text: ${metrics.brand}`);
      if (item.checkBrand && !metrics.brandVisible) addIssue(item.file, viewport.label, "Brand mark is not visibly rendered.");
      if (item.checkBrand && metrics.navLinks !== 5) addIssue(item.file, viewport.label, `Unexpected navigation link count: ${metrics.navLinks}.`);
      if (metrics.overflow > 2) addIssue(item.file, viewport.label, `Horizontal overflow: ${metrics.overflow}px.`);
      if (metrics.emptyCards > 0) addIssue(item.file, viewport.label, `Empty cards found: ${metrics.emptyCards}.`);
      if (metrics.badTextBoxes > 0) addIssue(item.file, viewport.label, `Text boxes with clipped content: ${metrics.badTextBoxes}.`);
      if (metrics.unequalStageRows > 0) addIssue(item.file, viewport.label, `Stage flow rows have uneven node widths: ${metrics.unequalStageRows}.`);
      if (item.name === "product" && metrics.heroAssetWidth < 256) addIssue(item.file, viewport.label, "Product hero asset is missing or too small.");
      if (item.name === "cockpit-sample" && metrics.cockpitGraph < 5) addIssue(item.file, viewport.label, "Cockpit graph did not render enough nodes.");
      if (bytes < 10000) addIssue(item.file, viewport.label, `Screenshot looks too small: ${bytes} bytes.`);

      results.push({
        page: item.file,
        viewport: viewport.label,
        screenshot,
        foldScreenshot,
        bytes,
        metrics,
      });
      await page.close();
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
writeMarkdownReport("visual-check.md", "Zhulong Visual Verification", summarizeIssues(issues), [
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
