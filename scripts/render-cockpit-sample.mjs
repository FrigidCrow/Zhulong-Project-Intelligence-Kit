import fs from "node:fs";
import path from "node:path";
import { kitRoot } from "./quality-utils.mjs";

const templatePath = path.join(kitRoot, "templates", "cockpit", "index.template.html");
const sampleDataPath = path.join(kitRoot, "templates", "cockpit", "sample-data.json");
const sampleHtmlPath = path.join(kitRoot, "templates", "cockpit", "sample.html");

function jsonForHtmlScript(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

const template = fs.readFileSync(templatePath, "utf8");
const sampleData = JSON.parse(fs.readFileSync(sampleDataPath, "utf8"));

function artifactGroup(id, label, artifacts) {
  return {
    id,
    label,
    rows: Object.entries(artifacts || {}).map(([key, artifact]) => ({
      key,
      path: artifact?.exists ? artifact.path : `${artifact?.path || "missing"} (missing)`,
      exists: Boolean(artifact?.exists),
      status: artifact?.exists ? artifact.status || "present" : artifact?.status || "missing",
      summary: artifact?.summary || artifact?.data?.status || "",
    })),
  };
}

function evidenceStep(id, label, status, detail, artifact) {
  return {
    id,
    label,
    status,
    detail,
    path: artifact?.path || "",
    exists: Boolean(artifact?.exists),
    summary: artifact?.summary || "",
  };
}

function buildSampleViewModel(data) {
  const graph = data.graphify.preview;
  return {
    version: "cockpit-viewmodel.v1",
    summary: [
      { id: "graphify", label: "Graphify Impact", status: data.graphify.status, detail: `${graph.totalNodes} nodes / ${graph.totalEdges} edges / ${graph.mode || "node"}` },
      { id: "knowledge", label: "Knowledge Evidence", status: data.rag.status, detail: "docs / citation / RAG / answer audit" },
      { id: "workflow", label: "Workflow", status: data.workflow.status, detail: `${data.workflow.states.length} workflow states` },
      { id: "privacy", label: "Privacy", status: data.privacy.status, detail: "local-only / offline lock" },
    ],
    impactGraph: {
      ...graph,
      mode: graph.mode || "node",
    },
    evidenceChain: [
      evidenceStep("docs", "Docs", "PASS", "docs sync", data.rag.artifacts.docsSync),
      evidenceStep("citation", "Citation", "PASS", "source check", data.rag.artifacts.citationAudit),
      evidenceStep("rag", "RAG Query", "PASS", "retrieval", data.rag.artifacts.ragQuery),
      evidenceStep("answer", "Answer Audit", "PASS", "claim support", data.rag.artifacts.answerAudit),
      evidenceStep("evidence", "Evidence", "PASS", "writeback", data.workflow.evidenceIndex),
    ],
    workflowRows: data.workflow.states.map((item) => ({
      id: item.data.id,
      workflow: item.data.workflow,
      status: item.data.status,
      path: item.path,
    })),
    artifactGroups: [
      artifactGroup("graphify", "Graphify Artifacts", data.graphify.artifacts),
      artifactGroup("rag", "GraphRAG / RAG", data.rag.artifacts),
      artifactGroup("quality", "Quality Closure", data.quality.artifacts),
      artifactGroup("privacy", "Privacy", data.privacy.artifacts),
    ],
    issues: data.issues,
    nextCommands: data.nextCommands,
  };
}

if (!sampleData.viewModel) {
  sampleData.viewModel = buildSampleViewModel(sampleData);
}

const html = template.replace("__AI_PIKIT_COCKPIT_DATA__", jsonForHtmlScript(sampleData));

if (html.includes("__AI_PIKIT_COCKPIT_DATA__")) {
  throw new Error("Cockpit sample placeholder was not replaced.");
}

fs.writeFileSync(sampleHtmlPath, html);
console.log(`cockpit sample rendered ${path.relative(kitRoot, sampleHtmlPath)}`);
