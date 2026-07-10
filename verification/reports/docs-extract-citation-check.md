# Zhulong Document Extraction and Citation Verification

生成时间: 2026-07-10T04:45:21.464Z

## 摘要

- 状态: PASS
- 问题数: 0

## Evidence

- zl docs extract: found extracted 6
- DOCUMENT_EXTRACT_REPORT: found docx-zip-xml
- DOCUMENT_EXTRACT_REPORT: found xlsx-zip-xml
- DOCUMENT_INDEX: found word.docx
- zl docs citations MD_SENTINEL_2101: found MD_SENTINEL_2101
- zl docs citations TXT_SENTINEL_2102: found TXT_SENTINEL_2102
- zl docs citations CSV_SENTINEL_2103: found CSV_SENTINEL_2103
- zl docs citations PDF_SENTINEL_2104: found PDF_SENTINEL_2104
- zl docs citations DOCX_SENTINEL_2105: found DOCX_SENTINEL_2105
- zl docs citations XLSX_SENTINEL_2106: found XLSX_SENTINEL_2106
- CITATIONS: found XLSX_SENTINEL_2106
- zl docs diff: found modified 1
- DOCUMENT_DIFF: found md.md

## Fixture Paths

- Work root: `<tmp>/zhulong-docs-extract-tpAmxr`
- Project root: `<tmp>/zhulong-docs-extract-tpAmxr/project`
- Reproduce command: `node '<kit-root>/scripts/verify-docs-extract-citation.mjs'`

## Issues

No docs extraction/citation issues found.
