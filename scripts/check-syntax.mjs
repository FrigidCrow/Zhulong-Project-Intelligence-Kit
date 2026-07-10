import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["bin", "src", "scripts", "test", "verification"];
const files = [];

function walk(root) {
  if (!fs.existsSync(root)) return;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (["node_modules", ".git", ".zl-tmp"].includes(entry.name)) continue;
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) walk(entryPath);
    else if (entry.isFile() && entry.name.endsWith(".mjs")) files.push(entryPath);
  }
}

for (const root of roots) walk(root);
const failures = [];
for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) failures.push({ file, output: `${result.stdout || ""}${result.stderr || ""}`.trim() });
}

for (const failure of failures) console.error(`${failure.file}\n${failure.output}`);
console.log(`syntax check ${failures.length ? "FAIL" : "PASS"} files=${files.length} issues=${failures.length}`);
if (failures.length) process.exitCode = 1;
