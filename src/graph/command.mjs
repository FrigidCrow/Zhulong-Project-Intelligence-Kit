import { createSubcommandHandler } from "../cli/subcommand-router.mjs";

export function createGraphCommand(handlers, usage) {
  return createSubcommandHandler({
    build: handlers.build,
    status: handlers.status,
    query: handlers.query,
    diff: handlers.diff,
    impact: handlers.impact,
    risk: handlers.risk,
    freshness: handlers.freshness,
  }, usage);
}
