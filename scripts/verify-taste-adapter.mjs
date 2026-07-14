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

const cli = path.join(kitRoot, "bin", "zl.mjs");
const run = (args) => spawnSync(process.execPath, [cli, ...args], { cwd: kitRoot, encoding: "utf8" });

function routingCase({ label, mode, request, setup, activePhase, extraArgs = [], expected }) {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), `zhulong-taste-${label}-`));
  const init = run(["init", "--target", fixture, "--template", "greenfield-app", "--name", `taste_${label}`, "--mode", mode, "--doc-policy", "reference", "--rag", "none", "--no-interactive"]);
  check(init.status === 0, `${label} Taste fixture init failed: ${init.stderr || init.stdout}`);
  if (activePhase) {
    const statePath = path.join(fixture, ".planning", "STATE.md");
    fs.writeFileSync(statePath, fs.readFileSync(statePath, "utf8").replace(/^current_phase:\s*.*$/m, `current_phase: ${activePhase}`));
  }
  setup?.(fixture);
  const workflow = run(["workflow", "run", "ui-phase", "--target", fixture, request, ...extraArgs]);
  check([0, 1].includes(workflow.status), `${label} Taste UI workflow failed unexpectedly: ${workflow.stderr || workflow.stdout}`);
  const contextDir = path.join(fixture, ".planning", "context");
  const packetName = fs.existsSync(contextDir)
    ? fs.readdirSync(contextDir).find((name) => name.startsWith("ui-") && name.endsWith(".md"))
    : null;
  check(Boolean(packetName), `${label} UI workflow did not create a context packet`);
  if (packetName) {
    const packet = fs.readFileSync(path.join(contextDir, packetName), "utf8");
    for (const marker of ["Project Manifest", "frontend_design:", "Frontend Design Decision", "allowed_changes", "design_variance", ...expected]) {
      check(packet.includes(marker), `${label} generated UI context missing ${marker}`);
    }
  }
  if (activePhase) {
    const recordPath = path.join(fixture, ".planning", "phases", activePhase.toLowerCase(), "FRONTEND_DESIGN_DECISION.md");
    check(fs.existsSync(recordPath), `${label} UI workflow did not write the active phase design decision`);
    if (fs.existsSync(recordPath)) {
      const record = fs.readFileSync(recordPath, "utf8");
      for (const marker of expected) check(record.includes(marker), `${label} active phase decision missing ${marker}`);
    }
  }
  fs.rmSync(fixture, { recursive: true, force: true });
}

routingCase({
  label: "create",
  mode: "new",
  request: "greenfield landing page",
  activePhase: "MVP-UI",
  expected: ["mode: create", "taste_applied: full", "needs_clarification: false"],
});
routingCase({
  label: "evolve",
  mode: "existing",
  request: "evolve the existing frontend",
  setup: (fixture) => {
    fs.mkdirSync(path.join(fixture, "src", "components"), { recursive: true });
    fs.writeFileSync(path.join(fixture, "src", "components", "Hero.tsx"), "export const Hero = () => null;\n");
  },
  expected: ["mode: evolve", "taste_applied: constrained"],
});
routingCase({
  label: "preserve",
  mode: "existing",
  request: "continue the existing product UI",
  setup: (fixture) => {
    const packagePath = path.join(fixture, "package.json");
    const pkg = fs.existsSync(packagePath) ? JSON.parse(fs.readFileSync(packagePath, "utf8")) : { name: "taste-preserve-fixture" };
    pkg.dependencies = { ...(pkg.dependencies || {}), "@mui/material": "7.0.0" };
    fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
  },
  expected: ["mode: preserve", "taste_applied: audit-only"],
});
routingCase({
  label: "system",
  mode: "new",
  request: "admin dashboard with dense tables",
  expected: ["mode: system", "taste_applied: disabled"],
});
routingCase({
  label: "override",
  mode: "new",
  request: "landing page",
  extraArgs: ["--design-strategy", "preserve", "--taste", "disabled"],
  expected: ["mode: preserve", "taste_applied: disabled", "source: user"],
});

console.log(`taste adapter verification ${issues.length ? "FAIL" : "PASS"} issues=${issues.length}`);
for (const issue of issues) console.error(`- ${issue}`);
if (issues.length) process.exitCode = 1;
