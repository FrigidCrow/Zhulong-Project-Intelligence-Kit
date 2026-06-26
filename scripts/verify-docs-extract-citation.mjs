import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {
  kitRoot,
  runCommand,
  shellQuote,
  summarizeIssues,
  tempRoot,
  writeJsonReport,
  writeMarkdownReport,
} from "./quality-utils.mjs";

const pikCli = path.join(kitRoot, "bin", "pik.mjs");
const workRoot = tempRoot("aipikit-docs-extract-");
const projectRoot = path.join(workRoot, "project");
const issues = [];
const evidence = [];

function write(filePath, textOrBuffer) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, textOrBuffer);
}

function addIssue(label, detail) {
  issues.push({ label, detail });
}

function assertIncludes(label, text, expected) {
  if (!text.includes(expected)) addIssue(label, `missing expected text: ${expected}`);
  else evidence.push(`${label}: found ${expected}`);
}

function assertFileIncludes(label, filePath, expected) {
  if (!fs.existsSync(filePath)) {
    addIssue(label, `missing file: ${path.relative(projectRoot, filePath)}`);
    return;
  }
  assertIncludes(label, fs.readFileSync(filePath, "utf8"), expected);
}

function pik(args, options = {}) {
  return runCommand(`pik ${args.join(" ")}`, "node", [pikCli, ...args], {
    cwd: projectRoot,
    timeout: 120000,
    ...options,
  });
}

function zipDateTime() {
  return { time: 0, date: 0 };
}

function makeZip(entries) {
  const fileParts = [];
  const centralParts = [];
  let offset = 0;
  const { time, date } = zipDateTime();
  for (const [name, content] of Object.entries(entries)) {
    const nameBuffer = Buffer.from(name);
    const input = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const compressed = zlib.deflateRawSync(input);
    const crc = crc32(input);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(input.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    fileParts.push(local, nameBuffer, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(input.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + compressed.length;
  }
  const centralOffset = offset;
  const centralSize = Buffer.concat(centralParts).length;
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(Object.keys(entries).length, 8);
  eocd.writeUInt16LE(Object.keys(entries).length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...fileParts, ...centralParts, eocd]);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

fs.mkdirSync(projectRoot, { recursive: true });
write(path.join(projectRoot, "src", "index.js"), "export const docsExtractFixture = true;\n");
write(path.join(projectRoot, "docs", "specs", "md.md"), "# MD Spec\n\nMD_SENTINEL_2101 approval amount.\n");
write(path.join(projectRoot, "documents", "minutes.txt"), "TXT_SENTINEL_2102 meeting note.\n");
write(path.join(projectRoot, "仕様書", "table.csv"), "key,value\nCSV_SENTINEL_2103,承認\n");
write(path.join(projectRoot, "docs", "pdf-spec.pdf"), Buffer.from("%PDF-1.4\n1 0 obj <<>>\nstream\nBT /F1 12 Tf 72 720 Td (PDF_SENTINEL_2104 local pdf) Tj ET\nendstream\nendobj\n%%EOF\n"));
write(path.join(projectRoot, "documents", "word.docx"), makeZip({
  "[Content_Types].xml": "<Types></Types>",
  "word/document.xml": "<w:document><w:body><w:p><w:r><w:t>DOCX_SENTINEL_2105 local word</w:t></w:r></w:p></w:body></w:document>",
}));
write(path.join(projectRoot, "documents", "book.xlsx"), makeZip({
  "[Content_Types].xml": "<Types></Types>",
  "xl/sharedStrings.xml": "<sst><si><t>XLSX_SENTINEL_2106</t></si><si><t>local sheet</t></si></sst>",
  "xl/worksheets/sheet1.xml": "<worksheet><sheetData><row><c t=\"s\"><v>0</v></c><c t=\"s\"><v>1</v></c></row></sheetData></worksheet>",
}));

pik(["init", "--target", projectRoot, "--template", "greenfield-app", "--name", "docs_extract_fixture", "--mode", "new", "--force"]);
const extract = pik(["docs", "extract", "--target", projectRoot]);
assertIncludes("pik docs extract", extract.output, "extracted 6");
assertFileIncludes("DOCUMENT_EXTRACT_REPORT", path.join(projectRoot, ".planning", "knowledge", "DOCUMENT_EXTRACT_REPORT.md"), "docx-zip-xml");
assertFileIncludes("DOCUMENT_EXTRACT_REPORT", path.join(projectRoot, ".planning", "knowledge", "DOCUMENT_EXTRACT_REPORT.md"), "xlsx-zip-xml");
assertFileIncludes("DOCUMENT_INDEX", path.join(projectRoot, ".planning", "knowledge", "DOCUMENT_INDEX.json"), "word.docx");

for (const sentinel of ["MD_SENTINEL_2101", "TXT_SENTINEL_2102", "CSV_SENTINEL_2103", "PDF_SENTINEL_2104", "DOCX_SENTINEL_2105", "XLSX_SENTINEL_2106"]) {
  const result = pik(["docs", "citations", "--target", projectRoot, sentinel]);
  assertIncludes(`pik docs citations ${sentinel}`, result.output, sentinel);
}
assertFileIncludes("CITATIONS", path.join(projectRoot, ".planning", "knowledge", "CITATIONS.md"), "XLSX_SENTINEL_2106");

write(path.join(projectRoot, "docs", "specs", "md.md"), "# MD Spec\n\nMD_SENTINEL_2101 approval amount changed.\nDOC_DIFF_SENTINEL_2199\n");
const diff = pik(["docs", "diff", "--target", projectRoot]);
assertIncludes("pik docs diff", diff.output, "modified 1");
assertFileIncludes("DOCUMENT_DIFF", path.join(projectRoot, ".planning", "knowledge", "DOCUMENT_DIFF.md"), "md.md");

const data = {
  generated: new Date().toISOString(),
  status: issues.length === 0 ? "PASS" : "FAIL",
  workRoot,
  projectRoot,
  evidence,
  issues,
};

writeJsonReport("docs-extract-citation-check.json", data);
writeMarkdownReport("docs-extract-citation-check.md", "AI-PIKit Document Extraction and Citation Verification", summarizeIssues(issues), [
  { title: "Evidence", body: evidence.length ? evidence.map((item) => `- ${item}`) : ["No evidence recorded."] },
  {
    title: "Fixture Paths",
    body: [
      `- Work root: \`${workRoot}\``,
      `- Project root: \`${projectRoot}\``,
      `- Reproduce command: \`node ${shellQuote(path.join(kitRoot, "scripts", "verify-docs-extract-citation.mjs"))}\``,
    ],
  },
  { title: "Issues", body: issues.length ? issues.map((issue) => `- ${issue.label}: ${issue.detail}`) : ["No docs extraction/citation issues found."] },
]);

console.log(`docs extract citation check ${data.status} issues=${issues.length}`);
if (issues.length > 0) process.exitCode = 1;
