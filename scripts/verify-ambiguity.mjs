import fs from "node:fs";
import path from "node:path";
import {
  kitRoot,
  runCommand,
  summarizeIssues,
  tempRoot,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const zlCli = path.join(kitRoot, "bin", "zl.mjs");
const workRoot = tempRoot("zhulong-ambiguity-");
const projectRoot = path.join(workRoot, "project");
const issues = [];
const evidence = [];

function write(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text);
}

function run(args, expected = 0) {
  const result = runCommand(args.join(" "), "node", [zlCli, ...args], { cwd: projectRoot, allowFailure: true });
  if (result.status !== expected) issues.push({ case: args.join(" "), detail: `exit ${result.status}, expected ${expected}` });
  else evidence.push(`${args.join(" ")}: exit ${expected}`);
  return result;
}

function assert(condition, caseName, detail) {
  if (!condition) issues.push({ case: caseName, detail });
  else evidence.push(`${caseName}: ${detail}`);
}

write(path.join(projectRoot, "docs", "requirements.md"), [
  "# Requirements",
  "The response should be fast and appropriate.",
  "The service must return 200 within 100 ms.",
  "画面は必要に応じて適切に更新する。",
  "画面は三秒以内に更新しなければならない。",
  "系统应该快速处理，并尽量减少等待。",
  "系统必须在三秒内完成，且不得外发数据。",
  "",
].join("\n"));

run(["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "ambiguity_fixture", "--mode", "new", "--force"]);
const sync = run(["docs", "sync", "--target", projectRoot]);
assert(sync.output.includes("ambiguity audit WAIVED_WITH_RISK"), "docs sync folding", "ambiguity audit folded into docs sync");
const reportPath = path.join(projectRoot, ".planning", "quality", "AMBIGUITY_AUDIT.json");
const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
assert(report.status === "WAIVED_WITH_RISK", "reference status", "findings do not block by default");
assert(report.ambiguity_hits >= 6, "tri-language hits", `hits=${report.ambiguity_hits}`);
assert(!report.records.some((item) => ["must", "应该", "必须", "不得"].includes(item.term)), "normative terms", "normative words are not flagged");

const strict = run(["ambiguity", "audit", "--target", projectRoot, "--strict"], 1);
assert(strict.output.includes("ambiguity audit FAIL"), "strict status", "strict mode blocks findings");

write(path.join(projectRoot, ".planning", "knowledge", "ambiguity-wordlists.json"), JSON.stringify({
  languages: { en: { ambiguous: [{ term: "magic", category: "project-domain" }] } },
}, null, 2));
write(path.join(projectRoot, "docs", "extension.md"), "The system uses magic behavior.\n");
run(["docs", "sync", "--target", projectRoot]);
const extended = JSON.parse(fs.readFileSync(reportPath, "utf8"));
assert(extended.wordlists.extension_loaded === true, "project extension", "project wordlist loaded");
assert(extended.records.some((item) => item.term === "magic"), "project extension", "project term merged with kit wordlist");

const data = { generated: new Date().toISOString(), status: issues.length ? "FAIL" : "PASS", workRoot, evidence, issues };
writeJsonReport("ambiguity-check.json", data);
writeMarkdownReport("ambiguity-check.md", "Zhulong Ambiguity Audit Verification", summarizeIssues(issues), [
  { title: "证据", body: evidence.map((item) => `- ${item}`) },
  { title: "问题", body: issues.length ? issues.map((item) => `- ${item.case}: ${item.detail}`) : ["未发现问题。"] },
]);
console.log(`ambiguity check ${data.status} issues=${issues.length}`);
if (issues.length) process.exitCode = 1;
