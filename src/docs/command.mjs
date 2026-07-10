import { createSubcommandHandler } from "../cli/subcommand-router.mjs";

export function createDocsCommand(handlers, usage) {
  return createSubcommandHandler({
    scan: handlers.scan,
    status: handlers.status,
    normalize: handlers.normalize,
    extract: handlers.extract,
    diff: handlers.diff,
    citations: handlers.citations,
    sync: handlers.sync,
    "citation-audit": handlers.citationAudit,
    index: handlers.index,
    query: handlers.query,
  }, usage);
}
