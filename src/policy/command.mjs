import { createSubcommandHandler } from "../cli/subcommand-router.mjs";

export function createPolicyCommand(handlers, usage) {
  return createSubcommandHandler({
    list: handlers.list,
    check: handlers.check,
    explain: handlers.explain,
    lock: handlers.lock,
    verify: handlers.verify,
    diff: handlers.diff,
  }, usage);
}
