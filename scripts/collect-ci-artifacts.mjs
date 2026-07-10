import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputRoot = path.join(root, "ci-artifacts");
fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });

const copied = [];
const reportRoot = path.join(root, "verification", "reports");
if (fs.existsSync(reportRoot)) {
  for (const entry of fs.readdirSync(reportRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !/\.(?:json|md)$/i.test(entry.name)) continue;
    const relative = path.join("verification", "reports", entry.name);
    const source = path.join(root, relative);
    const target = path.join(outputRoot, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    copied.push(relative);
  }
}

const manifest = {
  generated: new Date().toISOString(),
  retentionDays: 7,
  files: copied.sort(),
};
fs.writeFileSync(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`CI artifacts collected files=${copied.length + 1}`);
