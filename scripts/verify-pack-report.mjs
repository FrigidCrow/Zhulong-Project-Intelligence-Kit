import fs from "node:fs";
import path from "node:path";

const reportPath = path.resolve(process.argv[2] || "verification/reports/npm-pack.json");
if (!fs.existsSync(reportPath)) {
  console.error(`pack report not found: ${reportPath}`);
  process.exit(1);
}

const parsed = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const pack = Array.isArray(parsed) ? parsed[0] : parsed;
const packFiles = Array.isArray(pack?.files) ? pack.files : [];
const files = packFiles.map((file) => file.path);
const maxPackedBytes = 700 * 1024;
const maxUnpackedBytes = 1500 * 1024;
const maxSingleFileBytes = 400 * 1024;
const required = [
  "package.json",
  "LICENSE",
  "THIRD_PARTY_LICENSES.md",
  "bin/zl.mjs",
  "src/app.mjs",
  "src/quality/audits.mjs",
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
const oversizedFiles = packFiles.filter((file) => Number(file.size || 0) > maxSingleFileBytes);
const sizeIssues = [];
if (Number(pack?.size || 0) > maxPackedBytes) sizeIssues.push(`packed size ${pack.size} exceeds ${maxPackedBytes}`);
if (Number(pack?.unpackedSize || 0) > maxUnpackedBytes) sizeIssues.push(`unpacked size ${pack.unpackedSize} exceeds ${maxUnpackedBytes}`);
if (oversizedFiles.length) sizeIssues.push(`oversized files: ${oversizedFiles.map((file) => `${file.path}=${file.size}`).join(", ")}`);

if (forbidden.length || missing.length || sizeIssues.length) {
  if (forbidden.length) console.error(`forbidden package files: ${forbidden.join(", ")}`);
  if (missing.length) console.error(`required package files missing: ${missing.join(", ")}`);
  for (const issue of sizeIssues) console.error(`package size: ${issue}`);
  process.exit(1);
}

console.log(`pack report PASS files=${files.length} size=${pack?.size ?? "unknown"} unpacked=${pack?.unpackedSize ?? "unknown"}`);
