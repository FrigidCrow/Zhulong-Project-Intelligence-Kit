import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeFrontendDesignConfig,
  resolveFrontendDesignPolicy,
} from "../src/design/taste-policy.mjs";

test("frontend design config defaults safely and rejects unknown values", () => {
  assert.deepEqual(normalizeFrontendDesignConfig(), { strategy: "auto", taste: "auto" });
  assert.deepEqual(normalizeFrontendDesignConfig({ strategy: "wild", taste: "always" }), { strategy: "auto", taste: "auto" });
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
