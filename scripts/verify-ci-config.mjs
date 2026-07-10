import fs from "node:fs";

const issues = [];
const ci = fs.readFileSync(".github/workflows/ci.yml", "utf8");
const release = fs.readFileSync(".github/workflows/release.yml", "utf8");
const ruleset = JSON.parse(fs.readFileSync(".github/rulesets/main.json", "utf8"));
const actionPins = {
  "actions/checkout": "df4cb1c069e1874edd31b4311f1884172cec0e10",
  "actions/setup-node": "48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e",
  "actions/upload-artifact": "043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
  "actions/attest": "a1948c3f048ba23858d222213b7c278aabede763",
};

function expect(condition, detail) {
  if (!condition) issues.push(detail);
}

for (const [label, content] of [["CI", ci], ["release", release]]) {
  expect(content.includes(`actions/checkout@${actionPins["actions/checkout"]}`), `${label} must pin actions/checkout v6 by SHA`);
  expect(content.includes(`actions/setup-node@${actionPins["actions/setup-node"]}`), `${label} must pin actions/setup-node v6 by SHA`);
  expect(/node-version:\s*24/.test(content), `${label} must pin Node.js 24`);
  expect(content.includes("npm@11.12.1"), `${label} must pin npm 11.12.1`);
  expect(content.includes("npm ci --ignore-scripts"), `${label} must use npm ci`);
}
expect(ci.includes("npm run verify:quality"), "CI must run verify:quality");
expect(ci.includes("npm run verify:full-command-surface"), "CI must run verify:full-command-surface");
expect(ci.includes("npm pack --dry-run --json"), "CI must run npm pack --dry-run --json");
expect(ci.includes(`actions/upload-artifact@${actionPins["actions/upload-artifact"]}`), "CI must pin upload-artifact v7 by SHA");
expect(ci.includes("retention-days: 7"), "CI report retention must be seven days");
expect(!ci.includes("verification/reports/*.png"), "CI artifacts must not include screenshots");
expect(release.includes("id-token: write"), "release must request OIDC id-token permission");
expect(release.includes("environment: npm"), "release must use the npm environment");
expect(release.includes(`actions/attest@${actionPins["actions/attest"]}`), "release must pin attest v4 by SHA");
expect(release.includes("ZL_RELEASE_REPOSITORY_PRIVATE"), "release must block when the current plan cannot attest a private repository");
expect(!release.includes("NODE_AUTH_TOKEN"), "release must not depend on a long-lived npm token");
expect(fs.existsSync("package-lock.json"), "package-lock.json must be committed");

const pullRequest = ruleset.rules.find((rule) => rule.type === "pull_request")?.parameters;
const statusChecks = ruleset.rules.find((rule) => rule.type === "required_status_checks")?.parameters;
expect(pullRequest?.required_approving_review_count >= 1, "ruleset must require an approving review");
expect(pullRequest?.required_review_thread_resolution === true, "ruleset must require resolved review threads");
expect(statusChecks?.required_status_checks?.some((check) => check.context === "quality"), "ruleset must require the quality job");
expect(statusChecks?.strict_required_status_checks_policy === true, "ruleset must require an up-to-date branch");

if (issues.length) {
  for (const issue of issues) console.error(`CI configuration: ${issue}`);
  process.exit(1);
}
console.log("CI configuration PASS");
