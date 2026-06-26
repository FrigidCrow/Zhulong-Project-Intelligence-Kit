import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "graphrag-workspace", "output");
fs.mkdirSync(outDir, { recursive: true });

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath, results);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(entryPath);
    }
  }
  return results;
}

const records = walk(docsDir).sort().map((filePath) => {
  const text = fs.readFileSync(filePath, "utf8");
  const title = text.split(/\r?\n/).find((line) => line.startsWith("# "))?.replace(/^#\s+/, "") || path.basename(filePath);
  return {
    path: path.relative(root, filePath),
    title,
    chars: text.length,
    proxyApproval: text.includes("代理承認"),
    cr017: text.includes("CR-017") || text.includes("QA-042")
  };
});

fs.writeFileSync(path.join(outDir, "index.json"), `${JSON.stringify(records, null, 2)}\n`);
console.log(`Fixture RAG indexed ${records.length} documents`);
