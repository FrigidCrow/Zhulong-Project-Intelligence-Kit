import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { kitRoot } from "./quality-utils.mjs";

const issues = [];
const check = (condition, message) => { if (!condition) issues.push(message); };
const read = (relative) => fs.readFileSync(path.join(kitRoot, relative), "utf8");
const hash = (relative) => crypto.createHash("sha256").update(read(relative)).digest("hex");

check(hash("third_party/taste-skill/SKILL.md") === "aa194351b246b8b4799099d4ed7b033d29eab6e6e3d58d8d2172978be7b3ec89", "vendored Taste SKILL.md hash drifted");
check(hash("third_party/taste-skill/LICENSE") === "4575a543ab88dad12ccea7d97e563d0bce5b448b06072e65d3264497dad326df", "vendored Taste LICENSE hash drifted");

const upstream = read("third_party/taste-skill/UPSTREAM.md");
check(upstream.includes("b17742737e796305d829b3ad39eda3add0d79060"), "upstream commit is not pinned");
check(read("THIRD_PARTY_LICENSES.md").includes("Vendored Taste Skill snapshot"), "third-party notice missing Taste");

const adapter = read("core/design/taste-adapter.md");
for (const expected of ["preserve", "evolve", "create", "system", "Frontend Design Decision", "Authority Order", "Rule Tiers", "Verification Contract"]) {
  check(adapter.includes(expected), `adapter missing ${expected}`);
}

const schema = JSON.parse(read("schemas/project.manifest.schema.json"));
check(schema.properties.frontend_design?.properties?.strategy?.enum?.includes("system"), "manifest schema missing frontend strategy enum");
check(schema.properties.frontend_design?.properties?.taste?.enum?.includes("disabled"), "manifest schema missing Taste enum");
check(read("core/project.manifest.yml.template").includes("frontend_design:"), "manifest template missing frontend_design");

for (const workflow of ["ui-phase", "plan-phase", "execute-phase", "code-review", "verify-work"]) {
  const text = read(`core/workflows/${workflow}.md`);
  check(text.includes("Frontend Design Decision") || text.includes("taste-adapter.md"), `${workflow} does not propagate frontend design policy`);
}

for (const runtimeFile of [
  "runtime/codex/skills/zl-ui-phase/SKILL.md",
  "runtime/claude-code/skills/zl-ui-phase/SKILL.md",
  "runtime/github-copilot/prompts/zl-ui-phase.prompt.md",
]) {
  const text = read(runtimeFile);
  for (const expected of ["{{ZL_KIT_ROOT}}", "preserve", "evolve", "create", "system", "Frontend Design Decision", "bundled"]) {
    check(text.includes(expected), `${runtimeFile} missing ${expected}`);
  }
}

for (const doc of ["README.md", "docs/product.html", "docs/technical-guide.html", "docs/runtime-command-packs.md", "docs/architecture.md", "docs/full-test-plan.md", "docs/quality-plan.md", "docs/changelog.md"]) {
  const text = read(doc);
  check(/Taste/i.test(text), `${doc} missing Taste documentation`);
}

const pkg = JSON.parse(read("package.json"));
check(pkg.files.includes("third_party/"), "npm package files omit third_party");

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "zhulong-taste-adapter-"));
const cli = path.join(kitRoot, "bin", "zl.mjs");
const run = (args) => spawnSync(process.execPath, [cli, ...args], { cwd: kitRoot, encoding: "utf8" });
const init = run(["init", "--target", fixture, "--template", "greenfield-app", "--name", "taste_fixture", "--mode", "new", "--doc-policy", "reference", "--rag", "none", "--no-interactive"]);
check(init.status === 0, `Taste fixture init failed: ${init.stderr || init.stdout}`);
const workflow = run(["workflow", "run", "ui-phase", "--target", fixture, "greenfield landing page"]);
check([0, 1].includes(workflow.status), `Taste UI workflow failed unexpectedly: ${workflow.stderr || workflow.stdout}`);
const contextDir = path.join(fixture, ".planning", "context");
const packetName = fs.existsSync(contextDir)
  ? fs.readdirSync(contextDir).find((name) => name.startsWith("ui-") && name.endsWith(".md"))
  : null;
check(Boolean(packetName), "UI workflow did not create a context packet");
if (packetName) {
  const packet = fs.readFileSync(path.join(contextDir, packetName), "utf8");
  for (const expected of ["Project Manifest", "frontend_design:", "Frontend Design Decision", "taste_applied", "allowed_changes", "design_variance"]) {
    check(packet.includes(expected), `generated UI context missing ${expected}`);
  }
}
fs.rmSync(fixture, { recursive: true, force: true });

console.log(`taste adapter verification ${issues.length ? "FAIL" : "PASS"} issues=${issues.length}`);
for (const issue of issues) console.error(`- ${issue}`);
if (issues.length) process.exitCode = 1;
