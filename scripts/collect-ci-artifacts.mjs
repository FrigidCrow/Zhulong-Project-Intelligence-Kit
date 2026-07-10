import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const outputRoot = path.join(root, ".ci-artifacts");
fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });

const porcelain = execFileSync("git", ["status", "--porcelain=v1", "-z", "--", "verification/reports"], {
  cwd: root,
  encoding: "utf8",
});
const copied = [];
for (const entry of porcelain.split("\0").filter(Boolean)) {
  const relative = entry.slice(3).split(" -> ").at(-1);
  if (!relative || !/^verification\/reports\/.+\.(?:json|md)$/i.test(relative)) continue;
  const source = path.join(root, relative);
  if (!fs.existsSync(source)) continue;
  const target = path.join(outputRoot, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  copied.push(relative);
}

const manifest = {
  generated: new Date().toISOString(),
  retentionDays: 7,
  files: copied.sort(),
};
fs.writeFileSync(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`CI artifacts collected files=${copied.length + 1}`);
