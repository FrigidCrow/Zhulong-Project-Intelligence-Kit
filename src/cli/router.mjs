const ROUTES = new Set([
  "init",
  "docs",
  "rag",
  "answer",
  "ambiguity",
  "structure",
  "preflight",
  "refresh",
  "mode",
  "trace",
  "policy",
  "help",
  "next",
  "privacy",
  "license",
  "graph",
  "evidence",
  "runtime",
  "context",
  "workflow",
  "cockpit",
  "codebase",
  "verify",
  "map",
  "doctor",
  "completion",
]);

export async function dispatchCommand(args, handlers) {
  if (!args.command || args.command === "--help") {
    handlers.usage();
    return { handled: true, command: "help", exitCode: 0 };
  }
  if (!ROUTES.has(args.command) || typeof handlers[args.command] !== "function") {
    handlers.usage({ error: true });
    return { handled: false, command: args.command, exitCode: 2 };
  }
  await handlers[args.command](args);
  return { handled: true, command: args.command, exitCode: 0 };
}
