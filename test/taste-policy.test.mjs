import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFrontendDesignDecision,
  deriveFrontendDesignSignals,
  normalizeFrontendDesignConfig,
  parseFrontendDesignManifest,
  resolveFrontendDesignPolicy,
} from "../src/design/taste-policy.mjs";

test("frontend design config defaults safely and rejects unknown values", () => {
  assert.deepEqual(normalizeFrontendDesignConfig(), { strategy: "auto", taste: "auto" });
  assert.deepEqual(normalizeFrontendDesignConfig({ strategy: "wild", taste: "always" }), { strategy: "auto", taste: "auto" });
});

test("parses frontend design configuration from the complete manifest", () => {
  assert.deepEqual(parseFrontendDesignManifest([
    "project:",
    "  name: fixture",
    "frontend_design:",
    "  strategy: preserve",
    "  taste: disabled",
    "workflow:",
    "  mode: interactive",
  ].join("\n")), { strategy: "preserve", taste: "disabled" });
});

test("greenfield marketing surfaces use create with full Taste", () => {
  const result = resolveFrontendDesignPolicy({ signals: { landingPage: true } });
  assert.equal(result.mode, "create");
  assert.equal(result.tasteApplied, "full");
  assert.equal(result.needsClarification, false);
});

test("partial styles evolve while stable design systems are preserved", () => {
  const evolve = resolveFrontendDesignPolicy({ signals: { hasPartialDesign: true } });
  const preserve = resolveFrontendDesignPolicy({ signals: { hasDesignSystem: true } });
  assert.equal(evolve.mode, "evolve");
  assert.equal(evolve.tasteApplied, "constrained");
  assert.equal(preserve.mode, "preserve");
  assert.equal(preserve.tasteApplied, "audit-only");
});

test("dashboards use system mode and disable marketing Taste", () => {
  const result = resolveFrontendDesignPolicy({ config: { taste: "enabled" }, signals: { dashboard: true } });
  assert.equal(result.mode, "system");
  assert.equal(result.tasteApplied, "disabled");
});

test("user overrides manifest and manifest overrides evidence", () => {
  const manifest = resolveFrontendDesignPolicy({
    config: { strategy: "preserve" },
    signals: { landingPage: true },
  });
  const user = resolveFrontendDesignPolicy({
    config: { strategy: "preserve", taste: "enabled" },
    user: { strategy: "create", taste: "disabled" },
    signals: { hasDesignSystem: true },
  });
  assert.equal(manifest.mode, "preserve");
  assert.equal(manifest.source, "manifest");
  assert.equal(user.mode, "create");
  assert.equal(user.source, "user");
  assert.equal(user.tasteApplied, "disabled");
});

test("ambiguous automatic routing requests one clarification", () => {
  const result = resolveFrontendDesignPolicy();
  assert.equal(result.confidence, "low");
  assert.equal(result.needsClarification, true);
});

test("derives deterministic routing evidence from request, dependencies, and paths", () => {
  const system = deriveFrontendDesignSignals({ request: "管理后台 dashboard", initMode: "new" });
  assert.equal(system.signals.dashboard, true);
  const preserve = deriveFrontendDesignSignals({ dependencies: ["@mui/material"], paths: ["src/App.tsx"] });
  assert.equal(preserve.signals.hasDesignSystem, true);
  const evolve = deriveFrontendDesignSignals({ initMode: "existing", paths: ["src/components/Hero.tsx", "src/styles.css"] });
  assert.equal(evolve.signals.hasPartialDesign, true);
});

test("builds a concrete Frontend Design Decision with dials and one clarification", () => {
  const policy = resolveFrontendDesignPolicy();
  const decision = buildFrontendDesignDecision({ policy, evidence: ["no decisive design evidence found"] });
  assert.equal(decision.mode, "evolve");
  assert.equal(decision.dials.designVariance, 5);
  assert.equal(decision.needsClarification, true);
  assert.match(decision.clarificationQuestion, /preserve.*evolve.*new direction/i);
});
