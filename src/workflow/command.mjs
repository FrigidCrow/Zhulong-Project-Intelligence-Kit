import { WORKFLOW_COMMANDS } from "./catalog.mjs";

export function createWorkflowCommand(handlers, usage) {
  return function workflow(args) {
    const subcommand = args._[0];
    if (subcommand === "run") return handlers.run(args);
    if (subcommand === "status") return handlers.status(args);
    if (subcommand === "continue") return handlers.continue(args);
    if (subcommand === "audit") return handlers.audit(args);
    if (subcommand === "gate-check") return handlers.gateCheck(args);
    if (subcommand === "completion-check") return handlers.completionCheck(args);
    if (subcommand === "complete") return handlers.complete(args);
    if (subcommand === "accept") return handlers.accept(args);
    if (subcommand === "decisions") return handlers.decisions(args);
    if (subcommand === "authorize") return handlers.authorize(args);
    if (subcommand === "authorization-status") return handlers.authorizationStatus(args);
    if (subcommand === "permission-check") return handlers.permissionCheck(args);
    if (subcommand === "revoke") return handlers.revoke(args);
    const route = WORKFLOW_COMMANDS[subcommand];
    if (route) return handlers.handoff(args, route);
    usage();
    process.exitCode = 1;
  };
}
