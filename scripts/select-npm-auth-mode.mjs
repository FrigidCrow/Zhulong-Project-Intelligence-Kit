import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { selectNpmAuthMode } from "../src/release/auth-mode.mjs";

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

function registryEntryExists(spec) {
  const result = spawnSync("npm", ["view", spec, "version", "--json"], {
    encoding: "utf8",
    timeout: 30000,
  });
  if (result.status === 0) return true;
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (/\bE404\b|404 Not Found/i.test(output)) return false;
  throw new Error(`npm registry lookup failed for ${spec}: ${output.trim() || `exit ${result.status}`}`);
}

try {
  const mode = selectNpmAuthMode({
    versionExists: registryEntryExists(`${pkg.name}@${pkg.version}`),
    packageExists: registryEntryExists(pkg.name),
    hasBootstrapToken: process.env.HAS_NPM_BOOTSTRAP_TOKEN === "true",
  });
  const outputLine = `mode=${mode}\n`;
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, outputLine);
  else process.stdout.write(outputLine);
  if (mode === "bootstrap") {
    console.log("::warning::First publish uses NPM_BOOTSTRAP_TOKEN once. Revoke and delete it immediately after configuring trusted publishing.");
  } else {
    console.log("Existing package: use npm trusted publishing (OIDC).");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
