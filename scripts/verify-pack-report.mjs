import fs from "node:fs";
import path from "node:path";

const reportPath = path.resolve(process.argv[2] || "verification/reports/npm-pack.json");
if (!fs.existsSync(reportPath)) {
  console.error(`pack report not found: ${reportPath}`);
  process.exit(1);
}

const parsed = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const pack = Array.isArray(parsed) ? parsed[0] : parsed;
const files = Array.isArray(pack?.files) ? pack.files.map((file) => file.path) : [];
const required = [
  "package.json",
  "LICENSE",
  "THIRD_PARTY_LICENSES.md",
  "bin/zl.mjs",
  "bin/quality-audits.mjs",
  "ambiguity-wordlists.json",
  "runtime/claude-code/settings.template.json",
  "docs/assets/zhulong-icon.png",
];
const forbidden = files.filter((file) => (
  file.startsWith("verification/")
  || file.includes("/reports/")
  || /icon-candidates?/i.test(file)
  || /(?:^|\/)(?:screenshots?)(?:\/|$)/i.test(file)
));
const missing = required.filter((file) => !files.includes(file));

if (forbidden.length || missing.length) {
  if (forbidden.length) console.error(`forbidden package files: ${forbidden.join(", ")}`);
  if (missing.length) console.error(`required package files missing: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`pack report PASS files=${files.length} size=${pack?.size ?? "unknown"} unpacked=${pack?.unpackedSize ?? "unknown"}`);
