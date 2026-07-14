import path from "node:path";
import { RAG_BACKENDS } from "../project/policy-config.mjs";

export const COMMAND_ALIASES = new Map([
  ["zl-init", ["init"]],
  ["zl-verify", ["verify"]],
  ["zl-map", ["map"]],
  ["zl-codebase", ["codebase", "scan"]],
  ["zl-codebase-scan", ["codebase", "scan"]],
  ["zl-codebase-status", ["codebase", "status"]],
  ["zl-docs-scan", ["docs", "scan"]],
  ["zl-docs-status", ["docs", "status"]],
  ["zl-docs-normalize", ["docs", "normalize"]],
  ["zl-docs-extract", ["docs", "extract"]],
  ["zl-docs-diff", ["docs", "diff"]],
  ["zl-docs-citations", ["docs", "citations"]],
  ["zl-docs-index", ["docs", "index"]],
  ["zl-docs-query", ["docs", "query"]],
  ["zl-docs-sync", ["docs", "sync"]],
  ["zl-ambiguity-audit", ["ambiguity", "audit"]],
  ["zl-structure-audit", ["structure", "audit"]],
  ["zl-answer-audit", ["answer", "audit"]],
  ["zl-rag-init-local", ["rag", "init-local"]],
  ["zl-rag-golden-add", ["rag", "golden-add"]],
  ["zl-rag-golden-run", ["rag", "golden-run"]],
  ["zl-rag-eval", ["rag", "eval"]],
  ["zl-preflight", ["preflight"]],
  ["zl-refresh-plan", ["refresh", "plan"]],
  ["zl-refresh-run", ["refresh", "run"]],
  ["zl-mode-status", ["mode", "status"]],
  ["zl-mode-set", ["mode", "set"]],
  ["zl-citation-audit", ["docs", "citation-audit"]],
  ["zl-trace-build", ["trace", "build"]],
  ["zl-trace-query", ["trace", "query"]],
  ["zl-trace-audit", ["trace", "audit"]],
  ["zl-policy-list", ["policy", "list"]],
  ["zl-policy-check", ["policy", "check"]],
  ["zl-policy-explain", ["policy", "explain"]],
  ["zl-policy-lock", ["policy", "lock"]],
  ["zl-policy-verify", ["policy", "verify"]],
  ["zl-policy-diff", ["policy", "diff"]],
  ["zl-help-skills", ["help", "skills"]],
  ["zl-next", ["next"]],
  ["zl-privacy-audit", ["privacy", "audit"]],
  ["zl-offline-lock", ["privacy", "offline-lock"]],
  ["zl-outbound-audit", ["privacy", "outbound"]],
  ["zl-license-audit", ["license", "audit"]],
  ["zl-graph-build", ["graph", "build"]],
  ["zl-graph-status", ["graph", "status"]],
  ["zl-graph-query", ["graph", "query"]],
  ["zl-graph-diff", ["graph", "diff"]],
  ["zl-graph-impact", ["graph", "impact"]],
  ["zl-graph-risk", ["graph", "risk"]],
  ["zl-graph-freshness", ["graph", "freshness"]],
  ["zl-evidence-record", ["evidence", "record"]],
  ["zl-evidence-status", ["evidence", "status"]],
  ["zl-runtime-install", ["runtime", "install"]],
  ["zl-runtime-status", ["runtime", "status"]],
  ["zl-context-debug", ["context", "debug"]],
  ["zl-context-execute", ["context", "execute"]],
  ["zl-new-milestone", ["workflow", "run", "new-milestone"]],
  ["zl-spec-phase", ["workflow", "run", "spec-phase"]],
  ["zl-discuss-phase", ["workflow", "run", "discuss-phase"]],
  ["zl-ui-phase", ["workflow", "run", "ui-phase"]],
  ["zl-debug", ["workflow", "run", "debug"]],
  ["zl-plan-phase", ["workflow", "run", "plan-phase"]],
  ["zl-execute-phase", ["workflow", "run", "execute-phase"]],
  ["zl-code-review", ["workflow", "run", "code-review"]],
  ["zl-verify-work", ["workflow", "run", "verify-work"]],
  ["zl-complete-milestone", ["workflow", "run", "complete-milestone"]],
  ["zl-workflow-run", ["workflow", "run"]],
  ["zl-workflow-status", ["workflow", "status"]],
  ["zl-workflow-continue", ["workflow", "continue"]],
  ["zl-workflow-audit", ["workflow", "audit"]],
  ["zl-gate-check", ["workflow", "gate-check"]],
  ["zl-completion-check", ["workflow", "completion-check"]],
  ["zl-cockpit-build", ["cockpit", "build"]],
]);

const BOOLEAN_FLAGS = new Set([
  "details",
  "dry-run",
  "force",
  "all",
  "graph",
  "json",
  "quiet",
  "no-color",
  "index",
  "rag",
  "run",
  "save-baseline",
  "verbose",
  "explain",
  "strict",
  "allow-external-rag",
  "accept-completion",
  "interactive",
  "no-interactive",
]);

export function normalizeArgv(argv, executablePath = process.argv[1]) {
  const executable = path.basename(executablePath || "");
  const alias = COMMAND_ALIASES.get(executable);
  return alias ? [...alias, ...argv] : [...argv];
}

export function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command, _: [] };
  for (let i = 0; i < rest.length; i += 1) {
    const item = rest[i];
    if (!item.startsWith("--")) {
      args._.push(item);
      continue;
    }
    const key = item.slice(2);
    const targetKey = key === "command" ? "recordCommand" : key;
    const next = rest[i + 1];
    if (key === "rag" && next && !next.startsWith("--") && RAG_BACKENDS.has(next.trim().toLowerCase())) {
      args[targetKey] = next;
      i += 1;
      continue;
    }
    if (BOOLEAN_FLAGS.has(key) || !next || next.startsWith("--")) {
      args[targetKey] = true;
    } else {
      args[targetKey] = next;
      i += 1;
    }
  }
  return args;
}
