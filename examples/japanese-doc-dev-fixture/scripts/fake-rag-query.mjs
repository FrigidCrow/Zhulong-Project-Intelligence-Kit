import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");

function parseQuery(argv) {
  const index = argv.indexOf("--query");
  if (index >= 0) return argv.slice(index + 1).join(" ").trim();
  return argv.join(" ").trim();
}

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

function queryTerms(query) {
  const normalized = query
    .replace(/[、。！？!?（）()「」『』]/g, " ")
    .replace(/[のはをがにへとで]/g, " ");
  const terms = normalized.split(/\s+/).filter(Boolean);
  for (const term of ["代理承認", "上限", "30,000", "30000", "CR-017", "QA-042"]) {
    if (query.includes(term) || ["代理承認", "上限"].includes(term)) {
      terms.push(term);
    }
  }
  return [...new Set(terms)];
}

const query = parseQuery(process.argv.slice(2));
const terms = queryTerms(query);
const matches = [];

for (const filePath of walk(docsDir)) {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const score = terms.reduce((sum, term) => sum + (line.includes(term) ? 1 : 0), 0);
    if (score > 0) {
      matches.push({
        score,
        path: path.relative(root, filePath),
        line: index + 1,
        text: line.trim()
      });
    }
  });
}

matches.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path) || a.line - b.line);

console.log(`Fixture RAG answer for: ${query}`);
if (matches.length === 0) {
  console.log("- No matching fixture documents.");
} else {
  for (const match of matches.slice(0, 6)) {
    console.log(`- ${match.path}:${match.line} ${match.text}`);
  }
}
