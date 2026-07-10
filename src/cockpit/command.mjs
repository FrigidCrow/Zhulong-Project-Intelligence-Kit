import { createSubcommandHandler } from "../cli/subcommand-router.mjs";

export function createCockpitCommand(handlers, usage) {
  return createSubcommandHandler({ build: handlers.build }, usage);
}
