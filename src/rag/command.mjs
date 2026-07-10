import { createSubcommandHandler } from "../cli/subcommand-router.mjs";

export function createRagCommand(handlers, usage) {
  return createSubcommandHandler({
    "init-local": handlers.initLocal,
    "golden-add": handlers.goldenAdd,
    "golden-run": handlers.goldenRun,
    eval: handlers.eval,
  }, usage);
}
