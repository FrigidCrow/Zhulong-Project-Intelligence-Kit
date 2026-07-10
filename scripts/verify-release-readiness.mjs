import fs from "node:fs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const issues = [];
const expectedRepository = "git+https://github.com/FrigidCrow/Zhulong-Project-Intelligence-Kit.git";

if (pkg.private !== false) issues.push("package.json must set private=false before publishing");
if (!pkg.license || pkg.license === "UNLICENSED") issues.push("choose an SPDX license before publishing");
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
