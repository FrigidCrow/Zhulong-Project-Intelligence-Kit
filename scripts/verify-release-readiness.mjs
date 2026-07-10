import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const issues = [];
const expectedRepository = "git+https://github.com/FrigidCrow/Zhulong-Project-Intelligence-Kit.git";

if (pkg.private !== false) issues.push("package.json must set private=false before publishing");
if (pkg.license !== "Apache-2.0") issues.push("package.json license must be Apache-2.0");
if (!fs.existsSync("LICENSE")) issues.push("Apache-2.0 LICENSE file is missing");
if (!fs.existsSync("THIRD_PARTY_LICENSES.md")) issues.push("THIRD_PARTY_LICENSES.md is missing");
if (pkg.publishConfig?.access !== "public") issues.push("publishConfig.access must be public");
if (pkg.publishConfig?.provenance !== true) issues.push("publishConfig.provenance must be true");
if (pkg.repository?.url !== expectedRepository) issues.push(`repository.url must equal ${expectedRepository}`);
if (process.env.ZL_RELEASE_REPOSITORY_PRIVATE === "true") {
  issues.push("the current GitHub plan requires a public repository for artifact attestation");
}
if (process.env.GITHUB_REF_NAME && process.env.GITHUB_REF_NAME !== `v${pkg.version}`) {
  issues.push(`release tag ${process.env.GITHUB_REF_NAME} must equal v${pkg.version}`);
}

if (issues.length) {
  for (const issue of issues) console.error(`release readiness: ${issue}`);
  process.exit(1);
}
console.log(`release readiness PASS package=${pkg.name}@${pkg.version}`);
