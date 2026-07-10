import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TEXT_EXTENSIONS = new Set([".md", ".markdown", ".txt", ".csv"]);
const IGNORE_NAMES = new Set([".git", ".planning", "node_modules", "dist", "build", "coverage"]);

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function walkTextFiles(root, files = []) {
  if (!fs.existsSync(root)) return files;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (IGNORE_NAMES.has(entry.name) || entry.name === ".DS_Store") continue;
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) walkTextFiles(entryPath, files);
    else if (entry.isFile() && TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(entryPath);
  }
  return files;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function languageForLine(line) {
  if (/[\u3040-\u30ff]/u.test(line)) return "ja";
  if (/[\u3400-\u9fff]/u.test(line)) return "zh";
  return "en";
}

function normalizeWordlist(data) {
  const result = { en: [], ja: [], zh: [] };
  for (const language of Object.keys(result)) {
    const entries = data?.languages?.[language]?.ambiguous || [];
    for (const entry of entries) {
      const term = typeof entry === "string" ? entry : entry?.term;
      if (!term) continue;
      result[language].push({
        term: String(term),
        category: typeof entry === "string" ? "project" : entry.category || "project",
      });
    }
  }
  return result;
}

export function loadAmbiguityWordlists(target) {
  const basePath = path.join(kitRoot, "ambiguity-wordlists.json");
  const extensionPath = path.join(target, ".planning", "knowledge", "ambiguity-wordlists.json");
  const base = normalizeWordlist(readJson(basePath));
  const extension = normalizeWordlist(readJson(extensionPath));
  const merged = {};
  for (const language of ["en", "ja", "zh"]) {
    const byTerm = new Map();
    for (const entry of [...base[language], ...extension[language]]) byTerm.set(entry.term.toLowerCase(), entry);
    merged[language] = [...byTerm.values()];
  }
  return { basePath, extensionPath, merged, extensionLoaded: fs.existsSync(extensionPath) };
}

function ambiguitySourceFiles(target) {
  const extractedDir = path.join(target, ".planning", "knowledge", "extracted");
  const extracted = walkTextFiles(extractedDir);
  if (extracted.length > 0) return extracted;
  return ["docs", "documents", "仕様書"]
    .flatMap((name) => walkTextFiles(path.join(target, name)))
    .sort();
}

function countTerm(line, term, language) {
  const flags = language === "en" ? "giu" : "gu";
  const body = escapeRegex(term).replace(/\\ /g, "\\s+");
  const pattern = language === "en"
    ? new RegExp(`(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])`, flags)
    : new RegExp(body, flags);
  return [...line.matchAll(pattern)].length;
}

export function runAmbiguityAudit(target, options = {}) {
  const generatedAt = new Date().toISOString();
  const wordlists = loadAmbiguityWordlists(target);
  const files = ambiguitySourceFiles(target);
  const records = [];
  let scannedLines = 0;
  for (const filePath of files) {
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!line.trim()) return;
      scannedLines += 1;
      const language = languageForLine(line);
      for (const entry of wordlists.merged[language]) {
        const count = countTerm(line, entry.term, language);
        if (count === 0) continue;
        records.push({
          path: path.relative(target, filePath),
          line: index + 1,
          language,
          term: entry.term,
          category: entry.category,
          count,
          excerpt: line.trim().slice(0, 240),
        });
      }
    });
  }
  const ambiguityHits = records.reduce((sum, record) => sum + record.count, 0);
  const strict = Boolean(options.strict);
  const status = ambiguityHits === 0 ? "PASS" : strict ? "FAIL" : "WAIVED_WITH_RISK";
  const result = {
    generatedAt,
    status,
    blocking: strict && ambiguityHits > 0,
    strict,
    files_scanned: files.length,
    lines_scanned: scannedLines,
    ambiguity_hits: ambiguityHits,
    ambiguity_density: scannedLines > 0 ? Number((ambiguityHits / scannedLines).toFixed(6)) : 0,
    records,
    wordlists: {
      base: path.relative(target, wordlists.basePath),
      extension: ".planning/knowledge/ambiguity-wordlists.json",
      extension_loaded: wordlists.extensionLoaded,
    },
    heavyRefreshExecuted: false,
  };
  const qualityDir = path.join(target, ".planning", "quality");
  const jsonPath = path.join(qualityDir, "AMBIGUITY_AUDIT.json");
  const mdPath = path.join(qualityDir, "AMBIGUITY_AUDIT.md");
  writeJson(jsonPath, result);
  const markdown = `# Ambiguity Audit\n\nGenerated: ${generatedAt}\n\n## Summary\n\n- Status: ${status}\n- Blocking: ${result.blocking ? "yes" : "no"}\n- Files scanned: ${files.length}\n- Lines scanned: ${scannedLines}\n- Ambiguity hits: ${ambiguityHits}\n- Ambiguity density: ${result.ambiguity_density}\n- Project wordlist extension: ${wordlists.extensionLoaded ? "loaded" : "not present"}\n- Heavy refresh executed: no\n\n## Findings\n\n${records.length ? records.map((record) => `- \`${record.path}:${record.line}\` [${record.language}/${record.category}] \`${record.term}\` x${record.count} - ${record.excerpt}`).join("\n") : "No ambiguous terms found."}\n\n## Rule\n\n- Reference mode reports findings without blocking.\n- Strict mode returns a blocking failure when findings exist.\n- Normative words such as \`shall\`, \`must\`, \`应\`, \`应该\`, \`必须\`, and \`不得\` are not ambiguity terms.\n`;
  fs.mkdirSync(qualityDir, { recursive: true });
  fs.writeFileSync(mdPath, markdown);
  return { ...result, jsonPath, mdPath };
}

function validObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

const STRUCTURE_CONTRACTS = [
  {
    id: "document-index",
    path: ".planning/knowledge/DOCUMENT_INDEX.json",
    validate: (value) => validObject(value) && Array.isArray(value.documents),
    expected: "object with documents[]",
  },
  {
    id: "answer-audit",
    path: ".planning/quality/ANSWER_AUDIT.json",
    validate: (value) => validObject(value) && typeof value.status === "string" && Array.isArray(value.citations),
    expected: "object with status and citations[]",
  },
  {
    id: "ambiguity-audit",
    path: ".planning/quality/AMBIGUITY_AUDIT.json",
    validate: (value) => validObject(value) && typeof value.status === "string" && Number.isFinite(value.ambiguity_hits) && Array.isArray(value.records),
    expected: "object with status, ambiguity_hits, and records[]",
  },
  {
    id: "trace-matrix",
    path: ".planning/trace/TRACE_MATRIX.json",
    validate: (value) => validObject(value) && Array.isArray(value.rows) && validObject(value.summary),
    expected: "object with rows[] and summary",
  },
  {
    id: "refresh-state",
    path: ".planning/refresh/REFRESH_STATE.json",
    validate: (value) => validObject(value) && Number.isFinite(value.version) && Object.hasOwn(value, "rag") && Object.hasOwn(value, "graph"),
    expected: "object with version, rag, and graph",
  },
];

export function runStructureAudit(target, options = {}) {
  const generatedAt = new Date().toISOString();
  const records = STRUCTURE_CONTRACTS.map((contract) => {
    const filePath = path.join(target, contract.path);
    const exists = fs.existsSync(filePath);
    const value = exists ? readJson(filePath) : null;
    const valid = exists && contract.validate(value);
    return {
      id: contract.id,
      path: contract.path,
      exists,
      valid,
      status: valid ? "PASS" : "FAIL",
      detail: !exists ? "missing" : value == null ? "invalid JSON" : `schema mismatch; expected ${contract.expected}`,
    };
  });
  const passed = records.filter((record) => record.valid).length;
  const structureComplianceRate = Number((passed / records.length).toFixed(4));
  const strict = Boolean(options.strict);
  const status = passed === records.length ? "PASS" : strict ? "FAIL" : "WAIVED_WITH_RISK";
  const result = {
    generatedAt,
    status,
    blocking: strict && passed !== records.length,
    strict,
    structure_compliance_rate: structureComplianceRate,
    passed,
    total: records.length,
    records,
    heavyRefreshExecuted: false,
  };
  const qualityDir = path.join(target, ".planning", "quality");
  const jsonPath = path.join(qualityDir, "STRUCTURE_AUDIT.json");
  const mdPath = path.join(qualityDir, "STRUCTURE_AUDIT.md");
  writeJson(jsonPath, result);
  const markdown = `# Structure Audit\n\nGenerated: ${generatedAt}\n\n## Summary\n\n- Status: ${status}\n- Blocking: ${result.blocking ? "yes" : "no"}\n- Structure compliance rate: ${structureComplianceRate}\n- Passed: ${passed} / ${records.length}\n- Heavy refresh executed: no\n\n## Artifact Contracts\n\n| Artifact | Status | Detail |\n| --- | --- | --- |\n${records.map((record) => `| \`${record.path}\` | ${record.status} | ${record.valid ? "valid" : record.detail} |`).join("\n")}\n\n## Rule\n\nThe audit checks deterministic mini-schema contracts only. It does not call an LLM and adds no runtime dependency.\n`;
  fs.mkdirSync(qualityDir, { recursive: true });
  fs.writeFileSync(mdPath, markdown);
  return { ...result, jsonPath, mdPath };
}

function sourceTextForCitations(target, citations) {
  return citations
    .filter((citation) => citation.exists && citation.sourcePath)
    .map((citation) => {
      const filePath = path.join(target, citation.sourcePath);
      if (!fs.existsSync(filePath) || !TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())) return "";
      return fs.readFileSync(filePath, "utf8");
    })
    .join("\n");
}

function normalizedNumbers(text) {
  const withoutCitations = String(text || "")
    .replace(/[\w./\-぀-ヿ㐀-鿿]+\.(?:md|markdown|txt|csv|pdf|docx|xlsx):\d+/giu, " ")
    .replace(/\d{4}-\d{2}-\d{2}T\S+/g, " ");
  return [...withoutCitations.matchAll(/(?<![\p{L}\p{N}])\d[\d,]*(?:\.\d+)?%?(?![\p{L}\p{N}])/gu)]
    .map((match) => match[0].replace(/,/g, ""));
}

function claimSentences(text) {
  return String(text || "")
    .split(/(?<=[。！？.!?])\s+|\r?\n/u)
    .map((line) => line.replace(/^[-*#>\s]+/, "").trim())
    .filter((line) => line.length >= 12)
    .filter((line) => !/^(Generated|Status|Profile|Source|Backend|Matches|Heavy refresh|Next Command|Answer Audit)/i.test(line))
    .filter((line) => !/^zl[-\s]/i.test(line));
}

function tokenSet(text) {
  return new Set((String(text || "").toLowerCase().match(/[a-z0-9_]+|[\u3040-\u30ff]|[\u3400-\u9fff]/gu) || []).filter((token) => token.length > 1 || /[\u3040-\u9fff]/u.test(token)));
}

function overlapRatio(sentence, sourceTokens) {
  const tokens = [...tokenSet(sentence)];
  if (tokens.length === 0) return 0;
  return tokens.filter((token) => sourceTokens.has(token)).length / tokens.length;
}

export function measureAnswerGrounding(target, text, citations) {
  const resolved = citations.filter((citation) => citation.exists && citation.lineValid !== false).length;
  const citationResolveRate = citations.length > 0 ? Number((resolved / citations.length).toFixed(4)) : 0;
  const sourceText = sourceTextForCitations(target, citations);
  const sourceNumbers = new Set(normalizedNumbers(sourceText));
  const answerNumbers = normalizedNumbers(text);
  const driftValues = [...new Set(answerNumbers.filter((value) => !sourceNumbers.has(value)))];
  const sentences = claimSentences(text);
  const sourceTokens = tokenSet(sourceText);
  const unsupported = sentences.filter((sentence) => {
    const directlyCited = citations.some((citation) => sentence.includes(citation.sourcePath));
    return !directlyCited && overlapRatio(sentence, sourceTokens) < 0.34;
  });
  return {
    citation_resolve_rate: citationResolveRate,
    value_drift_count: driftValues.length,
    value_drift_values: driftValues,
    unsupported_sentence_ratio: sentences.length > 0 ? Number((unsupported.length / sentences.length).toFixed(4)) : 0,
    claim_sentences: sentences.length,
    unsupported_sentences: unsupported,
    method: "deterministic citation resolution + numeric comparison + lexical overlap",
  };
}
