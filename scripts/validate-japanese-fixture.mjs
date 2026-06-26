import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(kitRoot, "examples", "japanese-doc-dev-fixture");
const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pik-ja-fixture-"));
const projectRoot = path.join(workRoot, "project");
const pikCli = path.join(kitRoot, "bin", "pik.mjs");

function run(label, command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  const failed = result.status !== 0;
  if (options.expectFailure) {
    if (!failed) {
      throw new Error(`${label} was expected to fail but passed.\n${output}`);
    }
    console.log(`ok expected-failure ${label}`);
    return output;
  }
  if (failed) {
    throw new Error(`${label} failed with exit ${result.status}.\n${output}`);
  }
  console.log(`ok ${label}`);
  return output;
}

function pik(label, args, options = {}) {
  return run(label, "node", [pikCli, ...args], projectRoot, options);
}

function assertIncludes(label, text, expected) {
  if (!text.includes(expected)) {
    throw new Error(`${label} did not include ${expected}.\n${text}`);
  }
}

function copySeed(relativePath) {
  const source = path.join(projectRoot, "pik-seed", relativePath);
  const dest = path.join(projectRoot, ".planning", relativePath);
  fs.cpSync(source, dest, { recursive: true });
}

fs.cpSync(fixtureRoot, projectRoot, {
  recursive: true,
  filter: (source) => !source.includes(`${path.sep}node_modules${path.sep}`),
});

console.log(`fixture ${projectRoot}`);

run("fixture default tests", "npm", ["test"], projectRoot);
run("CR-017 acceptance fails before implementation", "npm", ["run", "test:task"], projectRoot, {
  expectFailure: true,
});

pik("pik init", ["init", "--target", projectRoot, "--template", "backend-service", "--name", "ja_approval_fixture", "--force"]);
fs.copyFileSync(
  path.join(projectRoot, "pik.fixture.config.json"),
  path.join(projectRoot, ".planning", "config.json"),
);
copySeed("issues");
copySeed(path.join("phases", "admin-approval"));

pik("pik verify", ["verify", "--target", projectRoot]);
pik("pik docs scan", ["docs", "scan", "--target", projectRoot]);
pik("pik docs normalize", ["docs", "normalize", "--target", projectRoot]);
pik("pik docs index direct", ["docs", "index", "--target", projectRoot, "--run"]);

const localQuery = pik("pik docs local query", ["docs", "query", "--target", projectRoot, "代理承認 30,000"]);
assertIncludes("local document query", localQuery, "QA-042");

const ragQuery = pik("pik docs RAG query", ["docs", "query", "--target", projectRoot, "--rag", "代理承認の上限金額"]);
assertIncludes("fixture RAG query", ragQuery, "30,000");

pik("pik graph build direct", ["graph", "build", "--target", projectRoot, "--run"]);
const graphQuery = pik("pik graph query", ["graph", "query", "--target", projectRoot, "PROXY_APPROVAL_LIMIT"]);
assertIncludes("graph query before change", graphQuery, "50000");

const policyPath = path.join(projectRoot, "src", "approvalPolicy.js");
const before = fs.readFileSync(policyPath, "utf8");
if (!before.includes("PROXY_APPROVAL_LIMIT = 50000")) {
  throw new Error("fixture policy did not contain the expected inherited 50000 limit");
}
fs.writeFileSync(policyPath, before.replace("PROXY_APPROVAL_LIMIT = 50000", "PROXY_APPROVAL_LIMIT = 30000"));

run("CR-017 acceptance passes after implementation", "npm", ["run", "test:task"], projectRoot);
run("fixture default tests after implementation", "npm", ["test"], projectRoot);

pik("pik graph rebuild direct", ["graph", "build", "--target", projectRoot, "--run"]);
const graphDiff = pik("pik graph diff", ["graph", "diff", "--target", projectRoot, "--details"]);
assertIncludes("graph diff after change", graphDiff, "30000");

pik("pik evidence record writeback", [
  "evidence",
  "record",
  "--target",
  projectRoot,
  "CR-017 proxy approval limit verified",
  "--command",
  "npm test && npm run test:task",
  "--result",
  "passed",
  "--source",
  "docs/qa/QA-042_代理承認上限.md,docs/change-requests/CR-017_代理承認上限.md",
  "--writeback",
  ".planning/issues/CR-017_proxy_approval_limit.md",
]);

const issueText = fs.readFileSync(path.join(projectRoot, ".planning", "issues", "CR-017_proxy_approval_limit.md"), "utf8");
assertIncludes("issue evidence writeback", issueText, "AI-PIKit Evidence Writeback");
pik("pik evidence status", ["evidence", "status", "--target", projectRoot]);

console.log(`validated ${projectRoot}`);
