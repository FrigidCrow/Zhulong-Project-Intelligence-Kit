import fs from "node:fs";

const issues = [];
const ci = fs.readFileSync(".github/workflows/ci.yml", "utf8");
const release = fs.readFileSync(".github/workflows/release.yml", "utf8");
const pages = fs.readFileSync(".github/workflows/pages.yml", "utf8");
const verificationManifest = fs.readFileSync("scripts/verification-manifest.mjs", "utf8");
const ruleset = JSON.parse(fs.readFileSync(".github/rulesets/main.json", "utf8"));
const actionPins = {
  "actions/checkout": "9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0",
  "actions/setup-node": "48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e",
  "actions/upload-artifact": "043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
  "actions/attest": "a1948c3f048ba23858d222213b7c278aabede763",
  "actions/configure-pages": "45bfe0192ca1faeb007ade9deae92b16b8254a0d",
  "actions/upload-pages-artifact": "fc324d3547104276b827a68afc52ff2a11cc49c9",
  "actions/deploy-pages": "cd2ce8fcbc39b97be8ca5fce6e763baed58fa128",
};

function expect(condition, detail) {
  if (!condition) issues.push(detail);
}

for (const [label, content] of [["CI", ci], ["release", release]]) {
  expect(content.includes(`actions/checkout@${actionPins["actions/checkout"]}`), `${label} must pin actions/checkout v7 by SHA`);
  expect(content.includes(`actions/setup-node@${actionPins["actions/setup-node"]}`), `${label} must pin actions/setup-node v6 by SHA`);
  expect(/node-version:\s*24/.test(content), `${label} must pin Node.js 24`);
  expect(content.includes("npm@11.12.1"), `${label} must pin npm 11.12.1`);
  expect(content.includes("npm ci --ignore-scripts"), `${label} must use npm ci`);
}
expect(ci.includes("npm run verify:ci"), "CI must run the authoritative verification tier");
expect(verificationManifest.includes('"full-command-surface"'), "CI verification manifest must include the full command surface");
expect(ci.includes("macos-latest"), "CI must run the core smoke suite on macOS");
expect(ci.includes("npm run verify:project-profiles"), "CI must verify document-heavy and non-document project profiles");
expect(ci.includes("npm pack --dry-run --json"), "CI must run npm pack --dry-run --json");
expect(ci.includes(`actions/upload-artifact@${actionPins["actions/upload-artifact"]}`), "CI must pin upload-artifact v7 by SHA");
expect(ci.includes("retention-days: 7"), "CI report retention must be seven days");
expect(ci.includes("path: ci-artifacts/"), "CI artifacts must use a non-hidden upload directory");
expect(!ci.includes("verification/reports/*.png"), "CI artifacts must not include screenshots");
expect(release.includes("id-token: write"), "release must request OIDC id-token permission");
expect(release.includes("environment: npm"), "release must use the npm environment");
expect(release.includes(`actions/attest@${actionPins["actions/attest"]}`), "release must pin attest v4 by SHA");
expect(release.includes("ZL_RELEASE_REPOSITORY_PRIVATE"), "release must block when the current plan cannot attest a private repository");
expect(release.includes("npm run verify:release"), "release must run the authoritative release verification tier");
expect(!release.includes("npm run verify:full-command-surface"), "release must not repeat a verifier outside the release DAG");
expect(!release.includes("NODE_AUTH_TOKEN"), "release must not depend on a long-lived npm token");
expect(pages.includes(`actions/checkout@${actionPins["actions/checkout"]}`), "Pages must pin actions/checkout v7 by SHA");
expect(pages.includes(`actions/setup-node@${actionPins["actions/setup-node"]}`), "Pages must pin actions/setup-node v6 by SHA");
expect(pages.includes(`actions/configure-pages@${actionPins["actions/configure-pages"]}`), "Pages must pin configure-pages v6 by SHA");
expect(pages.includes(`actions/upload-pages-artifact@${actionPins["actions/upload-pages-artifact"]}`), "Pages must pin upload-pages-artifact v5 by SHA");
expect(pages.includes(`actions/deploy-pages@${actionPins["actions/deploy-pages"]}`), "Pages must pin deploy-pages v5 by SHA");
expect(pages.includes("pages: write") && pages.includes("id-token: write"), "Pages must request deployment permissions");
expect(pages.includes("npm run verify:pages"), "Pages must assemble the allowlisted static site through verify:pages");
expect(pages.includes("ZL_PAGES_COMMIT_SHA"), "Pages must inject the deployed commit SHA");
expect(fs.existsSync("package-lock.json"), "package-lock.json must be committed");

const pullRequest = ruleset.rules.find((rule) => rule.type === "pull_request")?.parameters;
const statusChecks = ruleset.rules.find((rule) => rule.type === "required_status_checks")?.parameters;
expect(pullRequest?.required_approving_review_count === 0, "solo-maintainer ruleset must not require an unavailable approving reviewer");
expect(pullRequest?.require_last_push_approval === false, "solo-maintainer ruleset must not require last-push approval from another user");
expect(pullRequest?.required_review_thread_resolution === true, "ruleset must require resolved review threads");
expect(statusChecks?.required_status_checks?.some((check) => check.context === "quality"), "ruleset must require the quality job");
expect(statusChecks?.strict_required_status_checks_policy === true, "ruleset must require an up-to-date branch");

if (issues.length) {
  for (const issue of issues) console.error(`CI configuration: ${issue}`);
  process.exit(1);
}
console.log("CI configuration PASS");
