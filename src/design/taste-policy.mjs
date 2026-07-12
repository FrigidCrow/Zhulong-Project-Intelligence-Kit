export const FRONTEND_DESIGN_STRATEGIES = Object.freeze(["auto", "preserve", "evolve", "create", "system"]);
export const TASTE_SETTINGS = Object.freeze(["auto", "enabled", "disabled"]);

function normalize(value, allowed, fallback = "auto") {
  const candidate = String(value || "").trim().toLowerCase();
  return allowed.includes(candidate) ? candidate : fallback;
}

export function normalizeFrontendDesignConfig(config = {}) {
  return {
    strategy: normalize(config.strategy, FRONTEND_DESIGN_STRATEGIES),
    taste: normalize(config.taste, TASTE_SETTINGS),
  };
}

function inferStrategy(signals = {}) {
  if (signals.productSurface || signals.dashboard || signals.admin || signals.dataDense || signals.multiStep) {
    return { strategy: "system", confidence: "high", reason: "product-system surface" };
  }
  if (signals.hasStableDesign || signals.hasApprovedDesign || signals.hasDesignSystem) {
    return { strategy: "preserve", confidence: "high", reason: "stable project design evidence" };
  }
  if (signals.hasPartialDesign || signals.hasInconsistentDesign) {
    return { strategy: "evolve", confidence: "high", reason: "partial or inconsistent project style" };
  }
  if (signals.marketingSurface || signals.landingPage || signals.portfolio || signals.publicWebsite) {
    return { strategy: "create", confidence: "high", reason: "greenfield marketing surface" };
  }
  return { strategy: "evolve", confidence: "low", reason: "insufficient design evidence" };
}

function tasteApplication(strategy, taste) {
  if (taste === "disabled" || strategy === "system") return "disabled";
  if (strategy === "preserve") return "audit-only";
  if (strategy === "evolve") return "constrained";
  return "full";
}

export function resolveFrontendDesignPolicy({ config = {}, user = {}, signals = {} } = {}) {
  const normalizedConfig = normalizeFrontendDesignConfig(config);
  const userStrategy = normalize(user.strategy, FRONTEND_DESIGN_STRATEGIES);
  const userTaste = normalize(user.taste, TASTE_SETTINGS);
  const explicitStrategy = userStrategy !== "auto"
    ? { strategy: userStrategy, source: "user" }
    : normalizedConfig.strategy !== "auto"
      ? { strategy: normalizedConfig.strategy, source: "manifest" }
      : null;
  const inferred = explicitStrategy
    ? { ...explicitStrategy, confidence: "high", reason: `${explicitStrategy.source} override` }
    : { ...inferStrategy(signals), source: "evidence" };
  const taste = userTaste !== "auto"
    ? userTaste
    : normalizedConfig.taste;

  return {
    mode: inferred.strategy,
    confidence: inferred.confidence,
    source: inferred.source,
    reason: inferred.reason,
    taste: taste === "auto" ? "enabled" : taste,
    tasteApplied: tasteApplication(inferred.strategy, taste),
    needsClarification: !explicitStrategy && inferred.confidence === "low",
  };
}
