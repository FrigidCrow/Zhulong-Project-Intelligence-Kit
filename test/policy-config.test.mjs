import assert from "node:assert/strict";
import test from "node:test";
import {
  applyProjectPolicyToConfig,
  documentPolicyFromProfile,
  inferRagBackend,
  normalizeDocumentPolicy,
  normalizeProfileName,
  normalizeRagBackend,
} from "../src/project/policy-config.mjs";

test("normalizes document, profile, and RAG aliases", () => {
  assert.equal(normalizeDocumentPolicy("docs-strict"), "strict");
  assert.equal(normalizeDocumentPolicy("graph-lite"), "reference");
  assert.equal(normalizeProfileName("docs-reference"), "graph-lite");
  assert.equal(documentPolicyFromProfile("full-strict"), "strict");
  assert.equal(normalizeRagBackend("LOCAL"), "local");
  assert.equal(normalizeRagBackend("invalid"), "none");
});

test("rag none disables model-backed document context", () => {
  const result = applyProjectPolicyToConfig({}, { documentPolicy: "reference", ragBackend: "none" });
  assert.equal(result.profileName, "graph-lite");
  assert.equal(result.config.spec_context.enabled, false);
  assert.equal(result.config.spec_context.provider, "none");
  assert.equal(result.config.graphrag.enabled, false);
  assert.equal(result.config.graphrag.mode, "none");
  assert.equal(result.config.privacy.network_policy, "local_only");
});

test("strict local enables local GraphRAG without an external opt-in", () => {
  const result = applyProjectPolicyToConfig({}, { documentPolicy: "strict", ragBackend: "local" });
  assert.equal(result.profileName, "full-strict");
  assert.equal(result.config.spec_context.require_citations, true);
  assert.equal(result.config.graphrag.mode, "local");
  assert.equal(result.config.graphrag.requires_api_key, false);
  assert.equal(result.config.privacy.allow_external_rag, false);
});

test("external RAG is explicit in policy state", () => {
  const result = applyProjectPolicyToConfig({}, { documentPolicy: "strict", ragBackend: "external" });
  assert.equal(result.config.graphrag.mode, "external");
  assert.equal(result.config.graphrag.requires_api_key, true);
  assert.equal(result.config.privacy.network_policy, "external_rag_opt_in");
  assert.equal(result.config.privacy.allow_external_rag, true);
});

test("infers backend from explicit and legacy config shapes", () => {
  assert.equal(inferRagBackend({ rag_backend: "none" }, "full-strict"), "none");
  assert.equal(inferRagBackend({ graphrag: { enabled: true, mode: "local" } }), "local");
  assert.equal(inferRagBackend({ spec_context: { enabled: true, provider: "graphrag-external" } }), "external");
});
