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

export function parseFrontendDesignManifest(text = "") {
  const config = {};
  const lines = String(text).split(/\r?\n/);
  let baseIndent = null;
  for (const line of lines) {
    if (baseIndent === null) {
      const match = line.match(/^(\s*)frontend_design:\s*(?:#.*)?$/);
      if (match) baseIndent = match[1].length;
      continue;
    }
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const indent = line.match(/^\s*/)?.[0].length || 0;
    if (indent <= baseIndent) break;
    const match = line.match(/^\s+(strategy|taste):\s*([^#]+?)\s*(?:#.*)?$/);
    if (match) config[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return normalizeFrontendDesignConfig(config);
}

const DESIGN_SYSTEM_PACKAGES = new Set([
  "@adobe/react-spectrum",
  "@carbon/react",
  "@chakra-ui/react",
  "@fluentui/react-components",
  "@mui/material",
  "@primer/react",
  "@shopify/polaris",
  "antd",
]);

export function deriveFrontendDesignSignals({ request = "", initMode = "existing", dependencies = [], paths = [] } = {}) {
  const text = String(request).normalize("NFKC").toLowerCase();
  const names = new Set(Array.isArray(dependencies) ? dependencies : Object.keys(dependencies || {}));
  const normalizedPaths = paths.map((item) => String(item).replaceAll("\\", "/").toLowerCase());
  const signals = {
    dashboard: /\b(?:dashboard|admin|backoffice)\b|仪表盘|管理后台|后台界面/.test(text),
    dataDense: /data[- ]dense|table[- ]heavy|数据密集|表格密集/.test(text),
    multiStep: /multi[- ]step|多步骤|工作流界面/.test(text),
    marketingSurface: /\b(?:landing|marketing|portfolio|public website|corporate website)\b|落地页|营销页|作品集|官网/.test(text),
    landingPage: /\blanding(?: page)?\b|落地页/.test(text),
    portfolio: /\bportfolio\b|作品集/.test(text),
    publicWebsite: /\b(?:public|corporate) website\b|官网/.test(text),
    hasDesignSystem: [...names].some((name) => DESIGN_SYSTEM_PACKAGES.has(name)),
    hasStableDesign: normalizedPaths.some((item) => /(?:design-system|design_tokens|design-tokens|brand-guidelines|\/tokens\/|tokens\.)/.test(item)),
    hasApprovedDesign: normalizedPaths.some((item) => /(?:approved-design|figma-approved)/.test(item)),
    hasPartialDesign: false,
    hasInconsistentDesign: /inconsistent design|style drift|设计不统一|风格不统一/.test(text),
  };
  const frontendPaths = normalizedPaths.filter((item) => /\.(?:css|scss|sass|less|jsx|tsx|vue|svelte)$/.test(item));
  signals.hasPartialDesign = initMode !== "new"
    && frontendPaths.length > 0
    && !signals.hasDesignSystem
    && !signals.hasStableDesign
    && !signals.hasApprovedDesign;
  const evidence = [];
  if (signals.dashboard || signals.dataDense || signals.multiStep) evidence.push("request identifies a product-system surface");
  if (signals.marketingSurface) evidence.push("request identifies a public marketing surface");
  if (signals.hasDesignSystem) evidence.push(`dependency manifest contains an established design system`);
  if (signals.hasStableDesign || signals.hasApprovedDesign) evidence.push("project paths contain stable design or approved-design evidence");
  if (signals.hasPartialDesign) evidence.push(`existing frontend evidence found in ${frontendPaths.length} file(s) without stable tokens`);
  if (signals.hasInconsistentDesign) evidence.push("request identifies existing style inconsistency");
  if (evidence.length === 0) evidence.push("no decisive design evidence found");
  const pageKind = signals.dashboard || signals.dataDense || signals.multiStep
    ? "product system"
    : signals.landingPage ? "landing page"
      : signals.portfolio ? "portfolio"
        : signals.publicWebsite || signals.marketingSurface ? "public website"
          : "frontend surface";
  return { signals, evidence, pageKind };
}

function inferStrategy(signals = {}) {
  if (signals.dashboard || signals.admin || signals.dataDense || signals.multiStep) {
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

export function buildFrontendDesignDecision({ policy, evidence = [], pageKind = "frontend surface" } = {}) {
  const mode = policy?.mode || "evolve";
  const modeDefaults = {
    create: { designVariance: 7, motionIntensity: 4, visualDensity: 4 },
    evolve: { designVariance: 5, motionIntensity: 3, visualDensity: 5 },
    preserve: { designVariance: 2, motionIntensity: 2, visualDensity: 5 },
    system: { designVariance: 2, motionIntensity: 2, visualDensity: 8 },
  }[mode];
  const allowedChanges = {
    create: ["visual hierarchy", "layout composition", "typography within project constraints", "responsive motion"],
    evolve: ["hierarchy", "spacing", "composition", "responsive behavior", "restrained motion"],
    preserve: ["quality fixes that do not change the visual language"],
    system: ["task clarity", "data density", "states", "keyboard flow"],
  }[mode];
  const verification = mode === "system"
    ? ["desktop and mobile task flow", "keyboard access", "states and density", "contrast and reduced motion"]
    : ["desktop and mobile screenshots", "contrast and keyboard access", "theme and reduced motion", "performance-sensitive assets"];
  return {
    mode,
    confidence: policy?.confidence || "low",
    tasteApplied: policy?.tasteApplied || "constrained",
    source: policy?.source || "evidence",
    reason: policy?.reason || "insufficient design evidence",
    evidence,
    preserve: ["brand tokens", "component APIs", "routes and navigation", "analytics identifiers"],
    allowedChanges,
    designRead: {
      pageKind,
      audience: "confirm from specification evidence",
      visualLanguage: mode === "create" ? "Taste-led within project constraints" : `${mode} the established project language`,
    },
    dials: modeDefaults,
    verification,
    needsClarification: policy?.needsClarification === true,
    clarificationQuestion: policy?.needsClarification
      ? "Should this frontend preserve an existing visual system, evolve the current style, or establish a new direction?"
      : null,
  };
}
