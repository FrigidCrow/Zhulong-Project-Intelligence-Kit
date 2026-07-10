const XML_ENTITIES = Object.freeze({
  lt: "<",
  gt: ">",
  amp: "&",
  quot: '"',
  apos: "'",
});

export function markdownCell(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

export function xmlDecode(value) {
  return String(value || "").replace(/&(lt|gt|amp|quot|apos);/g, (_, entity) => XML_ENTITIES[entity]);
}
