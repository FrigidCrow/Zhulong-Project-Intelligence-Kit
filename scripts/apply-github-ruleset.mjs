import fs from "node:fs";

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const repoFlag = process.argv.indexOf("--repo");
const repository = repoFlag >= 0 ? process.argv[repoFlag + 1] : "FrigidCrow/Zhulong-Project-Intelligence-Kit";
const config = JSON.parse(fs.readFileSync(".github/rulesets/main.json", "utf8"));

if (!token) {
  console.error("GH_TOKEN or GITHUB_TOKEN is required");
  process.exit(1);
}
if (!/^[^/]+\/[^/]+$/.test(repository || "")) {
  console.error("repository must use owner/name format");
  process.exit(1);
}
const base = `https://api.github.com/repos/${repository}/rulesets`;
const headers = {
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
  "User-Agent": "zhulong-ruleset-configurator",
};

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers });
  const body = await response.text();
  const data = body ? JSON.parse(body) : null;
  if (!response.ok) {
    const detail = data?.message || `${response.status} ${response.statusText}`;
    throw new Error(`GitHub ruleset API failed (${response.status}): ${detail}`);
  }
  return data;
}

try {
  const rulesets = await request(base);
  const existing = rulesets.find((item) => item.name === config.name);
  const method = existing ? "PUT" : "POST";
  const url = existing ? `${base}/${existing.id}` : base;
  const result = await request(url, { method, body: JSON.stringify(config) });
  console.log(`GitHub ruleset ${existing ? "updated" : "created"}: ${result.name} (${result.enforcement})`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
