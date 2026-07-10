export const DEFAULT_DOC_SOURCE_PATHS = ["docs", "documents", "仕様書"];
export const DEFAULT_DOC_EXTENSIONS = [".md", ".markdown", ".txt", ".csv", ".pdf", ".docx", ".xlsx"];
export const DEFAULT_DOCUMENT_POLICY = "reference";
export const DEFAULT_RAG_BACKEND = "none";
export const DEFAULT_LOCAL_LLM_MODEL = "qwen2.5:7b";
export const DEFAULT_LOCAL_EMBEDDING_MODEL = "bge-m3";
export const DOCUMENT_POLICIES = new Set(["reference", "strict"]);
export const RAG_BACKENDS = new Set(["none", "local", "external"]);

const DOCUMENT_POLICY_ALIASES = {
  "docs-reference": "reference",
  "doc-reference": "reference",
  reference: "reference",
  "graph-lite": "reference",
  "docs-strict": "strict",
  "doc-strict": "strict",
  strict: "strict",
  "full-strict": "strict",
};

const PROFILE_ALIASES = {
  reference: "graph-lite",
  "docs-reference": "graph-lite",
  "doc-reference": "graph-lite",
  "graph-lite": "graph-lite",
  strict: "full-strict",
  "docs-strict": "full-strict",
  "doc-strict": "full-strict",
  "full-strict": "full-strict",
  "default-local-rag": "default-local-rag",
};

export const REFRESH_PROFILES = {
  "default-local-rag": {
    label: "Default Local RAG",
    documentPolicy: "reference",
    defaultRagBackend: "local",
    ragRequired: true,
    graphRequired: true,
    strict: false,
    description: "默认模式：使用本地 GraphRAG 和 Graphify，但只提醒 stale，不自动重建。",
  },
  "graph-lite": {
    label: "Graph Lite",
    documentPolicy: "reference",
    defaultRagBackend: "none",
    ragRequired: false,
    graphRequired: true,
    strict: false,
    description: "轻量模式：Zhulong + Graphify/codebase 优先，文档/RAG 可缺省并标记风险。",
  },
  "full-strict": {
    label: "Full Strict",
    documentPolicy: "strict",
    defaultRagBackend: "local",
    ragRequired: true,
    graphRequired: true,
    strict: true,
    description: "严格模式：文档/RAG 和 Graphify stale 都会让 preflight strict 失败。",
  },
};

export function normalizeDocumentPolicy(value, fallback = DEFAULT_DOCUMENT_POLICY) {
  const key = String(value || "").trim().toLowerCase();
  if (DOCUMENT_POLICY_ALIASES[key]) return DOCUMENT_POLICY_ALIASES[key];
  if (DOCUMENT_POLICIES.has(key)) return key;
  return fallback;
}

export function normalizeRagBackend(value, fallback = DEFAULT_RAG_BACKEND) {
  const key = String(value || "").trim().toLowerCase();
  return RAG_BACKENDS.has(key) ? key : fallback;
}

export function normalizeProfileName(value, fallback = null) {
  const key = String(value || "").trim().toLowerCase();
  return PROFILE_ALIASES[key] || (REFRESH_PROFILES[key] ? key : fallback);
}

export function profileNameForDocumentPolicy(policy) {
  return normalizeDocumentPolicy(policy) === "strict" ? "full-strict" : "graph-lite";
}

export function documentPolicyFromProfile(profileName) {
  const normalized = normalizeProfileName(profileName, "graph-lite");
  return REFRESH_PROFILES[normalized]?.documentPolicy || DEFAULT_DOCUMENT_POLICY;
}

export function inferRagBackend(config, profileName = null) {
  if (config.graphrag?.enabled === true) {
    if (config.graphrag?.mode === "external" || config.spec_context?.provider === "graphrag-external") return "external";
    return "local";
  }
  if (config.rag_backend) return normalizeRagBackend(config.rag_backend);
  if (config.spec_context?.enabled === true && /rag/i.test(String(config.spec_context?.provider || ""))) {
    return config.spec_context.provider === "graphrag-external" ? "external" : "local";
  }
  const profile = REFRESH_PROFILES[normalizeProfileName(profileName, "graph-lite")];
  return profile?.defaultRagBackend || DEFAULT_RAG_BACKEND;
}

export function applyProjectPolicyToConfig(config, options = {}) {
  const documentPolicy = normalizeDocumentPolicy(options.documentPolicy || config.document_policy);
  const ragBackend = normalizeRagBackend(options.ragBackend || config.rag_backend);
  const profileName = normalizeProfileName(options.profile, profileNameForDocumentPolicy(documentPolicy));
  const localModel = options.model || config.graphrag?.llm_model || process.env.ZHULONG_LOCAL_LLM_MODEL || DEFAULT_LOCAL_LLM_MODEL;
  const localEmbedding = options.embedding || config.graphrag?.embedding_model || process.env.ZHULONG_LOCAL_EMBEDDING_MODEL || DEFAULT_LOCAL_EMBEDDING_MODEL;

  config.document_policy = documentPolicy;
  config.rag_backend = ragBackend;
  config.execution_budget = {
    ...(config.execution_budget || {}),
    profile: profileName,
    document_policy: documentPolicy,
    rag_backend: ragBackend,
    heavy_refresh: "explicit_or_policy",
    auto_refresh: false,
    refresh_state_path: ".planning/refresh/REFRESH_STATE.json",
    warn_on_unrelated_commit_distance: true,
    note: "Ordinary workflow commands must not auto-run GraphRAG index, Graphify build, or refresh-run.",
  };

  config.privacy = {
    ...(config.privacy || {}),
    network_policy: ragBackend === "external" ? "external_rag_opt_in" : "local_only",
    allow_external_rag: ragBackend === "external",
    allow_external_tools: false,
    allowed_hosts: ["127.0.0.1", "localhost"],
    forbidden_env_keys: [
      "GRAPHRAG_API_KEY",
      "OPENAI_API_KEY",
      "AZURE_OPENAI_API_KEY",
      "DEEPSEEK_API_KEY",
      "ANTHROPIC_API_KEY",
      "GEMINI_API_KEY",
    ],
  };

  const baseSpec = {
    ...(config.spec_context || {}),
    source_paths: Array.isArray(config.spec_context?.source_paths) ? config.spec_context.source_paths : DEFAULT_DOC_SOURCE_PATHS,
    scan_extensions: Array.isArray(config.spec_context?.scan_extensions) ? config.spec_context.scan_extensions : DEFAULT_DOC_EXTENSIONS,
    require_citations: documentPolicy === "strict",
  };

  if (ragBackend === "none") {
    config.spec_context = {
      ...baseSpec,
      enabled: false,
      provider: "none",
      index_command: "",
      query_command: "",
    };
    config.graphrag = {
      ...(config.graphrag || {}),
      enabled: false,
      mode: "none",
      profile: "disabled",
      requires_api_key: false,
      root: "graphrag-workspace",
      llm_provider: "none",
      llm_model: localModel,
      embedding_provider: "none",
      embedding_model: localEmbedding,
      api_base: "",
      vector_store: "none",
      index_command: "",
      local_query_command: "",
    };
  } else if (ragBackend === "local") {
    config.spec_context = {
      ...baseSpec,
      enabled: true,
      provider: "graphrag-local",
      index_command: "graphrag index --root graphrag-workspace --method fast",
      query_command: "graphrag query --root graphrag-workspace --method basic --response-type \"List of 8 concise points with data references\" {query}",
    };
    config.graphrag = {
      ...(config.graphrag || {}),
      enabled: true,
      mode: "local",
      profile: "local_basic",
      requires_api_key: false,
      root: "graphrag-workspace",
      llm_provider: "ollama",
      llm_model: localModel,
      embedding_provider: "ollama",
      embedding_model: localEmbedding,
      api_base: "http://127.0.0.1:11434",
      vector_store: "lancedb",
      index_command: "graphrag index --root graphrag-workspace --method fast",
      local_query_command: "graphrag query --root graphrag-workspace --method basic --response-type \"List of 8 concise points with data references\" {query}",
    };
  } else {
    config.spec_context = {
      ...baseSpec,
      enabled: true,
      provider: "graphrag-external",
      index_command: config.spec_context?.index_command || "",
      query_command: config.spec_context?.query_command || "",
    };
    config.graphrag = {
      ...(config.graphrag || {}),
      enabled: true,
      mode: "external",
      profile: "external_opt_in",
      requires_api_key: true,
      root: "graphrag-workspace",
      llm_provider: config.graphrag?.llm_provider || "external-provider",
      llm_model: config.graphrag?.llm_model || "",
      embedding_provider: config.graphrag?.embedding_provider || "external-provider",
      embedding_model: config.graphrag?.embedding_model || "",
      api_base: config.graphrag?.api_base || "",
      vector_store: config.graphrag?.vector_store || "",
      index_command: config.graphrag?.index_command || "",
      local_query_command: config.graphrag?.local_query_command || "",
    };
  }

  return { config, documentPolicy, ragBackend, profileName, localModel, localEmbedding };
}
